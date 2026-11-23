import { z } from "zod";
import { isValidAccountId } from "../utils/env.js";
import { isValidTimeZone, parseCron } from "../utils/timezone.js";

const strict = <T extends z.ZodRawShape>(shape: T) => z.strictObject(shape);

const timeZone = z.string().refine(isValidTimeZone, "Must be a valid IANA timezone identifier.");
const environmentVariable = z
  .string()
  .regex(/^[A-Z][A-Z0-9_]{1,63}$/, "Must be a valid environment variable name.");
const accountId = z.string().refine(isValidAccountId, "Must be a numeric Facebook account ID.");
const port = z.number().int().min(1).max(65535);
const nonNegativeInteger = z.number().int().min(0);
const positiveInteger = z.number().int().min(1);
const optionalUrl = z
  .string()
  .refine(
    (value) => value === "" || URL.canParse(value),
    "Must be an empty string or a valid URL.",
  );

const applicationSchema = strict({
  name: z.string().min(1),
  environment: z.enum(["development", "staging", "production"]),
  timezone: timeZone,
  language: z.string().regex(/^[a-z]{2,3}(?:-[A-Z]{2,4})?$/, "Must be a locale such as en-PH."),
  debugMode: z.boolean(),
});

const identitySchema = strict({
  botName: z.string().min(1),
  commandPrefix: z.string().min(1).max(4),
  updateGroupNickname: z.boolean(),
  publisher: strict({
    name: z.string().min(1),
    profileUrl: optionalUrl,
    contactEmailEnv: environmentVariable,
  }),
});

const messengerSchema = strict({
  enabled: z.boolean(),
  authentication: strict({
    method: z.literal("appState"),
    appStateEnv: environmentVariable,
  }),
  connection: strict({
    reconnectAutomatically: z.boolean(),
    requestTimeoutMs: positiveInteger,
    maximumReconnectAttempts: nonNegativeInteger,
    reconnectDelayMs: positiveInteger,
  }),
  behavior: strict({
    receiveOwnMessages: z.boolean(),
    subscribeToEvents: z.boolean(),
    markMessagesAsRead: z.boolean(),
    sendDeliveryReceipts: z.boolean(),
    publishTypingStatus: z.boolean(),
    updateOnlinePresence: z.boolean(),
  }),
  eventLogging: strict({
    enabled: z.boolean(),
    logMessages: z.boolean(),
    logReplies: z.boolean(),
    logReactions: z.boolean(),
    logUnsentMessages: z.boolean(),
    logThreadChanges: z.boolean(),
    logReadReceipts: z.boolean(),
    logTypingEvents: z.boolean(),
    logPresenceChanges: z.boolean(),
  }),
  accountAccess: strict({
    ownerIds: z.array(accountId),
    administratorIds: z.array(accountId),
  }),
  userAgent: z.string().max(500),
});

const commandsSchema = strict({
  enabled: z.boolean(),
  prefixCommandsEnabled: z.boolean(),
  aliasesEnabled: z.boolean(),
  ignoreCase: z.boolean(),
  ignoreBotMessages: z.boolean(),
  ignoreOwnMessages: z.boolean(),
  defaultCooldownMs: nonNegativeInteger,
  maximumConcurrentExecutions: positiveInteger,
  maximumInputLength: positiveInteger,
});

const postgresqlSchema = strict({
  enabled: z.boolean(),
  connectionStringEnv: environmentVariable,
  pool: strict({
    minimumConnections: positiveInteger,
    maximumConnections: positiveInteger,
    idleTimeoutMs: positiveInteger,
    connectionTimeoutMs: positiveInteger,
  }),
});

const tursoSchema = strict({
  enabled: z.boolean(),
  databaseUrlEnv: environmentVariable,
  authenticationTokenEnv: environmentVariable,
  requestTimeoutMs: positiveInteger,
  maximumRetries: nonNegativeInteger,
  createBackups: z.boolean(),
  verifyIntegrityOnStartup: z.boolean(),
});

const mongodbSchema = strict({
  enabled: z.boolean(),
  connectionStringEnv: environmentVariable,
  databaseName: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/, "Invalid MongoDB database name."),
  maximumPoolSize: positiveInteger,
});

const redisSchema = strict({
  enabled: z.boolean(),
  connectionUrlEnv: environmentVariable,
  keyNamespace: z.string().regex(/^[a-z0-9_-]+:$/, "Key namespace must end with a colon."),
  connectionTimeoutMs: positiveInteger,
  maximumRequestRetries: nonNegativeInteger,
});

