import pino, { type Logger } from "pino";
import type { AppConfig } from "../config/index.js";

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
  return pino(
    {
      level: config.logging.minimumLevel,
      redact: config.logging.redactSensitiveValues
        ? { paths: SENSITIVE_PATHS, censor: "[REDACTED]" }
        : undefined,
      base: {
        service: "panindigan-messenger-bot",
        environment: config.application.environment,
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level(label: string) {
          return { level: label };
        },
      },
    },
    config.logging.usePrettyOutput
      ? pino.transport({
          target: "pino-pretty",
          options: { colorize: true, translateTime: "SYS:standard" },
        })
      : undefined,
  );
}

export function childLogger(parent: AppLogger, component: string): AppLogger {
  return parent.child({ component });
}
