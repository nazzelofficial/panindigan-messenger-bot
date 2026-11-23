import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadConfiguration } from "../src/config/index.js";
import { DatabaseManager } from "../src/databases/index.js";
import { PostgresMigrator } from "../src/databases/postgresql/migrations.js";
import { createLogger } from "../src/logging/logger.js";

interface BackupMetadata {
  readonly createdAt: string;
  readonly environment: string;
  readonly included: readonly string[];
  readonly redis: string;
}

/** JSON cannot represent BigInt, Date or binary values returned by drivers. */
function jsonReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Uint8Array) return Buffer.from(value).toString("base64");
  return value;
}

function writeJson(directory: string, filename: string, value: unknown): void {
  writeFileSync(
    path.join(directory, filename),
    `${JSON.stringify(value, jsonReplacer, 2)}\n`,
    "utf8",
  );
}

function isTableName(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) && !name.startsWith("sqlite_");
}

async function exportTurso(databases: DatabaseManager): Promise<Record<string, unknown[]>> {
  const turso = databases.bundle.turso;
  if (!turso) return {};
  const tables = await turso.query("SELECT name FROM sqlite_master WHERE type = 'table'");
  const snapshot: Record<string, unknown[]> = {};
  for (const row of tables.rows) {
    const name = String(row.name ?? "");
    if (!isTableName(name)) continue;
    const result = await turso.query(`SELECT * FROM "${name}"`);
    snapshot[name] = result.rows;
  }
  return snapshot;
}

async function exportMongo(databases: DatabaseManager): Promise<Record<string, unknown[]>> {
  const mongodb = databases.bundle.mongodb;
  if (!mongodb) return {};
  const db = mongodb.database();
  const collections = await db.listCollections().toArray();
  const snapshot: Record<string, unknown[]> = {};
  for (const info of collections) {
    if (!isTableName(info.name)) continue;
    snapshot[info.name] = await db.collection(info.name).find({}).toArray();
  }
  return snapshot;
}

async function main(): Promise<void> {
  const { config, secrets, warnings } = loadConfiguration();
  const logger = createLogger(config);
  for (const warning of warnings) logger.warn(warning);

  const databases = new DatabaseManager(config, secrets, logger);
  await databases.initialize();
  try {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const directory = path.resolve(process.cwd(), "backups", stamp);
    mkdirSync(directory, { recursive: true });

    const included: string[] = [];

    if (databases.bundle.postgres) {
      const snapshot = await new PostgresMigrator(
        databases.bundle.postgres,
        logger,
      ).exportSnapshot();
      writeJson(directory, "postgresql.json", snapshot);
      included.push(`postgresql: ${Object.keys(snapshot).length} tables`);
    }

    if (databases.bundle.turso) {
      const snapshot = await exportTurso(databases);
      writeJson(directory, "turso.json", snapshot);
      included.push(`turso: ${Object.keys(snapshot).length} tables`);
    }

    if (databases.bundle.mongodb) {
      const snapshot = await exportMongo(databases);
      writeJson(directory, "mongodb.json", snapshot);
      included.push(`mongodb: ${Object.keys(snapshot).length} collections`);
    }

    const metadata: BackupMetadata = {
      createdAt: new Date().toISOString(),
      environment: config.application.environment,
      included,
      redis:
        "not backed up: keys are temporary cooldowns, locks, dedupe, cache and rate-limit state",
    };
    writeJson(directory, "metadata.json", metadata);

    console.log(`Backup written to ${directory}`);
    for (const item of included) console.log(`  ${item}`);
    console.log("  redis: intentionally skipped (temporary state)");
  } finally {
    await databases.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
