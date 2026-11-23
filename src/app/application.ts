import type { AppLogger } from "../logging/logger.js";
import type { Services } from "../services/container.js";
import type { MessengerGateway } from "../messenger/client.js";
import type { DatabaseManager } from "../databases/index.js";
import type { CommandRegistry } from "../commands/registry.js";
import type { CommandDispatcher } from "../commands/dispatcher.js";
import { startOptionalServers, type OptionalServers } from "../api/servers.js";
import { startOperationalJobs, type OperationalJobs } from "../jobs/operational.js";
import type { LoadedConfiguration } from "../config/index.js";
import { withShutdownTimeout } from "./shutdown.js";

export class Application {
  private optionalServers: OptionalServers | undefined;
  private operationalJobs: OperationalJobs | undefined;
  private shuttingDown = false;

  public constructor(
    private readonly loaded: LoadedConfiguration,
    private readonly logger: AppLogger,
    private readonly databases: DatabaseManager,
    private readonly messenger: MessengerGateway,
    private readonly services: Services,
    private readonly registry: CommandRegistry,
    private readonly dispatcher: CommandDispatcher,
  ) {}

  public async start(): Promise<void> {
    const { config } = this.loaded;
    this.logger.info(
      {
        commands: this.registry.size,
        version: process.version,
        environment: config.application.environment,
      },
      "Panindigan Messenger Bot starting",
    );

    await this.services.permissions.hydrate();
    this.services.events.setDispatcher(this.dispatcher);
    this.messenger.setHandler(async (event) => {
      try {
        await this.services.events.handle(event);
      } catch (error) {
        this.logger.error(
          { error: error instanceof Error ? error.message : "event processing failed" },
          "Incoming event failed",
        );
      }
    });

    if (config.messengerRecovery.mqttRecoveryEnabled) {
      this.messenger.setRecoveryCallback(() => {
        this.logger.warn(
          "MQTT recovery requested after session death; restarting for a fresh AppState session",
        );
        setTimeout(
          () => {
            void withShutdownTimeout(
              () => this.stop(),
              config.messengerRecovery.shutdownGracePeriodMs,
              this.logger,
            ).then(() => process.exit(0));
          },
          Math.min(config.messengerRecovery.recoveryIntervalMs, 60_000),
        );
      });
    }

    await this.messenger.start();

    this.registerScheduledJobs();
    if (config.taskScheduler.enabled) this.services.scheduler.start();

    this.optionalServers = await startOptionalServers(
      config,
      this.loaded.secrets,
      this.databases,
      this.services,
      this.messenger,
      this.logger,
    );
    this.operationalJobs = startOperationalJobs(
      config,
      this.loaded.secrets,
      this.services,
      this.logger,
    );

    this.installSignalHandlers();
    this.logger.info("Panindigan Messenger Bot is running");
  }

  private registerScheduledJobs(): void {
    const { services, messenger, logger } = this;
    services.scheduler.register("maintenance.start", async (payload) => {
      const id = String(payload.maintenanceId ?? "");
      await services.maintenance.start(id, "scheduler");
    });
    services.scheduler.register("maintenance.end", async (payload) => {
      const id = String(payload.maintenanceId ?? "");
      await services.maintenance.finish(id, "scheduler");
    });
    services.scheduler.register("maintenance.notice", async (payload) => {
      await services.maintenance.deliverScheduledNotice(
        String(payload.maintenanceId ?? ""),
        Number(payload.leadMinutes ?? 0),
      );
    });
    services.scheduler.register("announcement.deliver", async (payload) => {
      await services.announcements.deliver(String(payload.announcementId ?? ""));
    });
    services.scheduler.register("scheduledmessage", async (payload) => {
      await messenger.sendText(String(payload.threadId ?? ""), String(payload.message ?? ""));
    });
    services.scheduler.register("reminder", async (payload) => {
      await messenger.sendText(String(payload.threadId ?? ""), String(payload.message ?? ""));
    });
    services.scheduler.register("automation.task", async (payload) => {
      await services.automation.recordRun(
        String(payload.threadId ?? ""),
        String(payload.kind ?? "task"),
        payload,
      );
      logger.info({ kind: payload.kind }, "Automation task executed");
    });
  }

  private installSignalHandlers(): void {
    const handler = (signal: string): void => {
      if (this.shuttingDown) return;
      this.shuttingDown = true;
      this.logger.info({ signal }, "Shutdown requested");
      void this.stop().then(() => process.exit(0));
    };
    process.once("SIGINT", () => handler("SIGINT"));
    process.once("SIGTERM", () => handler("SIGTERM"));
  }

  public async stop(): Promise<void> {
    this.services.scheduler.stop();
    this.operationalJobs?.stop();
    await this.optionalServers?.stop();
    await this.messenger.stop();
    await this.databases.close();
    this.logger.info("Shutdown complete");
  }
}
