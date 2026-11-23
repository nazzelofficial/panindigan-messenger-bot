import type { PostgresClient } from "../client.js";

export class ModerationRepository {
  public constructor(private readonly db: PostgresClient) {}

  public async addWarning(input: {
    groupId?: number;
    userFacebookId: string;
    moderatorFacebookId: string;
    reason: string;
  }): Promise<void> {
    await this.db.query(
      "INSERT INTO warnings (group_id, user_facebook_id, moderator_facebook_id, reason) VALUES ($1, $2, $3, $4)",
      [input.groupId ?? null, input.userFacebookId, input.moderatorFacebookId, input.reason],
    );
  }

  public async warnings(userFacebookId: string, groupId?: number): Promise<unknown[]> {
    const result = await this.db.query(
      `SELECT id, reason, moderator_facebook_id, created_at FROM warnings
        WHERE user_facebook_id = $1 AND active = TRUE AND ($2::bigint IS NULL OR group_id = $2)
       ORDER BY created_at DESC`,
      [userFacebookId, groupId ?? null],
    );
    return result.rows;
  }

  public async clearWarnings(userFacebookId: string, groupId?: number): Promise<number> {
    const result = await this.db.query(
      `UPDATE warnings SET active = FALSE WHERE user_facebook_id = $1 AND active = TRUE
        AND ($2::bigint IS NULL OR group_id = $2)`,
      [userFacebookId, groupId ?? null],
    );
    return result.rowCount ?? 0;
  }

  public async recordAction(input: {
    groupId?: number;
    actionType: string;
    targetFacebookId: string;
    actorFacebookId: string;
    reason?: string;
    metadata?: unknown;
  }): Promise<void> {
    await this.db.query(
      `INSERT INTO moderation_actions (group_id, action_type, target_facebook_id, actor_facebook_id, reason, metadata)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
      [
        input.groupId ?? null,
        input.actionType,
        input.targetFacebookId,
        input.actorFacebookId,
        input.reason ?? "",
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  }

  public async addReport(input: {
    groupId?: number;
    reporter: string;
    target: string;
    reason: string;
  }): Promise<number> {
    const result = await this.db.query<{ id: string }>(
      `INSERT INTO reports (group_id, reporter_facebook_id, target_facebook_id, reason)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [input.groupId ?? null, input.reporter, input.target, input.reason],
    );
    return Number(result.rows[0]!.id);
  }

  public async reports(status = "open"): Promise<unknown[]> {
    const result = await this.db.query(
      "SELECT id, reporter_facebook_id, target_facebook_id, reason, status, created_at FROM reports WHERE status = $1 ORDER BY created_at DESC",
      [status],
    );
    return result.rows;
  }

  public async resolveReport(id: number, status: string): Promise<boolean> {
    const result = await this.db.query(
      "UPDATE reports SET status = $2, updated_at = NOW() WHERE id = $1",
      [id, status],
    );
    return (result.rowCount ?? 0) > 0;
  }

  public async mute(input: {
    groupId: number;
    userFacebookId: string;
    expiresAt: Date | null;
    actor: string;
  }): Promise<void> {
    await this.db.query(
      `INSERT INTO mutes (group_id, user_facebook_id, expires_at, created_by)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (group_id, user_facebook_id) DO UPDATE
         SET expires_at = EXCLUDED.expires_at, active = TRUE, created_by = EXCLUDED.created_by`,
      [input.groupId, input.userFacebookId, input.expiresAt, input.actor],
    );
  }

  public async unmute(groupId: number, userFacebookId: string): Promise<void> {
    await this.db.query(
      "UPDATE mutes SET active = FALSE WHERE group_id = $1 AND user_facebook_id = $2",
      [groupId, userFacebookId],
    );
  }

  public async isMuted(groupId: number, userFacebookId: string): Promise<boolean> {
    const result = await this.db.query<{ active: boolean }>(
      `SELECT active FROM mutes WHERE group_id = $1 AND user_facebook_id = $2
        AND active = TRUE AND (expires_at IS NULL OR expires_at > NOW())`,
      [groupId, userFacebookId],
    );
    return result.rows.length > 0;
  }

  public async addBlacklist(
    scope: "user" | "group",
    value: string,
    reason: string,
    actor: string,
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO blacklist (scope, value, reason, created_by) VALUES ($1, $2, $3, $4)
       ON CONFLICT (scope, value) DO UPDATE SET reason = EXCLUDED.reason, created_by = EXCLUDED.created_by`,
      [scope, value, reason, actor],
    );
  }

  public async removeBlacklist(scope: "user" | "group", value: string): Promise<boolean> {
    const result = await this.db.query("DELETE FROM blacklist WHERE scope = $1 AND value = $2", [
      scope,
      value,
    ]);
    return (result.rowCount ?? 0) > 0;
  }

  public async blacklist(scope?: "user" | "group"): Promise<unknown[]> {
    const result = await this.db.query(
      "SELECT scope, value, reason, created_by, created_at FROM blacklist WHERE ($1::text IS NULL OR scope = $1) ORDER BY created_at DESC",
      [scope ?? null],
    );
    return result.rows;
  }

  public async addFilter(
    groupId: number,
    word: string,
    action: string,
    actor: string,
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO word_filters (group_id, word, action, created_by) VALUES ($1, $2, $3, $4)
       ON CONFLICT (group_id, word) DO UPDATE SET action = EXCLUDED.action, created_by = EXCLUDED.created_by`,
      [groupId, word.toLowerCase(), action, actor],
    );
  }

  public async removeFilter(groupId: number, word: string): Promise<boolean> {
    const result = await this.db.query(
      "DELETE FROM word_filters WHERE group_id = $1 AND word = $2",
      [groupId, word.toLowerCase()],
    );
    return (result.rowCount ?? 0) > 0;
  }

  public async filters(groupId: number): Promise<unknown[]> {
    const result = await this.db.query(
      "SELECT id, word, action FROM word_filters WHERE group_id = $1 ORDER BY word",
      [groupId],
    );
    return result.rows;
  }

  public async logHistory(groupId?: number, limit = 50): Promise<unknown[]> {
    const result = await this.db.query(
      `SELECT action_type, target_facebook_id, actor_facebook_id, reason, created_at FROM moderation_actions
        WHERE ($1::bigint IS NULL OR group_id = $1) ORDER BY created_at DESC LIMIT $2`,
      [groupId ?? null, limit],
    );
    return result.rows;
  }
}
