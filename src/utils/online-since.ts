import type { DatabaseBundle } from "../databases/index.js";

/** Key under which the durable "first seen online" timestamp is stored. */
const ONLINE_SINCE_KEY = "bot:online_since";

/**
 * Returns the timestamp (epoch ms) of the first time this deployment was seen
 * online, persisted in Turso so it survives process restarts and container
 * redeploys. Falls back to the current process start when Turso is unavailable
 * or has no recorded value yet. This gives `!uptime` a true continuous-online
 * figure rather than the process uptime that resets to zero on every restart.
 */
export async function getOnlineSince(databases: DatabaseBundle): Promise<number> {
  if (databases.turso !== undefined) {
    try {
      await databases.turso.query(
        `INSERT INTO recovery_metadata (key, value) VALUES (?, ?)
         ON CONFLICT(key) DO NOTHING`,
        [ONLINE_SINCE_KEY, String(Date.now())],
      );
      const result = await databases.turso.query(
        "SELECT value FROM recovery_metadata WHERE key = ?",
        [ONLINE_SINCE_KEY],
      );
      const raw = result.rows[0]?.value;
      const parsed = typeof raw === "string" ? Number(raw) : Number.NaN;
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    } catch {
      // fall through to process start
    }
  }
  return Date.now() - Math.floor(process.uptime() * 1000);
}
