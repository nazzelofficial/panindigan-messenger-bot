import type { AppConfig } from "../../config/index.js";
import type { DatabaseBundle } from "../../databases/index.js";
import type { AppLogger } from "../../logging/logger.js";
import type { MessengerGateway } from "../../messenger/client.js";
import type {
  MaintenanceRepository,
  MaintenanceRow,
  MaintenanceStatus,
} from "../../databases/postgresql/repositories/maintenance.js";
import { randomIdentifier } from "../../utils/crypto.js";
import { formatDateTime, formatDuration, zonedDateTimeToEpoch } from "../../utils/time.js";
import { splitMessage } from "../../utils/text.js";

export interface MaintenanceSnapshot {
  status: MaintenanceStatus;
  title: string;
  endsAt?: number;
  record?: MaintenanceRow;
}

export interface ScheduleInput {
  title: string;
  reason: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  noticeMessage?: string;
  createdBy: string;
}

export class MaintenanceService {
  public constructor(
    private readonly config: AppConfig,
    private readonly databases: DatabaseBundle,
    private readonly messenger: MessengerGateway,
    private readonly logger: AppLogger,
  ) {}

  private repository(): MaintenanceRepository {
    if (!this.config.modules.maintenance || !this.databases.maintenance) {
      throw new Error("The maintenance system is not available.");
    }
    return this.databases.maintenance;
  }

  public async currentStatus(): Promise<MaintenanceSnapshot> {
    const repository = this.databases.maintenance;
    if (!repository) return { status: "OFF", title: "" };
    const active = await repository.active();
    if (active) {
      return {
        status: "ACTIVE",
        title: active.title,
        endsAt: active.ends_at.getTime(),
        record: active,
      };
    }
    const upcoming = (await repository.list(1))[0];
    if (upcoming?.status === "SCHEDULED") {
      return {
        status: "SCHEDULED",
        title: upcoming.title,
        endsAt: upcoming.ends_at.getTime(),
        record: upcoming,
      };
    }
    return { status: "OFF", title: "" };
  }

  public async isActive(): Promise<boolean> {
    return (await this.currentStatus()).status === "ACTIVE";
  }

  public async createSchedule(input: ScheduleInput): Promise<MaintenanceRow> {
    const repository = this.repository();
    const startsAt = zonedDateTimeToEpoch(
      input.startDate,
      input.startTime,
      this.config.maintenance.timezone,
    );
    const endsAt = zonedDateTimeToEpoch(
      input.endDate,
      input.endTime,
      this.config.maintenance.timezone,
    );
    if (endsAt <= startsAt) {
      throw new Error("The end date and time must be after the start date and time.");
    }
    if (startsAt <= Date.now()) {
      throw new Error("The start time must be in the future.");
    }
    const id = randomIdentifier("maint");
    const record = await repository.create({
      id,
      title: input.title,
      reason: input.reason,
      description: "",
      startsAt: new Date(startsAt),
      endsAt: new Date(endsAt),
      timezone: this.config.maintenance.timezone,
      noticeMessage: input.noticeMessage ?? "",
      createdBy: input.createdBy,
    });
    await repository.recordHistory(id, "scheduled", {
      startsAt: new Date(startsAt).toISOString(),
      endsAt: new Date(endsAt).toISOString(),
      createdBy: input.createdBy,
    });
    await this.enqueueLifecycle(record);
    this.logger.info({ id, startsAt, endsAt }, "Maintenance scheduled");
    return record;
  }

  private async enqueueLifecycle(record: MaintenanceRow): Promise<void> {
    const scheduler = this.databases.scheduler;
    if (!scheduler || !this.config.taskScheduler.enabled) return;
    const timezone = this.config.maintenance.timezone;
    if (this.config.maintenance.startAutomatically) {
      await scheduler.create({
        id: `${record.id}:start`,
        kind: "maintenance.start",
        payload: { maintenanceId: record.id },
        dueAt: record.starts_at,
        timezone,
        maximumAttempts: this.config.taskScheduler.maximumRetries,
        createdBy: record.created_by,
      });
    }
    if (this.config.maintenance.finishAutomatically) {
      await scheduler.create({
        id: `${record.id}:end`,
        kind: "maintenance.end",
        payload: { maintenanceId: record.id },
        dueAt: record.ends_at,
        timezone,
        maximumAttempts: this.config.taskScheduler.maximumRetries,
        createdBy: record.created_by,
      });
    }
    if (this.config.maintenance.sendAdvanceNotices) {
      for (const lead of this.config.maintenance.noticeLeadTimesMinutes) {
        const due = new Date(record.starts_at.getTime() - lead * 60_000);
        if (due.getTime() <= Date.now()) continue;
        await scheduler.create({
          id: `${record.id}:notice:${lead}`,
          kind: "maintenance.notice",
          payload: { maintenanceId: record.id, leadMinutes: lead },
          dueAt: due,
          timezone,
          maximumAttempts: this.config.taskScheduler.maximumRetries,
          createdBy: record.created_by,
        });
      }
    }
  }

