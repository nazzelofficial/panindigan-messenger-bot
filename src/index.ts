import "dotenv/config";
import { bootstrap } from "./app/bootstrap.js";
import { withShutdownTimeout } from "./app/shutdown.js";

async function main(): Promise<void> {
  const { application, logger } = await bootstrap();
  await application.start();

  process.once("exit", () => logger.flush());
  process.once("uncaughtException", (error) => {
    logger.fatal({ error: error.message }, "Uncaught exception");
    void withShutdownTimeout(() => application.stop(), 10_000, logger).then(() => process.exit(1));
  });
  process.once("unhandledRejection", (reason) => {
    logger.error({ reason: String(reason) }, "Unhandled rejection");
  });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown startup error";
  process.stderr.write(`Startup failed: ${message}\n`);
  process.exit(1);
});