const databasesSchema = strict({
  postgresql: postgresqlSchema,
  turso: tursoSchema,
  mongodb: mongodbSchema,
  redis: redisSchema,
});

const alertingSchema = strict({
  enabled: z.boolean(),
  email: strict({
    enabled: z.boolean(),
    recipients: z.array(z.string().email()),
    usernameEnv: environmentVariable,
    passwordEnv: environmentVariable,
  }),
  telegram: strict({
    enabled: z.boolean(),
    botTokenEnv: environmentVariable,
    chatIds: z.array(z.string().regex(/^-?\d{5,20}$/, "Invalid Telegram chat ID.")),
  }),
  discord: strict({
    enabled: z.boolean(),
    webhookUrlEnv: environmentVariable,
  }),
});

type AiLevel = "ask1" | "ask2" | "ask3" | "ask4" | "ask5" | "ask6";
const quotaSchema = strict({
  maximumRequests: nonNegativeInteger,
  periodHours: nonNegativeInteger,
});

const artificialIntelligenceSchema = strict({
  enabled: z.boolean(),
  defaultProvider: z.string().max(64),
  defaultModel: z.string().max(128),
  requestTimeoutMs: positiveInteger,
  maximumConcurrentRequests: positiveInteger,
  recordUsage: z.boolean(),
  coinPrices: strict({
    ask1: nonNegativeInteger,
    ask2: nonNegativeInteger,
    ask3: nonNegativeInteger,
    ask4: nonNegativeInteger,
    ask5: nonNegativeInteger,
    ask6: z.literal(0),
  }),
  maximumMessageLengths: strict({
    ask1: positiveInteger,
    ask2: positiveInteger,
    ask3: positiveInteger,
    ask4: positiveInteger,
    ask5: positiveInteger,
    ask6: positiveInteger,
  }),
  requestQuotas: strict({
    ask1: quotaSchema,
    ask2: quotaSchema,
    ask3: quotaSchema,
    ask4: quotaSchema,
    ask5: quotaSchema,
    ask6: quotaSchema,
  }),
});

const economySchema = strict({
  enabled: z.boolean(),
  currencyLabel: z.string().min(1).max(24),
  rewards: strict({
    daily: strict({
      enabled: z.boolean(),
      amount: positiveInteger,
      cooldownHours: z.number().min(1),
      streakBonusEnabled: z.boolean(),
    }),
    weekly: strict({
      enabled: z.boolean(),
      amount: positiveInteger,
      cooldownHours: z.number().min(1),
    }),
    monthly: strict({
      enabled: z.boolean(),
      amount: positiveInteger,
      resetPolicy: z.enum(["calendarMonth", "fixedInterval"]),
    }),
  }),
  activities: strict({
    work: strict({
      enabled: z.boolean(),
      minimumPayout: nonNegativeInteger,
      maximumPayout: positiveInteger,
      cooldownMinutes: z.number().min(1),
    }),
    beg: strict({
      enabled: z.boolean(),
      minimumPayout: nonNegativeInteger,
      maximumPayout: positiveInteger,
      cooldownHours: z.number().min(1),
    }),
  }),
});

const maintenanceSchema = strict({
  enabled: z.boolean(),
  defaultScope: z.literal("global"),
  timezone: timeZone,
  blockRegularCommands: z.boolean(),
  allowOwnerOverride: z.boolean(),
  allowAdministratorOverride: z.boolean(),
  keepStatusCommandsAvailable: z.boolean(),
  keepHelpCommandsAvailable: z.boolean(),
  notifyAllActiveGroups: z.boolean(),
  sendAdvanceNotices: z.boolean(),
  noticeLeadTimesMinutes: z.array(positiveInteger),
  startAutomatically: z.boolean(),
  finishAutomatically: z.boolean(),
});

