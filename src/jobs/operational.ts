import { watch, type FSWatcher } from "node:fs";
import path from "node:path";
import type { AppConfig, ResolvedSecrets } from "../config/index.js";
import type { AppLogger } from "../logging/logger.js";
import type { Services } from "../services/container.js";
import { cronMatches, parseCron } from "../utils/timezone.js";
import { loadConfiguration } from "../config/index.js";

export interface OperationalJobs {
  stop(): void;
}

/** Optional operational tools. All are disabled by default in production. */
export function startOperationalJobs(
  config: AppConfig,
  secrets: ResolvedSecrets,
  services: Services,
  logger: AppLogger,
): OperationalJobs {
  const timers: NodeJS.Timeout[] = [];
  const watchers: FSWatcher[] = [];

  if (config.scheduledRestart.enabled && config.scheduledRestart.cronExpression) {
    const schedule = parseCron(config.scheduledRestart.cronExpression);
    timers.push(
      setInterval(() => {
        if (!cronMatches(schedule, Date.now(), config.scheduledRestart.timezone)) return;
        logger.warn("Scheduled restart window reached; exiting for supervisor restart");
        setTimeout(
          () => process.exit(0),
          Math.max(1000, config.messengerRecovery.shutdownGracePeriodMs),
        );
      }, 60_000),
    );
    logger.info("Scheduled restart monitor started");
  }

  if (config.healthMonitoring.enabled && secrets.uptimeTargetUrl) {
    timers.push(
      setInterval(() => {
        void fetch(secrets.uptimeTargetUrl!, {
          signal: AbortSignal.timeout(config.healthMonitoring.requestTimeoutMs),
        })
          .then((response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
          })
          .catch((error: unknown) => {
            const detail = error instanceof Error ? error.message : "check failed";
            logger.error({ detail }, "Uptime target health check failed");
            void services.alerts.send("critical", "Uptime target unreachable", detail);
          });
      }, config.healthMonitoring.checkIntervalSeconds * 1000),
    );
    logger.info("Health monitoring started");
  }

  if (config.developmentWatcher.enabled) {
    if (config.application.environment === "production") {
      logger.warn(
        "Development watcher is enabled in production; file changes are logged but never hot-reloaded into authentication state",
      );
    }
    const sourceDirectory = path.resolve(process.cwd(), "src");
    let debounce: NodeJS.Timeout | undefined;
    const watcher = watch(sourceDirectory, { recursive: true }, (_event, filename) => {
      if (!filename) return;
      if (config.developmentWatcher.excludedCommands.some((name) => filename.includes(name)))
        return;
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => {
        try {
          const reloaded = loadConfiguration();
          logger.info(
            { warnings: reloaded.warnings.length },
            "Configuration re-validated after source change; credentials and authentication were not reloaded",
          );
        } catch (error) {
          logger.error(
            { error: String(error) },
            "Configuration re-validation failed after source change",
          );
        }
      }, config.developmentWatcher.reloadDelayMs);
    });
    watchers.push(watcher);
    logger.info("Development watcher started");
  }

  return {
    stop: () => {
      for (const timer of timers) clearInterval(timer);
      for (const watcher of watchers) watcher.close();
    },
  };
}
