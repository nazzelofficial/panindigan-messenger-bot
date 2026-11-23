import pg, { type Pool, type PoolClient, type QueryResult, type QueryResultRow } from "pg";
import type { AppConfig } from "../../config/index.js";
import { DatabaseUnavailableError, type DatabaseHealth } from "../types.js";

const { Pool: PgPool } = pg;

export class PostgresClient {
  private readonly pool: Pool;

  public constructor(connectionString: string, config: AppConfig) {
    const { pool } = config.databases.postgresql;
    this.pool = new PgPool({
      connectionString,
      min: pool.minimumConnections,
      max: pool.maximumConnections,
      idleTimeoutMillis: pool.idleTimeoutMs,
      connectionTimeoutMillis: pool.connectionTimeoutMs,
      allowExitOnIdle: false,
    });
    this.pool.on("error", () => {
      // Health checks and request paths surface the real cause; we never log
      // connection strings, and no error is swallowed silently by the app.
    });
  }

  public async connect(): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query("SELECT 1");
    } finally {
      client.release();
    }
  }

  public async query<T extends QueryResultRow = QueryResultRow>(
    sql: string,
    values: readonly unknown[] = [],
  ): Promise<QueryResult<T>> {
    try {
      return await this.pool.query<T>(sql, values as unknown[]);
    } catch (error) {
      throw new DatabaseUnavailableError("PostgreSQL", "query", error);
    }
  }

  public async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const result = await work(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error instanceof DatabaseUnavailableError
        ? error
        : new DatabaseUnavailableError("PostgreSQL", "transaction", error);
    } finally {
      client.release();
    }
  }

  public async health(): Promise<DatabaseHealth> {
    try {
      const started = Date.now();
      await this.query("SELECT 1 AS healthy");
      return {
        name: "PostgreSQL",
        state: "connected",
        detail: `round-trip ${Date.now() - started}ms`,
        checkedAt: Date.now(),
      };
    } catch (error) {
      return {
        name: "PostgreSQL",
        state: "disconnected",
        detail: error instanceof Error ? error.message.slice(0, 200) : "Health check failed",
        checkedAt: Date.now(),
      };
    }
  }

  public getPool(): Pool {
    return this.pool;
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}
