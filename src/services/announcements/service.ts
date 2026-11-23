import type { AppConfig } from "../../config/index.js";
import type { DatabaseBundle } from "../../databases/index.js";
import type { AppLogger } from "../../logging/logger.js";
import type { MessengerGateway } from "../../messenger/client.js";
import type { AnnouncementRepository } from "../../databases/postgresql/repositories/announcements.js";
import { randomIdentifier } from "../../utils/crypto.js";
import { formatDateTime, zonedDateTimeToEpoch } from "../../utils/time.js";
import { splitMessage } from "../../utils/text.js";

export type AnnouncementType =
  "general" | "maintenance" | "interruption" | "release" | "update" | "security" | "emergency";
export type AnnouncementPriority = "normal" | "important" | "urgent";

export interface DeliverySummary {
  announcementId: string;
  targets: number;
  sent: number;
  failed: number;
  skipped: number;
}

export class AnnouncementService {
  private readonly pendingConfirmations = new Map<
    string,
    { body: string; title: string; expiresAt: number }
  >();

  public constructor(
    private readonly config: AppConfig,
    private readonly databases: DatabaseBundle,
    private readonly messenger: MessengerGateway,
    private readonly logger: AppLogger,
  ) {}

  private repository(): AnnouncementRepository {
    if (!this.config.modules.announcements || !this.databases.announcements) {
      throw new Error("The announcement system is not available.");
    }
    return this.databases.announcements;
  }

  public async create(input: {
    title: string;
    body: string;
    type?: AnnouncementType;
    priority?: AnnouncementPriority;
    createdBy: string;
    scheduledFor?: Date;
  }) {
    return this.repository().create({
      id: randomIdentifier("ann"),
      title: input.title,
      body: input.body,
      type: input.type ?? "general",
      priority: input.priority ?? "normal",
      createdBy: input.createdBy,
      scheduledFor: input.scheduledFor,
    });
  }

  public async prepare(
    title: string,
    body: string,
    actor: string,
  ): Promise<{ id: string; preview: string; targets: number }> {
    const record = await this.create({ title, body, createdBy: actor });
    const targets = this.messenger.groups.eligibleGroups().length;
    this.pendingConfirmations.set(actor, { title, body, expiresAt: Date.now() + 5 * 60_000 });
    return {
      id: record.id,
      targets,
      preview: [
        "📢 BROADCAST PREVIEW",
        "",
        `Title: ${title}`,
        `Recipient groups: ${targets}`,
        "",
        body,
        "",
        this.config.announcements.requireFinalConfirmation
          ? `Confirm with: ${this.config.identity.commandPrefix}broadcast confirm ${record.id}`
          : "No confirmation is required by the current configuration.",
      ].join("\n"),
    };
  }

  public async confirm(id: string, actor: string): Promise<DeliverySummary> {
    const pending = this.pendingConfirmations.get(actor);
    if (
      this.config.announcements.requireFinalConfirmation &&
      (!pending || pending.expiresAt < Date.now())
    ) {
      throw new Error(
        "There is no pending broadcast confirmation, or it has expired. Preview it again first.",
      );
    }
    const record = await this.repository().find(id);
    if (!record) throw new Error("Announcement not found.");
    if (record.status === "completed" || record.status === "partially_failed") {
      throw new Error("This announcement has already been delivered.");
    }
    this.pendingConfirmations.delete(actor);
    await this.repository().confirm(id);
    await this.databases.operational?.recordActivity("announcement", "confirmed", { id, actor });
    return this.deliver(id);
  }

