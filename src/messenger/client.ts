import {
  MessengerClient,
  login,
  type MessageEvent,
  type MessageReplyEvent,
  type ReactionEvent,
  type ThreadInfo,
} from "panindigan-automate";
import type { AppConfig, ResolvedSecrets } from "../config/index.js";
import type { AppLogger } from "../logging/logger.js";
import type { DatabaseBundle } from "../databases/index.js";
import type { DatabaseHealth } from "../databases/types.js";
import { readEnvironment } from "../utils/env.js";
import { buildClientOptions, parseAndValidateAppState } from "./adapter.js";
import { GroupRegistry } from "./group-registry.js";

export type IncomingEvent =
  | { kind: "message"; event: MessageEvent }
  | { kind: "message_reply"; event: MessageReplyEvent }
  | { kind: "reaction"; event: ReactionEvent }
  | { kind: "participant_join"; threadId: string; addedIds: readonly string[] }
  | { kind: "participant_leave"; threadId: string; removedIds: readonly string[] }
  | { kind: "thread_update"; threadId: string; actorId: string; action: string };

export type IncomingHandler = (event: IncomingEvent) => Promise<void>;

function describeFailure(error: unknown): string {
  if (!(error instanceof Error)) return "unknown error";
  return error.message
    .replace(/[a-z][a-z0-9+.-]*:\/\/[^\s"'()]+/gi, "[REDACTED_URL]")
    .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
    .slice(0, 400);
}

/**
 * Owns the Messenger session. Authentication failures do not terminate the
 * application: the gateway keeps retrying in the background while the command
 * registry, scheduler and web services remain available.
 */
export class MessengerGateway {
  private client: MessengerClient | undefined;
  private connected = false;
  private authenticatedUserId = "";
  private readonly registry: GroupRegistry;
  private handler: IncomingHandler = async () => undefined;
  private recoveryCallback: (() => void) | undefined;
  private retryTimer: NodeJS.Timeout | undefined;
  private attempt = 0;
  private stopped = false;

  public constructor(
    private readonly config: AppConfig,
    private readonly secrets: ResolvedSecrets,
    private readonly databases: DatabaseBundle,
    private readonly logger: AppLogger,
  ) {
    this.registry = new GroupRegistry(databases.groups, logger);
  }

  public get groups(): GroupRegistry {
    return this.registry;
  }

  public get isConnected(): boolean {
    return this.connected && (this.client?.isConnected() ?? false);
  }

  public get currentUserId(): string {
    return this.authenticatedUserId;
  }

  public setHandler(handler: IncomingHandler): void {
    this.handler = handler;
  }

  public setRecoveryCallback(callback: () => void): void {
    this.recoveryCallback = callback;
  }

  /** Starts the connection loop without ever failing the overall startup. */
  public start(): void {
    if (!this.config.messenger.enabled) {
      this.logger.warn("Messenger is disabled in configuration; no connection will be made");
      return;
    }
    void this.attemptLogin();
  }

  private async attemptLogin(): Promise<void> {
    if (this.stopped) return;
    this.attempt += 1;
    try {
      // Read the AppState again on every attempt so a corrected environment
      // value is picked up without a process restart.
      const raw = readEnvironment(this.config.messenger.authentication.appStateEnv);
      if (!raw) {
        throw new Error(
          `Environment variable ${this.config.messenger.authentication.appStateEnv} is not set`,
        );
      }
      const credentials = parseAndValidateAppState(raw, this.logger);
      const client = new MessengerClient(buildClientOptions(this.config, this.secrets));
      this.wireClient(client);
      const result = await client.login(credentials);
      if (this.stopped) {
        await client.logout().catch(() => undefined);
        return;
      }
      this.client = client;
      this.authenticatedUserId = result.userId;
      this.connected = true;
      this.attempt = 0;
      await this.registry.hydrateFromDatabase();
      await this.discoverGroups();
      await this.databases.checkpoints?.setRecoveryValue(
        "lastMessengerLogin",
        new Date().toISOString(),
      );
      this.logger.info(
        { restored: result.restored, userId: result.userId, attempt: this.attempt },
        "Messenger authenticated with AppState",
      );
    } catch (error) {
      this.connected = false;
      this.client = undefined;
      const detail = describeFailure(error);
      this.logger.error(
        { attempt: this.attempt, error: detail },
        "Messenger authentication failed; the service stays online and will retry",
      );
      await this.databases.checkpoints?.setRecoveryValue(
        "lastMessengerFailure",
        new Date().toISOString(),
      );
      await this.alertRecoveryFailure(detail);
      this.scheduleRetry();
    }
  }

  private scheduleRetry(): void {
    if (this.stopped || !this.config.messenger.connection.reconnectAutomatically) return;
    if (this.retryTimer) clearTimeout(this.retryTimer);
    const isLongRetry = this.attempt > this.config.messenger.connection.maximumReconnectAttempts;
    const delayMs = isLongRetry
      ? this.config.messengerRecovery.recoveryIntervalMs
      : this.config.messenger.connection.reconnectDelayMs * Math.min(this.attempt, 6);
    this.retryTimer = setTimeout(() => void this.attemptLogin(), delayMs);
    this.logger.warn(
      { attempt: this.attempt, nextRetryMs: delayMs },
      isLongRetry
        ? "Messenger retries moved to the long recovery interval; re-export FB_APPSTATE when possible"
        : "Messenger login scheduled for retry",
    );
  }

  private wireClient(client: MessengerClient): void {
    client.on("ready", (event) => {
      this.connected = true;
      this.authenticatedUserId = event.userId;
      this.logger.info({ userId: event.userId }, "Messenger connection ready");
    });
    client.on("reconnect", (event) => {
      this.connected = true;
      this.logger.info({ attempt: event.attempt, drained: event.drained }, "Messenger reconnected");
      void this.discoverGroups();
    });
    client.on("disconnect", (event) => {
      this.connected = false;
      this.logger.warn(
        { attempts: event.attempts, reason: event.reason },
        "Messenger disconnected",
      );
      this.scheduleRetry();
    });
    client.on("error", (event) => {
      this.logger.error({ code: event.error.code }, "Messenger background error");
    });
    client.on("warning", (event) => {
      this.logger.warn({ context: event.context }, event.message);
    });
    client.on("logout", (event) => {
      this.connected = false;
      this.logger.warn({ reason: event.reason }, "Messenger session ended");
      this.scheduleRetry();
    });
    client.on("session_dead", (event) => {
      this.connected = false;
      this.logger.error({ reason: event.reason }, "Messenger session is no longer valid");
      if (this.config.messengerRecovery.notifyOnRecoveryFailure) {
        void this.alertRecoveryFailure(event.reason);
      }
      if (this.config.messengerRecovery.mqttRecoveryEnabled) {
        this.recoveryCallback?.();
      }
      this.scheduleRetry();
    });
    client.on("checkpoint", (event) => {
      this.logger.error(
        { operation: event.operation, code: event.code },
        "Facebook requested a checkpoint",
      );
    });

    const behavior = this.config.messenger.behavior;
    if (behavior.subscribeToEvents) {
      client.on("message", (event) => {
        if (event.isSelf && !behavior.receiveOwnMessages) return;
        void this.handler({ kind: "message", event });
      });
      client.on("message_reply", (event) => {
        if (event.isSelf && !behavior.receiveOwnMessages) return;
        void this.handler({ kind: "message_reply", event });
      });
      if (this.config.messenger.eventLogging.logReactions) {
        client.on("reaction", (event) => void this.handler({ kind: "reaction", event }));
      }
      if (this.config.messenger.eventLogging.logThreadChanges) {
        client.on(
          "participant_join",
          (event) =>
            void this.handler({
              kind: "participant_join",
              threadId: event.threadId,
              addedIds: event.addedIds,
            }),
        );
        client.on(
          "participant_leave",
          (event) =>
            void this.handler({
              kind: "participant_leave",
              threadId: event.threadId,
              removedIds: event.removedIds,
            }),
        );
        client.on(
          "thread_update",
          (event) =>
            void this.handler({
              kind: "thread_update",
              threadId: event.threadId,
              actorId: event.actorId,
              action: event.action,
            }),
        );
      }
    }
    const logging = this.config.messenger.eventLogging;
    if (logging.enabled) {
      if (logging.logMessages) {
        client.on("message", (event) =>
          this.logger.debug(
            { messageId: event.messageId, threadId: event.threadId },
            "message event",
          ),
        );
      }
      if (logging.logReplies) {
        client.on("message_reply", (event) =>
          this.logger.debug(
            { messageId: event.messageId, threadId: event.threadId },
            "message reply event",
          ),
        );
      }
      if (logging.logUnsentMessages) {
        client.on("message_unsend", (event) =>
          this.logger.info(
            { messageId: event.messageId, threadId: event.threadId },
            "message unsent",
          ),
        );
      }
      if (logging.logReadReceipts) {
        client.on("read", (event) =>
          this.logger.debug({ threadId: event.threadId, readerId: event.readerId }, "read receipt"),
        );
      }
      if (logging.logTypingEvents) {
        client.on("typing", (event) =>
          this.logger.debug({ threadId: event.threadId, userId: event.userId }, "typing event"),
        );
      }
      if (logging.logPresenceChanges) {
        client.on("presence", (event) =>
          this.logger.debug({ userId: event.userId, status: event.status }, "presence event"),
        );
      }
    }
    if (behavior.updateOnlinePresence) {
      this.logger.warn(
        "updateOnlinePresence is enabled, but panindigan-automate has no supported API for publishing bot presence",
      );
    }
    if (this.config.identity.updateGroupNickname) {
      this.logger.debug(
        "updateGroupNickname is enabled; nicknames are changed only through explicit administrator commands",
      );
    }
    if (behavior.markMessagesAsRead) {
      client.on(
        "message",
        (event) => void client.markAsRead(event.threadId).catch(() => undefined),
      );
    }
    if (behavior.publishTypingStatus) {
      client.on("message", (event) => {
        if (event.isSelf) return;
        void client
          .setTyping(event.threadId, true)
          .then(() => new Promise((resolve) => setTimeout(resolve, 800)))
          .then(() => client.setTyping(event.threadId, false))
          .catch(() => undefined);
      });
    }
    if (behavior.sendDeliveryReceipts) {
      client.on(
        "message",
        (event) => void client.markAsDelivered(event.messageId).catch(() => undefined),
      );
    }
  }

  public async discoverGroups(): Promise<void> {
    if (!this.client) return;
    let cursor: string | undefined;
    for (let page = 0; page < 20; page += 1) {
      const result = await this.client.getThreadList({ limit: 50, tags: ["INBOX"], cursor });
      for (const thread of result.threads) this.registry.observe(thread);
      if (!result.hasMore || !result.cursor) break;
      cursor = result.cursor;
    }
  }

  public async buildEligibleGroupList(): Promise<ThreadInfo[]> {
    await this.discoverGroups();
    return this.client
      ? (await this.client.getThreadList({ limit: 50, tags: ["INBOX"] })).threads.filter(
          (thread) => thread.isGroup && thread.canReply,
        )
      : [];
  }

  public async sendText(threadId: string, text: string): Promise<{ messageId: string }> {
    if (!this.client) throw new Error("Messenger client is not connected.");
    const result = await this.client.sendMessage(threadId, { type: "text", body: text });
    return { messageId: result.messageId };
  }

  public async sendReply(
    threadId: string,
    messageId: string,
    text: string,
  ): Promise<{ messageId: string }> {
    if (!this.client) throw new Error("Messenger client is not connected.");
    const result = await this.client.sendReply(threadId, messageId, { type: "text", body: text });
    return { messageId: result.messageId };
  }

  public async react(messageId: string, emoji: string): Promise<void> {
    if (!this.client) return;
    await this.client.addReaction(messageId, emoji);
  }

  public async resolveProfileId(input: string): Promise<string> {
    if (!this.client) throw new Error("Messenger client is not connected.");
    return this.client.resolveProfileId(input);
  }

  public async addParticipant(threadId: string, userId: string): Promise<void> {
    if (!this.client) throw new Error("Messenger client is not connected.");
    await this.client.addParticipant(threadId, userId);
  }

  public async changeNickname(threadId: string, userId: string, nickname: string): Promise<void> {
    if (!this.client) return;
    await this.client.changeNickname(threadId, userId, nickname);
  }

  public async getThread(threadId: string): Promise<ThreadInfo | undefined> {
    if (!this.client) return undefined;
    return this.client.getThread(threadId);
  }

  public async getUser(userId: string) {
    if (!this.client) return undefined;
    return this.client.getUser(userId);
  }

  public async getMe() {
    if (!this.client) return undefined;
    return this.client.getMe();
  }

  public raw(): MessengerClient | undefined {
    return this.client;
  }

  public health(): DatabaseHealth {
    return {
      name: "Messenger",
      state: this.isConnected ? "connected" : "disconnected",
      checkedAt: Date.now(),
    };
  }

  private async alertRecoveryFailure(reason: string): Promise<void> {
    this.logger.error({ reason }, "Messenger recovery failed; manual AppState refresh required");
    if (this.databases.checkpoints) {
      await this.databases.checkpoints.setRecoveryValue(
        "lastMessengerFailure",
        new Date().toISOString(),
      );
    }
  }

  public async stop(): Promise<void> {
    this.stopped = true;
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = undefined;
    }
    if (!this.client) return;
    await this.client.logout().catch((error: unknown) => {
      this.logger.warn(
        { error: error instanceof Error ? error.message : "logout failed" },
        "Messenger logout error",
      );
    });
    this.client = undefined;
    this.connected = false;
  }
}

/** Re-exported for adapters that need to construct `login()` directly. */
export { login };
