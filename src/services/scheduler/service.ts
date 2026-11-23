import type { AppConfig } from "../../config/index.js";
import type { DatabaseBundle } from "../../databases/index.js";
import type { AppLogger } from "../../logging/logger.js";
import type { ScheduledJobRow } from "../../databases/postgresql/repositories/scheduler.js";
import { randomIdentifier } from "../../utils/crypto.js";

export type JobHandler = (payload: Record<string, unknown>, job: ScheduledJobRow) => Promise<void>;

/** Durable job runner. PostgreSQL owns schedules; Turso owns execution checkpoints. */
export class SchedulerService {
  private readonly handlers = new Map<string, JobHandler>();
  private timer: NodeJS.Timeout | undefined;
  private readonly workerId = randomIdentifier("worker");
  private running = false;

  public constructor(
    private readonly config: AppConfig,
    private readonly databases: DatabaseBundle,
    private readonly logger: AppLogger,
  ) {}

  public register(kind: string, handler: JobHandler): void {
    this.handlers.set(kind, handler);
  }

  public start(): void {
    if (!this.config.taskScheduler.enabled || !this.databases.scheduler) return;
    this.timer = setInterval(() => void this.poll(), this.config.taskScheduler.pollIntervalMs);
    void this.poll();
    this.logger.info("Task scheduler started");
  }

  public stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    this.logger.info("Task scheduler stopped");
  }

  public async poll(): Promise<number> {
    if (this.running || !this.databases.scheduler) return 0;
    this.running = true;
    try {
      const lockUntil = new Date(Date.now() + 60_000);
      const jobs = await this.databases.scheduler.claimDue(this.workerId, lockUntil, 20);
      for (const job of jobs) {
        const distributedLock = await this.databases.locks?.acquire(`job:${job.id}`, 120_000);
        if (!distributedLock) {
          await this.databases.scheduler.failed(job.id, job.maximum_attempts, 1000);
          continue;
        }
        const checkpoint = await this.databases.checkpoints?.write({
          jobId: job.id,
          status: "running",
          attempt: job.attempts + 1,
        });
        try {
          const handler = this.handlers.get(job.job_kind);
          if (!handler) throw new Error(`No handler registered for job kind ${job.job_kind}.`);
          await handler(job.payload, job);
          await this.databases.scheduler.succeeded(job.id);
          await this.databases.scheduler.recordRun(job.id, job.attempts + 1, "succeeded");
          await this.databases.checkpoints?.write({
            id: checkpoint,
            jobId: job.id,
            status: "succeeded",
            attempt: job.attempts + 1,
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Job failed";
          const outcome = await this.databases.scheduler.failed(
            job.id,
            job.maximum_attempts,
            5000 * (job.attempts + 1),
          );
          await this.databases.scheduler.recordRun(job.id, job.attempts + 1, "failed", message);
          await this.databases.checkpoints?.write({
            id: checkpoint,
            jobId: job.id,
            status: outcome,
            attempt: job.attempts + 1,
            details: { error: message },
          });
          this.logger.error(
            { jobId: job.id, kind: job.job_kind, outcome, error: message },
            "Scheduled job failed",
          );
        } finally {
          await distributedLock.release();
        }
      }
      return jobs.length;
    } finally {
      this.running = false;
    }
  }

  public schedule(input: {
    id?: string;
    kind: string;
    payload: unknown;
    dueAt: Date;
    timezone?: string;
    maximumAttempts?: number;
    createdBy: string;
  }): Promise<void> {
    if (!this.databases.scheduler) throw new Error("PostgreSQL is required for scheduling.");
    return this.databases.scheduler.create({
      id: input.id ?? randomIdentifier("job"),
      kind: input.kind,
      payload: input.payload,
      dueAt: input.dueAt,
      timezone: input.timezone ?? this.config.taskScheduler.timezone,
      maximumAttempts: input.maximumAttempts ?? this.config.taskScheduler.maximumRetries,
      createdBy: input.createdBy,
    });
  }

  public cancel(id: string): Promise<boolean> {
    if (!this.databases.scheduler) throw new Error("PostgreSQL is required for scheduling.");
    return this.databases.scheduler.cancel(id);
  }

  public list(limit = 50) {
    if (!this.databases.scheduler) throw new Error("PostgreSQL is required for scheduling.");
    return this.databases.scheduler.list(limit);
  }
}
