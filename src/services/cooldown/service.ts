import type { AppConfig } from "../../config/index.js";
import type { DatabaseBundle } from "../../databases/index.js";
import type { CommandDefinition } from "../../commands/types.js";
import { formatDuration } from "../../utils/time.js";

export interface CooldownResult {
  allowed: boolean;
  remainingMs: number;
}

/** Redis-backed cooldowns with an explicit fail-closed policy. */
export class CooldownService {
  public constructor(
    private readonly config: AppConfig,
    private readonly databases: DatabaseBundle,
  ) {}

  public async check(key: string, cooldownMs: number): Promise<CooldownResult> {
    if (cooldownMs <= 0) return { allowed: true, remainingMs: 0 };
    if (!this.databases.redis || !this.databases.cooldowns) {
      // Abuse prevention must not silently disappear when Redis is down.
      return { allowed: false, remainingMs: cooldownMs };
    }
    return this.databases.cooldowns.check(key, cooldownMs);
  }

  public async acquire(key: string, cooldownMs: number): Promise<CooldownResult> {
    if (cooldownMs <= 0) return { allowed: true, remainingMs: 0 };
    if (!this.databases.redis || !this.databases.cooldowns) {
      return { allowed: false, remainingMs: cooldownMs };
    }
    return this.databases.cooldowns.acquire(key, cooldownMs);
  }

  public async checkCommand(
    userId: string,
    threadId: string,
    command: CommandDefinition,
  ): Promise<CooldownResult> {
    if (!this.config.rateLimiting.enabled) return { allowed: true, remainingMs: 0 };
    const keys = this.databases.redis?.keys;
    if (!keys || !this.databases.cooldowns) {
      return { allowed: false, remainingMs: this.config.commands.defaultCooldownMs };
    }
    const checks: Array<{ key: string; ms: number }> = [
      {
        key: keys.cooldown("global", "all", "command"),
        ms: this.config.rateLimiting.defaultCooldownMs,
      },
      {
        key: keys.cooldown("user", userId, "command"),
        ms: this.config.rateLimiting.perUserCooldownMs,
      },
      {
        key: keys.cooldown("group", threadId, "command"),
        ms: this.config.rateLimiting.perGroupCooldownMs,
      },
      { key: keys.cooldown("command", command.name, "execution"), ms: command.cooldownMs },
      { key: keys.cooldown("user", userId, command.name), ms: command.cooldownMs },
    ];
    // Atomic acquire of all keys. The old code did 5 pTTL reads THEN 5
    // SET NX writes; concurrent commands (up to 25 in flight) could all pass
    // the read phase before any lock existed, so nobody saw a cooldown. Using
    // SET NX directly makes each key acquisition atomic; if any key is held,
    // release the ones we just took and report the longest remaining wait.
    const acquired: string[] = [];
    let longest = 0;
    for (const check of checks) {
      if (check.ms <= 0) continue;
      const result = await this.acquire(check.key, check.ms);
      if (result.allowed) {
        acquired.push(check.key);
      } else {
        longest = Math.max(longest, result.remainingMs);
      }
    }
    if (longest > 0) {
      // Roll back the keys this call acquired — otherwise a denied command
      // would still consume the cooldown and extend the wait for everyone.
      for (const key of acquired) {
        try {
          await this.databases.cooldowns.release(key);
        } catch {
          // best-effort rollback
        }
      }
      return { allowed: false, remainingMs: longest };
    }
    return { allowed: true, remainingMs: 0 };
  }

  public describe(result: CooldownResult): string {
    return `Please wait ${formatDuration(result.remainingMs)} before doing that again.`;
  }
}
