import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { configSchema } from "../../src/config/schema.js";
import { EconomyService } from "../../src/services/economy/service.js";
import { CooldownStore } from "../../src/databases/redis/cooldowns.js";
import { ArchiveRepository } from "../../src/databases/mongodb/repositories.js";
import { AnnouncementService } from "../../src/services/announcements/service.js";
import { MaintenanceService } from "../../src/services/maintenance/service.js";
import { extractUserIdFromUrl } from "panindigan-automate";
import type { DatabaseBundle } from "../../src/databases/index.js";
import type { MessengerGateway } from "../../src/messenger/client.js";
import type { AppLogger } from "../../src/logging/logger.js";

const config = configSchema.parse(
  JSON.parse(readFileSync(resolve(process.cwd(), "config.json"), "utf8")),
);
const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
} as unknown as AppLogger;

describe("economy safety", () => {
  function harness() {
    const claims = new Map<string, { amount: number; nextEligibleAt: number }>();
    const economy = {
      getBalance: async () => 0,
      applyTransaction: async (input: { amount: number }) => ({
        balance: 100 + input.amount,
        applied: true,
      }),
      claimReward: async (input: {
        userId: number;
        rewardType: string;
        period: string;
        amount: number;
        nextEligibleAt: Date;
        idempotencyKey: string;
      }) => {
        const key = `${input.userId}:${input.rewardType}:${input.period}`;
        const existing = claims.get(key);
        if (existing && existing.nextEligibleAt > Date.now()) {
          return { claimed: false, balance: 250, nextEligibleAt: existing.nextEligibleAt };
        }
        claims.set(key, { amount: input.amount, nextEligibleAt: input.nextEligibleAt.getTime() });
        return { claimed: true, balance: 250, nextEligibleAt: input.nextEligibleAt.getTime() };
      },
    };
    const databases = {
      users: {
        upsert: async () => ({ id: 1, facebook_id: "123456789" }),
        find: async () => undefined,
      },
      economy,
      redis: {
        keys: {
          rewardLock: (id: string, type: string) => `${id}:${type}`,
          cooldown: (scope: string, id: string, action: string) => `${scope}:${id}:${action}`,
        },
      },
    } as unknown as DatabaseBundle;
    const cooldowns = { acquire: async () => ({ allowed: true, remainingMs: 0 }) } as never;
    return { service: new EconomyService(config, databases, cooldowns, logger), claims };
  }

  it("prevents two daily claims inside the cooldown", async () => {
    const { service } = harness();
    const first = await service.claim("123456789", "daily", "evt-1");
    const second = await service.claim("123456789", "daily", "evt-2");
    expect(first.success).toBe(true);
    expect(second.success).toBe(false);
    expect(second.amount).toBe(0);
  });

  it("enforces the configured five-hour beg cooldown", async () => {
    const { service } = harness();
    const first = await service.claim("123456789", "beg", "beg-1");
    expect(first.success).toBe(true);
    expect(first.nextEligibleAt! - Date.now()).toBeGreaterThan(4.9 * 60 * 60 * 1000);
  });

  it("rejects a zero or negative transfer amount before any database call", async () => {
    const { service } = harness();
    await expect(service.transfer("1", "2", 0)).rejects.toThrow(/positive whole number/);
  });
});

describe("Redis cooldown store", () => {
  it("uses atomic SET NX and reports the remaining TTL", async () => {
    let stored = false;
    const redis = {
      set: async (_key: string, _value: string, options: { nx?: boolean }) => {
        if (stored) return false;
        stored = Boolean(options.nx);
        return true;
      },
      raw: () => ({ pTTL: async () => 4200 }),
      delete: async () => undefined,
    } as never;
    const store = new CooldownStore(redis);
    const first = await store.acquire("key", 5000);
    const second = await store.acquire("key", 5000);
    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(false);
    expect(second.remainingMs).toBe(4200);
  });
});

describe("MongoDB document validation", () => {
  it("accepts a complete message document and rejects malformed payloads", async () => {
    const stored: unknown[] = [];
    const database = {
      database: () => ({
        collection: () => ({
          updateOne: async (_filter: unknown, update: { $set: unknown }) =>
            stored.push(update.$set),
          insertOne: async (document: unknown) => stored.push(document),
        }),
      }),
    } as never;
    const repository = new ArchiveRepository(database, 90);
    await repository.archiveMessage({
      messageId: "m1",
      threadId: "t1",
      senderId: "u1",
      body: "hello",
    });
    expect(stored).toHaveLength(1);
    await expect(repository.archiveEvent("", null, {})).rejects.toThrow();
  });
});

