import { createClient, type RedisClientType } from "redis";
import type { AppConfig } from "../../config/index.js";
import type { DatabaseHealth } from "../types.js";
import { RedisKeys } from "./keys.js";

export class RedisDatabase {
  private readonly client: RedisClientType;
  public readonly keys: RedisKeys;

  public constructor(url: string, config: AppConfig) {
    const settings = config.databases.redis;
    this.keys = new RedisKeys(settings.keyNamespace);
    this.client = createClient({
      url,
      socket: {
        connectTimeout: settings.connectionTimeoutMs,
        reconnectStrategy: (retries: number) => Math.min(100 * 2 ** retries, 3000),
      },
      // Redis itself handles command retries internally; this keeps the application
      // bound explicit and observable rather than silently disabling protections.
      disableOfflineQueue: false,
    }) as RedisClientType;
  }

  public async connect(): Promise<void> {
    this.client.on("error", () => {
      // Errors are surfaced through health checks and command paths. We never
      // emit URLs or credentials into logs.
    });
    await this.client.connect();
  }

  public async health(): Promise<DatabaseHealth> {
    try {
      const started = Date.now();
      await this.client.ping();
      return {
        name: "Redis",
        state: "connected",
        detail: `round-trip ${Date.now() - started}ms`,
        checkedAt: Date.now(),
      };
    } catch (error) {
      return {
        name: "Redis",
        state: "disconnected",
        detail: error instanceof Error ? error.message.slice(0, 200) : "Health check failed",
        checkedAt: Date.now(),
      };
    }
  }

  public async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  public async set(
    key: string,
    value: string,
    options?: { ttlMs?: number; nx?: boolean },
  ): Promise<boolean> {
    const result = await this.client.set(key, value, {
      ...(options?.ttlMs !== undefined ? { PX: options.ttlMs } : {}),
      ...(options?.nx ? { NX: true } : {}),
    });
    return result === "OK";
  }

  public async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  public async expire(key: string, ttlMs: number): Promise<void> {
    await this.client.pExpire(key, ttlMs);
  }

  public async increment(key: string): Promise<number> {
    return this.client.incr(key);
  }

  public async evaluate(script: string, keys: string[], arguments_: string[]): Promise<unknown> {
    return this.client.eval(script, { keys, arguments: arguments_ });
  }

  public async multi(): Promise<ReturnType<RedisClientType["multi"]>> {
    return this.client.multi();
  }

  public raw(): RedisClientType {
    return this.client;
  }

  public async close(): Promise<void> {
    if (this.client.isOpen) await this.client.quit();
  }
}
