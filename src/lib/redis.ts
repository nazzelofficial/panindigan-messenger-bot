import { database } from '../database/index.js';
import { logger } from './logger.js';

/**
 * Redis Replacement using PostgreSQL (via Database module)
 * This class implements the subset of Redis commands used in the project,
 * backed by the 'settings' table in PostgreSQL.
 */
class RedisClient {
  get connected(): boolean {
    return true; 
  }

  async connect(): Promise<void> {
    logger.info('Redis Replacement: Connected via PostgreSQL (Settings Table)');
  }

  async disconnect(): Promise<void> {
    // No-op
  }

  async get(key: string): Promise<string | null> {
    const val = await database.getSetting<string | number>(key);
    return val !== null ? String(val) : null;
  }

  async set(key: string, value: string | number, ttlSeconds?: number): Promise<void> {
    await database.setSetting(key, value, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    await database.deleteSetting(key);
  }

  async exists(key: string): Promise<number> {
    const val = await database.getSetting(key);
    return val !== null ? 1 : 0;
  }

  async ttl(key: string): Promise<number> {
    return await database.getTTL(key);
  }

  async checkCooldown(key: string): Promise<{ onCooldown: boolean; remaining: number }> {
     const ttl = await this.ttl(key);
     if (ttl > 0) {
         return { onCooldown: true, remaining: ttl };
     }
     return { onCooldown: false, remaining: 0 };
  }

  async setCooldown(key: string, seconds: number): Promise<void> {
    await this.set(key, Date.now(), seconds);
  }

  async incr(key: string): Promise<number> {
    return await database.increment(key);
  }
}

export const redis = new RedisClient();
export default redis;
