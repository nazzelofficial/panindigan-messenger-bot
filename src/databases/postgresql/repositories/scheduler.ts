import type { PostgresClient } from "../client.js";

export interface ScheduledJobRow {
  id: string;
  job_kind: string;
  payload: Record<string, unknown>;
  due_at: Date;
  timezone_name: string;
  status: string;
  attempts: number;
  maximum_attempts: number;
  locked_by: string | null;
  locked_until: Date | null;
  created_by: string;
}

export class SchedulerRepository {
  public constructor(private readonly db: PostgresClient) {}

  public async create(input: {
    id: string;
    kind: string;
    payload: unknown;
    dueAt: Date;
    timezone: string;
    maximumAttempts: number;
    createdBy: string;
  }): Promise<void> {
    await this.db.query(
      `INSERT INTO scheduled_jobs (id, job_kind, payload, due_at, timezone_name, maximum_attempts, created_by)
       VALUES ($1,$2,$3::jsonb,$4,$5,$6,$7)
       ON CONFLICT (id) DO UPDATE SET payload = EXCLUDED.payload, due_at = EXCLUDED.due_at,
         status = 'pending', attempts = 0, next_attempt_at = NULL, updated_at = NOW()`,
      [
        input.id,
        input.kind,
        JSON.stringify(input.payload),
        input.dueAt,
        input.timezone,
        input.maximumAttempts,
        input.createdBy,
      ],
    );
  }

  public async claimDue(workerId: string, lockUntil: Date, limit = 20): Promise<ScheduledJobRow[]> {
    return this.db.transaction(async (connection) => {
      const candidates = await connection.query<ScheduledJobRow>(
        `SELECT * FROM scheduled_jobs
          WHERE status = 'pending' AND due_at <= NOW()
            AND (next_attempt_at IS NULL OR next_attempt_at <= NOW())
            AND (locked_until IS NULL OR locked_until <= NOW())
          ORDER BY due_at LIMIT $1 FOR UPDATE SKIP LOCKED`,
        [limit],
      );
      const claimed: ScheduledJobRow[] = [];
      for (const job of candidates.rows) {
        const result = await connection.query<ScheduledJobRow>(
          `UPDATE scheduled_jobs SET status = 'running', locked_by = $2, locked_until = $3, updated_at = NOW()
            WHERE id = $1 AND status = 'pending' RETURNING *`,
          [job.id, workerId, lockUntil],
        );
        if (result.rows[0]) claimed.push(result.rows[0]);
      }
      return claimed;
    });
  }

  public async succeeded(id: string): Promise<void> {
    await this.db.query(
      "UPDATE scheduled_jobs SET status = 'succeeded', locked_by = NULL, locked_until = NULL, updated_at = NOW() WHERE id = $1",
      [id],
    );
  }

  public async failed(
    id: string,
    maximumAttempts: number,
    retryDelayMs: number,
  ): Promise<"retry" | "exhausted"> {
    return this.db.transaction(async (connection) => {
      const result = await connection.query<{ attempts: number }>(
        `UPDATE scheduled_jobs
            SET attempts = attempts + 1,
                status = CASE WHEN attempts + 1 >= $2 THEN 'failed' ELSE 'pending' END,
                next_attempt_at = NOW() + ($3 * INTERVAL '1 millisecond'),
                locked_by = NULL, locked_until = NULL, updated_at = NOW()
          WHERE id = $1 RETURNING attempts`,
        [id, maximumAttempts, retryDelayMs],
      );
      return (result.rows[0]?.attempts ?? maximumAttempts) >= maximumAttempts
        ? "exhausted"
        : "retry";
    });
  }

  public async cancel(id: string): Promise<boolean> {
    const result = await this.db.query(
      "UPDATE scheduled_jobs SET status = 'cancelled', locked_by = NULL, locked_until = NULL WHERE id = $1 AND status IN ('pending', 'running')",
      [id],
    );
    return (result.rowCount ?? 0) > 0;
  }

  public async list(limit = 50): Promise<ScheduledJobRow[]> {
    const result = await this.db.query<ScheduledJobRow>(
      "SELECT * FROM scheduled_jobs ORDER BY due_at DESC LIMIT $1",
      [limit],
    );
    return result.rows;
  }

  public async recordRun(
    jobId: string,
    attempt: number,
    status: string,
    error?: string,
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO job_runs (job_id, attempt, status, error, finished_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [jobId, attempt, status, error ?? null],
    );
  }
}