export const configSchema = strict({
  application: applicationSchema,
  identity: identitySchema,
  messenger: messengerSchema,
  commands: commandsSchema,
  databases: databasesSchema,
  webDashboard: strict({
    enabled: z.boolean(),
    host: z.string().min(1),
    port,
    sessionLifetimeMs: positiveInteger,
    sessionSecretEnv: environmentVariable,
  }),
  uptimeEndpoint: strict({
    enabled: z.boolean(),
    host: z.string().min(1),
    port,
    websocket: strict({
      enabled: z.boolean(),
      path: z.string().startsWith("/"),
      accessTokenEnv: environmentVariable,
    }),
  }),
  scheduledRestart: strict({
    enabled: z.boolean(),
    cronExpression: z.string(),
    timezone: timeZone,
  }),
  healthMonitoring: strict({
    enabled: z.boolean(),
    checkIntervalSeconds: positiveInteger,
    endpointUrlEnv: environmentVariable,
    requestTimeoutMs: positiveInteger,
  }),
  developmentWatcher: strict({
    enabled: z.boolean(),
    reloadDelayMs: nonNegativeInteger,
    excludedCommands: z.array(z.string()),
    excludedEvents: z.array(z.string()),
  }),
  messengerRecovery: strict({
    mqttRecoveryEnabled: z.boolean(),
    recoveryIntervalMs: positiveInteger,
    shutdownGracePeriodMs: nonNegativeInteger,
    notifyOnRecoveryFailure: z.boolean(),
  }),
  alerting: alertingSchema,
  permissions: strict({
    userAllowlist: strict({ enabled: z.boolean(), userIds: z.array(accountId) }),
    groupAllowlist: strict({ enabled: z.boolean(), groupIds: z.array(accountId) }),
    requireBothListsWhenBothEnabled: z.boolean(),
  }),
  responseVisibility: strict({
    suppressUnknownCommand: z.boolean(),
    suppressAdministratorOnlyNotice: z.boolean(),
    suppressBlockedGroupNotice: z.boolean(),
    suppressBlockedUserNotice: z.boolean(),
    suppressMissingRoleNotice: z.boolean(),
    suppressMissingRoleReplyNotice: z.boolean(),
    suppressMissingRoleReactionNotice: z.boolean(),
  }),
  networkProxy: strict({ enabled: z.boolean(), urlEnv: environmentVariable }),
  rateLimiting: strict({
    enabled: z.boolean(),
    backend: z.literal("redis"),
    defaultCooldownMs: nonNegativeInteger,
    perUserCooldownMs: nonNegativeInteger,
    perGroupCooldownMs: nonNegativeInteger,
    antiSpam: strict({
      enabled: z.boolean(),
      observationWindowMs: positiveInteger,
      maximumMessages: positiveInteger,
      initialDelayMs: nonNegativeInteger,
      maximumDelayMs: positiveInteger,
    }),
  }),
  economy: economySchema,
  artificialIntelligence: artificialIntelligenceSchema,
  maintenance: maintenanceSchema,
  announcements: strict({
    enabled: z.boolean(),
    broadcastToEligibleGroups: z.boolean(),
    requireFinalConfirmation: z.boolean(),
    obeyMessengerRateLimits: z.boolean(),
  }),
  taskScheduler: strict({
    enabled: z.boolean(),
    timezone: timeZone,
    pollIntervalMs: positiveInteger,
    maximumRetries: positiveInteger,
  }),
  cache: strict({
    enabled: z.boolean(),
    defaultLifetimeSeconds: positiveInteger,
    maximumEntries: positiveInteger,
  }),
  logging: strict({
    minimumLevel: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]),
    usePrettyOutput: z.boolean(),
    redactSensitiveValues: z.boolean(),
  }),
  security: strict({
    validateIncomingEvents: z.boolean(),
    deduplicateIncomingEvents: z.boolean(),
    rejectOversizedCommandInput: z.boolean(),
    maximumConcurrentCommands: positiveInteger,
  }),
  modules: strict({
    moderation: z.boolean(),
    automation: z.boolean(),
    economy: z.boolean(),
    leveling: z.boolean(),
    utilities: z.boolean(),
    entertainment: z.boolean(),
    games: z.boolean(),
    media: z.boolean(),
    artificialIntelligence: z.boolean(),
    maintenance: z.boolean(),
    announcements: z.boolean(),
  }),
}).superRefine((config, context) => {
  const issue = (path: (string | number)[], message: string): void => {
    context.addIssue({ code: "custom", path, message });
  };

  if (config.webDashboard.enabled && config.webDashboard.port === config.uptimeEndpoint.port) {
    issue(["webDashboard", "port"], "Web dashboard and uptime endpoint cannot share a port.");
  }
  if (config.uptimeEndpoint.websocket.enabled && config.application.debugMode === false) {
    // A token is still required; presence is checked in the loader.
  }
  if (config.scheduledRestart.enabled) {
    if (!config.scheduledRestart.cronExpression) {
      issue(
        ["scheduledRestart", "cronExpression"],
        "A cron expression is required when scheduled restart is enabled.",
      );
    } else {
      try {
        parseCron(config.scheduledRestart.cronExpression);
      } catch (error) {
        issue(
          ["scheduledRestart", "cronExpression"],
          error instanceof Error ? error.message : "Invalid cron expression.",
        );
      }
    }
  }
  const noticeTimes = config.maintenance.noticeLeadTimesMinutes;
  if (new Set(noticeTimes).size !== noticeTimes.length) {
    issue(["maintenance", "noticeLeadTimesMinutes"], "Notice lead times must be unique.");
  }
  if (
    ![...noticeTimes]
      .sort((a, b) => b - a)
      .every((value, index, sorted) => index === 0 || sorted[index - 1]! > value)
  ) {
    issue(
      ["maintenance", "noticeLeadTimesMinutes"],
      "Notice lead times must be listed in descending order.",
    );
  }
  const prices = config.artificialIntelligence.coinPrices;
  if (
    prices.ask1 > prices.ask2 ||
    prices.ask2 > prices.ask3 ||
    prices.ask3 > prices.ask4 ||
    prices.ask4 > prices.ask5
  ) {
    issue(
      ["artificialIntelligence", "coinPrices"],
      "Coin prices must increase with the command level; ask6 must remain free.",
    );
  }
  for (const level of ["ask1", "ask2", "ask3", "ask4", "ask5"] as const) {
    const quota = config.artificialIntelligence.requestQuotas[level];
    if (quota.maximumRequests === 0 || quota.periodHours === 0) {
      issue(
        ["artificialIntelligence", "requestQuotas", level],
        "Paid AI levels require a positive request limit and period.",
      );
    }
  }
  const ask6Quota = config.artificialIntelligence.requestQuotas.ask6;
  if (ask6Quota.maximumRequests !== 0 || ask6Quota.periodHours !== 0) {
    issue(
      ["artificialIntelligence", "requestQuotas", "ask6"],
      "ask6 must not have an application-level request-count limit.",
    );
  }
  if (config.economy.activities.work.minimumPayout > config.economy.activities.work.maximumPayout) {
    issue(["economy", "activities", "work"], "Minimum payout cannot exceed maximum payout.");
  }
  if (config.economy.activities.beg.minimumPayout > config.economy.activities.beg.maximumPayout) {
    issue(["economy", "activities", "beg"], "Minimum payout cannot exceed maximum payout.");
  }
  const ownerIds = new Set(config.messenger.accountAccess.ownerIds);
  const overlap = config.messenger.accountAccess.administratorIds.some((id) => ownerIds.has(id));
  if (overlap) {
    issue(["messenger", "accountAccess"], "An account cannot be both owner and administrator.");
  }
  if (config.modules.maintenance && !config.maintenance.enabled) {
    issue(
      ["modules", "maintenance"],
      "The maintenance module requires maintenance.enabled to be true.",
    );
  }
  if (config.modules.announcements && !config.announcements.enabled) {
    issue(
      ["modules", "announcements"],
      "The announcements module requires announcements.enabled to be true.",
    );
  }
  if (
    config.rateLimiting.enabled &&
    config.rateLimiting.backend === "redis" &&
    !config.databases.redis.enabled
  ) {
    issue(
      ["rateLimiting", "backend"],
      "Redis-backed rate limiting requires databases.redis.enabled.",
    );
  }
  if (config.rateLimiting.antiSpam.initialDelayMs > config.rateLimiting.antiSpam.maximumDelayMs) {
    issue(
      ["rateLimiting", "antiSpam", "initialDelayMs"],
      "Initial delay cannot exceed maximum delay.",
    );
  }
  if (config.commands.defaultCooldownMs !== config.rateLimiting.defaultCooldownMs) {
    issue(
      ["commands", "defaultCooldownMs"],
      "Command and rate-limiter default cooldowns must match: keep one authoritative value.",
    );
  }
});

export type AppConfig = z.infer<typeof configSchema>;
export type { AiLevel };

export function formatConfigIssues(error: z.ZodError): string[] {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
    return `${path}: ${issue.message}`;
  });
}
