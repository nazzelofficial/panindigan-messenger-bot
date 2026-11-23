import { FileStorage, type StorageAdapter } from "panindigan-automate";
import path from "node:path";
import type { AppLogger } from "../logging/logger.js";
import type { DatabaseBundle } from "../databases/index.js";

/**
 * Durable session storage for the Messenger client.
 *
 * The library persists the authenticated cookie jar (the refreshed AppState)
 * through a StorageAdapter. The default file adapter writes under `data/session`
 * — fine on a machine with a disk, but LOST on ephemeral hosts (Render/Fly)
 * every time the container restarts, which logs the account out and forces a
 * manual AppState re-export.
 *
 * This adapter stores the same session document in the managed Turso database
 * (durable, off-container) using its recovery key-value table, and keeps the
 * file adapter as a read fallback / write mirror. If Turso is unavailable it
 * degrades to the file adapter rather than breaking login.
 */
export class DurableSessionStorage implements StorageAdapter {
  readonly #file: FileStorage;
  readonly #turso: NonNullable<DatabaseBundle["turso"]> | undefined;
  readonly #logger: AppLogger | undefined;
  static readonly PREFIX = "session:";

  constructor(directory: string, bundle: DatabaseBundle, logger?: AppLogger) {
    this.#file = new FileStorage(directory, null);
    this.#turso = bundle.turso;
    this.#logger = logger;
  }

  get durable(): boolean {
    return this.#turso !== undefined;
  }

  async get<T>(key: string): Promise<T | null> {
    // Prefer the durable copy: it survives container restarts and power loss.
    if (this.#turso !== undefined) {
      try {
        const result = await this.#turso.query(
          "SELECT value FROM recovery_metadata WHERE key = ?",
          [`${DurableSessionStorage.PREFIX}${key}`],
        );
        const raw = result.rows[0]?.value;
        if (typeof raw === "string" && raw !== "") return JSON.parse(raw) as T;
      } catch (error) {
        this.#logger?.warn({ err: error instanceof Error ? error.message : String(error), key }, "Durable session read failed; falling back to file");
      }
    }
    return this.#file.get<T>(key);
  }

  async set(key: string, value: unknown): Promise<void> {
    // Always write the file mirror first (fast, and works without Turso).
    await this.#file.set(key, value);
    if (this.#turso !== undefined) {
      try {
        await this.#turso.query(
          `INSERT INTO recovery_metadata (key, value) VALUES (?, ?)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`,
          [`${DurableSessionStorage.PREFIX}${key}`, JSON.stringify(value)],
        );
      } catch (error) {
        this.#logger?.warn({ err: error instanceof Error ? error.message : String(error), key }, "Durable session write failed; file mirror retained");
      }
    }
  }

  async delete(key: string): Promise<void> {
    await this.#file.delete(key);
    if (this.#turso !== undefined) {
      try {
        await this.#turso.query("DELETE FROM recovery_metadata WHERE key = ?", [`${DurableSessionStorage.PREFIX}${key}`]);
      } catch {
        // best-effort
      }
    }
  }

  async keys(): Promise<readonly string[]> {
    const fromFile = await this.#file.keys();
    if (this.#turso === undefined) return fromFile;
    try {
      const result = await this.#turso.query(
        "SELECT key FROM recovery_metadata WHERE key LIKE ?",
        [`${DurableSessionStorage.PREFIX}%`],
      );
      const fromDb = (result.rows as Array<{ key: string }>).map((row) =>
        String(row.key).slice(DurableSessionStorage.PREFIX.length),
      );
      return [...new Set([...fromFile, ...fromDb])].sort();
    } catch {
      return fromFile;
    }
  }

  async clear(): Promise<void> {
    await this.#file.clear();
    if (this.#turso !== undefined) {
      try {
        await this.#turso.query("DELETE FROM recovery_metadata WHERE key LIKE ?", [`${DurableSessionStorage.PREFIX}%`]);
      } catch {
        // best-effort
      }
    }
  }
}