  public async deliver(id: string): Promise<DeliverySummary> {
    const repository = this.repository();
    const record = await repository.find(id);
    if (!record) throw new Error("Announcement not found.");
    const groups = this.config.announcements.broadcastToEligibleGroups
      ? await this.messenger.buildEligibleGroupList()
      : [];
    await repository.setTargets(id, groups.length);

    const message = [
      `📢 ${record.title}`,
      "",
      record.body,
      "",
      `— ${this.config.identity.publisher.name}`,
    ].join("\n");

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    for (const group of groups) {
      const idempotencyKey = `${id}:${group.id}`;
      const inserted = await repository.addDelivery({
        announcementId: id,
        threadId: group.id,
        idempotencyKey,
      });
      if (!inserted) {
        skipped += 1;
        continue;
      }
      let delivered = false;
      let lastError: string | undefined;
      for (let attempt = 1; attempt <= 2; attempt += 1) {
        try {
          for (const chunk of splitMessage(message, 1900)) {
            await this.messenger.sendText(group.id, chunk);
          }
          await repository.markDeliveryByKey(idempotencyKey, "sent");
          await this.databases.checkpoints?.recordDelivery({
            announcementId: id,
            threadId: group.id,
            attempt,
            status: "sent",
            idempotencyKey: `${idempotencyKey}:${attempt}`,
          });
          delivered = true;
          break;
        } catch (error) {
          lastError = error instanceof Error ? error.message.slice(0, 300) : "Delivery failed";
          await this.databases.checkpoints?.recordDelivery({
            announcementId: id,
            threadId: group.id,
            attempt,
            status: "failed",
            error: lastError,
            idempotencyKey: `${idempotencyKey}:${attempt}`,
          });
          if (attempt === 1) await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
      if (delivered) sent += 1;
      else {
        failed += 1;
        await repository.markDeliveryByKey(idempotencyKey, "failed", lastError);
      }
      if (this.config.announcements.obeyMessengerRateLimits) {
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    }
    await repository.refreshSummary(id);
    const status = failed === 0 ? "completed" : sent > 0 ? "partially_failed" : "failed";
    await repository.setStatus(id, status);
    this.logger.info(
      { id, targets: groups.length, sent, failed, skipped },
      "Broadcast delivery summary",
    );
    return { announcementId: id, targets: groups.length, sent, failed, skipped };
  }

  public async schedule(input: {
    date: string;
    time: string;
    title: string;
    body: string;
    createdBy: string;
  }) {
    const dueAt = zonedDateTimeToEpoch(input.date, input.time, this.config.application.timezone);
    if (dueAt <= Date.now()) throw new Error("The scheduled delivery time must be in the future.");
    const record = await this.create({
      title: input.title,
      body: input.body,
      createdBy: input.createdBy,
      scheduledFor: new Date(dueAt),
    });
    await this.databases.scheduler?.create({
      id: `announcement:${record.id}`,
      kind: "announcement.deliver",
      payload: { announcementId: record.id },
      dueAt: new Date(dueAt),
      timezone: this.config.application.timezone,
      maximumAttempts: this.config.taskScheduler.maximumRetries,
      createdBy: input.createdBy,
    });
    return record;
  }

  public async processDue(): Promise<number> {
    const due = await this.repository().due(new Date());
    for (const record of due) {
      await this.repository().setStatus(record.id, "delivering");
      try {
        await this.deliver(record.id);
      } catch (error) {
        this.logger.error(
          { id: record.id, error: String(error) },
          "Scheduled announcement delivery failed",
        );
      }
    }
    return due.length;
  }

  public async cancel(id: string): Promise<void> {
    const record = await this.repository().find(id);
    if (!record) throw new Error("Announcement not found.");
    if (!["draft", "scheduled"].includes(record.status))
      throw new Error("This announcement can no longer be cancelled.");
    await this.repository().setStatus(id, "cancelled");
    await this.databases.scheduler?.cancel(`announcement:${id}`);
  }

  public list(limit = 20) {
    return this.repository().list(limit);
  }

  public async info(id: string) {
    const record = await this.repository().find(id);
    if (!record) throw new Error("Announcement not found.");
    const deliveries = await this.repository().deliveries(id);
    const operational = await this.databases.checkpoints?.deliveryHistory(id);
    return { record, deliveries, operational: operational ?? [] };
  }

  public async status() {
    const all = await this.list(50);
    return {
      total: all.length,
      completed: all.filter((item) => item.status === "completed").length,
      partial: all.filter((item) => item.status === "partially_failed").length,
      scheduled: all.filter((item) => item.status === "scheduled").length,
    };
  }

  public formatRecord(record: Awaited<ReturnType<AnnouncementRepository["find"]>>): string {
    if (!record) return "Announcement not found.";
    return [
      `📢 ANNOUNCEMENT ${record.id}`,
      "",
      `Title: ${record.title}`,
      `Type: ${record.announcement_type}`,
      `Priority: ${record.priority}`,
      `Status: ${record.status}`,
      `Created: ${formatDateTime(record.created_at.getTime(), this.config.application.timezone)}`,
      `Targets: ${record.total_targets} · Sent: ${record.successful_deliveries} · Failed: ${record.failed_deliveries}`,
      "",
      record.body,
    ].join("\n");
  }
}
