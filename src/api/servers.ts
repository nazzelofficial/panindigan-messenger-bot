import Fastify, { type FastifyInstance } from "fastify";
import { WebSocketServer } from "ws";
import type { Server } from "node:http";
import type { AppConfig, ResolvedSecrets } from "../config/index.js";
import type { AppLogger } from "../logging/logger.js";
import type { Services } from "../services/container.js";
import type { MessengerGateway } from "../messenger/client.js";
import type { DatabaseManager } from "../databases/index.js";
import { hmacSha256, safeEqual } from "../utils/crypto.js";
import { readEnvironment } from "../utils/env.js";

export interface OptionalServers {
  stop(): Promise<void>;
}

/** Platform-hosted services (Render, Fly, Railway) inject the bind port via PORT. */
export function resolveUptimePort(config: AppConfig): number {
  const injected = readEnvironment("PORT");
  if (injected === undefined) return config.uptimeEndpoint.port;
  const parsed = Number(injected);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535
    ? parsed
    : config.uptimeEndpoint.port;
}

export async function startOptionalServers(
  config: AppConfig,
  secrets: ResolvedSecrets,
  databases: DatabaseManager,
  services: Services,
  messenger: MessengerGateway,
  logger: AppLogger,
): Promise<OptionalServers> {
  const instances: FastifyInstance[] = [];
  const sockets: WebSocketServer[] = [];

  if (config.webDashboard.enabled) {
    const app = Fastify({ logger: false });
    const secret = secrets.dashboardSessionSecret!;
    const sign = (value: string) => hmacSha256(secret, value);
    app.post("/api/session", async (request, reply) => {
      const header = request.headers.authorization ?? "";
      const supplied = header.startsWith("Bearer ") ? header.slice(7) : "";
      if (!safeEqual(supplied, secret)) {
        await reply.code(401).send({ error: "unauthorized" });
        return;
      }
      const issued = Date.now().toString();
      const token = `${issued}.${sign(issued)}`;
      await reply.send({ token, expiresAt: Date.now() + config.webDashboard.sessionLifetimeMs });
    });
    app.addHook("onRequest", async (request, reply) => {
      if (request.url === "/api/session") return;
      const header = request.headers.authorization ?? "";
      const raw = header.startsWith("Bearer ") ? header.slice(7) : "";
      const dot = raw.lastIndexOf(".");
      const issuedAt = Number(raw.slice(0, dot));
      const expired = Date.now() - issuedAt > config.webDashboard.sessionLifetimeMs;
      if (
        dot < 1 ||
        !Number.isFinite(issuedAt) ||
        expired ||
        !safeEqual(raw.slice(dot + 1), sign(raw.slice(0, dot)))
      ) {
        await reply.code(401).send({ error: "unauthorized" });
      }
    });
    app.get("/api/status", async () => ({
      maintenance: await services.maintenance.currentStatus(),
      databases: await databases.health(),
      messenger: messenger.health(),
    }));
    app.get("/api/commands", async () => ({
      categories: Object.keys(config.modules),
      registry: "validated at startup",
    }));
    await app.listen({ host: config.webDashboard.host, port: config.webDashboard.port });
    instances.push(app);
    logger.info({ port: config.webDashboard.port }, "Local web dashboard started");
  }

  if (config.uptimeEndpoint.enabled) {
    const app = Fastify({ logger: false });
    app.get("/health", async () => ({ ok: true, timestamp: Date.now() }));
    app.get("/uptime", async () => ({
      ok: true,
      uptimeSeconds: Math.floor(process.uptime()),
      messenger: messenger.health().state,
      databases: (await databases.health()).map((entry) => ({
        name: entry.name,
        state: entry.state,
      })),
    }));
    const uptimePort = resolveUptimePort(config);
    await app.listen({ host: config.uptimeEndpoint.host, port: uptimePort });
    instances.push(app);
    if (config.uptimeEndpoint.websocket.enabled) {
      const server = WebSocketServer as unknown as new (options: {
        noServer: boolean;
      }) => WebSocketServer;
      const wss = new server({ noServer: true });
      const httpServer = app.server as Server;
      httpServer.on("upgrade", (request, socket, head) => {
        const url = new URL(request.url ?? "/", "http://localhost");
        if (url.pathname !== config.uptimeEndpoint.websocket.path) {
          socket.destroy();
          return;
        }
        const supplied = url.searchParams.get("token") ?? "";
        if (!secrets.uptimeSocketToken || !safeEqual(supplied, secrets.uptimeSocketToken)) {
          socket.destroy();
          return;
        }
        wss.handleUpgrade(request, socket, head, (ws) => wss.emit("connection", ws, request));
      });
      wss.on("connection", (socket) => {
        const timer = setInterval(
          () => {
            if (socket.readyState === socket.OPEN) {
              socket.send(
                JSON.stringify({
                  uptimeSeconds: Math.floor(process.uptime()),
                  timestamp: Date.now(),
                }),
              );
            }
          },
          config.uptimeEndpoint.websocket.path === "/uptime" ? 5000 : 5000,
        );
        socket.on("close", () => clearInterval(timer));
      });
      sockets.push(wss);
      logger.info({ port: uptimePort }, "Uptime websocket started");
    }
    logger.info({ host: config.uptimeEndpoint.host, port: uptimePort }, "Uptime endpoint started");
  }

  return {
    stop: async () => {
      for (const socket of sockets)
        await new Promise<void>((resolve) => socket.close(() => resolve()));
      await Promise.all(instances.map((instance) => instance.close()));
    },
  };
}
