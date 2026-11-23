import type { PostgresClient } from "../client.js";

export type MaintenanceStatus = "OFF" | "SCHEDULED" | "ACTIVE" | "COMPLETED" | "CANCELLED";

export interface MaintenanceRow {
  id: string;
  title: string;
  reason: string;
  description: string;
  starts_at: Date;
  ends_at: Date;
  timezone_name: string;
  expected_duration_ms: string;
  status: MaintenanceStatus;
  notice_message: string;
  created_by: string;
  created_at: Date;
  actual_start_at: Date | null;
  actual_end_at: Date | null;
  updated_at: Date;
  notification_status: string;
}

export interface CreateMaintenanceInput {
  id: string;
  title: string;
  reason: string;
  description: string;
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  noticeMessage: string;
  createdBy: string;
}

export class MaintenanceRepository {
  public constructor(private readonly db: PostgresClient) {}

  public async create(input: CreateMaintenanceInput): Promise<MaintenanceRow> {
    const result = await this.db.query<MaintenanceRow>(
      `INSERT INTO maintenances (id, title, reason, description, starts_at, ends_at, timezone_name,
                                 expected_duration_ms, status, notice_message, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'SCHEDULED',$9,$10)
       RETURNING *`,
      [
        input.id,
        input.title,
        input.reason,
        input.description,
        input.startsAt,
        input.endsAt,
        input.timezone,
        input.endsAt.getTime() - input.startsAt.getTime(),
        input.noticeMessage,
        input.createdBy,
      ],
    );
    return result.rows[0]!;
  }

  public async find(id: string): Promise<MaintenanceRow | undefined> {
    const result = await this.db.query<MaintenanceRow>("SELECT * FROM maintenances WHERE id = $1", [
      id,
    ]);
    return result.rows[0];
  }

  public async active(): Promise<MaintenanceRow | undefined> {
    const result = await this.db.query<MaintenanceRow>(
      "SELECT * FROM maintenances WHERE status = 'ACTIVE' ORDER BY actual_start_at DESC NULLS LAST LIMIT 1",
    );
    return result.rows[0];
  }

  public async list(limit = 25): Promise<MaintenanceRow[]> {
    const result = await this.db.query<MaintenanceRow>(
      "SELECT * FROM maintenances ORDER BY starts_at DESC LIMIT $1",
      [limit],
    );
    return result.rows;
  }

  public async scheduledBetween(from: Date, to: Date): Promise<MaintenanceRow[]> {
    const result = await this.db.query<MaintenanceRow>(
      "SELECT * FROM maintenances WHERE status = 'SCHEDULED' AND starts_at BETWEEN $1 AND $2 ORDER BY starts_at",
      [from, to],
    );
    return result.rows;
  }

  public async pendingCompletion(before: Date): Promise<MaintenanceRow[]> {
    const result = await this.db.query<MaintenanceRow>(
      "SELECT * FROM maintenances WHERE status = 'ACTIVE' AND ends_at <= $1",
      [before],
    );
    return result.rows;
  }

  public async setStatus(id: string, status: MaintenanceStatus): Promise<void> {
    await this.db.query("UPDATE maintenances SET status = $2, updated_at = NOW() WHERE id = $1", [
      id,
      status,
    ]);
  }

  public async markStarted(id: string): Promise<void> {
    await this.db.query(
      "UPDATE maintenances SET status = 'ACTIVE', actual_start_at = COALESCE(actual_start_at, NOW()), updated_at = NOW() WHERE id = $1",
      [id],
    );
  }

  public async markFinished(id: string): Promise<void> {
    await this.db.query(
      "UPDATE maintenances SET status = 'COMPLETED', actual_end_at = NOW(), updated_at = NOW() WHERE id = $1",
      [id],
    );
  }

  public async edit(
    id: string,
    patch: Partial<
      Pick<
        MaintenanceRow,
        "title" | "reason" | "description" | "starts_at" | "ends_at" | "notice_message"
      >
    >,
  ): Promise<void> {
    const columns: string[] = [];
    const values: unknown[] = [];
    for (const [key, value] of Object.entries(patch)) {
      if (value === undefined) continue;
      values.push(value);
      columns.push(`${key} = $${values.length}`);
    }
    if (columns.length === 0) return;
    values.push(id);
    await this.db.query(
      `UPDATE maintenances SET ${columns.join(", ")}, updated_at = NOW() WHERE id = $${values.length}`,
      values,
    );
  }

  public async recordNotification(entry: {
    maintenanceId: string;
    type: string;
    leadMinutes: number;
    threadId: string;
    status: "pending" | "sent" | "failed";
    error?: string;
    idempotencyKey: string;
  }): Promise<void> {
    await this.db.query(
      `INSERT INTO maintenance_notifications (maintenance_id, notification_type, lead_time_minutes, thread_id,
                                               status, error, sent_at, idempotency_key)
       VALUES ($1,$2,$3,$4,$5,$6, CASE WHEN $5 = 'sent' THEN NOW() ELSE NULL END, $7)
       ON CONFLICT (maintenance_id, notification_type, lead_time_minutes, thread_id)
       DO UPDATE SET status = EXCLUDED.status, error = EXCLUDED.error,
                     sent_at = CASE WHEN EXCLUDED.status = 'sent' THEN NOW() ELSE maintenance_notifications.sent_at END`,
      [
        entry.maintenanceId,
        entry.type,
        entry.leadMinutes,
        entry.threadId,
        entry.status,
        entry.error ?? null,
        entry.idempotencyKey,
      ],
    );
  }

  public async notifications(maintenanceId: string): Promise<unknown[]> {
    const result = await this.db.query(
      "SELECT notification_type, lead_time_minutes, thread_id, status, error, sent_at FROM maintenance_notifications WHERE maintenance_id = $1 ORDER BY sent_at DESC NULLS LAST",
      [maintenanceId],
    );
    return result.rows;
  }

  public async history(maintenanceId?: string, limit = 50): Promise<unknown[]> {
    const result = await this.db.query(
      `SELECT maintenance_id, action, details, created_at FROM maintenance_history
        WHERE ($1::text IS NULL OR maintenance_id = $1) ORDER BY created_at DESC LIMIT $2`,
      [maintenanceId ?? null, limit],
    );
    return result.rows;
  }

  public async recordHistory(
    maintenanceId: string,
    action: string,
    details: unknown,
  ): Promise<void> {
    await this.db.query(
      "INSERT INTO maintenance_history (maintenance_id, action, details) VALUES ($1, $2, $3::jsonb)",
      [maintenanceId, action, JSON.stringify(details)],
    );
  }
}
