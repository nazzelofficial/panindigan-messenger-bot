import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

vi.mock("panindigan-automate", async (importOriginal) => {
  const actual = await importOriginal<typeof import("panindigan-automate")>();
  class FailingClient {
    on(): () => void {
      return () => undefined;
    }
    async login(): Promise<never> {
      throw new Error("AUTH_LOGIN_REJECTED: session tokens unavailable");
    }
    async logout(): Promise<void> {
      return undefined;
    }
    isConnected(): boolean {
      return false;
    }
  }
  return { ...actual, MessengerClient: FailingClient };
});

const { configSchema } = await import("../../src/config/schema.js");
const { MessengerGateway } = await import("../../src/messenger/client.js");

const config = configSchema.parse(
  JSON.parse(readFileSync(resolve(process.cwd(), "config.json"), "utf8")),
);

describe("messenger connection resilience", () => {
  it("keeps running and reports disconnected when authentication fails", async () => {
    const errors: string[] = [];
    const logger = {
      error: (_context: unknown, message: string) => errors.push(message),
      warn: vi.fn(),
      info: vi.fn(),
      debug: vi.fn(),
    } as never;
    const databases = {
      checkpoints: { setRecoveryValue: async () => undefined },
    } as never;
    const secrets = {
      appState: JSON.stringify([
        { key: "c_user", value: "1" },
        { key: "xs", value: "2" },
        { key: "datr", value: "3" },
      ]),
    } as never;
    const gateway = new MessengerGateway(config, secrets, databases, logger);

    expect(() => gateway.start()).not.toThrow();
    await new Promise((done) => setTimeout(done, 50));

    expect(gateway.isConnected).toBe(false);
    expect(gateway.health().state).toBe("disconnected");
    expect(errors.some((message) => message.includes("stays online"))).toBe(true);

    await gateway.stop();
  });
});
