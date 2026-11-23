import "dotenv/config";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import type { Db, Document, AnyBulkWriteOperation } from "mongodb";
import { ObjectId } from "mongodb";
import { loadConfiguration } from "../src/config/index.js";
import { DatabaseManager } from "../src/databases/index.js";
import type { PostgresClient } from "../src/databases/postgresql/client.js";
import type { TursoClient } from "../src/databases/turso/client.js";
import { createLogger } from "../src/logging/logger.js";

/**
 * Restores one backup directory. Overwrites are upserts keyed by primary key,
 * so re-running a restore is safe, but the explicit --confirm flag is required
 * to make an accidental invocation impossible.
 */

const args = process.argv.slice(2);
const hasConfirm = args.includes("--confirm");
const positional = args.filter((arg) => arg !== "--confirm");

if (positional.length !== 1 || !hasConfirm) {
  console.error("Usage: pnpm restore <backup-directory> --confirm");
  console.error("The --confirm flag is required; restore upserts rows over existing data.");
  process.exit(1);
}

const backupDirectory = path.resolve(process.cwd(), positional[0]!);
if (!existsSync(backupDirectory) || !statSync(backupDirectory).isDirectory()) {
  console.error(`Backup directory does not exist: ${backupDirectory}`);
  process.exit(1);
}

function readJson(filename: string): Record<string, unknown[]> | undefined {
  const file = path.join(backupDirectory, filename);
  if (!existsSync(file)) return undefined;
  return JSON.parse(readFileSync(file, "utf8")) as Record<string, unknown[]>;
}

