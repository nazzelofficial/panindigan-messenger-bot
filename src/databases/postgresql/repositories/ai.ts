import type { PostgresClient } from "../client.js";

export class AiRepository {
  public constructor(private readonly db: PostgresClient) {}

  public async recordUsage(entry: {
    userId: number;
    level: string;
    provider: string;
    model: string;
    inputTokens?: number;
    outputTokens?: number;
    usageMetadata?: unknown;
    coinCharge: number;
    refundStatus: string;
    success: boolean;
    failureReason?: string;
    durationMs: number;
    idempotencyKey: string;
  }): Promise<void> {
    await this.db.query(
      `INSERT INTO ai_usage (user_id, command_level, provider, model, input_tokens, output_tokens,
                             usage_metadata, coin_charge, refund_status, success, failure_reason,
                             duration_ms, idempotency_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (idempotency_key) DO NOTHING`,
      [
        entry.userId,
        entry.level,
        entry.provider,
        entry.model,
        entry.inputTokens ?? null,
        entry.outputTokens ?? null,
        JSON.stringify(entry.usageMetadata ?? {}),
        entry.coinCharge,
        entry.refundStatus,
        entry.success,
        entry.failureReason ?? null,
        entry.durationMs,
        entry.idempotencyKey,
      ],
    );
  }

  public async countInPeriod(userId: number, level: string, periodStart: Date): Promise<number> {
    const result = await this.db.query<{ request_count: string }>(
      "SELECT request_count FROM ai_request_quotas WHERE user_id = $1 AND command_level = $2 AND period_start = $3",
      [userId, level, periodStart],
    );
    return Number(result.rows[0]?.request_count ?? 0);
  }

  public async incrementQuota(userId: number, level: string, periodStart: Date): Promise<number> {
    const result = await this.db.query<{ request_count: string }>(
      `INSERT INTO ai_request_quotas (user_id, command_level, period_start, request_count)
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (user_id, command_level, period_start)
       DO UPDATE SET request_count = ai_request_quotas.request_count + 1
       RETURNING request_count`,
      [userId, level, periodStart],
    );
    return Number(result.rows[0]!.request_count);
  }

  public async usage(userId: number, limit = 10): Promise<unknown[]> {
    const result = await this.db.query(
      `SELECT command_level, provider, model, coin_charge, refund_status, success, duration_ms, created_at
        FROM ai_usage WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2`,
      [userId, limit],
    );
    return result.rows;
  }

  public async topUsers(limit = 10): Promise<unknown[]> {
    const result = await this.db.query(
      `SELECT u.facebook_id, COUNT(*)::int AS requests, SUM(a.coin_charge)::bigint AS coins_spent
        FROM ai_usage a JOIN bot_users u ON u.id = a.user_id
       GROUP BY u.facebook_id ORDER BY requests DESC LIMIT $1`,
      [limit],
    );
    return result.rows;
  }

  public async totalSpent(userId: number): Promise<number> {
    const result = await this.db.query<{ total: string }>(
      "SELECT COALESCE(SUM(coin_charge), 0)::text AS total FROM ai_usage WHERE user_id = $1 AND refund_status <> 'full'",
      [userId],
    );
    return Number(result.rows[0]!.total);
  }

  public async addFeedback(
    usageId: number,
    userId: number,
    rating: number,
    comment: string,
  ): Promise<void> {
    await this.db.query(
      "INSERT INTO ai_feedback (usage_id, user_id, rating, comment) VALUES ($1, $2, $3, $4)",
      [usageId, userId, rating, comment],
    );
  }

  public async lastUsageId(userId: number): Promise<number | undefined> {
    const result = await this.db.query<{ id: string }>(
      "SELECT id FROM ai_usage WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1",
      [userId],
    );
    return result.rows[0] ? Number(result.rows[0].id) : undefined;
  }

  public async requestCancellation(key: string, userId: number): Promise<void> {
    await this.db.query(
      "INSERT INTO ai_cancellations (request_key, user_id) VALUES ($1, $2) ON CONFLICT (request_key) DO NOTHING",
      [key, userId],
    );
  }

  public async isCancelled(key: string): Promise<boolean> {
    const result = await this.db.query("SELECT 1 FROM ai_cancellations WHERE request_key = $1", [
      key,
    ]);
    return (result.rowCount ?? 0) > 0;
  }
}
