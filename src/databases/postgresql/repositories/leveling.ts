import type { PostgresClient } from "../client.js";

export interface LevelRow {
  user_id: number;
  xp: string;
  total_xp: string;
  level: number;
}

export function levelFromXp(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1);
}

export class LevelingRepository {
  public constructor(private readonly db: PostgresClient) {}

  public async get(userId: number): Promise<LevelRow> {
    const result = await this.db.query<LevelRow>(
      `INSERT INTO user_levels (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING
       RETURNING user_id, xp, total_xp, level`,
      [userId],
    );
    if (result.rows[0]) return result.rows[0];
    const existing = await this.db.query<LevelRow>(
      "SELECT user_id, xp, total_xp, level FROM user_levels WHERE user_id = $1",
      [userId],
    );
    return existing.rows[0]!;
  }

  public async addXp(userId: number, amount: number): Promise<LevelRow> {
    return this.db.transaction(async (connection) => {
      await connection.query("SELECT pg_advisory_xact_lock($1)", [userId]);
      const current = await this.get(userId);
      const xp = Number(current.xp) + amount;
      const level = levelFromXp(xp);
      await connection.query(
        "UPDATE user_levels SET xp = $2, total_xp = total_xp + $3, level = $4, updated_at = NOW() WHERE user_id = $1",
        [userId, xp, Math.max(amount, 0), level],
      );
      return {
        ...current,
        xp: String(xp),
        total_xp: String(Number(current.total_xp) + Math.max(amount, 0)),
        level,
      };
    });
  }

  public async setXp(userId: number, xp: number): Promise<void> {
    await this.db.query(
      "UPDATE user_levels SET xp = $2, level = $3, updated_at = NOW() WHERE user_id = $1",
      [userId, xp, levelFromXp(xp)],
    );
  }

  public async top(limit = 10): Promise<unknown[]> {
    const result = await this.db.query(
      `SELECT u.facebook_id, l.xp, l.level FROM user_levels l
        JOIN bot_users u ON u.id = l.user_id ORDER BY l.xp DESC LIMIT $1`,
      [limit],
    );
    return result.rows;
  }

  public async addBoost(userId: number, multiplier: number, expiresAt: Date): Promise<void> {
    await this.db.query(
      "INSERT INTO xp_boosts (user_id, multiplier, expires_at) VALUES ($1, $2, $3)",
      [userId, multiplier, expiresAt],
    );
  }

  public async removeBoosts(userId: number): Promise<number> {
    const result = await this.db.query("DELETE FROM xp_boosts WHERE user_id = $1", [userId]);
    return result.rowCount ?? 0;
  }
}