describe("announcement delivery", () => {
  function harness(failThread: string) {
    const deliveries = new Map<string, string>();
    const deliveriesSeen: string[] = [];
    const announcements = {
      find: async () => ({
        id: "ann1",
        title: "Update",
        body: "Hello",
        announcement_type: "general",
        priority: "normal",
        created_by: "owner",
        created_at: new Date(),
        scheduled_for: null,
        status: "delivering",
        total_targets: 0,
        successful_deliveries: 0,
        failed_deliveries: 0,
      }),
      setTargets: async () => undefined,
      addDelivery: async (entry: { threadId: string }) => {
        if (deliveries.has(entry.threadId)) return false;
        deliveries.set(entry.threadId, "pending");
        deliveriesSeen.push(entry.threadId);
        return true;
      },
      markDeliveryByKey: async () => undefined,
      refreshSummary: async () => undefined,
      setStatus: async () => undefined,
    };
    const messenger = {
      buildEligibleGroupList: async () => [{ id: "g1" }, { id: failThread }, { id: "g3" }],
      sendText: async (threadId: string) => {
        if (threadId === failThread) throw new Error("recipient unavailable");
        return { messageId: "sent" };
      },
    } as unknown as MessengerGateway;
    const databases = {
      announcements,
      checkpoints: { recordDelivery: async () => true, recordActivity: async () => undefined },
    } as unknown as DatabaseBundle;
    return {
      service: new AnnouncementService(config, databases, messenger, logger),
      deliveriesSeen,
    };
  }

  it("reports partial delivery honestly when one group fails", async () => {
    const { service } = harness("g2");
    const summary = await service.deliver("ann1");
    expect(summary.targets).toBe(3);
    expect(summary.sent).toBe(2);
    expect(summary.failed).toBe(1);
  });

  it("skips duplicate deliveries to the same group", async () => {
    const { service, deliveriesSeen } = harness("none");
    await service.deliver("ann1");
    expect(new Set(deliveriesSeen).size).toBe(deliveriesSeen.length);
  });
});

describe("maintenance notices", () => {
  it("records delivery and never repeats an idempotent notice", async () => {
    const sent: string[] = [];
    const recorded: string[] = [];
    const repository = {
      find: async () => ({
        id: "m1",
        title: "Upgrade",
        reason: "DB work",
        description: "",
        starts_at: new Date(Date.now() + 3600000),
        ends_at: new Date(Date.now() + 7200000),
        timezone_name: "Asia/Manila",
        expected_duration_ms: "3600000",
        status: "SCHEDULED",
        notice_message: "",
        created_by: "owner",
        created_at: new Date(),
        actual_start_at: null,
        actual_end_at: null,
        updated_at: new Date(),
        notification_status: "pending",
      }),
      recordNotification: async (entry: { threadId: string; idempotencyKey: string }) =>
        recorded.push(entry.idempotencyKey),
    };
    const claimedKeys = new Set<string>();
    const databases = {
      maintenance: repository,
      checkpoints: {
        recordIdempotency: async (key: string) => {
          if (claimedKeys.has(key)) return false;
          claimedKeys.add(key);
          return true;
        },
        setRecoveryValue: async () => undefined,
      },
    } as unknown as DatabaseBundle;
    const messenger = {
      groups: { eligibleGroups: () => [{ threadId: "g1" }, { threadId: "g2" }] },
      sendText: async (threadId: string) => {
        sent.push(threadId);
        return { messageId: "sent" };
      },
    } as unknown as MessengerGateway;
    const service = new MaintenanceService(config, databases, messenger, logger);
    await service.deliverScheduledNotice("m1", 60);
    await service.deliverScheduledNotice("m1", 60);
    expect(sent).toHaveLength(2);
    expect(recorded).toHaveLength(2);
  });

  it("validates that maintenance cannot end before it starts", async () => {
    const databases = { maintenance: {} } as unknown as DatabaseBundle;
    const messenger = { groups: { eligibleGroups: () => [] } } as unknown as MessengerGateway;
    const service = new MaintenanceService(config, databases, messenger, logger);
    await expect(
      service.createSchedule({
        title: "Bad",
        reason: "",
        startDate: "2026-12-02",
        startTime: "01:00",
        endDate: "2026-12-01",
        endTime: "22:00",
        createdBy: "owner",
      }),
    ).rejects.toThrow(/after the start/);
  });
});

describe("Messenger identity resolution", () => {
  it("extracts a Facebook user ID from a profile URL", () => {
    expect(extractUserIdFromUrl("https://www.facebook.com/profile.php?id=1234567890")).toBe(
      "1234567890",
    );
    expect(extractUserIdFromUrl("https://www.facebook.com/juan.dela.cruz")).toBeNull();
  });
});
