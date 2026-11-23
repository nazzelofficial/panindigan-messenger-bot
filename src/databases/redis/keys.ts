/**
 * Versioned Redis key conventions. Every key is namespaced, bounded by a TTL
 * and documented here so obsolete keys can be cleaned up safely.
 */
export class RedisKeys {
  public constructor(private readonly namespace: string) {}

  public cooldown(scope: string, identifier: string, action: string): string {
    return `${this.namespace}v1:cooldown:${scope}:${identifier}:${action}`;
  }

  public rewardLock(userId: string, reward: string): string {
    return `${this.namespace}v1:reward:${userId}:${reward}`;
  }

  public antiSpam(identifier: string): string {
    return `${this.namespace}v1:spam:${identifier}`;
  }

  public dedupe(eventId: string): string {
    return `${this.namespace}v1:dedupe:${eventId}`;
  }

  public lock(name: string): string {
    return `${this.namespace}v1:lock:${name}`;
  }

  public cache(name: string): string {
    return `${this.namespace}v1:cache:${name}`;
  }

  public cacheIndex(): string {
    return `${this.namespace}v1:cache:index`;
  }

  public aiConcurrency(userId: string): string {
    return `${this.namespace}v1:ai:concurrency:${userId}`;
  }

  public aiDedupe(key: string): string {
    return `${this.namespace}v1:ai:dedupe:${key}`;
  }

  public rateLimit(scope: string, identifier: string): string {
    return `${this.namespace}v1:ratelimit:${scope}:${identifier}`;
  }
}
