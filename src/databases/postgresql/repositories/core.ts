import type { PostgresClient } from "../client.js";

export interface UserRow {
  id: number;
  facebook_id: string;
  display_name: string | null;
  locale: string;
  is_owner: boolean;
  is_admin: boolean;
}

export interface GroupRow {
  id: number;
  thread_id: string;
  name: string | null;
  is_group: boolean;
  is_active: boolean;
  participant_count: number;
  last_seen_at?: Date | null;
}

export class UserRepository {
  public constructor(private readonly db: PostgresClient) {}

  public async upsert(facebookId: string, displayName?: string): Promise<UserRow> {
    const result = await this.db.query<UserRow>(
      `INSERT INTO bot_users (facebook_id, display_name)
       VALUES ($1, $2)
       ON CONFLICT (facebook_id) DO UPDATE
         SET display_name = COALESCE(EXCLUDED.display_name, bot_users.display_name),
             updated_at = NOW()
       RETURNING id, facebook_id, display_name, locale, is_owner, is_admin`,
      [facebookId, displayName ?? null],
    );
    return result.rows[0]!;
  }

  public async find(facebookId: string): Promise<UserRow | undefined> {
    const result = await this.db.query<UserRow>(
      "SELECT id, facebook_id, display_name, locale, is_owner, is_admin FROM bot_users WHERE facebook_id = $1",
      [facebookId],
    );
    return result.rows[0];
  }

  public async setRole(facebookId: string, role: "owner" | "admin", value: boolean): Promise<void> {
    const column = role === "owner" ? "is_owner" : "is_admin";
    await this.db.query(
      `UPDATE bot_users SET ${column} = $1, updated_at = NOW() WHERE facebook_id = $2`,
      [value, facebookId],
    );
  }

  public async listByRole(role: "owner" | "admin"): Promise<string[]> {
    const column = role === "owner" ? "is_owner" : "is_admin";
    const result = await this.db.query<{ facebook_id: string }>(
      `SELECT facebook_id FROM bot_users WHERE ${column} = TRUE ORDER BY facebook_id`,
    );
    return result.rows.map((row) => row.facebook_id);
  }

  public async setPreference(userId: number, key: string, value: unknown): Promise<void> {
    await this.db.query(
      `INSERT INTO user_preferences (user_id, preference_key, value) VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (user_id, preference_key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [userId, key, JSON.stringify(value)],
    );
  }

  public async getPreference<T>(userId: number, key: string): Promise<T | undefined> {
    const result = await this.db.query<{ value: T }>(
      "SELECT value FROM user_preferences WHERE user_id = $1 AND preference_key = $2",
      [userId, key],
    );
    return result.rows[0]?.value;
  }
}

export class GroupRepository {
  public constructor(private readonly db: PostgresClient) {}

  public async upsert(
    threadId: string,
    details: { name?: string | null; isGroup?: boolean; participantCount?: number } = {},
  ): Promise<GroupRow> {
    const result = await this.db.query<GroupRow>(
      `INSERT INTO messenger_groups (thread_id, name, is_group, participant_count, last_seen_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (thread_id) DO UPDATE
         SET name = COALESCE(EXCLUDED.name, messenger_groups.name),
             is_group = EXCLUDED.is_group,
             participant_count = EXCLUDED.participant_count,
             is_active = TRUE,
             last_seen_at = NOW(),
             updated_at = NOW()
       RETURNING id, thread_id, name, is_group, is_active, participant_count`,
      [threadId, details.name ?? null, details.isGroup ?? true, details.participantCount ?? 0],
    );
    return result.rows[0]!;
  }

  public async listActive(): Promise<GroupRow[]> {
    const result = await this.db.query<GroupRow>(
      "SELECT id, thread_id, name, is_group, is_active, participant_count, last_seen_at FROM messenger_groups WHERE is_active = TRUE ORDER BY thread_id",
    );
    return result.rows;
  }

  public async find(threadId: string): Promise<GroupRow | undefined> {
    const result = await this.db.query<GroupRow>(
      "SELECT id, thread_id, name, is_group, is_active, participant_count FROM messenger_groups WHERE thread_id = $1",
      [threadId],
    );
    return result.rows[0];
  }

  public async setActive(threadId: string, active: boolean): Promise<void> {
    await this.db.query(
      "UPDATE messenger_groups SET is_active = $1, updated_at = NOW() WHERE thread_id = $2",
      [active, threadId],
    );
  }
}

export class AuditRepository {
  public constructor(private readonly db: PostgresClient) {}

  public async record(entry: {
    actorFacebookId?: string;
    action: string;
    targetType: string;
    targetId: string;
    details?: unknown;
    severity?: "info" | "warning" | "critical";
  }): Promise<void> {
    await this.db.query(
      `INSERT INTO audit_logs (actor_facebook_id, action, target_type, target_id, details, severity)
       VALUES ($1, $2, $3, $4, $5::jsonb, $6)`,
      [
        entry.actorFacebookId ?? null,
        entry.action,
        entry.targetType,
        entry.targetId,
        JSON.stringify(entry.details ?? {}),
        entry.severity ?? "info",
      ],
    );
  }

  public async recent(limit = 50): Promise<unknown[]> {
    const result = await this.db.query(
      "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT $1",
      [limit],
    );
    return result.rows;
  }
}
