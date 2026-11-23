import type { RedisDatabase } from "./client.js";

/** Bounded temporary cache. Redis holds transient values only, never business truth. */
export class RedisCache {
  public constructor(
    private readonly redis: RedisDatabase,
    private readonly maximumEntries: number,
  ) {}

  public async get<T>(name: string): Promise<T | undefined> {
    const raw = await this.redis.get(this.redis.keys.cache(name));
    if (raw === null) return undefined;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return undefined;
    }
  }

  public async set(name: string, value: unknown, lifetimeSeconds: number): Promise<void> {
    const key = this.redis.keys.cache(name);
    await this.redis.set(key, JSON.stringify(value), {
      ttlMs: Math.max(1, lifetimeSeconds * 1000),
    });
    await this.redis.evaluate(
      `redis.call('sadd', KEYS[1], KEYS[2]); return redis.call('scard', KEYS[1]);`,
      [this.redis.keys.cacheIndex(), key],
      [],
    );
    await this.enforceLimit();
  }

  public async delete(name: string): Promise<void> {
    const key = this.redis.keys.cache(name);
    await this.redis.delete(key);
    await this.redis.raw().sRem(this.redis.keys.cacheIndex(), key);
  }

  private async enforceLimit(): Promise<void> {
    const size = await this.redis.raw().sCard(this.redis.keys.cacheIndex());
    if (size <= this.maximumEntries) return;
    const allKeys = await this.redis.raw().sMembers(this.redis.keys.cacheIndex());
    const excess = allKeys.slice(0, size - this.maximumEntries);
    if (excess.length === 0) return;
    const pipeline = this.redis.raw().multi();
    for (const key of excess) {
      pipeline.del(key);
      pipeline.sRem(this.redis.keys.cacheIndex(), key);
    }
    await pipeline.exec();
  }
}
