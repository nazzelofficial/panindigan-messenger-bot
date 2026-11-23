import type { AppConfig } from "../../config/index.js";
import type { DatabaseBundle } from "../../databases/index.js";
import type { AppLogger } from "../../logging/logger.js";

export interface AntiSpamResult {
  allowed: boolean;
  delayMs: number;
  count: number;
}

/** Sliding-window anti-spam with progressive throttling. */
export class AntiSpamService {
  public constructor(
    private readonly config: AppConfig,
    private readonly databases: DatabaseBundle,
    private readonly logger: AppLogger,
  ) {}

  public async evaluate(userId: string, threadId: string): Promise<AntiSpamResult> {
    const settings = this.config.rateLimiting.antiSpam;
    if (!settings.enabled || !this.databases.rateLimiter || !this.databases.redis) {
      return { allowed: true, delayMs: 0, count: 0 };
    }
    const key = this.databases.redis.keys.antiSpam(`${userId}:${threadId}`);
    const result = await this.databases.rateLimiter.allow(
      key,
      settings.observationWindowMs,
      settings.maximumMessages,
    );
    if (result.allowed) return { allowed: true, delayMs: 0, count: result.count };

    const overage = Math.max(1, result.count - settings.maximumMessages + 1);
    const delayMs = Math.min(
      settings.maximumDelayMs,
      settings.initialDelayMs + overage * settings.initialDelayMs,
    );
    this.logger.warn(
      { userId, threadId, count: result.count, delayMs },
      "Anti-spam limit triggered",
    );
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    return { allowed: true, delayMs, count: result.count };
  }
}
