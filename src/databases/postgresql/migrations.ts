import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { sha256 } from "../../utils/crypto.js";
import type { AppLogger } from "../../logging/logger.js";
import type { PostgresClient } from "./client.js";

interface AppliedMigration {
  filename: string;
  checksum: string;
}

const TRACKING_TABLE = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename TEXT PRIMARY KEY,
  checksum TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

export class PostgresMigrator {
  public constructor(
    private readonly client: PostgresClient,
    private readonly logger: AppLogger,
  ) {}

  public async migrate(
    migrationsDirectory = path.resolve(process.cwd(), "database", "postgresql", "migrations"),
  ): Promise<number> {
    await this.client.query(TRACKING_TABLE);
    const files = readdirSync(migrationsDirectory)
      .filter((file) => file.endsWith(".sql"))
      .sort();
    let applied = 0;
    for (const filename of files) {
      const contents = readFileSync(path.join(migrationsDirectory, filename), "utf8");
      const checksum = sha256(contents);
      const existing = await this.client.query<AppliedMigration>(
        "SELECT filename, checksum FROM schema_migrations WHERE filename = $1",
        [filename],
      );
      const previous = existing.rows[0];
      if (previous) {
        if (previous.checksum !== checksum) {
          throw new Error(
            `Migration ${filename} changed after it was applied. Create a new migration instead of editing history.`,
          );
        }
        continue;
      }
      await this.client.transaction(async (connection) => {
        await connection.query(contents);
        await connection.query(
          "INSERT INTO schema_migrations (filename, checksum) VALUES ($1, $2)",
          [filename, checksum],
        );
      });
      applied += 1;
      this.logger.info({ filename }, "PostgreSQL migration applied");
    }
    return applied;
  }

  /** Exports every application table as JSON for a tool-independent backup. */
  public async exportSnapshot(): Promise<Record<string, unknown[]>> {
    const tables = await this.client.query<{ tablename: string }>(
      "SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename <> 'schema_migrations' ORDER BY tablename",
    );
    const snapshot: Record<string, unknown[]> = {};
    for (const { tablename } of tables.rows) {
      const result = await this.client.query(`SELECT * FROM "${tablename}"`);
      snapshot[tablename] = result.rows;
    }
    return snapshot;
  }
}
