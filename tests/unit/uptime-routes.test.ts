import Fastify from "fastify";
import { describe, expect, it, vi } from "vitest";
import { registerUptimeRoutes } from "../../src/api/servers.js";
import type { MessengerGateway } from "../../src/messenger/client.js";
import type { DatabaseManager } from "../../src/databases/index.js";

const deps = {
  messenger: { health: () => ({ state: "connected" }) } as unknown as MessengerGateway,
  databases: {
    health: async () => [{ name: "PostgreSQL", state: "connected", checkedAt: Date.now() }],
  } as unknown as DatabaseManager,
};

function app() {
  const instance = Fastify();
  registerUptimeRoutes(instance, deps);
  return instance;
}

describe("uptime server routes", () => {
  it("serves GET / with a status overview instead of a 404", async () => {
    const server = app();
    const response = await server.inject({ method: "GET", url: "/" });
    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.ok).toBe(true);
    expect(body.endpoints).toContain("/health");
    await server.close();
  });

  it("still serves /health and /uptime", async () => {
    const server = app();
    expect((await server.inject({ method: "GET", url: "/health" })).statusCode).toBe(200);
    const uptime = await server.inject({ method: "GET", url: "/uptime" });
    expect(uptime.statusCode).toBe(200);
    expect(uptime.json().messenger).toBe("connected");
    await server.close();
  });

  it("returns a consistent 404 body for unknown paths", async () => {
    const server = app();
    const response = await server.inject({ method: "GET", url: "/does-not-exist" });
    expect(response.statusCode).toBe(404);
    expect(response.json().message).toContain("/health");
    await server.close();
  });
});
