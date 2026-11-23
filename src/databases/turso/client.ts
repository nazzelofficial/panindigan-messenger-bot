import { createClient, type Client, type InValue } from "@libsql/client";
import type { AppConfig } from "../../config/index.js";
import { DatabaseUnavailableError, type DatabaseHealth } from "../types.js";

/** libSQL accepts only scalar values; structured values are stored as JSON text. */
function toSqlValues(args: readonly unknown[]): InValue[] {
  return args.map((value): InValue => {
    if (value === null || value === undefined) return null;
    if (typeof value === "string" || typeof value === "number" || typeof value === "bigint")
      return value;
    if (typeof value === "boolean") return value ? 1 : 0;
    if (value instanceof Uint8Array) return value;
    if (value instanceof Date) return value.toISOString();
    return JSON.stringify(value);
  });
}

export interface TursoQueryResult {
  rows: Array<Record<string, unknown>>;
  rowsAffected: number;
  lastInsertRowid: number | bigint | undefined;
}

function isRemoteUrl(url: string): boolean {
  return /^(libsql|https|http):\/\//i.test(url);
}

/**
 * Production client for the provisioned, persistent Turso (libSQL) database.
 * A local file or in-memory URL is rejected outright: it would silently
 * replace durable operational history with ephemeral storage.
 */
export class TursoClient {
  private readonly client: Client;
  private readonly maximumRetries: number;

  public constructor(url: string, authToken: string, config: AppConfig) {
    if (!isRemoteUrl(url)) {
      throw new Error(
        "TURSO_DATABASE_URL must be a remote libsql:// or https:// URL. Local SQLite files are not a valid production substitute.",
      );
    }
    const requestTimeoutMs = config.databases.turso.requestTimeoutMs;
    this.maximumRetries = config.databases.turso.maximumRetries;
    this.client = createClient({
      url,
      authToken,
      // `fetch` is the supported way to bound a remote request. The client's
      // `timeout` option is a local-file busy timeout and is intentionally not
      // used for a remote Turso database.
      fetch: (request: Request) =>
        globalThis.fetch(request, { signal: AbortSignal.timeout(requestTimeoutMs) }),
    });
  }

  private async withRetry<T>(operation: string, work: () => Promise<T>): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maximumRetries; attempt += 1) {
      try {
        return await work();
      } catch (error) {
        lastError = error;
        if (attempt === this.maximumRetries || !isRetryable(error)) break;
        await new Promise((resolve) => setTimeout(resolve, 50 * 2 ** attempt));
      }
    }
    throw new DatabaseUnavailableError("Turso", operation, lastError);
  }

  public async connect(): Promise<void> {
    const result = await this.query("SELECT 1 AS ok");
    if (Number(result.rows[0]?.ok) !== 1)
      throw new Error("Turso connectivity check returned an unexpected result.");
  }

  public async query(sql: string, args: unknown[] = []): Promise<TursoQueryResult> {
    return this.withRetry("query", async () => {
      const result = await this.client.execute({ sql, args: toSqlValues(args) });
      return {
        rows: result.rows.map((row) => ({ ...row })),
        rowsAffected: result.rowsAffected,
        lastInsertRowid: result.lastInsertRowid,
      };
    });
  }

  /** Runs several statements atomically in a single libSQL transaction. */
  public async batch(statements: ReadonlyArray<{ sql: string; args?: unknown[] }>): Promise<void> {
    await this.withRetry("batch", () =>
      this.client.batch(
        statements.map((statement) => ({
          sql: statement.sql,
          args: toSqlValues(statement.args ?? []),
        })),
      ),
    );
  }

  public async transaction<T>(
    work: (run: (sql: string, args?: unknown[]) => Promise<TursoQueryResult>) => Promise<T>,
  ): Promise<T> {
    const transaction = await this.client.transaction();
    try {
      const result = await work(async (sql, args = []) => {
        const value = await transaction.execute({ sql, args: toSqlValues(args) });
        return {
          rows: value.rows.map((row) => ({ ...row })),
          rowsAffected: value.rowsAffected,
          lastInsertRowid: value.lastInsertRowid,
        };
      });
      await transaction.commit();
      return result;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  public async health(): Promise<DatabaseHealth> {
    try {
      const started = Date.now();
      await this.query("SELECT 1 AS healthy");
      return {
        name: "Turso",
        state: "connected",
        detail: `round-trip ${Date.now() - started}ms`,
        checkedAt: Date.now(),
      };
    } catch (error) {
      return {
        name: "Turso",
        state: "disconnected",
        detail: error instanceof Error ? error.message.slice(0, 200) : "Health check failed",
        checkedAt: Date.now(),
      };
    }
  }

  public async integrityCheck(): Promise<string> {
    const result = await this.query("PRAGMA integrity_check");
    return String(result.rows[0]?.integrity_check ?? "unknown");
  }

  public raw(): Client {
    return this.client;
  }

  public async close(): Promise<void> {
    this.client.close();
  }
}

function isRetryable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("econnreset") ||
    message.includes("socket") ||
    message.includes("fetch failed") ||
    message.includes("service unavailable")
  );
}
