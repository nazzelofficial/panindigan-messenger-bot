import type { AppConfig } from "../config/index.js";
import type { AppLogger } from "../logging/logger.js";
import type { DatabaseBundle } from "../databases/index.js";
import type { MessengerGateway, IncomingEvent } from "../messenger/client.js";
import type { Services } from "../services/container.js";
import { parseCommandBody } from "./parser.js";
import type { CommandContext, CommandResult, PermissionLevel } from "./types.js";
import { CommandRegistry } from "./registry.js";
import { formatDuration } from "../utils/time.js";

export interface DispatchOutcome {
  handled: boolean;
  command?: string;
  success: boolean;
  durationMs: number;
  error?: string;
}

const MAINTENANCE_SAFE_NAMES = new Set([
  "help",
  "commands",
  "status",
  "health",
  "maintenance",
  "maintenancehistory",
  "maintenanceconfig",
  "ping",
  "latency",
  "uptime",
  "botinfo",
  "changelog",
  "language",
  "owner",
]);

export class CommandDispatcher {
  public constructor(
    private readonly config: AppConfig,
    private readonly registry: CommandRegistry,
    private readonly services: Services,
    private readonly messenger: MessengerGateway,
    private readonly databases: DatabaseBundle,
    private readonly logger: AppLogger,
  ) {}

  private inFlight = 0;

  public async handle(incoming: IncomingEvent): Promise<DispatchOutcome> {
    if (!this.config.commands.enabled) {
      return { handled: false, success: true, durationMs: 0 };
    }
    const concurrencyLimit = Math.min(
      this.config.commands.maximumConcurrentExecutions,
      this.config.security.maximumConcurrentCommands,
    );
    if (this.inFlight >= concurrencyLimit) {
      this.logger.warn("Command concurrency limit reached; event ignored");
      return { handled: false, success: true, durationMs: 0 };
    }
    this.inFlight += 1;
    try {
      return await this.handleCommand(incoming);
    } finally {
      this.inFlight -= 1;
    }
  }

  private async handleCommand(incoming: IncomingEvent): Promise<DispatchOutcome> {
    const started = Date.now();
    if (incoming.kind !== "message" && incoming.kind !== "message_reply") {
      return { handled: false, success: true, durationMs: 0 };
    }
    const event = incoming.event;
    const body = event.body;
    if (!body || body.trim() === "") return { handled: false, success: true, durationMs: 0 };
    if (
      (this.config.commands.ignoreOwnMessages || this.config.commands.ignoreBotMessages) &&
      event.isSelf
    ) {
      return { handled: false, success: true, durationMs: 0 };
    }
    if (
      this.config.security.rejectOversizedCommandInput &&
      body.length > this.config.commands.maximumInputLength
    ) {
      return { handled: false, success: true, durationMs: 0 };
    }

    if (!this.config.commands.prefixCommandsEnabled) {
      return { handled: false, success: true, durationMs: 0 };
    }

    const runtimePrefix = await this.services.cache.get<string>("runtime:prefix");
    const prefix =
      runtimePrefix && runtimePrefix.length > 0
        ? runtimePrefix
        : this.config.identity.commandPrefix;
    const parsed = parseCommandBody(body, prefix, this.config.commands.ignoreCase);
    if (!parsed) return { handled: false, success: true, durationMs: 0 };
    const command = this.config.commands.aliasesEnabled
      ? this.registry.resolve(parsed.name)
      : this.registry.get(parsed.name);
    if (!command) {
      if (!this.config.responseVisibility.suppressUnknownCommand) {
        await this.send(
          event.threadId,
          `Unknown command. Use ${this.config.identity.commandPrefix}help to see available commands.`,
        );
      }
      return { handled: false, success: true, durationMs: Date.now() - started };
    }

    const context: CommandContext = {
      command,
      args: parsed,
      senderId: event.senderId,
      threadId: event.threadId,
      threadName: null,
      isGroup: event.isGroup,
      messageId: event.messageId,
      eventTimestamp: event.timestamp,
      isReply: incoming.kind === "message_reply",
      config: this.config,
      databases: this.databases,
      services: this.services,
      messenger: this.messenger,
      logger: this.logger,
      reply: async (text: string) => this.send(event.threadId, text),
      react: async (emoji: string) => {
        try {
          await this.messenger.react(event.messageId, emoji);
        } catch (error) {
          this.logger.warn({ error: this.errorMessage(error) }, "Could not add reaction");
        }
      },
    };

    try {
      // Permission resolution is centralized; no command implements its own role check.
      if (!this.services.permissions.hasPermission(event.senderId, command.permission)) {
        await this.deny(context, this.permissionNotice(command.permission), "missing_role");
        return {
          handled: true,
          command: command.name,
          success: false,
          durationMs: Date.now() - started,
        };
      }

      const allowlist = this.services.permissions.checkAllowlists(event.senderId, event.threadId);
      if (!allowlist.allowed) {
        await this.deny(context, allowlist.reason, allowlist.kind);
        return {
          handled: true,
          command: command.name,
          success: false,
          durationMs: Date.now() - started,
        };
      }

      // Maintenance blocking happens here, before any ordinary execution.
      const maintenance = await this.services.maintenance.currentStatus();
      const isBypass =
        (this.config.maintenance.allowOwnerOverride &&
          this.services.permissions.isOwner(event.senderId)) ||
        (this.config.maintenance.allowAdministratorOverride &&
          this.services.permissions.isAdmin(event.senderId));
      if (
        this.config.maintenance.enabled &&
        this.config.maintenance.blockRegularCommands &&
        maintenance.status === "ACTIVE" &&
        !command.maintenanceSafe &&
        !MAINTENANCE_SAFE_NAMES.has(command.name) &&
        !isBypass
      ) {
        await this.maintenanceNotice(context, maintenance.title, maintenance.endsAt);
        return {
          handled: true,
          command: command.name,
          success: false,
          durationMs: Date.now() - started,
        };
      }

      if (command.module) {
        const override = await this.services.cache.get<boolean>(`runtime:module:${command.module}`);
        const enabled = override ?? this.config.modules[command.module];
        if (enabled === false) {
          return {
            handled: true,
            command: command.name,
            success: false,
            durationMs: Date.now() - started,
          };
        }
      }

      const cooldown = await this.services.cooldowns.checkCommand(
        event.senderId,
        event.threadId,
        command,
      );
      if (!cooldown.allowed) {
        await this.send(
          event.threadId,
          `Please wait ${formatDuration(cooldown.remainingMs)} before using that command again.`,
        );
        return {
          handled: true,
          command: command.name,
          success: false,
          durationMs: Date.now() - started,
        };
      }

      const spam = await this.services.antiSpam.evaluate(event.senderId, event.threadId);
      if (!spam.allowed) {
        // Tell the user they're being throttled instead of silently dropping
        // the command — otherwise rapid sends look like the bot is ignoring
        // them with no cooldown feedback.
        await this.send(
          event.threadId,
          `Please slow down — too many messages. Try again in ${formatDuration(spam.delayMs)}.`,
        );
        return {
          handled: true,
          command: command.name,
          success: false,
          durationMs: Date.now() - started,
        };
      }

      await this.services.permissions.ensureUser(event.senderId, event.body ?? undefined);
      const result = (await command.run(context)) ?? {};
      await this.deliverResult(context, result);
      await this.record(context, true, undefined, Date.now() - started);
      return {
        handled: true,
        command: command.name,
        success: true,
        durationMs: Date.now() - started,
      };
    } catch (error) {
      const message = this.errorMessage(error);
      this.logger.error({ command: command.name, error: message }, "Command execution failed");
      await this.record(context, false, message, Date.now() - started);
      await this.send(
        event.threadId,
        `The command could not be completed: ${message}\nNo changes were made. Please try again later.`,
      );
      return {
        handled: true,
        command: command.name,
        success: false,
        durationMs: Date.now() - started,
        error: message,
      };
    }
  }

