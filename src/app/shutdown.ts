import type { AppLogger } from "../logging/logger.js";

/** Guarantees the process cannot hang forever while closing dependencies. */
export function withShutdownTimeout(
  work: () => Promise<void>,
  milliseconds: number,
  logger: AppLogger,
): Promise<void> {
  return new Promise<void>((resolve) => {
    let settled = false;
    const finish = (): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve();
    };
    const timer = setTimeout(() => {
      logger.error({ milliseconds }, "Graceful shutdown timed out; forcing exit");
      finish();
    }, milliseconds);
    work().then(finish, (error: unknown) => {
      logger.error(
        { error: error instanceof Error ? error.message : "shutdown error" },
        "Error during shutdown",
      );
      finish();
    });
  });
}
