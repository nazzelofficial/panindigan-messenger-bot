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

export class MessengerGateway {
  private client: MessengerClient | undefined;
  private connected = false;
  private authenticatedUserId = "";
  private readonly registry: GroupRegistry;
  private handler: IncomingHandler = async () => undefined;
  private recoveryCallback: (() => void) | undefined;

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

  public async start(): Promise<void> {
    if (!this.config.messenger.enabled) {
      this.logger.warn("Messenger is disabled in configuration; no connection will be made");
      return;
    }
    const credentials = parseAndValidateAppState(this.secrets.appState);
    const options = buildClientOptions(this.config, this.secrets);
    const client = new MessengerClient(options);
    this.client = client;

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
        "updateOnlinePresence is enabled, but panindigan-automate@0.3.5 has no supported API for publishing bot presence",
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

    const result = await client.login(credentials);
    this.authenticatedUserId = result.userId;
    this.connected = true;
    await this.registry.hydrateFromDatabase();
    await this.discoverGroups();
    this.logger.info({ restored: result.restored }, "Messenger authenticated with AppState");
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
      await this.databases.checkpoints.setRecoveryValue("lastFailure", new Date().toISOString());
    }
  }

  public async stop(): Promise<void> {
    if (!this.client) return;
    await this.client.logout().catch((error: unknown) => {
      this.logger.warn(
        { error: error instanceof Error ? error.message : "logout failed" },
        "Messenger logout error",
      );
    });
    this.connected = false;
  }
}

/** Re-exported for adapters that need to construct `login()` directly. */
export { login };
