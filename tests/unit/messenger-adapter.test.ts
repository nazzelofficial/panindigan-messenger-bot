import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { configSchema } from "../../src/config/schema.js";
import { buildClientOptions, parseAndValidateAppState } from "../../src/messenger/adapter.js";
import type { ResolvedSecrets } from "../../src/config/index.js";

const config = configSchema.parse(
  JSON.parse(readFileSync(resolve(process.cwd(), "config.json"), "utf8")),
);
const secrets = { appState: "[]" } as ResolvedSecrets;

describe("messenger adapter", () => {
  it("passes only verified panindigan-automate options", () => {
    const options = buildClientOptions(config, secrets) as Record<string, unknown>;
    expect(options["httpTimeout"]).toBe(30000);
    expect(options["update"]).toEqual({ enabled: false });
    expect(options).not.toHaveProperty("email");
    expect(options).not.toHaveProperty("password");
    expect(options).not.toHaveProperty("appState");
  });

  it("passes the configured desktop user-agent through to the library", () => {
    const options = buildClientOptions(config, secrets) as Record<string, unknown>;
    expect(options["userAgent"]).toBe(config.messenger.userAgent);
    expect(String(options["userAgent"])).toContain("Windows NT 10.0");
    expect(String(options["userAgent"])).toContain("Chrome/159.0.8154.13");
    expect(String(options["userAgent"])).not.toContain("Mobile");
  });

  it("accepts a valid AppState array by cookie name", () => {
    const state = JSON.stringify([
      { key: "c_user", value: "123" },
      { key: "xs", value: "abc" },
      { key: "datr", value: "def" },
    ]);
    expect(() => parseAndValidateAppState(state)).not.toThrow();
  });

  it("rejects AppState missing required cookies without echoing values", () => {
    expect(() =>
      parseAndValidateAppState(JSON.stringify([{ key: "c_user", value: "secret-value" }])),
    ).toThrow(/xs, datr/);
  });

  it("rejects malformed AppState JSON", () => {
    expect(() => parseAndValidateAppState("not-json")).toThrow(/valid JSON/);
  });

  it("warns about recommended cookies without logging their values", () => {
    const warnings: Array<{ missingCookies?: string[] }> = [];
    const logger = {
      warn: (context: { missingCookies?: string[] }) => warnings.push(context),
    } as never;
    const state = JSON.stringify([
      { key: "c_user", value: "super-secret-id" },
      { key: "xs", value: "super-secret-xs" },
      { key: "datr", value: "super-secret-datr" },
    ]);
    parseAndValidateAppState(state, logger);
    expect(warnings[0]?.missingCookies).toEqual(["sb", "fr", "presence"]);
    expect(JSON.stringify(warnings)).not.toContain("super-secret");
  });
});
