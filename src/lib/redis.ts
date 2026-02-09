import { database, isDatabaseConnected } from '../database/index.js';
import { logger } from './logger.js';
import NodeCache from 'node-cache';

/**
 * Redis Replacement using PostgreSQL (via Database module)
 * with In-Memory Fallback if database is disconnected.
 */
class RedisClient {
  private memoryCache: NodeCache;

  constructor() {
    // In-memory fallback (checkperiod: 60s)
    this.memoryCache = new NodeCache({ checkperiod: 60 });
  }

  get connected(): boolean {
    return true; 
  }

  async connect(): Promise<void> {
    if (isDatabaseConnected()) {
        logger.info('Redis Replacement: Connected via PostgreSQL (Settings Table)');
    } else {
        logger.warn('Redis Replacement: PostgreSQL disconnected. Using In-Memory Fallback (Non-persistent).');
    }
  }

  async disconnect(): Promise<void> {
    // No-op
  }

  private useMemory(): boolean {
    return !isDatabaseConnected();
  }

  async get(key: string): Promise<string | null> {
    if (this.useMemory()) {
        const val = this.memoryCache.get<string | number>(key);
        return val !== undefined ? String(val) : null;
    }
    const val = await database.getSetting<string | number>(key);
    return val !== null ? String(val) : null;
  }

  async set(key: string, value: string | number, ttlSeconds?: number): Promise<void> {
    if (this.useMemory()) {
        this.memoryCache.set(key, value, ttlSeconds || 0);
        return;
    }
    await database.setSetting(key, value, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    if (this.useMemory()) {
        this.memoryCache.del(key);
        return;
    }
    await database.deleteSetting(key);
  }

  async exists(key: string): Promise<number> {
    if (this.useMemory()) {
        return this.memoryCache.has(key) ? 1 : 0;
    }
    const val = await database.getSetting(key);
    return val !== null ? 1 : 0;
  }

  async ttl(key: string): Promise<number> {
    if (this.useMemory()) {
        const ttl = this.memoryCache.getTtl(key);
        if (!ttl) return -2;
        const remaining = Math.ceil((ttl - Date.now()) / 1000);
        return remaining > 0 ? remaining : -2;
    }
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
    if (this.useMemory()) {
        const current = (this.memoryCache.get<number>(key) || 0);
        const next = current + 1;
        
        // Preserve existing TTL if key exists
        const ttl = this.memoryCache.getTtl(key);
        if (ttl && ttl > Date.now()) {
            const remaining = Math.ceil((ttl - Date.now()) / 1000);
            this.memoryCache.set(key, next, remaining);
        } else {
            // New key or expired, set without TTL (will be set by caller usually, or infinite)
            // But for rate limiting, we expect caller to set TTL if it's 1.
            this.memoryCache.set(key, next); 
        }
        return next;
    }
    return await database.increment(key);
  }
}

export const redis = new RedisClient();
export default redis;
