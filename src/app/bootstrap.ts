import "dotenv/config";
import { loadConfiguration, type LoadedConfiguration } from "../config/index.js";
import { createLogger, type AppLogger } from "../logging/logger.js";
import { DatabaseManager } from "../databases/index.js";
import { MessengerGateway } from "../messenger/client.js";
import { Services } from "../services/container.js";
import { createValidatedRegistry } from "../commands/loader.js";
import { CommandDispatcher } from "../commands/dispatcher.js";
import { Application } from "./application.js";

export interface BootstrapResult {
  application: Application;
  logger: AppLogger;
  loaded: LoadedConfiguration;
}

/** Builds and verifies the complete application graph before any work starts. */
export async function bootstrap(): Promise<BootstrapResult> {
  const loaded = loadConfiguration();
  const logger = createLogger(loaded.config);
  for (const warning of loaded.warnings) logger.warn(warning);

  const databases = new DatabaseManager(loaded.config, loaded.secrets, logger);
  await databases.initialize();

  const registry = createValidatedRegistry(loaded.config);
  logger.info({ commands: registry.size }, "Command registry validated");

  const messenger = new MessengerGateway(loaded.config, loaded.secrets, databases.bundle, logger);
  const services = new Services(loaded.config, loaded.secrets, databases.bundle, messenger, logger);
  const dispatcher = new CommandDispatcher(
    loaded.config,
    registry,
    services,
    messenger,
    databases.bundle,
    logger,
  );

  const application = new Application(
    loaded,
    logger,
    databases,
    messenger,
    services,
    registry,
    dispatcher,
  );
  return { application, logger, loaded };
}
