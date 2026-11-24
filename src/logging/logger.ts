import pino, { type Logger } from "pino";
import type { AppConfig } from "../config/index.js";
import { createColorizedDestination } from "./colorized-destination.js";

export type AppLogger = Logger;

const SENSITIVE_PATHS = [
  "appState",
  "FB_APPSTATE",
  "*.appState",
  "*.FB_APPSTATE",
  "password",
  "*.password",
  "smtpPassword",
  "token",
  "*.token",
  "accessToken",
  "botToken",
  "apiKey",
  "api_key",
  "*.apiKey",
  "authorization",
  "headers.authorization",
  "cookie",
  "headers.cookie",
  "connectionString",
  "databaseUrl",
  "authenticationToken",
  "sessionSecret",
  "secret",
  "*.secret",
  "privateKey",
];

export function createLogger(config: AppConfig): AppLogger {
  // Always colorized, never raw JSON. Pino applies redaction BEFORE writing
  // the line, so the destination only sees already-sanitized records. The
  // destination stream colorizes every line — no pino-pretty needed, no TTY
  // requirement, identical on local shells and hosted log viewers.
  const destination = config.logging.usePrettyOutput
    ? pino.transport({
        target: "pino-pretty",
        options: { colorize: true, translateTime: "SYS:standard" },
      })
    : createColorizedDestination();
  return pino(
    {
      level: config.logging.minimumLevel,
      redact: config.logging.redactSensitiveValues
        ? { paths: SENSITIVE_PATHS, censor: "[REDACTED]" }
        : undefined,
      base: {
        library: "panindigan-messenger-bot",
        environment: config.application.environment,
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      // Keep numeric pino levels so the badge/icon mapping works.
    },
    destination,
  );
}

export function childLogger(parent: AppLogger, component: string): AppLogger {
  // Bind `module` so the colorizer shows [MODULE] in the output line.
  return parent.child({ module: component });
}
