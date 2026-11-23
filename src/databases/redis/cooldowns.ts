import type { RedisDatabase } from "./client.js";

export interface CooldownCheck {
  allowed: boolean;
  remainingMs: number;
}

/** Redis is the fast, temporary cooldown store; PostgreSQL remains authoritative for rewards. */
export class CooldownStore {
  public constructor(private readonly redis: RedisDatabase) {}

  public async check(key: string, _cooldownMs: number): Promise<CooldownCheck> {
    const ttl = await this.redis
      .raw()
      .pTTL(key)
      .catch(() => -2 as number);
    if (ttl > 0) return { allowed: false, remainingMs: ttl };
    return { allowed: true, remainingMs: 0 };
  }

  public async acquire(key: string, cooldownMs: number): Promise<CooldownCheck> {
    const acquired = await this.redis.set(key, Date.now().toString(), {
      ttlMs: cooldownMs,
      nx: true,
    });
    if (acquired) return { allowed: true, remainingMs: 0 };
    const ttl = await this.redis
      .raw()
      .pTTL(key)
      .catch(() => 0 as number);
    return { allowed: false, remainingMs: Math.max(ttl, 0) };
  }

  public async release(key: string): Promise<void> {
    await this.redis.delete(key);
  }
}
