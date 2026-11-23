import { readFileSync } from "node:fs";
import path from "node:path";
import { configSchema, formatConfigIssues, type AppConfig } from "./schema.js";
import { readEnvironment, requireEnvironment } from "../utils/env.js";

export class ConfigurationError extends Error {
  public constructor(
    message: string,
    public readonly details: readonly string[] = [],
  ) {
    super(details.length > 0 ? `${message}\n- ${details.join("\n- ")}` : message);
    this.name = "ConfigurationError";
  }
}

export interface ResolvedSecrets {
  readonly appState: string;
  readonly postgresUrl?: string;
  readonly tursoUrl?: string;
  readonly tursoToken?: string;
  readonly mongodbUrl?: string;
  readonly redisUrl?: string;
  readonly contactEmail?: string;
  readonly dashboardSessionSecret?: string;
  readonly uptimeSocketToken?: string;
  readonly uptimeTargetUrl?: string;
  readonly smtpHost?: string;
  readonly smtpPort?: string;
  readonly smtpUsername?: string;
  readonly smtpPassword?: string;
  readonly smtpFrom?: string;
  readonly telegramBotToken?: string;
  readonly discordWebhookUrl?: string;
  readonly messengerProxyUrl?: string;
  readonly aiApiKey?: string;
  readonly aiBaseUrl?: string;
  readonly aiDefaultModel?: string;
  readonly aiFallbackModel?: string;
}

export interface LoadedConfiguration {
  readonly config: AppConfig;
  readonly secrets: ResolvedSecrets;
  readonly warnings: readonly string[];
}

function readConfigFile(filePath: string): unknown {
  let contents: string;
  try {
    contents = readFileSync(filePath, "utf8");
  } catch {
    throw new ConfigurationError(`Cannot read configuration file at ${filePath}.`);
  }
  try {
    return JSON.parse(contents) as unknown;
  } catch (error) {
    throw new ConfigurationError("config.json is not valid JSON.", [
      error instanceof Error ? error.message : "Unknown parse error.",
    ]);
  }
}

/**
 * Loads, validates and resolves the single authoritative configuration file.
 * Secrets are read from environment variables named by the configuration and
 * are never copied into the configuration object or any log record.
 */
