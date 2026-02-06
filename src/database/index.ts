import { Pool, PoolClient, QueryResult } from 'pg';
import NodeCache from 'node-cache';
import { logger } from '../lib/logger.js';
import type { User, Thread, Log, CommandStat, MusicQueueItem, Setting, Cooldown, NewLog, Transaction } from './schema.js';

let pool: Pool | null = null;
let isConnected = false;

// Initialize cache with 1 minute TTL by default
const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

export async function initDatabase(): Promise<boolean> {
  const connectionString = process.env.DATABASE_URL;
  
  if (!connectionString) {
    logger.warn('DATABASE_URL not found. Database features will be disabled.');
    return false;
  }

  try {
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined
    });

    // Test connection
    const client = await pool.connect();
    client.release();
    
    isConnected = true;
    
    await createTables();
    
    logger.info('PostgreSQL connected successfully');
    return true;
  } catch (error) {
    logger.error('Failed to connect to PostgreSQL', { error });
    isConnected = false;
    return false;
  }
}

async function createTables(): Promise<void> {
  if (!pool) return;
  
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        name TEXT,
        xp INTEGER DEFAULT 0,
        level INTEGER DEFAULT 0,
        total_messages INTEGER DEFAULT 0,
        coins INTEGER DEFAULT 0,
        daily_streak INTEGER DEFAULT 0,
        last_xp_gain TIMESTAMP,
        last_daily_claim TIMESTAMP,
        joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_users_level_xp ON users(level DESC, xp DESC);
      CREATE INDEX IF NOT EXISTS idx_users_total_messages ON users(total_messages DESC);
      CREATE INDEX IF NOT EXISTS idx_users_coins ON users(coins DESC);
    `);

    // Threads table
    await client.query(`
      CREATE TABLE IF NOT EXISTS threads (
        id VARCHAR(255) PRIMARY KEY,
        name TEXT,
        is_group BOOLEAN DEFAULT FALSE,
        welcome_enabled BOOLEAN DEFAULT TRUE,
        prefix VARCHAR(50),
        settings JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS logs (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        level VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        metadata JSONB,
        thread_id VARCHAR(255),
        user_id VARCHAR(255),
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_logs_type ON logs(type);
      CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
      CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs(timestamp DESC);
    `);

    // Command Stats table
    await client.query(`
      CREATE TABLE IF NOT EXISTS command_stats (
        id SERIAL PRIMARY KEY,
        command_name VARCHAR(100) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        thread_id VARCHAR(255),
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        success BOOLEAN DEFAULT FALSE,
        execution_time INTEGER
      );
      CREATE INDEX IF NOT EXISTS idx_cmd_stats_name ON command_stats(command_name);
      CREATE INDEX IF NOT EXISTS idx_cmd_stats_user ON command_stats(user_id);
      CREATE INDEX IF NOT EXISTS idx_cmd_stats_date ON command_stats(executed_at DESC);
    `);

    // Music Queue table
    await client.query(`
      CREATE TABLE IF NOT EXISTS music_queue (
        id SERIAL PRIMARY KEY,
        thread_id VARCHAR(255) NOT NULL,
        url TEXT NOT NULL,
        title TEXT,
        duration INTEGER,
        requested_by VARCHAR(255) NOT NULL,
        position INTEGER NOT NULL,
        added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_music_queue_thread_pos ON music_queue(thread_id, position);
    `);

    // Settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(255) PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Cooldowns table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cooldowns (
        id VARCHAR(255) PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        command VARCHAR(100),
        timestamp BIGINT NOT NULL,
        expires_at TIMESTAMP NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_cooldowns_type_user ON cooldowns(type, user_id);
      CREATE INDEX IF NOT EXISTS idx_cooldowns_expires ON cooldowns(expires_at);
    `);

    // Transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        amount INTEGER NOT NULL,
        balance INTEGER NOT NULL,
        description TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_created ON transactions(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    `);

    await client.query('COMMIT');
    logger.info('Database tables created/verified');
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to create database tables', { error });
    throw error;
  } finally {
    client.release();
  }
}

// Helper to map DB row to User object
function mapUser(row: any): User {
  return {
    id: row.id,
    name: row.name,
    xp: row.xp,
    level: row.level,
    totalMessages: row.total_messages,
    coins: row.coins,
    dailyStreak: row.daily_streak,
    lastXpGain: row.last_xp_gain,
    lastDailyClaim: row.last_daily_claim,
    joinedAt: row.joined_at,
    updatedAt: row.updated_at
  };
}

// Helper to map DB row to Thread object
function mapThread(row: any): Thread {
  return {
    id: row.id,
    name: row.name,
    isGroup: row.is_group,
    welcomeEnabled: row.welcome_enabled,
    prefix: row.prefix,
    settings: row.settings || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class Database {
  async disconnect(): Promise<void> {
    if (pool) {
      await pool.end();
      isConnected = false;
      logger.info('Database connection closed');
    }
  }

  async getUser(userId: string): Promise<User | null> {
    if (!pool || !isConnected) return null;

    const cacheKey = `user_${userId}`;
    const cachedUser = cache.get<User>(cacheKey);
    if (cachedUser) return cachedUser;

    try {
      const res = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
      if (res.rows.length > 0) {
        const user = mapUser(res.rows[0]);
        cache.set(cacheKey, user);
        return user;
      }
      return null;
    } catch (error) {
      logger.error('Failed to get user', { userId, error });
      return null;
    }
  }

  async createUser(userId: string, name?: string): Promise<User | null> {
    if (!pool || !isConnected) return null;
    
    try {
      // Upsert user
      const res = await pool.query(`
        INSERT INTO users (id, name, xp, level, total_messages, coins, daily_streak, joined_at, updated_at)
        VALUES ($1, $2, 0, 0, 0, 0, 0, NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
        RETURNING *
      `, [userId, name]);
      
      const user = mapUser(res.rows[0]);
      cache.set(`user_${userId}`, user);
      return user;
    } catch (error) {
      logger.error('Failed to create user', { userId, error });
      return null;
    }
  }

  async getOrCreateUser(userId: string, name?: string): Promise<User | null> {
    let user = await this.getUser(userId);
    if (!user) {
      user = await this.createUser(userId, name);
    }
    return user;
  }

  async getUserData(userId: string): Promise<User | null> {
    return this.getOrCreateUser(userId);
  }

  async updateUserXP(userId: string, xpGain: number): Promise<{ user: User; leveledUp: boolean } | null> {
    if (!pool || !isConnected) return null;
    
    try {
      const user = await this.getOrCreateUser(userId);
      if (!user) return null;

      const newXP = user.xp + xpGain;
      const xpForNextLevel = (user.level + 1) * 100;
      let newLevel = user.level;
      let leveledUp = false;
      let remainingXP = newXP;

      if (newXP >= xpForNextLevel) {
        newLevel += 1;
        remainingXP = newXP - xpForNextLevel;
        leveledUp = true;
      }

      const res = await pool.query(`
        UPDATE users 
        SET xp = $1, level = $2, last_xp_gain = NOW(), updated_at = NOW(), total_messages = total_messages + 1
        WHERE id = $3
        RETURNING *
      `, [remainingXP, newLevel, userId]);

      if (res.rows.length > 0) {
        const updatedUser = mapUser(res.rows[0]);
        cache.set(`user_${userId}`, updatedUser);
        return { user: updatedUser, leveledUp };
      }
      
      return null;
    } catch (error) {
      logger.error('Failed to update user XP', { userId, xpGain, error });
      return null;
    }
  }

  async getLeaderboard(limit: number = 10): Promise<User[]> {
    if (!pool || !isConnected) return [];
    
    try {
      const res = await pool.query(`
        SELECT * FROM users 
        ORDER BY level DESC, xp DESC 
        LIMIT $1
      `, [limit]);
      
      return res.rows.map(mapUser);
    } catch (error) {
      logger.error('Failed to get leaderboard', { error });
      return [];
    }
  }

  async getCoinsLeaderboard(limit: number = 10): Promise<User[]> {
    if (!pool || !isConnected) return [];
    
    try {
      const res = await pool.query(`
        SELECT * FROM users 
        ORDER BY coins DESC 
        LIMIT $1
      `, [limit]);
      
      return res.rows.map(mapUser);
    } catch (error) {
      logger.error('Failed to get coins leaderboard', { error });
      return [];
    }
  }

  async deleteUserAccount(userId: string): Promise<boolean> {
    if (!pool || !isConnected) return false;

    try {
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
      cache.del(`user_${userId}`);
      return true;
    } catch (error) {
      logger.error('Failed to delete user account', { userId, error });
      return false;
    }
  }

  async getThread(threadId: string): Promise<Thread | null> {
    if (!pool || !isConnected) return null;

    const cacheKey = `thread_${threadId}`;
    const cachedThread = cache.get<Thread>(cacheKey);
    if (cachedThread) return cachedThread;

    try {
      const res = await pool.query('SELECT * FROM threads WHERE id = $1', [threadId]);
      if (res.rows.length > 0) {
        const thread = mapThread(res.rows[0]);
        cache.set(cacheKey, thread);
        return thread;
      }
      return null;
    } catch (error) {
      logger.error('Failed to get thread', { threadId, error });
      return null;
    }
  }

  async getOrCreateThread(threadId: string, name?: string, isGroup?: boolean): Promise<Thread | null> {
    if (!pool || !isConnected) return null;
    
    try {
      const res = await pool.query(`
        INSERT INTO threads (id, name, is_group, welcome_enabled, settings, created_at, updated_at)
        VALUES ($1, $2, $3, TRUE, '{}', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET updated_at = NOW()
        RETURNING *
      `, [threadId, name, isGroup ?? false]);
      
      const thread = mapThread(res.rows[0]);
      cache.set(`thread_${threadId}`, thread);
      return thread;
    } catch (error) {
      logger.error('Failed to get or create thread', { threadId, error });
      return null;
    }
  }

  async logEntry(entry: NewLog): Promise<void> {
    if (!pool || !isConnected) return;
    
    try {
      await pool.query(`
        INSERT INTO logs (type, level, message, metadata, thread_id, user_id, timestamp)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [entry.type, entry.level, entry.message, entry.metadata ? JSON.stringify(entry.metadata) : null, entry.threadId, entry.userId]);
    } catch (error) {
      logger.error('Failed to log entry', { error });
    }
  }

  async getLogs(options: { type?: string; level?: string; limit?: number } = {}): Promise<Log[]> {
    if (!pool || !isConnected) return [];
    
    try {
      const { type, level, limit = 100 } = options;
      let query = 'SELECT * FROM logs';
      const params: any[] = [];
      const conditions: string[] = [];

      if (type) {
        params.push(type);
        conditions.push(`type = $${params.length}`);
      }
      if (level) {
        params.push(level);
        conditions.push(`level = $${params.length}`);
      }

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1}`;
      params.push(limit);

      const res = await pool.query(query, params);
      
      return res.rows.map(row => ({
        id: row.id,
        type: row.type,
        level: row.level,
        message: row.message,
        metadata: row.metadata,
        threadId: row.thread_id,
        userId: row.user_id,
        timestamp: row.timestamp
      }));
    } catch (error) {
      logger.error('Failed to get logs', { error });
      return [];
    }
  }

  async logCommandExecution(commandName: string, userId: string, threadId: string, success: boolean, executionTime: number): Promise<void> {
    if (!pool || !isConnected) return;
    
    try {
      await pool.query(`
        INSERT INTO command_stats (command_name, user_id, thread_id, success, execution_time, executed_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `, [commandName, userId, threadId, success, executionTime]);
    } catch (error) {
      logger.error('Failed to log command execution', { commandName, error });
    }
  }

  async getCommandStats(): Promise<{ command: string; count: number }[]> {
    if (!pool || !isConnected) return [];
    
    try {
      const res = await pool.query(`
        SELECT command_name as command, COUNT(*) as count 
        FROM command_stats 
        GROUP BY command_name 
        ORDER BY count DESC
      `);
      
      return res.rows;
    } catch (error) {
      logger.error('Failed to get command stats', { error });
      return [];
    }
  }

  async addToMusicQueue(threadId: string, url: string, title: string, duration: number, requestedBy: string): Promise<void> {
    if (!pool || !isConnected) return;
    
    try {
      const maxRes = await pool.query('SELECT MAX(position) as max_pos FROM music_queue WHERE thread_id = $1', [threadId]);
      const position = (maxRes.rows[0].max_pos || 0) + 1;
      
      await pool.query(`
        INSERT INTO music_queue (thread_id, url, title, duration, requested_by, position, added_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
      `, [threadId, url, title, duration, requestedBy, position]);
    } catch (error) {
      logger.error('Failed to add to music queue', { threadId, url, error });
    }
  }

  async getMusicQueue(threadId: string): Promise<MusicQueueItem[]> {
    if (!pool || !isConnected) return [];
    
    try {
      const res = await pool.query(`
        SELECT * FROM music_queue 
        WHERE thread_id = $1 
        ORDER BY position ASC
      `, [threadId]);
      
      return res.rows.map(row => ({
        id: row.id,
        threadId: row.thread_id,
        url: row.url,
        title: row.title,
        duration: row.duration,
        requestedBy: row.requested_by,
        position: row.position,
        addedAt: row.added_at
      }));
    } catch (error) {
      logger.error('Failed to get music queue', { threadId, error });
      return [];
    }
  }

  async removeFromMusicQueue(id: string): Promise<void> {
    if (!pool || !isConnected) return;
    
    try {
      await pool.query('DELETE FROM music_queue WHERE id = $1', [id]);
    } catch (error) {
      logger.error('Failed to remove from music queue', { id, error });
    }
  }

  async clearMusicQueue(threadId: string): Promise<void> {
    if (!pool || !isConnected) return;
    
    try {
      await pool.query('DELETE FROM music_queue WHERE thread_id = $1', [threadId]);
    } catch (error) {
      logger.error('Failed to clear music queue', { threadId, error });
    }
  }

  async getSetting<T>(key: string): Promise<T | null> {
    const cacheKey = `setting_${key}`;
    const cachedSetting = cache.get<T>(cacheKey);
    if (cachedSetting !== undefined) return cachedSetting;

    if (!pool || !isConnected) return null;
    
    try {
      const res = await pool.query('SELECT value FROM settings WHERE key = $1', [key]);
      if (res.rows.length > 0) {
        const value = res.rows[0].value as T;
        cache.set(cacheKey, value);
        return value;
      }
      return null;
    } catch (error) {
      logger.error('Failed to get setting', { key, error });
      return null;
    }
  }

  async setSetting(key: string, value: unknown): Promise<void> {
    if (!pool || !isConnected) return;
    
    try {
      await pool.query(`
        INSERT INTO settings (key, value, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()
      `, [key, JSON.stringify(value)]);
      
      cache.set(`setting_${key}`, value);
    } catch (error) {
      logger.error('Failed to set setting', { key, error });
    }
  }

  async deleteSetting(key: string): Promise<void> {
    if (!pool || !isConnected) return;
    
    try {
      await pool.query('DELETE FROM settings WHERE key = $1', [key]);
      cache.del(`setting_${key}`);
    } catch (error) {
      logger.error('Failed to delete setting', { key, error });
    }
  }

  async getTotalUsers(): Promise<number> {
    if (!pool || !isConnected) return 0;
    
    try {
      const res = await pool.query('SELECT COUNT(*) as count FROM users');
      return parseInt(res.rows[0].count);
    } catch (error) {
      logger.error('Failed to get total users', { error });
      return 0;
    }
  }

  async getTotalThreads(): Promise<number> {
    if (!pool || !isConnected) return 0;
    
    try {
      const res = await pool.query('SELECT COUNT(*) as count FROM threads');
      return parseInt(res.rows[0].count);
    } catch (error) {
      logger.error('Failed to get total threads', { error });
      return 0;
    }
  }

  async getTopUsers(limit: number = 5): Promise<User[]> {
    if (!pool || !isConnected) return [];
    
    try {
      const res = await pool.query(`
        SELECT * FROM users 
        ORDER BY total_messages DESC 
        LIMIT $1
      `, [limit]);
      
      return res.rows.map(mapUser);
    } catch (error) {
      logger.error('Failed to get top users', { error });
      return [];
    }
  }

  async getAppstate(): Promise<any[] | null> {
    try {
      return await this.getSetting<any[]>('appstate');
    } catch (error) {
      logger.error('Failed to get appstate from database', { error });
      return null;
    }
  }

  async saveAppstate(appstate: any[]): Promise<boolean> {
    try {
      if (!appstate || appstate.length === 0) {
        logger.warn('Attempted to save empty appstate, skipping');
        return false;
      }
      await this.setSetting('appstate', appstate);
      return true;
    } catch (error) {
      logger.error('Failed to save appstate to database', { error });
      return false;
    }
  }

  async checkCooldown(userId: string, type: string, cooldownMs: number): Promise<{ onCooldown: boolean; remaining: number }> {
    const cacheKey = `cooldown_${type}_${userId}`;
    const cachedCooldown = cache.get<number>(cacheKey);
    const now = Date.now();

    if (cachedCooldown && cachedCooldown > now) {
      return { onCooldown: true, remaining: Math.ceil((cachedCooldown - now) / 1000) };
    }

    if (!pool || !isConnected) return { onCooldown: false, remaining: 0 };
    
    try {
      const id = `${type}:${userId}`;
      const res = await pool.query('SELECT * FROM cooldowns WHERE id = $1', [id]);
      
      if (res.rows.length > 0) {
        const existing = res.rows[0];
        const timestamp = parseInt(existing.timestamp);
        const elapsed = now - timestamp;
        
        if (elapsed < cooldownMs) {
          const expiresAt = timestamp + cooldownMs;
          cache.set(cacheKey, expiresAt, Math.ceil((expiresAt - now) / 1000));
          return { onCooldown: true, remaining: Math.ceil((cooldownMs - elapsed) / 1000) };
        }
      }
      
      const expiresAt = now + cooldownMs;
      
      await pool.query(`
        INSERT INTO cooldowns (id, type, user_id, timestamp, expires_at)
        VALUES ($1, $2, $3, $4, TO_TIMESTAMP($5 / 1000.0))
        ON CONFLICT (id) DO UPDATE SET 
          timestamp = $4, 
          expires_at = TO_TIMESTAMP($5 / 1000.0)
      `, [id, type, userId, now, expiresAt]);
      
      cache.set(cacheKey, expiresAt, Math.ceil(cooldownMs / 1000));
      
      return { onCooldown: false, remaining: 0 };
    } catch (error) {
      logger.error('Failed to check cooldown', { userId, type, error });
      return { onCooldown: false, remaining: 0 };
    }
  }

  async checkXPCooldown(userId: string, cooldownMs: number): Promise<boolean> {
    const result = await this.checkCooldown(userId, 'xp', cooldownMs);
    return !result.onCooldown;
  }

  async checkCommandCooldown(userId: string, command: string, cooldownMs: number): Promise<{ onCooldown: boolean; remaining: number }> {
    return this.checkCooldown(userId, `cmd:${command}`, cooldownMs);
  }

  async getUserCoins(userId: string): Promise<number> {
    const user = await this.getOrCreateUser(userId);
    return user?.coins ?? 0;
  }

  async addCoins(userId: string, amount: number, type: Transaction['type'], description: string): Promise<{ success: boolean; newBalance: number }> {
    if (!pool || !isConnected) return { success: false, newBalance: 0 };

    try {
      await pool.query('BEGIN');

      const user = await this.getOrCreateUser(userId);
      if (!user) {
        await pool.query('ROLLBACK');
        return { success: false, newBalance: 0 };
      }

      const newBalance = (user.coins ?? 0) + amount;

      await pool.query(`
        UPDATE users 
        SET coins = $1, updated_at = NOW() 
        WHERE id = $2
      `, [newBalance, userId]);

      await pool.query(`
        INSERT INTO transactions (user_id, type, amount, balance, description, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `, [userId, type, amount, newBalance, description]);

      await pool.query('COMMIT');

      cache.del(`user_${userId}`);
      
      return { success: true, newBalance };
    } catch (error) {
      await pool.query('ROLLBACK');
      logger.error('Failed to add coins', { userId, amount, error });
      return { success: false, newBalance: 0 };
    }
  }

  async removeCoins(userId: string, amount: number, type: Transaction['type'], description: string): Promise<{ success: boolean; newBalance: number }> {
    if (!pool || !isConnected) return { success: false, newBalance: 0 };

    try {
      await pool.query('BEGIN');

      const user = await this.getOrCreateUser(userId);
      if (!user) {
        await pool.query('ROLLBACK');
        return { success: false, newBalance: 0 };
      }

      const currentCoins = user.coins ?? 0;
      if (currentCoins < amount) {
        await pool.query('ROLLBACK');
        return { success: false, newBalance: currentCoins };
      }

      const newBalance = currentCoins - amount;

      await pool.query(`
        UPDATE users 
        SET coins = $1, updated_at = NOW() 
        WHERE id = $2
      `, [newBalance, userId]);

      await pool.query(`
        INSERT INTO transactions (user_id, type, amount, balance, description, created_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
      `, [userId, type, -amount, newBalance, description]);

      await pool.query('COMMIT');

      cache.del(`user_${userId}`);

      return { success: true, newBalance };
    } catch (error) {
      await pool.query('ROLLBACK');
      logger.error('Failed to remove coins', { userId, amount, error });
      return { success: false, newBalance: 0 };
    }
  }

  async updateUserCoins(userId: string, amount: number): Promise<boolean> {
    if (amount >= 0) {
      const result = await this.addCoins(userId, amount, 'other', 'Generic update');
      return result.success;
    } else {
      const result = await this.removeCoins(userId, Math.abs(amount), 'other', 'Generic update');
      return result.success;
    }
  }

  async claimDaily(userId: string): Promise<{ success: boolean; coins: number; streak: number; nextClaim?: Date; message: string }> {
    if (!pool || !isConnected) return { success: false, coins: 0, streak: 0, message: 'Database error' };

    try {
      const user = await this.getOrCreateUser(userId);
      if (!user) return { success: false, coins: 0, streak: 0, message: 'User not found' };

      const now = new Date();
      const lastClaim = user.lastDailyClaim ? new Date(user.lastDailyClaim) : new Date(0);
      
      // Check if already claimed today (reset at midnight UTC or simply 24h)
      // Implementing 24h cooldown for simplicity, or midnight reset logic
      const diff = now.getTime() - lastClaim.getTime();
      const dayInMs = 24 * 60 * 60 * 1000;
      
      if (diff < dayInMs && now.getDate() === lastClaim.getDate()) {
        const nextClaim = new Date(lastClaim.getTime() + dayInMs); // Rough estimate
        return { 
          success: false, 
          coins: 0, 
          streak: user.dailyStreak, 
          nextClaim, 
          message: 'Already claimed daily reward' 
        };
      }

      // Check streak (within 48 hours to keep streak)
      let streak = user.dailyStreak;
      if (diff > dayInMs * 2) {
        streak = 1;
      } else {
        streak += 1;
      }

      const reward = 100 + (streak * 10); // Base 100 + 10 per streak day
      
      await this.addCoins(userId, reward, 'claim', 'Daily claim');
      
      await pool.query(`
        UPDATE users 
        SET daily_streak = $1, last_daily_claim = NOW() 
        WHERE id = $2
      `, [streak, userId]);

      // Update cache
      cache.del(`user_${userId}`);

      return { success: true, coins: reward, streak, message: 'Daily reward claimed!' };
    } catch (error) {
      logger.error('Failed to claim daily', { userId, error });
      return { success: false, coins: 0, streak: 0, message: 'Internal error' };
    }
  }
}

export const database = new Database();
