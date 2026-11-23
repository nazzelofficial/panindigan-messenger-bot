import { MongoClient } from "mongodb";
import type { AppConfig } from "../../config/index.js";
import { DatabaseUnavailableError, type DatabaseHealth } from "../types.js";

export class MongoDatabase {
  private readonly client: MongoClient;
  private readonly databaseName: string;
  private connected = false;

  public constructor(connectionString: string, config: AppConfig) {
    this.databaseName = config.databases.mongodb.databaseName;
    this.client = new MongoClient(connectionString, {
      maxPoolSize: config.databases.mongodb.maximumPoolSize,
      serverSelectionTimeoutMS: 10_000,
    });
  }

  public async connect(): Promise<void> {
    await this.client.connect();
    await this.client.db(this.databaseName).admin().ping();
    this.connected = true;
  }

  public database() {
    return this.client.db(this.databaseName);
  }

  public async health(): Promise<DatabaseHealth> {
    try {
      const started = Date.now();
      await this.client.db(this.databaseName).admin().ping();
      return {
        name: "MongoDB",
        state: "connected",
        detail: `round-trip ${Date.now() - started}ms`,
        checkedAt: Date.now(),
      };
    } catch (error) {
      return {
        name: "MongoDB",
        state: "disconnected",
        detail: error instanceof Error ? error.message.slice(0, 200) : "Health check failed",
        checkedAt: Date.now(),
      };
    }
  }

  public async close(): Promise<void> {
    await this.client.close();
  }

  public assertAvailable(): void {
    if (!this.connected) throw new DatabaseUnavailableError("MongoDB", "operation");
  }
}
