import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { sha256 } from "../../utils/crypto.js";
import type { AppLogger } from "../../logging/logger.js";
import type { TursoClient } from "./client.js";

export class TursoMigrator {
  public constructor(
    private readonly client: TursoClient,
    private readonly logger: AppLogger,
  ) {}

  public async migrate(
    migrationsDirectory = path.resolve(process.cwd(), "database", "turso", "migrations"),
  ): Promise<number> {
    await this.client.batch([
      {
        sql: `CREATE TABLE IF NOT EXISTS schema_migrations (
          filename TEXT PRIMARY KEY,
          checksum TEXT NOT NULL,
          applied_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
        )`,
      },
    ]);
    const files = readdirSync(migrationsDirectory)
      .filter((file) => file.endsWith(".sql"))
      .sort();
    let applied = 0;
    for (const filename of files) {
      const contents = readFileSync(path.join(migrationsDirectory, filename), "utf8");
      const checksum = sha256(contents);
      const existing = await this.client.query(
        "SELECT filename, checksum FROM schema_migrations WHERE filename = ?",
        [filename],
      );
      const previous = existing.rows[0] as { checksum?: string } | undefined;
      if (previous) {
        if (previous.checksum !== checksum) {
          throw new Error(
            `Turso migration ${filename} changed after it was applied. Add a new migration instead.`,
          );
        }
        continue;
      }
      const statements = contents
        .split(";")
        .map((statement) => statement.trim())
        .filter((statement) => statement.length > 0 && !statement.startsWith("--"))
        .map((sql) => ({ sql }));
      await this.client.batch([
        ...statements,
        {
          sql: "INSERT INTO schema_migrations (filename, checksum) VALUES (?, ?)",
          args: [filename, checksum],
        },
      ]);
      applied += 1;
      this.logger.info({ filename }, "Turso migration applied");
    }
    return applied;
  }
}
