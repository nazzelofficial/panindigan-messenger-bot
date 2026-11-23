import path from "node:path";
import type { ClientOptions, Credentials } from "panindigan-automate";
import type { AppConfig, ResolvedSecrets } from "../config/index.js";
import type { AppLogger } from "../logging/logger.js";
import { EnvironmentError } from "../utils/env.js";

/**
 * Maps application configuration onto only those ClientOptions that exist in
 * panindigan-automate@0.3.5. No legacy FCA option is passed through.
 */
export function buildClientOptions(config: AppConfig, secrets: ResolvedSecrets): ClientOptions {
  const options: ClientOptions = {
    httpTimeout: config.messenger.connection.requestTimeoutMs,
    httpRetries: config.databases.turso.maximumRetries,
    reconnectAttempts: config.messenger.connection.reconnectAutomatically
      ? config.messenger.connection.maximumReconnectAttempts
      : 0,
    reconnectDelayMax: config.messenger.connection.reconnectDelayMs,
    userAgent: config.messenger.userAgent.trim() === "" ? undefined : config.messenger.userAgent,
    httpProxy: secrets.messengerProxyUrl,
    persistSession: true,
    storageAdapter: "file",
    storageDirectory: path.resolve(process.cwd(), "data", "session"),
    logLevel: config.logging.minimumLevel,
    prettyPrint: config.logging.usePrettyOutput,
    // Automatic self-updates are disabled for a deterministic production
    // deployment; upgrades are performed deliberately by the operator.
    update: { enabled: false },
  };
  return options;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Validates the AppState before handing it to the library. Required cookies
 * are checked by name only — no values are ever read into logs or errors.
 */
export function parseAndValidateAppState(raw: string, logger?: AppLogger): Credentials {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new EnvironmentError("FB_APPSTATE", "FB_APPSTATE must contain valid JSON AppState data.");
  }

  let names: Set<string>;
  if (Array.isArray(parsed)) {
    names = new Set(parsed.filter(isRecord).map((entry) => String(entry.key ?? entry.name ?? "")));
    if (names.size === 0) {
      throw new EnvironmentError("FB_APPSTATE", "FB_APPSTATE contains no recognizable cookies.");
    }
  } else if (isRecord(parsed)) {
    names = new Set(Object.keys(parsed));
  } else {
    throw new EnvironmentError("FB_APPSTATE", "FB_APPSTATE must be an AppState array or object.");
  }

  const required = ["c_user", "xs", "datr"];
  const missing = required.filter((name) => !names.has(name));
  if (missing.length > 0) {
    throw new EnvironmentError(
      "FB_APPSTATE",
      `FB_APPSTATE is missing required cookies: ${missing.join(", ")}. Re-export the AppState from a logged-in browser session.`,
    );
  }
  // The library normalizes facebook.com domains itself, but a full browser
  // export normally carries these additional cookies. Their absence is a
  // common cause of a desktop page without `fb_dtsg` / `lsd`.
  const recommended = ["sb", "fr", "presence"];
  const missingRecommended = recommended.filter((name) => !names.has(name));
  if (missingRecommended.length > 0) {
    logger?.warn(
      { missingCookies: missingRecommended, cookieCount: names.size },
      "AppState lacks recommended browser cookies; re-export the complete jar from a desktop browser if login fails",
    );
  }
  return parsed as Credentials;
}
