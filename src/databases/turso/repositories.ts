import { randomIdentifier } from "../../utils/crypto.js";
import type { TursoClient } from "./client.js";

export class OperationalRepository {
  public constructor(private readonly client: TursoClient) {}

  public async recordCommand(entry: {
    command: string;
    threadId: string;
    userId: string;
    argumentLength: number;
    success: boolean;
    error?: string;
    durationMs: number;
  }): Promise<void> {
    const day = new Date().toISOString().slice(0, 10);
    await this.client.batch([
      {
        sql: `INSERT INTO command_history (command_name, thread_id, user_id, argument_length, success, error, duration_ms)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          entry.command,
          entry.threadId,
          entry.userId,
          entry.argumentLength,
          entry.success ? 1 : 0,
          entry.error ?? null,
          entry.durationMs,
        ],
      },
      {
        sql: `INSERT INTO command_analytics (command_name, usage_day, executions, failures)
              VALUES (?, ?, 1, ?)
              ON CONFLICT(command_name, usage_day) DO UPDATE SET
                executions = command_analytics.executions + 1,
                failures = command_analytics.failures + excluded.failures`,
        args: [entry.command, day, entry.success ? 0 : 1],
      },
    ]);
  }

  public async recordAutomation(threadId: string, kind: string, details: unknown): Promise<void> {
    await this.client.query(
      "INSERT INTO automation_history (thread_id, kind, details) VALUES (?, ?, ?)",
      [threadId, kind, JSON.stringify(details)],
    );
  }

  public async recordActivity(category: string, action: string, details: unknown): Promise<void> {
    await this.client.query(
      "INSERT INTO operational_activity (category, action, details) VALUES (?, ?, ?)",
      [category, action, JSON.stringify(details)],
    );
  }

  public async recentCommands(limit = 20): Promise<unknown[]> {
    const result = await this.client.query(
      "SELECT command_name, thread_id, user_id, success, duration_ms, created_at FROM command_history ORDER BY created_at DESC LIMIT ?",
      [limit],
    );
    return result.rows;
  }

  public async commandTotals(limit = 10): Promise<unknown[]> {
    const result = await this.client.query(
      "SELECT command_name, SUM(executions) AS executions, SUM(failures) AS failures FROM command_analytics GROUP BY command_name ORDER BY executions DESC LIMIT ?",
      [limit],
    );
    return result.rows;
  }
}

export class CheckpointRepository {
  public constructor(private readonly client: TursoClient) {}

  public async write(entry: {
    jobId: string;
    status: string;
    attempt: number;
    details?: unknown;
    id?: string;
  }): Promise<string> {
    const id = entry.id ?? randomIdentifier("checkpoint");
    await this.client.query(
      `INSERT INTO scheduler_checkpoints (id, job_id, status, attempt, details)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET status = excluded.status, attempt = excluded.attempt, details = excluded.details`,
      [id, entry.jobId, entry.status, entry.attempt, JSON.stringify(entry.details ?? {})],
    );
    return id;
  }

  public async forJob(jobId: string): Promise<unknown[]> {
    const result = await this.client.query(
      "SELECT id, status, attempt, details, created_at FROM scheduler_checkpoints WHERE job_id = ? ORDER BY created_at DESC",
      [jobId],
    );
    return result.rows;
  }

  public async recordIdempotency(key: string, operation: string): Promise<boolean> {
    const result = await this.client.query(
      "INSERT OR IGNORE INTO idempotency_records (key, operation) VALUES (?, ?)",
      [key, operation],
    );
    return result.rowsAffected > 0;
  }

  public async setRecoveryValue(key: string, value: string): Promise<void> {
    await this.client.query(
      `INSERT INTO recovery_metadata (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
      [key, value],
    );
  }

  public async getRecoveryValue(key: string): Promise<string | undefined> {
    const result = await this.client.query("SELECT value FROM recovery_metadata WHERE key = ?", [
      key,
    ]);
    return result.rows[0]?.value as string | undefined;
  }

  public async recordDelivery(entry: {
    announcementId: string;
    threadId: string;
    attempt: number;
    status: string;
    error?: string;
    idempotencyKey: string;
  }): Promise<boolean> {
    const result = await this.client.query(
      `INSERT OR IGNORE INTO announcement_delivery_history
         (announcement_id, thread_id, attempt, status, error, idempotency_key)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        entry.announcementId,
        entry.threadId,
        entry.attempt,
        entry.status,
        entry.error ?? null,
        entry.idempotencyKey,
      ],
    );
    return result.rowsAffected > 0;
  }

  public async deliveryHistory(announcementId: string): Promise<unknown[]> {
    const result = await this.client.query(
      "SELECT thread_id, attempt, status, error, created_at FROM announcement_delivery_history WHERE announcement_id = ? ORDER BY created_at",
      [announcementId],
    );
    return result.rows;
  }
}
