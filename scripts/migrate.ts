import "dotenv/config";
import { loadConfiguration } from "../src/config/index.js";
import { DatabaseManager } from "../src/databases/index.js";
import { createLogger } from "../src/logging/logger.js";

/**
 * Applies every pending migration. DatabaseManager.initialize() connects each
 * enabled store and runs its migrator, so there is nothing to call here beyond
 * bootstrapping the manager and reporting the resulting health state.
 */
async function main(): Promise<void> {
  const { config, secrets, warnings } = loadConfiguration();
  const logger = createLogger(config);
  for (const warning of warnings) logger.warn(warning);

  const databases = new DatabaseManager(config, secrets, logger);
  try {
    await databases.initialize();
    for (const component of await databases.health()) {
      logger.info(
        { database: component.name, state: component.state, detail: component.detail },
        "Database health after migration",
      );
    }
    logger.info("All migrations are up to date");
  } finally {
    await databases.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
