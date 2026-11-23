import { randomIdentifier } from "../../utils/crypto.js";
import type { RedisDatabase } from "./client.js";

const RELEASE_SCRIPT = `
if redis.call('get', KEYS[1]) == ARGV[1] then
  return redis.call('del', KEYS[1])
end
return 0
`;

export interface DistributedLock {
  readonly token: string;
  release(): Promise<void>;
}

/** Short-lived, atomic distributed locks used by the scheduler and broadcaster. */
export class LockManager {
  public constructor(private readonly redis: RedisDatabase) {}

  public async acquire(name: string, ttlMs: number): Promise<DistributedLock | undefined> {
    const token = randomIdentifier("lock");
    const acquired = await this.redis.set(this.redis.keys.lock(name), token, { ttlMs, nx: true });
    if (!acquired) return undefined;
    return {
      token,
      release: async () => {
        await this.redis.evaluate(RELEASE_SCRIPT, [this.redis.keys.lock(name)], [token]);
      },
    };
  }

  public async withLock<T>(
    name: string,
    ttlMs: number,
    work: () => Promise<T>,
  ): Promise<T | undefined> {
    const lock = await this.acquire(name, ttlMs);
    if (!lock) return undefined;
    try {
      return await work();
    } finally {
      await lock.release();
    }
  }
}