function quoteIdentifier(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function isTableName(name: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(name) && !name.startsWith("sqlite_");
}

interface PgColumn {
  readonly column_name: string;
  readonly data_type: string;
}

function toPgValue(value: unknown, type: string): unknown {
  if (value === null || value === undefined) return null;
  if (type === "jsonb" || type === "json" || typeof value === "object")
    return JSON.stringify(value);
  return value;
}

async function pgColumns(client: PostgresClient, table: string): Promise<PgColumn[]> {
  const result = await client.query<PgColumn>(
    "SELECT column_name, data_type FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position",
    [table],
  );
  return result.rows;
}

async function pgPrimaryKey(client: PostgresClient, table: string): Promise<string[]> {
  const result = await client.query<{ attname: string }>(
    `SELECT a.attname
       FROM pg_index i
       JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = to_regclass($1) AND i.indisprimary
      ORDER BY array_position(i.indkey, a.attnum)`,
    [quoteIdentifier(table)],
  );
  return result.rows.map((row) => row.attname);
}

/** Parents before children, derived from live foreign-key metadata. */
async function pgTableOrder(client: PostgresClient, tables: string[]): Promise<string[]> {
  const edges = await client.query<{ child: string; parent: string }>(
    `SELECT tc.table_name AS child, ccu.table_name AS parent
       FROM information_schema.table_constraints tc
       JOIN information_schema.constraint_column_usage ccu
         ON ccu.constraint_name = tc.constraint_name AND ccu.constraint_schema = tc.constraint_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public' AND ccu.table_schema = 'public'`,
  );
  const known = new Set(tables);
  const dependencies = new Map<string, Set<string>>();
  for (const table of tables) dependencies.set(table, new Set());
  for (const edge of edges.rows) {
    if (edge.child === edge.parent) continue;
    if (known.has(edge.child) && known.has(edge.parent))
      dependencies.get(edge.child)!.add(edge.parent);
  }

  const ordered: string[] = [];
  const remaining = new Set(tables);
  while (remaining.size > 0) {
    const next = [...remaining].find((table) =>
      [...dependencies.get(table)!].every((dependency) => !remaining.has(dependency)),
    );
    if (!next) {
      ordered.push(...remaining);
      break;
    }
    ordered.push(next);
    remaining.delete(next);
  }
  return ordered;
}

async function restorePostgres(
  client: PostgresClient,
  snapshot: Record<string, unknown[]>,
): Promise<void> {
  const tables = Object.keys(snapshot).filter(isTableName).sort();
  const order = await pgTableOrder(client, tables);
  await client.transaction(async (connection) => {
    for (const table of order) {
      const rows = snapshot[table] ?? [];
      if (rows.length === 0) continue;

      const columns = await pgColumns(client, table);
      const primaryKey = await pgPrimaryKey(client, table);
      const names = columns.map((column) => column.column_name);
      const updatable = names.filter((name) => !primaryKey.includes(name));
      const conflictTarget =
        primaryKey.length > 0 ? ` (${primaryKey.map(quoteIdentifier).join(", ")})` : "";
      const conflictAction =
        updatable.length > 0
          ? `DO UPDATE SET ${updatable.map((name) => `${quoteIdentifier(name)} = EXCLUDED.${quoteIdentifier(name)}`).join(", ")}`
          : "DO NOTHING";
      const prefix = `INSERT INTO ${quoteIdentifier(table)} (${names.map(quoteIdentifier).join(", ")}) VALUES `;
      const suffix = ` ON CONFLICT${conflictTarget} ${conflictAction}`;

      for (let offset = 0; offset < rows.length; offset += 100) {
        const chunk = rows.slice(offset, offset + 100);
        const placeholders = chunk
          .map(
            (_, rowIndex) =>
              `(${names.map((_, columnIndex) => `$${rowIndex * names.length + columnIndex + 1}`).join(", ")})`,
          )
          .join(", ");
        const values = chunk.flatMap((row) => {
          const record = row as Record<string, unknown>;
          return names.map((name) =>
            toPgValue(
              record[name],
              columns.find((column) => column.column_name === name)!.data_type,
            ),
          );
        });
        await connection.query(`${prefix}${placeholders}${suffix}`, values);
      }
      console.log(`  postgres.${table}: ${rows.length} rows`);
    }
  });
}

async function restoreTurso(
  client: TursoClient,
  snapshot: Record<string, unknown[]>,
): Promise<void> {
  const tables = Object.keys(snapshot).filter(isTableName).sort();
  const sequences: string[] = [];

  for (const table of tables) {
    const rows = snapshot[table] ?? [];
    if (rows.length === 0) continue;

    const info = await client.query(`PRAGMA table_info("${table}")`);
    const columns = info.rows.map((row) => String(row.name));
    const primaryKey = info.rows
      .filter((row) => Number(row.pk) > 0)
      .sort((a, b) => Number(a.pk) - Number(b.pk))
      .map((row) => String(row.name));
    const updatable = columns.filter((name) => !primaryKey.includes(name));
    const conflictTarget =
      primaryKey.length > 0 ? `(${primaryKey.map(quoteIdentifier).join(", ")})` : "";
    const conflictAction =
      updatable.length > 0
        ? `DO UPDATE SET ${updatable.map((name) => `${quoteIdentifier(name)} = excluded.${quoteIdentifier(name)}`).join(", ")}`
        : "DO NOTHING";
    const sql = `INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(", ")}) VALUES (${columns.map(() => "?").join(", ")}) ON CONFLICT${conflictTarget ? `${conflictTarget} ` : ""}${conflictAction}`;

    for (const row of rows) {
      const record = row as Record<string, unknown>;
      const values = columns.map((name) => (record[name] === undefined ? null : record[name]));
      await client.query(sql, values);
    }
    if (columns.includes("id")) sequences.push(table);
    console.log(`  turso.${table}: ${rows.length} rows`);
  }

  // AUTOINCREMENT tables keep their next value in sqlite_sequence; advance it
  // so restored rows do not collide with future inserts.
  const sequenceTable = await client.query(
    "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sqlite_sequence'",
  );
  if (sequenceTable.rows.length > 0) {
    for (const table of sequences) {
      await client.query(
        `INSERT INTO sqlite_sequence (name, seq) SELECT ?, COALESCE(MAX(id), 0) FROM ${quoteIdentifier(table)} ON CONFLICT(name) DO UPDATE SET seq = excluded.seq`,
        [table],
      );
    }
  }
}

async function restoreMongo(database: Db, snapshot: Record<string, unknown[]>): Promise<void> {
  for (const name of Object.keys(snapshot).filter(isTableName).sort()) {
    const documents = snapshot[name] ?? [];
    if (documents.length === 0) continue;
    const collection = database.collection(name);
    const operations: Array<AnyBulkWriteOperation<Document>> = documents.map((raw) => {
      const document = raw as Document;
      const storedId = document._id;
      const id =
        typeof storedId === "string" && /^[a-fA-F0-9]{24}$/.test(storedId)
          ? new ObjectId(storedId)
          : storedId;
      const fields: Document = { ...document };
      delete fields._id;
      return { updateOne: { filter: { _id: id }, update: { $set: fields }, upsert: true } };
    });

    for (let offset = 0; offset < operations.length; offset += 500) {
      await collection.bulkWrite(operations.slice(offset, offset + 500), { ordered: false });
    }
    console.log(`  mongodb.${name}: ${documents.length} documents`);
  }
}

async function main(): Promise<void> {
  const { config, secrets, warnings } = loadConfiguration();
  const logger = createLogger(config);
  for (const warning of warnings) logger.warn(warning);

  const databases = new DatabaseManager(config, secrets, logger);
  await databases.initialize();
  try {
    const postgresql = readJson("postgresql.json");
    const turso = readJson("turso.json");
    const mongodb = readJson("mongodb.json");

    if (postgresql && databases.bundle.postgres) {
      await restorePostgres(databases.bundle.postgres, postgresql);
    } else if (postgresql) {
      console.warn("  skipped postgresql.json: databases.postgresql is disabled");
    }

    if (turso && databases.bundle.turso) {
      await restoreTurso(databases.bundle.turso, turso);
    } else if (turso) {
      console.warn("  skipped turso.json: databases.turso is disabled");
    }

    if (mongodb && databases.bundle.mongodb) {
      await restoreMongo(databases.bundle.mongodb.database(), mongodb);
    } else if (mongodb) {
      console.warn("  skipped mongodb.json: databases.mongodb is disabled");
    }

    console.log("Restore complete. Redis state was not restored (temporary by design).");
  } finally {
    await databases.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
