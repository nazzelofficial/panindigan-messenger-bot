# Panindigan Messenger Bot

A long-running Messenger bot for group administration, moderation, economy, automation, AI assistance, maintenance windows and developer announcements. It runs as a TypeScript 7 / Node ESM service on top of `panindigan-automate` and keeps its business data in PostgreSQL, operational history in a managed Turso (libSQL) database, archives in MongoDB and transient state in Redis.

**Status:** `0.1.0`, pre-1.0. The bot drives a personal Messenger account, not a Page or a Business API app. Personal-account automation violates Meta's expected use patterns in some cases and can lead to feature limits, checkpoints or account restrictions. Use a dedicated account, not a personal primary account. The underlying library (`panindigan-automate@0.3.5`) is also pre-1.0; pin the version and upgrade deliberately.

## Requirements

- **Node.js >= 22 LTS.** Node 26 is what the project is built and tested against (`@types/node` 26, TypeScript 7); use it in production if possible.
- **pnpm >= 9.** The repository pins `pnpm@12.21.0` through the `packageManager` field, so `corepack` will select it automatically.
- The build uses TypeScript **7.0.2** through the `@typescript/native` alias. ESLint resolves TypeScript **6.0.2** through the `typescript` alias, which is Microsoft's documented side-by-side setup for tools that still need the compiler API. Both versions are pinned in `package.json`.
- **PostgreSQL 17** for authoritative relational data.
- **A provisioned Turso database named `panindigan`**, accessed over a remote `libsql://` URL. A local SQLite file is not an acceptable substitute.
- **MongoDB 8** for document archives.
- **Redis 7** for cooldowns, locks, deduplication, cache and rate limits.
- Docker and Docker Compose are optional but supported; see [Docker deployment](#docker-deployment).

## Install

```sh
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
# fill in .env — see below
pnpm build
pnpm start
```

For development, `pnpm dev` runs the TypeScript source with reload. Useful checks:

```sh
pnpm typecheck        # strict TypeScript, no emit
pnpm verify:commands  # registry and per-category command counts
pnpm test
pnpm lint
```

The operational scripts `pnpm migrate`, `pnpm backup` and `pnpm restore` call `loadConfiguration()`, so they need the same populated `.env` as the bot. `pnpm verify:commands` only reads `config.json` and needs no credentials.

## Authentication: AppState only

There is **no email/password login**. The only supported authentication method is `messenger.authentication.method: "appState"`. `FB_APPSTATE` must contain the JSON cookie state of an already logged-in browser session, exactly as defined by `messenger.authentication.appStateEnv` in `config.json`.

The loader accepts either an array of cookie objects (with `key` or `name` fields) or an object keyed by cookie name. It checks the cookie **names** only and requires:

- `c_user`
- `xs`
- `datr`

If any are missing, startup fails and tells you which ones to re-export. Cookie values are never read into logs or error messages.

To export: sign in to Messenger in a desktop browser, open developer tools, go to the cookies storage view for the Messenger site, and copy the cookies into a JSON array of `{ "key": "...", "value": "..." }` objects. Store that array as a single line in `.env`:

```dotenv
FB_APPSTATE=[{"key":"c_user","value":"..."},{"key":"xs","value":"..."},{"key":"datr","value":"..."}]
```

Keep it out of version control (`.gitignore` already excludes `.env` and `appstate*.json`). The library persists the session under `data/session` via its file storage adapter, so the session can survive a restart; when a session dies, re-export the AppState and restart. If you see a checkpoint or `session_dead` event, that refresh is required rather than optional.

## Environment

Copy `.env.example` to `.env` and fill in the values. With the shipped `config.json`, all four databases are enabled, so these are required:

| Variable                | Purpose                                                              |
| ----------------------- | -------------------------------------------------------------------- |
| `FB_APPSTATE`           | Messenger AppState JSON (see above)                                  |
| `POSTGRES_DATABASE_URL` | PostgreSQL connection string                                         |
| `TURSO_DATABASE_URL`    | Remote `libsql://` (or `https://`) URL for the `panindigan` database |
| `TURSO_AUTH_TOKEN`      | Auth token for that Turso database                                   |
| `MONGODB_URI`           | MongoDB connection string                                            |
| `REDIS_URL`             | Redis connection URL                                                 |

Optional groups:

- Publisher/contact: `PANINDIGAN_CONTACT_EMAIL`.
- Web services (disabled in the shipped config): `DASHBOARD_SESSION_SECRET`, `UPTIME_SOCKET_TOKEN`, `UPTIME_TARGET_URL`.
- Alerts (disabled by default): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_FROM`, `TELEGRAM_BOT_TOKEN`, `DISCORD_ALERT_WEBHOOK_URL`.
- Proxy: `MESSENGER_PROXY_URL` (only read when `networkProxy.enabled` is true).
- AI: `AI_PROVIDER_API_KEY`, `AI_PROVIDER_BASE_URL`, `AI_PROVIDER_DEFAULT_MODEL`, `AI_PROVIDER_FALLBACK_MODEL`. These are required when `artificialIntelligence.enabled` is true and `defaultProvider` is set.
- Docker Compose additionally reads `POSTGRES_PASSWORD`, `MONGODB_PASSWORD` and `REDIS_PASSWORD` from `.env` to configure the local database containers. See [Docker deployment](#docker-deployment).

## Configuration

`config.json` is the single authoritative configuration file and is validated with a strict Zod schema in `src/config/schema.ts`; unknown keys are rejected at startup. **Secrets never go in JSON.** JSON holds plain settings and the _names_ of environment variables through properties ending in `Env` (`connectionStringEnv`, `databaseUrlEnv`, `authenticationTokenEnv`, `appStateEnv`, `sessionSecretEnv`, and so on). The actual values are read from `.env`.

Sections you will normally touch:

| Section                                                                                                                                                                        | What it controls                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `application`                                                                                                                                                                  | `name`, `environment`, `timezone`, `language`, `debugMode`                                                                                    |
| `identity`                                                                                                                                                                     | `botName`, `commandPrefix` (`!`), `updateGroupNickname`, `publisher`                                                                          |
| `messenger`                                                                                                                                                                    | `authentication`, `connection` (timeouts, reconnects), `behavior`, `eventLogging`, `accountAccess.ownerIds` / `administratorIds`, `userAgent` |
| `commands`                                                                                                                                                                     | `enabled`, `prefixCommandsEnabled`, `aliasesEnabled`, `ignoreCase`, `defaultCooldownMs`, `maximumConcurrentExecutions`, `maximumInputLength`  |
| `databases`                                                                                                                                                                    | Per-store `enabled` flags, connection-string variable names, pool sizes and retries                                                           |
| `permissions`                                                                                                                                                                  | `userAllowlist`, `groupAllowlist`, `requireBothListsWhenBothEnabled`                                                                          |
| `rateLimiting`                                                                                                                                                                 | `enabled`, `backend` (`redis`), default/per-user/per-group cooldowns, `antiSpam`                                                              |
| `economy`                                                                                                                                                                      | Reward amounts and cooldowns, `work` and `beg` payout ranges                                                                                  |
| `artificialIntelligence`                                                                                                                                                       | `defaultProvider`, `defaultModel`, `coinPrices`, `maximumMessageLengths`, `requestQuotas`, `recordUsage`                                      |
| `maintenance`                                                                                                                                                                  | `defaultScope` (`global`), blocking rules, overrides, `noticeLeadTimesMinutes`                                                                |
| `announcements`                                                                                                                                                                | `broadcastToEligibleGroups`, `requireFinalConfirmation`, `obeyMessengerRateLimits`                                                            |
| `taskScheduler`                                                                                                                                                                | `enabled`, `timezone`, `pollIntervalMs`, `maximumRetries`                                                                                     |
| `modules`                                                                                                                                                                      | On/off toggles for the 11 command categories                                                                                                  |
| `logging` / `security`                                                                                                                                                         | Log level, `redactSensitiveValues`, event validation and deduplication, input limits                                                          |
| `webDashboard`, `uptimeEndpoint`, `healthMonitoring`, `scheduledRestart`, `alerting`, `networkProxy`, `cache`, `developmentWatcher`, `messengerRecovery`, `responseVisibility` | Optional features, all disabled in the shipped config except `cache`                                                                          |

A few validation rules are worth knowing before you edit it: `commands.defaultCooldownMs` must equal `rateLimiting.defaultCooldownMs`; maintenance notice lead times must be unique and in descending order; AI coin prices must increase from `ask1` through `ask5` and `ask6` must stay free with no request-count quota; an account cannot appear in both `ownerIds` and `administratorIds`; enabling the maintenance or announcements module requires its feature section to be enabled as well.

## Databases and ownership boundaries

| Store                      | Owns                                                                                                                                                                                                                                                              | Notes                                                                                                                                                                                                                                                                                                    |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **PostgreSQL**             | Authoritative relational business data: users, groups and preferences; permissions and settings; economy ledger and reward claims; leveling; moderation; AI usage and quotas; maintenance schedules; announcements; automation config; scheduled jobs; audit log. | Schema lives in `database/postgresql/migrations/*.sql` (apply with `pnpm migrate`). A consolidated reference is at `database/postgresql/schema/panindigan.sql`. Applied migrations are recorded with checksums in `schema_migrations`; editing an applied file is rejected.                              |
| **Turso (managed libSQL)** | Durable operational history and job checkpoints: `command_history`, `command_analytics`, `automation_history`, `operational_activity`, `scheduler_checkpoints`, `idempotency_records`, `recovery_metadata`, `integrity_checks`, `announcement_delivery_history`.  | The database is named `panindigan`. Only remote `libsql://` or `https://` URLs are accepted; a local SQLite file or in-memory URL is rejected at startup on purpose, because it would silently replace durable history with ephemeral storage. `verifyIntegrityOnStartup` runs `PRAGMA integrity_check`. |
| **MongoDB**                | Document archives: `message_archive`, `event_archive`, `snapshots`, `automation_outputs`. Database name comes from `databases.mongodb.databaseName` (`panindigan`).                                                                                               | Indexes are created idempotently at startup. Archive collections carry TTL indexes via `expiresAt`, so old documents expire naturally.                                                                                                                                                                   |
| **Redis**                  | Temporary state only: cooldowns, distributed locks, event deduplication, cache, rate-limit counters, AI concurrency and AI dedupe keys.                                                                                                                           | Keys are namespaced `panindigan:v1:` and TTL-bounded. Redis data is intentionally **not backed up**; after stopping the bot it is safe to flush. Cooldown checks fail closed if Redis is unavailable.                                                                                                    |

Do not move data between these stores to "fill gaps". PostgreSQL is the source of truth for anything you would want to report on; Turso is append-mostly telemetry and checkpoint state; MongoDB is an archive; Redis can disappear at any time.

## Commands

There are **280 commands** across **11 categories**, invoked with the `!` prefix (`identity.commandPrefix`). Module toggles in `config.json` can disable a category at runtime.

| Category       | Commands |
| -------------- | -------- |
| administration | 35       |
| moderation     | 25       |
| information    | 25       |
| utility        | 25       |
| automation     | 25       |
| entertainment  | 25       |
| economy        | 30       |
| leveling       | 25       |
| games          | 25       |
| media          | 25       |
| ai             | 15       |

`pnpm verify:commands` imports every category index under `src/commands/categories/`, registers the commands and calls `registry.validate()`, which fails on missing categories, duplicate names/aliases or a total other than 280.

Status and safety commands that stay available during maintenance include `!help`, `!commands`, `!status`, `!health`, `!ping`, `!latency`, `!uptime`, `!botinfo`, `!changelog`, `!language`, `!owner`, `!maintenance`, `!maintenancehistory` and `!maintenanceconfig`.

## Economy and daily rewards

The currency label is `coins`. Rewards are configured under `economy.rewards`:

| Reward  | Amount | Rule                                   |
| ------- | ------ | -------------------------------------- |
| Daily   | 250    | 24-hour cooldown, streak bonus enabled |
| Weekly  | 1000   | 168-hour cooldown                      |
| Monthly | 3000   | `calendarMonth` reset policy           |

Activities: `work` pays 20–100 with a 30-minute cooldown; `beg` pays 1–50 with a 5-hour cooldown. Balances, transactions, claims, shop items and inventory live in PostgreSQL (`coin_accounts`, `coin_transactions`, `reward_claims`, `shop_items`, `inventory_items`). Claim and transaction writes carry idempotency keys and unique constraints so a retry cannot double-pay. Economy audit rows are written to `economy_audit`.

## AI: ask1 through ask6

AI commands map to six levels with graduated pricing, quotas and input limits from `artificialIntelligence`:

| Command | Coins per request | Max message length | Request quota                                 |
| ------- | ----------------- | ------------------ | --------------------------------------------- |
| `!ask1` | 2                 | 2000               | 20 per 24 hours                               |
| `!ask2` | 5                 | 4000               | 15 per 24 hours                               |
| `!ask3` | 10                | 6000               | 10 per 24 hours                               |
| `!ask4` | 20                | 8000               | 8 per 24 hours                                |
| `!ask5` | 35                | 12000              | 5 per 24 hours                                |
| `!ask6` | 0                 | 20000              | None (`maximumRequests: 0`, `periodHours: 0`) |

`ask6` is **free and has no application-level request-count limit**; the schema enforces that it stays at zero cost and without a quota. It is still subject to the ordinary command cooldowns, anti-spam checks, `maximumConcurrentRequests` and Messenger's own constraints.

Usage is recorded in `ai_usage` when `recordUsage` is true. Per-user quotas for paid levels are tracked in `ai_request_quotas`. Requests rejected before the provider call are never charged; a provider request that fails is charged and then fully refunded, and the refund is recorded. The provider is an OpenAI-compatible chat-completions endpoint configured with `AI_PROVIDER_*`. Per-level model overrides can be set with `AI_MODEL_ASK1` through `AI_MODEL_ASK6`. Until `defaultProvider`/`defaultModel` and the API variables are set, AI commands report the missing configuration rather than failing silently.

## Global maintenance

Maintenance is global and persistent. Schedules use this command form:

```
!maintenance schedule YYYY-MM-DD HH:mm YYYY-MM-DD HH:mm Title
```

Times are interpreted in `maintenance.timezone` (`Asia/Manila`), and the end time must be after the start time. The recorded status values are `OFF`, `SCHEDULED`, `ACTIVE`, `COMPLETED` and `CANCELLED`; a normal schedule moves through the first three. `startAutomatically` and `finishAutomatically` are enabled.

While a maintenance is `ACTIVE`, regular commands are blocked. Exceptions are:

- commands marked `maintenanceSafe` or in the built-in safety list (`status`, `help`, `health`, `maintenance`, `ping`, `uptime`, and similar);
- the owner, when `allowOwnerOverride` is true (administrators are **not** allowed to override by default);
- whatever is permitted by `keepStatusCommandsAvailable` and `keepHelpCommandsAvailable`.

Active groups receive advance notices at **60, 30, 10 and 5 minutes** before the start (`noticeLeadTimesMinutes`). Per-user notice spam is throttled through Redis. Schedules, notifications and history are stored in PostgreSQL; delivery attempts are recorded per thread.

## Developer announcements and broadcasts

Announcements are owner-only tooling. `announcements.requireFinalConfirmation` is true: a draft is prepared first and is only delivered after an explicit confirmation, so a mistyped broadcast cannot go out. Delivery targets eligible groups (`broadcastToEligibleGroups`) and obeys Messenger rate limits (`obeyMessengerRateLimits`). Each target gets a row in `announcement_deliveries` with a status and idempotency key; repeated attempts do not re-send to groups already served.

## Scheduler

`taskScheduler` polls every 1000 ms in `Asia/Manila` and retries failed jobs up to 5 times. Durable jobs and their runs live in PostgreSQL (`scheduled_jobs`, `job_runs`); progress checkpoints, idempotency records and recovery metadata live in Turso. This is separate from `scheduledRestart`, an optional cron-driven process restart that is disabled in the shipped config.

## Permissions

Owner and administrator IDs come from `messenger.accountAccess.ownerIds` and `administratorIds` in `config.json`, plus roles stored in `bot_users` (`is_owner`, `is_admin`) that are hydrated at startup. An owner can grant or revoke roles at runtime; those changes are written to `audit_logs` with `critical` severity. Role resolution is centralized in the dispatcher — commands do not implement their own checks. Permission levels are `public`, `admin` and `owner`; owners satisfy admin-level checks. An account cannot be both owner and administrator in config.

Access is further restricted by `permissions.userAllowlist` and `permissions.groupAllowlist`. When both are enabled, `requireBothListsWhenBothEnabled: true` means a sender must pass **both** checks. The `responseVisibility` section controls whether denial notices are sent.

## Cooldowns and anti-spam

`rateLimiting.backend` is `redis`. Every command is checked against a global cooldown, a per-user cooldown, a per-group cooldown, a per-command cooldown and a per-user-per-command cooldown. With the shipped config the first three are 1000 ms; individual commands add their own `cooldownMs`. If Redis is unavailable, cooldown checks deny rather than allow — abuse prevention does not silently disappear.

`rateLimiting.antiSpam` watches a 10-second window, allows 7 messages and then applies a progressive delay from 500 ms up to 5000 ms. Incoming events are validated and deduplicated (`security.validateIncomingEvents`, `security.deduplicateIncomingEvents`), command input is capped at 2000 characters, and concurrency is capped at 25 (`commands.maximumConcurrentExecutions`, `security.maximumConcurrentCommands`).

## Security and secret redaction

Secrets live only in environment variables; `config.json` stores variable names. Pino redaction (`logging.redactSensitiveValues`) covers paths such as `appState`, `FB_APPSTATE`, `password`, `token`, `apiKey`, `authorization`, `cookie`, `connectionString`, `databaseUrl`, `authenticationToken`, `sessionSecret` and `secret`, replacing them with `[REDACTED]`. Database clients do not log connection strings, and the AppState validator checks cookie names without emitting values. Never commit `.env`, AppState exports, session data under `data/`, or backup files under `backups/` — all are ignored by Git, but the backups contain real business data and should be stored encrypted if moved off-host.

## Migrations, backup and restore

```sh
pnpm migrate                              # connect, apply pending migrations, verify health
pnpm backup                               # write backups/<timestamp>/*.json
pnpm restore backups/<timestamp> --confirm # restore rows; --confirm is mandatory
pnpm verify:commands                      # check the command registry
```

`pnpm migrate` bootstraps `DatabaseManager`; migrations run during `initialize()` for every enabled store. Migration files are tracked by filename and SHA-256 checksum. Adding a change means adding a new numbered file, not editing an applied one.

`pnpm backup` writes a timestamped directory under `backups/` containing `metadata.json`, `postgresql.json` (from `PostgresMigrator.exportSnapshot()`), `turso.json` (every table dumped via `sqlite_master`) and `mongodb.json` (every collection via `find({}).toArray()`). Redis is deliberately excluded because its contents are temporary.

`pnpm restore` reads one of those directories and upserts rows using parameterized SQL keyed by each table's primary key, then upserts MongoDB documents by `_id`. It requires `--confirm` and will refuse to run without it. Stop the bot before restoring so nothing writes concurrently, and make sure migrations have been applied so the target schema exists.

## Docker deployment

Prepare `.env` with your `FB_APPSTATE`, Turso URL and token, plus `POSTGRES_PASSWORD`, `MONGODB_PASSWORD` and `REDIS_PASSWORD` for the local containers. Then:

```sh
docker compose up -d --build
docker compose logs -f app
```

The Compose file runs PostgreSQL 17, MongoDB 8 and Redis 7 on a single internal bridge network. **No database ports are published to the host** and there is no local Turso/SQLite service — Turso stays remote. The `app` service waits for the database healthchecks, runs as the non-root `node` user, mounts `./data` (including the persisted Messenger session) and `./backups`, and restarts unless stopped. Use `docker compose exec` for psql, mongosh or redis-cli access.

The image is multi-stage: dependencies are installed with `pnpm install --frozen-lockfile`, TypeScript is compiled to `dist/`, dev dependencies are pruned, and only `dist`, `config.json`, `database/`, `package.json` and production `node_modules` are copied into the runtime stage. No secrets are baked into the image. The healthcheck uses Node's built-in `fetch` against the uptime endpoint when `uptimeEndpoint.enabled` is true; with the shipped config it is disabled, so the healthcheck falls back to a process check. To inspect databases from the host, use `docker compose exec` rather than publishing ports.

## Troubleshooting

| Symptom                                                         | Likely cause                                                     | What to do                                                                                                                                 |
| --------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `FB_APPSTATE is missing required cookies: c_user, xs, datr`     | Exported state lacks one of the required cookies.                | Re-export from a logged-in browser session and make sure all three cookies are present.                                                    |
| `FB_APPSTATE must contain valid JSON AppState data`             | `.env` value is not valid JSON, or quotes were stripped.         | Store it as one single-quoted `.env` value with escaped inner quotes; no trailing commas.                                                  |
| `TURSO_DATABASE_URL must be a remote libsql:// or https:// URL` | Local file or in-memory URL was supplied.                        | Provision the managed `panindigan` database and use its remote URL plus auth token.                                                        |
| `Migration <file> changed after it was applied`                 | An already-applied SQL file was edited.                          | Restore the original file from history and add a new numbered migration instead.                                                           |
| `Configuration validation failed: ...`                          | Strict schema rejected a value or combination.                   | Check the exact path in the message: property names, cooldown equality, notice lead-time order, AI price/quota rules, owner/admin overlap. |
| Bot connects but ignores commands                               | Wrong prefix, module disabled, allowlist, or active maintenance. | Confirm `!` prefix, `commands.enabled`, the relevant `modules` flag, `permissions` lists and maintenance status.                           |
| "MAINTENANCE IN PROGRESS" for every command                     | A global maintenance is `ACTIVE`.                                | Wait for it to finish, use `!status`/`!help`, or use the owner override.                                                                   |
| AI commands report a missing provider                           | `defaultProvider`/`defaultModel` empty or `AI_PROVIDER_*` unset. | Configure the provider and model in `config.json` and set the API key and base URL.                                                        |
| Commands are denied with a cooldown message and Redis is down   | Fail-closed cooldown policy.                                     | Restore Redis health (`docker compose ps redis`, `docker compose logs redis`) before expecting commands to run.                            |
| `pnpm verify:commands` reports a missing category               | A category index file has not been created yet.                  | Add `src/commands/categories/<category>/index.ts` exporting its command definitions; expected total is 280.                                |
| Container marked unhealthy                                      | Uptime endpoint disabled, or the process exited.                 | With the default config the healthcheck is a process check; inspect `docker compose logs app` for the real failure.                        |
