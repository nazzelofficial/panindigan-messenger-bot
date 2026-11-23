import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { configSchema } from "../../src/config/schema.js";
import { CommandDispatcher } from "../../src/commands/dispatcher.js";
import { CommandRegistry } from "../../src/commands/registry.js";
import { loadAllCommands } from "../../src/commands/loader.js";
import type { Services } from "../../src/services/container.js";
import type { MessengerGateway } from "../../src/messenger/client.js";
import type { DatabaseBundle } from "../../src/databases/index.js";
import type { AppLogger } from "../../src/logging/logger.js";
import type { IncomingEvent } from "../../src/messenger/client.js";

const config = configSchema.parse(
  JSON.parse(readFileSync(resolve(process.cwd(), "config.json"), "utf8")),
);

function harness(active: boolean, overrides: {
  cooldownResult?: { allowed: boolean; remainingMs: number };
  antiSpamResult?: { allowed: boolean; delayMs: number; count: number };
} = {}) {
  const sent: string[] = [];
  const executed: string[] = [];
  const registry = new CommandRegistry();
  for (const command of loadAllCommands()) {
    const wrapped =
      command.name === "balance"
        ? {
            ...command,
            run: async () => {
              executed.push(command.name);
              return { text: "balance" };
            },
          }
        : command;
    registry.register(wrapped);
  }
  const services = {
    permissions: {
      hasPermission: () => true,
      isOwner: () => false,
      isAdmin: () => false,
      checkAllowlists: () => ({ allowed: true, reason: "" }),
      ensureUser: async () => undefined,
    },
    maintenance: {
      currentStatus: async () => ({
        status: active ? "ACTIVE" : "OFF",
        title: "Database Upgrade",
        endsAt: Date.now() + 3600000,
      }),
    },
    cooldowns: {
      checkCommand: async () => overrides.cooldownResult ?? ({ allowed: true, remainingMs: 0 }),
      check: async () => ({ allowed: true, remainingMs: 0 }),
      acquire: async () => ({ allowed: true, remainingMs: 0 }),
    },
    antiSpam: { evaluate: async () => overrides.antiSpamResult ?? ({ allowed: true, delayMs: 0, count: 1 }) },
    cache: {
      get: async () => undefined,
      set: async () => undefined,
      delete: async () => undefined,
    },
    outbox: {
      sendChunked: async (_thread: string, text: string) => {
        sent.push(text);
        return 1;
      },
    },
  } as unknown as Services;
  const messenger = {
    sendText: async (_thread: string, text: string) => {
      sent.push(text);
      return { messageId: "m1" };
    },
    react: async () => undefined,
  } as unknown as MessengerGateway;
  const databases = {
    health: async () => [
      { name: "PostgreSQL", state: "connected", checkedAt: Date.now() },
      { name: "Turso", state: "connected", checkedAt: Date.now() },
    ],
    redis: { keys: { cooldown: () => "key" } },
    operational: { recordCommand: async () => undefined },
  } as unknown as DatabaseBundle;
  const logger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() } as unknown as AppLogger;
  const dispatcher = new CommandDispatcher(
    config,
    registry,
    services,
    messenger,
    databases,
    logger,
  );
  return { dispatcher, sent, executed };
}

const event = (body: string): IncomingEvent => ({
  kind: "message",
  event: {
    type: "message",
    messageId: "msg1",
    threadId: "thread1",
    senderId: "123456789",
    isGroup: true,
    body,
    attachments: [],
    mentions: [],
    isSelf: false,
    timestamp: Date.now(),
  },
});

describe("central command pipeline", () => {
  it("blocks ordinary commands during active maintenance", async () => {
    const { dispatcher, sent, executed } = harness(true);
    const outcome = await dispatcher.handle(event("!balance"));
    expect(outcome.success).toBe(false);
    expect(executed).toHaveLength(0);
    expect(sent.join(" ")).toContain("MAINTENANCE IN PROGRESS");
  });

  it("keeps status commands available during maintenance", async () => {
    const { dispatcher, sent } = harness(true);
    const outcome = await dispatcher.handle(event("!status"));
    expect(outcome.handled).toBe(true);
    expect(sent.join(" ")).toContain("PANINDIGAN STATUS");
  });

  it("executes ordinary commands when maintenance is off", async () => {
    const { dispatcher, executed } = harness(false);
    await dispatcher.handle(event("!balance"));
    expect(executed).toContain("balance");
  });

  it("shows a visible cooldown message when a command is on cooldown", async () => {
    const { dispatcher, sent, executed } = harness(false, {
      cooldownResult: { allowed: false, remainingMs: 3000 },
    });
    const outcome = await dispatcher.handle(event("!balance"));
    expect(outcome.success).toBe(false);
    expect(executed).toHaveLength(0);
    expect(sent.join(" ")).toContain("Please wait");
  });

  it("shows a visible slow-down message when anti-spam denies", async () => {
    const { dispatcher, sent, executed } = harness(false, {
      antiSpamResult: { allowed: false, delayMs: 2000, count: 9 },
    });
    const outcome = await dispatcher.handle(event("!balance"));
    expect(outcome.success).toBe(false);
    expect(executed).toHaveLength(0);
    expect(sent.join(" ")).toContain("slow down");
  });
});