  public async start(id: string, actor: string): Promise<void> {
    const repository = this.repository();
    const record = await repository.find(id);
    if (!record) throw new Error("Maintenance record not found.");
    if (record.status === "ACTIVE") return;
    await repository.markStarted(id);
    await repository.recordHistory(id, "started", { actor });
    await this.databases.checkpoints?.setRecoveryValue("maintenanceActiveId", id);
    await this.broadcast(`${this.startNotice(record)}\n\n${this.noticeBody(record)}`, "start");
    this.logger.info({ id, actor }, "Global maintenance activated");
  }

  public async finish(id: string, actor: string): Promise<void> {
    const repository = this.repository();
    const record = await repository.find(id);
    if (!record) throw new Error("Maintenance record not found.");
    if (record.status !== "ACTIVE") return;
    await repository.markFinished(id);
    await repository.recordHistory(id, "completed", { actor });
    await this.databases.checkpoints?.setRecoveryValue("maintenanceActiveId", "");
    await this.broadcast(
      `✅ PANINDIGAN MAINTENANCE COMPLETE\n\nScheduled maintenance has finished. All commands are operational again.\n\n${this.noticeBody(record)}`,
      "completed",
    );
    this.logger.info({ id, actor }, "Global maintenance completed");
  }

  public async activateNow(
    actor: string,
    title: string,
    reason: string,
    noticeMessage: string,
  ): Promise<MaintenanceRow> {
    const repository = this.repository();
    const now = Date.now();
    const record = await repository.create({
      id: randomIdentifier("maint"),
      title,
      reason,
      description: "",
      startsAt: new Date(now),
      endsAt: new Date(now + 3_600_000),
      timezone: this.config.maintenance.timezone,
      noticeMessage,
      createdBy: actor,
    });
    await repository.markStarted(record.id);
    await repository.recordHistory(record.id, "started", { actor, manual: true });
    await this.databases.checkpoints?.setRecoveryValue("maintenanceActiveId", record.id);
    await this.broadcast(`${this.startNotice(record)}\n\n${this.noticeBody(record)}`, "start");
    return record;
  }

  public async deactivateNow(actor: string): Promise<void> {
    const active = await this.repository().active();
    if (!active) throw new Error("There is no active maintenance to end.");
    await this.finish(active.id, actor);
  }

  public async cancel(id: string, actor: string): Promise<void> {
    const repository = this.repository();
    const record = await repository.find(id);
    if (!record) throw new Error("Maintenance record not found.");
    if (record.status !== "SCHEDULED")
      throw new Error("Only scheduled maintenance can be cancelled.");
    await repository.setStatus(id, "CANCELLED");
    await repository.recordHistory(id, "cancelled", { actor });
    const scheduler = this.databases.scheduler;
    if (scheduler) {
      await scheduler.cancel(`${id}:start`);
      await scheduler.cancel(`${id}:end`);
      for (const lead of this.config.maintenance.noticeLeadTimesMinutes)
        await scheduler.cancel(`${id}:notice:${lead}`);
    }
    this.logger.info({ id, actor }, "Scheduled maintenance cancelled");
  }

  public async reschedule(id: string, input: ScheduleInput): Promise<void> {
    const repository = this.repository();
    const record = await repository.find(id);
    if (!record || record.status !== "SCHEDULED")
      throw new Error("Only scheduled maintenance can be rescheduled.");
    const startsAt = zonedDateTimeToEpoch(
      input.startDate,
      input.startTime,
      this.config.maintenance.timezone,
    );
    const endsAt = zonedDateTimeToEpoch(
      input.endDate,
      input.endTime,
      this.config.maintenance.timezone,
    );
    if (endsAt <= startsAt || startsAt <= Date.now()) throw new Error("Invalid reschedule dates.");
    await repository.edit(id, {
      title: input.title,
      reason: input.reason,
      starts_at: new Date(startsAt),
      ends_at: new Date(endsAt),
      notice_message: input.noticeMessage ?? record.notice_message,
    });
    await repository.recordHistory(id, "rescheduled", { actor: input.createdBy, startsAt, endsAt });
    const scheduler = this.databases.scheduler;
    if (scheduler) {
      await scheduler.cancel(`${id}:start`);
      await scheduler.cancel(`${id}:end`);
      for (const lead of this.config.maintenance.noticeLeadTimesMinutes)
        await scheduler.cancel(`${id}:notice:${lead}`);
    }
    await this.enqueueLifecycle({
      ...record,
      starts_at: new Date(startsAt),
      ends_at: new Date(endsAt),
    });
  }

