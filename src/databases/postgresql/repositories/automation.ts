import type { PostgresClient } from "../client.js";

export class AutomationRepository {
  public constructor(private readonly db: PostgresClient) {}

  public async getSettings(threadId: string): Promise<Record<string, unknown>> {
    await this.db.query(
      "INSERT INTO group_settings (thread_id) VALUES ($1) ON CONFLICT (thread_id) DO NOTHING",
      [threadId],
    );
    const result = await this.db.query<Record<string, unknown>>(
      "SELECT welcome_message, goodbye_message, auto_react_emoji, auto_delete_seconds, announcement_enabled FROM group_settings WHERE thread_id = $1",
      [threadId],
    );
    return result.rows[0]!;
  }

  public async updateSettings(threadId: string, patch: Record<string, unknown>): Promise<void> {
    const allowed = new Set([
      "welcome_message",
      "goodbye_message",
      "auto_react_emoji",
      "auto_delete_seconds",
      "announcement_enabled",
    ]);
    const columns: string[] = [];
    const values: unknown[] = [];
    for (const [key, value] of Object.entries(patch)) {
      if (!allowed.has(key) || value === undefined) continue;
      values.push(value);
      columns.push(`${key} = $${values.length}`);
    }
    if (columns.length === 0) return;
    await this.db.query(
      "INSERT INTO group_settings (thread_id) VALUES ($1) ON CONFLICT (thread_id) DO NOTHING",
      [threadId],
    );
    values.push(threadId);
    await this.db.query(
      `UPDATE group_settings SET ${columns.join(", ")}, updated_at = NOW() WHERE thread_id = $${values.length}`,
      values,
    );
  }

  public async addResponse(input: {
    threadId: string;
    trigger: string;
    response: string;
    matchMode?: string;
    actor: string;
  }): Promise<void> {
    await this.db.query(
      `INSERT INTO auto_responses (thread_id, trigger_text, response_text, match_mode, created_by)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (thread_id, trigger_text) DO UPDATE
         SET response_text = EXCLUDED.response_text, match_mode = EXCLUDED.match_mode, active = TRUE`,
      [input.threadId, input.trigger, input.response, input.matchMode ?? "exact", input.actor],
    );
  }

  public async removeResponse(threadId: string, trigger: string): Promise<boolean> {
    const result = await this.db.query(
      "DELETE FROM auto_responses WHERE thread_id = $1 AND trigger_text = $2",
      [threadId, trigger],
    );
    return (result.rowCount ?? 0) > 0;
  }

  public async responses(threadId: string): Promise<unknown[]> {
    const result = await this.db.query(
      "SELECT id, trigger_text, response_text, match_mode, active FROM auto_responses WHERE thread_id = $1 ORDER BY trigger_text",
      [threadId],
    );
    return result.rows;
  }

  public async matchingResponses(threadId: string, message: string): Promise<unknown[]> {
    const result = await this.db.query<{
      response_text: string;
      match_mode: string;
      trigger_text: string;
    }>(
      "SELECT response_text, match_mode, trigger_text FROM auto_responses WHERE thread_id = $1 AND active = TRUE",
      [threadId],
    );
    const lower = message.toLowerCase();
    return result.rows.filter((row) => {
      const trigger = row.trigger_text.toLowerCase();
      if (row.match_mode === "contains") return lower.includes(trigger);
      if (row.match_mode === "prefix") return lower.startsWith(trigger);
      return lower === trigger;
    });
  }

  public async addTrigger(threadId: string, keyword: string, response: string): Promise<void> {
    await this.db.query(
      `INSERT INTO keyword_triggers (thread_id, keyword, response_text) VALUES ($1,$2,$3)
       ON CONFLICT (thread_id, keyword) DO UPDATE SET response_text = EXCLUDED.response_text, active = TRUE`,
      [threadId, keyword.toLowerCase(), response],
    );
  }

  public async removeTrigger(threadId: string, keyword: string): Promise<boolean> {
    const result = await this.db.query(
      "DELETE FROM keyword_triggers WHERE thread_id = $1 AND keyword = $2",
      [threadId, keyword.toLowerCase()],
    );
    return (result.rowCount ?? 0) > 0;
  }

  public async triggers(threadId: string): Promise<unknown[]> {
    const result = await this.db.query(
      "SELECT id, keyword, response_text, active FROM keyword_triggers WHERE thread_id = $1 ORDER BY keyword",
      [threadId],
    );
    return result.rows;
  }

  public async recordRun(threadId: string, kind: string, details: unknown): Promise<void> {
    await this.db.query(
      "INSERT INTO automation_runs (thread_id, kind, details) VALUES ($1, $2, $3::jsonb)",
      [threadId, kind, JSON.stringify(details)],
    );
  }
}