export function loadConfiguration(
  filePath = path.resolve(process.cwd(), "config.json"),
): LoadedConfiguration {
  const raw = readConfigFile(filePath);
  const parsed = configSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ConfigurationError(
      "Configuration validation failed.",
      formatConfigIssues(parsed.error),
    );
  }
  const config = parsed.data;
  const warnings: string[] = [];
  const resolve = (name: string, required: boolean, label: string): string | undefined => {
    const value = readEnvironment(name);
    if (value !== undefined) return value;
    if (required) {
      throw new ConfigurationError(`Missing required environment variable "${name}" for ${label}.`);
    }
    warnings.push(`${label} is disabled because "${name}" is not set.`);
    return undefined;
  };

  const appState = requireEnvironment(config.messenger.authentication.appStateEnv);
  const postgresUrl = config.databases.postgresql.enabled
    ? requireEnvironment(config.databases.postgresql.connectionStringEnv)
    : undefined;
  const tursoUrl = config.databases.turso.enabled
    ? requireEnvironment(config.databases.turso.databaseUrlEnv)
    : undefined;
  const tursoToken = config.databases.turso.enabled
    ? requireEnvironment(config.databases.turso.authenticationTokenEnv)
    : undefined;
  const mongodbUrl = config.databases.mongodb.enabled
    ? requireEnvironment(config.databases.mongodb.connectionStringEnv)
    : undefined;
  const redisUrl = config.databases.redis.enabled
    ? requireEnvironment(config.databases.redis.connectionUrlEnv)
    : undefined;

  const dashboardSessionSecret = config.webDashboard.enabled
    ? requireEnvironment(config.webDashboard.sessionSecretEnv)
    : resolve(config.webDashboard.sessionSecretEnv, false, "Web dashboard session");

  const uptimeSocketToken = config.uptimeEndpoint.websocket.enabled
    ? requireEnvironment(config.uptimeEndpoint.websocket.accessTokenEnv)
    : undefined;
  const uptimeTargetUrl = config.healthMonitoring.enabled
    ? requireEnvironment(config.healthMonitoring.endpointUrlEnv)
    : undefined;

  const contactEmail = resolve(
    config.identity.publisher.contactEmailEnv,
    false,
    "Publisher contact email",
  );

  let smtpUsername: string | undefined;
  let smtpPassword: string | undefined;
  if (config.alerting.enabled && config.alerting.email.enabled) {
    smtpUsername = requireEnvironment(config.alerting.email.usernameEnv);
    smtpPassword = requireEnvironment(config.alerting.email.passwordEnv);
    if (config.alerting.email.recipients.length === 0) {
      throw new ConfigurationError("Email alerting requires at least one recipient.");
    }
  }
  const telegramBotToken =
    config.alerting.enabled && config.alerting.telegram.enabled
      ? requireEnvironment(config.alerting.telegram.botTokenEnv)
      : undefined;
  if (config.alerting.telegram.enabled && config.alerting.telegram.chatIds.length === 0) {
    throw new ConfigurationError("Telegram alerting requires at least one chat ID.");
  }
  const discordWebhookUrl =
    config.alerting.enabled && config.alerting.discord.enabled
      ? requireEnvironment(config.alerting.discord.webhookUrlEnv)
      : undefined;

  const messengerProxyUrl = config.networkProxy.enabled
    ? requireEnvironment(config.networkProxy.urlEnv)
    : undefined;

  const providerConfigured = config.artificialIntelligence.defaultProvider.trim() !== "";
  let aiApiKey: string | undefined;
  let aiBaseUrl: string | undefined;
  let aiDefaultModel: string | undefined;
  let aiFallbackModel: string | undefined;
  if (config.artificialIntelligence.enabled && providerConfigured) {
    aiApiKey = requireEnvironment("AI_PROVIDER_API_KEY");
    aiBaseUrl = requireEnvironment("AI_PROVIDER_BASE_URL");
    aiDefaultModel = readEnvironment("AI_PROVIDER_DEFAULT_MODEL");
    aiFallbackModel = readEnvironment("AI_PROVIDER_FALLBACK_MODEL");
    if (config.artificialIntelligence.defaultModel.trim() === "" && aiDefaultModel === undefined) {
      warnings.push(
        "AI provider is configured but no model is set; AI commands will report the missing model until one is configured.",
      );
    }
  } else if (config.artificialIntelligence.enabled) {
    warnings.push(
      "Artificial intelligence is enabled but no provider is configured; AI commands will report this clearly until AI_PROVIDER_API_KEY and AI_PROVIDER_BASE_URL are set.",
    );
  }

  const secrets: ResolvedSecrets = {
    appState,
    postgresUrl,
    tursoUrl,
    tursoToken,
    mongodbUrl,
    redisUrl,
    contactEmail,
    dashboardSessionSecret,
    uptimeSocketToken,
    uptimeTargetUrl,
    smtpHost: readEnvironment("SMTP_HOST"),
    smtpPort: readEnvironment("SMTP_PORT"),
    smtpUsername,
    smtpPassword,
    smtpFrom: readEnvironment("SMTP_FROM"),
    telegramBotToken,
    discordWebhookUrl,
    messengerProxyUrl,
    aiApiKey,
    aiBaseUrl,
    aiDefaultModel,
    aiFallbackModel,
  };

  return { config, secrets, warnings };
}

/** Returns a deep copy that is safe to print: only secret *names* survive. */
export function describeConfiguration(config: AppConfig): Record<string, unknown> {
  return JSON.parse(JSON.stringify(config)) as Record<string, unknown>;
}
