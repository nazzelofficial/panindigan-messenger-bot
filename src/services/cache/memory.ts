interface Entry {
  value: unknown;
  expiresAt: number;
}

/**
 * Bounded in-process fallback used only when Redis is disabled. It is never a
 * substitute for durable storage and is intentionally not shared across nodes.
 */
export class MemoryCache {
  private readonly entries = new Map<string, Entry>();

  public constructor(private readonly maximumEntries = 10_000) {}

  public async get<T>(name: string): Promise<T | undefined> {
    const entry = this.entries.get(name);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.entries.delete(name);
      return undefined;
    }
    return entry.value as T;
  }

  public async set(name: string, value: unknown, lifetimeSeconds: number): Promise<void> {
    if (this.entries.size >= this.maximumEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest !== undefined) this.entries.delete(oldest);
    }
    this.entries.set(name, { value, expiresAt: Date.now() + lifetimeSeconds * 1000 });
  }

  public async delete(name: string): Promise<void> {
    this.entries.delete(name);
  }
}
