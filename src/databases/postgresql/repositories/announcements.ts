import type { PostgresClient } from "../client.js";

export interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  announcement_type: string;
  priority: string;
  created_by: string;
  created_at: Date;
  scheduled_for: Date | null;
  status: string;
  total_targets: number;
  successful_deliveries: number;
  failed_deliveries: number;
}

export class AnnouncementRepository {
  public constructor(private readonly db: PostgresClient) {}

  public async create(input: {
    id: string;
    title: string;
    body: string;
    type: string;
    priority: string;
    createdBy: string;
    scheduledFor?: Date;
  }): Promise<AnnouncementRow> {
    const status = input.scheduledFor ? "scheduled" : "draft";
    const result = await this.db.query<AnnouncementRow>(
      `INSERT INTO announcements (id, title, body, announcement_type, priority, created_by, scheduled_for, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [
        input.id,
        input.title,
        input.body,
        input.type,
        input.priority,
        input.createdBy,
        input.scheduledFor ?? null,
        status,
      ],
    );
    return result.rows[0]!;
  }

  public async find(id: string): Promise<AnnouncementRow | undefined> {
    const result = await this.db.query<AnnouncementRow>(
      "SELECT * FROM announcements WHERE id = $1",
      [id],
    );
    return result.rows[0];
  }

  public async list(limit = 25): Promise<AnnouncementRow[]> {
    const result = await this.db.query<AnnouncementRow>(
      "SELECT * FROM announcements ORDER BY created_at DESC LIMIT $1",
      [limit],
    );
    return result.rows;
  }

  public async due(before: Date): Promise<AnnouncementRow[]> {
    const result = await this.db.query<AnnouncementRow>(
      "SELECT * FROM announcements WHERE status = 'scheduled' AND scheduled_for <= $1",
      [before],
    );
    return result.rows;
  }

  public async setStatus(id: string, status: string): Promise<void> {
    await this.db.query("UPDATE announcements SET status = $2 WHERE id = $1", [id, status]);
  }

  public async confirm(id: string): Promise<void> {
    await this.db.query(
      "UPDATE announcements SET confirmed_at = NOW(), status = 'delivering' WHERE id = $1",
      [id],
    );
  }

  public async setTargets(id: string, count: number): Promise<void> {
    await this.db.query("UPDATE announcements SET total_targets = $2 WHERE id = $1", [id, count]);
  }

  public async addDelivery(entry: {
    announcementId: string;
    threadId: string;
    idempotencyKey: string;
  }): Promise<boolean> {
    const result = await this.db.query(
      `INSERT INTO announcement_deliveries (announcement_id, thread_id, idempotency_key)
       VALUES ($1, $2, $3) ON CONFLICT (announcement_id, thread_id) DO NOTHING`,
      [entry.announcementId, entry.threadId, entry.idempotencyKey],
    );
    return (result.rowCount ?? 0) > 0;
  }

  public async pendingDeliveries(
    announcementId: string,
  ): Promise<Array<{ id: string; thread_id: string; attempts: number }>> {
    const result = await this.db.query<{ id: string; thread_id: string; attempts: number }>(
      "SELECT id, thread_id, attempts FROM announcement_deliveries WHERE announcement_id = $1 AND status = 'pending'",
      [announcementId],
    );
    return result.rows;
  }

  public async markDeliveryByKey(
    idempotencyKey: string,
    status: "sent" | "failed" | "skipped",
    error?: string,
  ): Promise<void> {
    await this.db.query(
      `UPDATE announcement_deliveries
          SET status = $2, error = $3, attempts = attempts + 1,
              sent_at = CASE WHEN $2 = 'sent' THEN NOW() ELSE sent_at END
        WHERE idempotency_key = $1`,
      [idempotencyKey, status, error ?? null],
    );
  }

  public async markDelivery(
    id: number,
    status: "sent" | "failed" | "skipped",
    error?: string,
  ): Promise<void> {
    await this.db.query(
      "UPDATE announcement_deliveries SET status = $2, error = $3, attempts = attempts + 1, sent_at = CASE WHEN $2 = 'sent' THEN NOW() ELSE sent_at END WHERE id = $4",
      [status, error ?? null, id],
    );
  }

  public async refreshSummary(id: string): Promise<void> {
    await this.db.query(
      `UPDATE announcements SET
         successful_deliveries = (SELECT COUNT(*)::int FROM announcement_deliveries WHERE announcement_id = $1 AND status = 'sent'),
         failed_deliveries = (SELECT COUNT(*)::int FROM announcement_deliveries WHERE announcement_id = $1 AND status = 'failed')
       WHERE id = $1`,
      [id],
    );
  }

  public async deliveries(id: string): Promise<unknown[]> {
    const result = await this.db.query(
      "SELECT thread_id, status, attempts, error, sent_at FROM announcement_deliveries WHERE announcement_id = $1 ORDER BY thread_id",
      [id],
    );
    return result.rows;
  }
}
