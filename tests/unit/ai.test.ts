import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { configSchema } from "../../src/config/schema.js";
import { AiService } from "../../src/services/ai/service.js";
import type { ResolvedSecrets } from "../../src/config/index.js";
import type { DatabaseBundle } from "../../src/databases/index.js";
import type { CooldownService } from "../../src/services/cooldown/service.js";
import type { AppLogger } from "../../src/logging/logger.js";

const config = configSchema.parse(
  JSON.parse(readFileSync(resolve(process.cwd(), "config.json"), "utf8")),
);
const secrets = {
  aiApiKey: "test-key",
  aiBaseUrl: "https://api.example.com/v1",
  aiDefaultModel: "test-model",
} as ResolvedSecrets;

function harness() {
  const transactions: Array<{ amount: number; key: string }> = [];
  const usage: Array<Record<string, unknown>> = [];
  const counted: string[] = [];
  const databases = {
    users: { upsert: async () => ({ id: 1, facebook_id: "123456789" }) },
    economy: {
      getBalance: async () => 1000,
      applyTransaction: async (input: { amount: number; idempotencyKey: string }) => {
        transactions.push({ amount: input.amount, key: input.idempotencyKey });
        return { balance: 1000 + input.amount, applied: true };
      },
    },
    ai: {
      countInPeriod: async () => 0,
      incrementQuota: async () => 1,
      recordUsage: async (entry: Record<string, unknown>) => usage.push(entry),
      isCancelled: async () => false,
    },
    cooldowns: { acquire: async () => ({ allowed: true, remainingMs: 0 }) },
    redis: {
      keys: { aiDedupe: (k: string) => "dedupe:" + k, aiConcurrency: (k: string) => "conc:" + k },
      raw: () => ({ incr: async () => 1, decr: async () => 0 }),
      expire: async () => undefined,
      delete: async () => undefined,
    },
    checkpoints: { recordActivity: async () => undefined },
  } as unknown as DatabaseBundle;
  const cooldowns = {
    acquire: async () => ({ allowed: true, remainingMs: 0 }),
  } as unknown as CooldownService;
  const logger = { warn: vi.fn(), info: vi.fn() } as unknown as AppLogger;
  const service = new AiService(config, secrets, databases, cooldowns, logger);
  return { service, transactions, usage, counted };
}

describe("AI service", () => {
  it("charges ask1 and records real usage", async () => {
    const { service, transactions, usage } = harness();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "answer" } }],
          model: "test-model",
          usage: { prompt_tokens: 5, completion_tokens: 3 },
        }),
        { status: 200 },
      )) as typeof fetch;
    try {
      const result = await service.ask("ask1", "123456789", "hello", "event-1");
      expect(result.success).toBe(true);
      expect(result.text).toBe("answer");
      expect(
        transactions.some((t) => t.amount === -config.artificialIntelligence.coinPrices.ask1),
      ).toBe(true);
      expect(usage[0]?.["command_level"] ?? usage[0]?.["level"]).toBeDefined();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("never charges ask6 and applies no application quota", async () => {
    const { service, transactions } = harness();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "free answer" } }],
          model: "test-model",
          usage: {},
        }),
        { status: 200 },
      )) as typeof fetch;
    try {
      const result = await service.ask("ask6", "123456789", "hello", "event-2");
      expect(result.coinCharge).toBe(0);
      expect(transactions).toHaveLength(0);
      expect(service.quota("ask6")).toEqual({ maximumRequests: 0, periodHours: 0 });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("refunds a failed provider request", async () => {
    const { service, transactions } = harness();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ error: { message: "provider outage" } }), {
        status: 503,
      })) as typeof fetch;
    try {
      await expect(service.ask("ask2", "123456789", "hello", "event-3")).rejects.toThrow(
        /provider outage/,
      );
      expect(transactions.some((t) => t.amount > 0)).toBe(true);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
