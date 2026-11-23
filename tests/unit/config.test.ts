import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { configSchema, formatConfigIssues } from "../../src/config/schema.js";

const raw = JSON.parse(readFileSync(path.resolve(process.cwd(), "config.json"), "utf8")) as unknown;

describe("configuration", () => {
  it("parses the authoritative config.json with strict validation", () => {
    const result = configSchema.safeParse(raw);
    expect(result.success, result.success ? "" : formatConfigIssues(result.error).join("\n")).toBe(
      true,
    );
  });

  it("rejects unknown legacy properties instead of silently accepting them", () => {
    const candidate = { ...(raw as Record<string, unknown>), legacyBotToken: "abc" };
    const result = configSchema.safeParse(candidate);
    expect(result.success).toBe(false);
    if (!result.success)
      expect(formatConfigIssues(result.error).join(" ")).toContain("legacyBotToken");
  });

  it("rejects a positive application-level limit for ask6", () => {
    const candidate = structuredClone(raw) as Record<string, unknown>;
    const ai = candidate["artificialIntelligence"] as Record<string, unknown>;
    const quotas = ai["requestQuotas"] as Record<string, unknown>;
    quotas["ask6"] = { maximumRequests: 5, periodHours: 24 };
    const result = configSchema.safeParse(candidate);
    expect(result.success).toBe(false);
  });

  it("rejects a non-zero coin price for ask6", () => {
    const candidate = structuredClone(raw) as Record<string, unknown>;
    const ai = candidate["artificialIntelligence"] as Record<string, unknown>;
    const prices = ai["coinPrices"] as Record<string, unknown>;
    prices["ask6"] = 1;
    expect(configSchema.safeParse(candidate).success).toBe(false);
  });

  it("rejects colliding web ports when both local services are enabled", () => {
    const candidate = structuredClone(raw) as Record<string, unknown>;
    (candidate["webDashboard"] as Record<string, unknown>)["enabled"] = true;
    (candidate["uptimeEndpoint"] as Record<string, unknown>)["enabled"] = true;
    (candidate["uptimeEndpoint"] as Record<string, unknown>)["port"] = 3001;
    const result = configSchema.safeParse(candidate);
    expect(result.success).toBe(false);
    if (!result.success)
      expect(formatConfigIssues(result.error).join(" ")).toContain("share a port");
  });

  it("stores only environment-variable references, never credential values", () => {
    const parsed = configSchema.parse(raw);
    expect(parsed.messenger.authentication).toEqual({
      method: "appState",
      appStateEnv: "FB_APPSTATE",
    });
    expect(parsed).not.toHaveProperty("email");
    expect(parsed).not.toHaveProperty("password");
    expect(parsed.databases.turso.authenticationTokenEnv).toBe("TURSO_AUTH_TOKEN");
    const text = readFileSync(path.resolve(process.cwd(), "config.json"), "utf8");
    expect(text).not.toContain("appState=");
    expect(text).not.toMatch(/"apiKey"\s*:/);
  });
});