  private async deliverResult(context: CommandContext, result: CommandResult): Promise<void> {
    if (result.reactions) {
      for (const emoji of result.reactions) await context.react(emoji);
    }
    if (result.text && !result.silent) await context.reply(result.text);
  }

  private async deny(
    context: CommandContext,
    message: string,
    kind?: "missing_role" | "user" | "group",
  ): Promise<void> {
    const visibility = this.config.responseVisibility;
    if (kind === "missing_role") {
      if (context.command.permission === "admin" && visibility.suppressAdministratorOnlyNotice)
        return;
      if (visibility.suppressMissingRoleNotice || visibility.suppressMissingRoleReplyNotice) return;
      // `suppressMissingRoleReactionNotice` removes the reaction-style denial;
      // this dispatcher sends text only, but the setting is still honoured by
      // suppressing any implicit acknowledgement.
      if (visibility.suppressMissingRoleReactionNotice) return;
    }
    if (kind === "user" && visibility.suppressBlockedUserNotice) return;
    if (kind === "group" && visibility.suppressBlockedGroupNotice) return;
    if (
      kind === undefined &&
      message.includes("allowlisted") &&
      visibility.suppressBlockedUserNotice
    )
      return;
    await context.reply(message);
  }

  private permissionNotice(level: PermissionLevel): string {
    if (level === "owner") return "This command is restricted to the bot owner.";
    return "This command requires administrator permission.";
  }

  private async maintenanceNotice(
    context: CommandContext,
    title: string,
    endsAt: number | undefined,
  ): Promise<void> {
    const key =
      this.databases.redis?.keys.cooldown("maintenance", context.senderId, "notice") ??
      "maintenance:notice";
    const acquired = await this.services.cooldowns.check(key, 30_000);
    if (!acquired.allowed) return;
    await this.services.cooldowns.acquire(key, 30_000);
    await context.reply(
      `🛠️ MAINTENANCE IN PROGRESS\n\n${title || "System maintenance"} is underway, so regular commands are temporarily unavailable.\n${
        endsAt ? `Expected completion: ${new Date(endsAt).toISOString()}` : ""
      }\n\nStatus remains available with ${this.config.identity.commandPrefix}status.`,
    );
  }

  private async send(threadId: string, text: string): Promise<void> {
    try {
      await this.services.outbox.sendChunked(threadId, text);
    } catch (error) {
      this.logger.warn({ error: this.errorMessage(error) }, "Failed to send command response");
    }
  }

  private async record(
    context: CommandContext,
    success: boolean,
    error: string | undefined,
    durationMs: number,
  ): Promise<void> {
    await this.databases.operational?.recordCommand({
      command: context.command.name,
      threadId: context.threadId,
      userId: context.senderId,
      argumentLength: context.args.raw.length,
      success,
      error,
      durationMs,
    });
  }

  private errorMessage(error: unknown): string {
    if (error instanceof Error) return error.message.slice(0, 300);
    return "Unexpected error";
  }
}
