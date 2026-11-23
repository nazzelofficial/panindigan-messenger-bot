import type { AppConfig } from "../../config/index.js";
import type { DatabaseBundle } from "../../databases/index.js";
import type { AppLogger } from "../../logging/logger.js";
import type { IncomingEvent, MessengerGateway } from "../../messenger/client.js";
import type { CommandDispatcher } from "../../commands/dispatcher.js";
import type { AutomationService } from "../automation/service.js";
import { splitMessage } from "../../utils/text.js";

/** Validates, de-duplicates and routes incoming Messenger activity. */
export class EventProcessingService {
  private dispatcher: CommandDispatcher | undefined;

  public constructor(
    private readonly config: AppConfig,
    private readonly databases: DatabaseBundle,
    private readonly automation: AutomationService,
    private readonly gateway: MessengerGateway,
    private readonly logger: AppLogger,
  ) {}

  public setDispatcher(dispatcher: CommandDispatcher): void {
    this.dispatcher = dispatcher;
  }

  public async handle(incoming: IncomingEvent): Promise<void> {
    if (incoming.kind === "message" || incoming.kind === "message_reply") {
      const event = incoming.event;
      if (!event.messageId || !event.threadId || !event.senderId) return;
      if (this.config.security.validateIncomingEvents && typeof event.timestamp !== "number")
        return;
      if (this.config.security.deduplicateIncomingEvents) {
        if (!(await this.claimDedupe(event.messageId))) return;
      }
      await this.databases.archive?.archiveMessage({
        messageId: event.messageId,
        threadId: event.threadId,
        senderId: event.senderId,
        body: event.body,
        attachments: event.attachments ? [...event.attachments] : [],
      });
      const isCommand = event.body?.startsWith(this.config.identity.commandPrefix) ?? false;
      if (!isCommand && this.config.modules.leveling && !event.isSelf) {
        await this.awardParticipationXp(event.senderId).catch((error: unknown) => {
          this.logger.warn({ error: String(error) }, "Could not award participation XP");
        });
      }
      const outcome = await this.dispatcher?.handle(incoming);
      if (!outcome?.handled && !isCommand)
        await this.runAutomation(event.threadId, event.body ?? "");
      return;
    }

    await this.databases.archive?.archiveEvent(
      incoming.kind,
      "threadId" in incoming ? incoming.threadId : null,
      {
        ...incoming,
      },
    );
  }

  private async claimDedupe(eventId: string): Promise<boolean> {
    if (!this.databases.redis) return true;
    const key = this.databases.redis.keys.dedupe(eventId);
    return this.databases.redis.set(key, "1", { ttlMs: 10 * 60_000, nx: true });
  }

  private async awardParticipationXp(facebookId: string): Promise<void> {
    if (!this.databases.users) return;
    const user = await this.databases.users.upsert(facebookId);
    // Small, bounded XP award with a Redis lock so rapid messages cannot farm XP.
    const key = this.databases.redis?.keys.cooldown("user", facebookId, "xp") ?? `xp:${facebookId}`;
    if (this.databases.cooldowns) {
      const check = await this.databases.cooldowns.acquire(key, 60_000);
      if (!check.allowed) return;
    }
    await this.databases.leveling?.addXp(user.id, 5);
  }

  private async runAutomation(threadId: string, body: string): Promise<void> {
    if (!this.config.modules.automation || !body || !this.databases.automation) return;
    const responses = await this.automation.matchingResponses(threadId, body);
    for (const response of responses) {
      const text = (response as { response_text?: string }).response_text;
      if (!text) continue;
      await this.send(threadId, text);
      await this.automation.recordRun(threadId, "auto_response", { trigger: body });
    }
  }

  private async send(threadId: string, text: string): Promise<void> {
    for (const chunk of splitMessage(text, 1900)) await this.gateway.sendText(threadId, chunk);
  }
}