  public async edit(id: string, patch: Record<string, unknown>): Promise<void> {
    const repository = this.repository();
    const record = await repository.find(id);
    if (!record) throw new Error("Maintenance record not found.");
    const allowed = new Set([
      "title",
      "reason",
      "description",
      "starts_at",
      "ends_at",
      "notice_message",
    ]);
    const clean: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(patch)) if (allowed.has(key)) clean[key] = value;
    await repository.edit(id, clean);
    await repository.recordHistory(id, "edited", { patch: clean });
  }

  public list(limit = 20) {
    return this.repository().list(limit);
  }

  public async info(id: string) {
    const record = await this.repository().find(id);
    if (!record) throw new Error("Maintenance record not found.");
    return { record, notifications: await this.repository().notifications(id) };
  }

  public history(id?: string, limit = 30) {
    return this.repository().history(id, limit);
  }

  public configuration(): Record<string, unknown> {
    return {
      scope: this.config.maintenance.defaultScope,
      timezone: this.config.maintenance.timezone,
      blockRegularCommands: this.config.maintenance.blockRegularCommands,
      ownerOverride: this.config.maintenance.allowOwnerOverride,
      administratorOverride: this.config.maintenance.allowAdministratorOverride,
      noticeLeadTimesMinutes: this.config.maintenance.noticeLeadTimesMinutes,
      automaticStart: this.config.maintenance.startAutomatically,
      automaticCompletion: this.config.maintenance.finishAutomatically,
    };
  }

  public async sendNotice(
    message: string,
    actor: string,
  ): Promise<{ sent: number; failed: number }> {
    await this.databases.operational?.recordActivity("maintenance", "manual_notice", { actor });
    return this.broadcast(
      `🛠️ PANINDIGAN MAINTENANCE NOTICE\n\n${message}\n\n— Panindigan Developer Team`,
      "notice",
    );
  }

  public async deliverScheduledNotice(id: string, leadMinutes: number): Promise<void> {
    const record = await this.repository().find(id);
    if (!record || record.status !== "SCHEDULED") return;
    const key = `${id}:notice:${leadMinutes}`;
    if (!(await this.claimKey(key, "notice"))) return;
    await this.broadcast(
      `${this.advanceNotice(record, leadMinutes)}\n\n${this.noticeBody(record)}`,
      `notice:${leadMinutes}`,
    );
  }

  private async claimKey(key: string, operation: string): Promise<boolean> {
    if (!this.databases.checkpoints) return true;
    return this.databases.checkpoints.recordIdempotency(`maintenance:${key}`, operation);
  }

  private async broadcast(text: string, type: string): Promise<{ sent: number; failed: number }> {
    if (!this.config.maintenance.notifyAllActiveGroups) return { sent: 0, failed: 0 };
    const groups = this.messenger.groups.eligibleGroups();
    let sent = 0;
    let failed = 0;
    for (const group of groups) {
      const idempotencyKey = `${type}:${group.threadId}:${Date.now()}`;
      if (!(await this.claimKey(idempotencyKey, type))) continue;
      try {
        for (const chunk of splitMessage(text, 1900))
          await this.messenger.sendText(group.threadId, chunk);
        sent += 1;
        await this.databases.maintenance?.recordNotification({
          maintenanceId: "broadcast",
          type,
          leadMinutes: 0,
          threadId: group.threadId,
          status: "sent",
          idempotencyKey,
        });
      } catch (error) {
        failed += 1;
        await this.databases.maintenance?.recordNotification({
          maintenanceId: "broadcast",
          type,
          leadMinutes: 0,
          threadId: group.threadId,
          status: "failed",
          error: error instanceof Error ? error.message.slice(0, 300) : "Delivery failed",
          idempotencyKey,
        });
      }
      if (this.config.announcements.obeyMessengerRateLimits) {
        await new Promise((resolve) => setTimeout(resolve, 350));
      }
    }
    this.logger.info(
      { type, sent, failed, groups: groups.length },
      "Maintenance notice delivery summary",
    );
    return { sent, failed };
  }

  private noticeBody(record: MaintenanceRow): string {
    const zone = record.timezone_name;
    const start = formatDateTime(record.starts_at.getTime(), zone);
    const end = formatDateTime(record.ends_at.getTime(), zone);
    return [
      `Title: ${record.title}`,
      record.reason ? `Reason: ${record.reason}` : "",
      `Start: ${start}`,
      `Expected completion: ${end}`,
      `Timezone: ${zone}`,
      record.notice_message ? `\n${record.notice_message}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  }

  private startNotice(record: MaintenanceRow): string {
    return `🛠️ PANINDIGAN MAINTENANCE STARTED\n\nMaintenance is now in progress. Regular bot commands are temporarily unavailable.\nExpected duration: ${formatDuration(
      record.ends_at.getTime() - record.starts_at.getTime(),
    )}`;
  }

  private advanceNotice(record: MaintenanceRow, leadMinutes: number): string {
    return `🛠️ PANINDIGAN MAINTENANCE NOTICE\n\nA scheduled system maintenance is approaching in ${formatDuration(
      leadMinutes * 60_000,
    )}. During this period, regular bot commands will be temporarily unavailable.`;
  }
}
