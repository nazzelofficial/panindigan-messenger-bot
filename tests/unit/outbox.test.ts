import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { configSchema } from "../../src/config/schema.js";
import { OutboxService } from "../../src/services/outbox/service.js";
import type { MessengerGateway } from "../../src/messenger/client.js";
import type { DatabaseBundle } from "../../src/databases/index.js";

function fastConfig() {
  const parsed = configSchema.parse(
    JSON.parse(readFileSync(resolve(process.cwd(), "config.json"), "utf8")),
  );
  const clone = structuredClone(parsed);
  clone.rateLimiting.antiSpam.initialDelayMs = 2;
  clone.rateLimiting.antiSpam.maximumDelayMs = 8;
  clone.announcements.obeyMessengerRateLimits = false;
  return clone;
}

function harness(failures: number) {
  const sent: string[] = [];
  let attempts = 0;
  const messenger = {
    sendText: async (_thread: string, text: string) => {
      attempts += 1;
      if (attempts <= failures) throw new Error("Rate limit exceeded");
      sent.push(text);
      return { messageId: "m" };
    },
  } as unknown as MessengerGateway;
  const logger = { warn: () => undefined, info: () => undefined, error: () => undefined } as never;
  const service = new OutboxService(fastConfig(), {} as DatabaseBundle, messenger, logger);
  return { service, sent, attempts };
}

describe("outbox rate-limit handling", () => {
  it("retries a rate-limited send and then delivers the response", async () => {
    const { service, sent } = harness(2);
    const sentCount = await service.sendChunked("thread1", "hello");
    expect(sentCount).toBe(1);
    expect(sent).toEqual(["hello"]);
  });

  it("shows a cooldown notice when all retries are exhausted", async () => {
    const { service, sent } = harness(3);
    const sentCount = await service.sendChunked("thread1", "hello");
    expect(sentCount).toBe(0);
    expect(sent).toHaveLength(1);
    expect(sent[0]).toContain("rate limit reached");
  });

  it("does not retry unrelated errors", async () => {
    const messenger = {
      sendText: async () => {
        throw new Error("Messenger client is not connected.");
      },
    } as unknown as MessengerGateway;
    const logger = {
      warn: () => undefined,
      info: () => undefined,
      error: () => undefined,
    } as never;
    const service = new OutboxService(fastConfig(), {} as DatabaseBundle, messenger, logger);
    await expect(service.sendChunked("thread1", "hello")).rejects.toThrow(/not connected/);
  });
});
