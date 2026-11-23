import { afterEach, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { configSchema } from "../../src/config/schema.js";
import { resolveUptimePort } from "../../src/api/servers.js";

const config = configSchema.parse(
  JSON.parse(readFileSync(resolve(process.cwd(), "config.json"), "utf8")),
);

describe("uptime bind port", () => {
  const original = process.env.PORT;
  afterEach(() => {
    if (original === undefined) delete process.env.PORT;
    else process.env.PORT = original;
  });

  it("listens on the configured port when PORT is absent", () => {
    delete process.env.PORT;
    expect(resolveUptimePort(config)).toBe(config.uptimeEndpoint.port);
  });

  it("honours the port injected by the hosting platform", () => {
    process.env.PORT = "8080";
    expect(resolveUptimePort(config)).toBe(8080);
  });

  it("ignores an invalid injected port", () => {
    process.env.PORT = "not-a-port";
    expect(resolveUptimePort(config)).toBe(config.uptimeEndpoint.port);
  });
});
