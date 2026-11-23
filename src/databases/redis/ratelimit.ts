import type { RedisDatabase } from "./client.js";

const SLIDING_WINDOW_SCRIPT = `
redis.call('zremrangebyscore', KEYS[1], 0, ARGV[1])
local count = redis.call('zcard', KEYS[1])
if count >= tonumber(ARGV[2]) then
  return {0, count, 0}
end
redis.call('zadd', KEYS[1], ARGV[3], ARGV[4])
redis.call('pexpire', KEYS[1], ARGV[5])
return {1, count + 1, 0}
`;

export interface RateLimitResult {
  allowed: boolean;
  count: number;
}

/** Atomic sliding-window limiter with automatic TTL so keys never grow unbounded. */
export class RateLimiterStore {
  public constructor(private readonly redis: RedisDatabase) {}

  public async allow(key: string, windowMs: number, maximum: number): Promise<RateLimitResult> {
    const now = Date.now();
    const result = (await this.redis.evaluate(
      SLIDING_WINDOW_SCRIPT,
      [key],
      [
        String(now - windowMs),
        String(maximum),
        String(now),
        `${now}-${Math.random()}`,
        String(windowMs),
      ],
    )) as number[];
    return { allowed: result[0] === 1, count: Number(result[1]) };
  }
}
