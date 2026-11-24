# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and version numbers follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.3] - 2026-11-24

### Fixed

- Cooldown, slow-down, and other short notices now actually appear. The library's send idempotency hashes on thread + exact text with a 24-hour TTL, so identical denial text was deduped and silently dropped after the first send. Each notice now carries a zero-width reference tied to the incoming message, so the hash is unique and the reply reaches Messenger while remaining invisible to the user.
- Outbound replies are serialized per thread (FIFO), so multi-part responses stay adjacent and in order instead of being buried by other sends. Split replies now carry `(1/3)`-style part markers, and a failed send no longer silently drops the remaining parts.
- Console logs are now colorized and human-readable instead of raw JSON, with the bot's own visual identity — bracketed 24-hour timestamps with milliseconds, solid background level badges, a diamond brand mark, and corner-bracketed module names — deliberately distinct from the library's logger.

## [0.1.2] - 2026-11-23

### Added

- Durable Messenger sessions: the refreshed session cookie jar is stored in Turso with a local `data/session` file mirror, so restarts, redeploys, and power loss do not log the account out. A corrected `FB_APPSTATE` is still picked up automatically when Facebook rejects a session.
- Continuous uptime: `!uptime` and `GET /uptime` now report time online from a durable first-seen timestamp in Turso, alongside the per-process uptime.

### Fixed

- The uptime server now serves `GET /` with a small status overview instead of returning `{"message":"Route GET:/ not found","error":"Not Found","statusCode":404}` to browsers and health probes. Unknown paths still return 404, now with a consistent body listing the available endpoints.

### Changed

- README grammar and accuracy pass: corrected stale version numbers and the uptime-endpoint status, reworded awkward sections, and documented durable sessions and uptime. No content was removed.

## [0.1.1] - 2026-11-23

### Fixed

- Cooldown and anti-spam now produce a visible reply. Anti-spam previously slept and then returned `allowed: true`, making the dispatcher's denial branch unreachable; rapid messages were throttled silently. It now returns a denial with the delay, and the dispatcher replies "Please slow down …".
- Command cooldown acquisition is now atomic (`SET NX` per key with rollback), so concurrent rapid commands can no longer all pass the check before a lock exists.

## [0.1.0] - 2026-11-23

Initial production implementation.

### Added

- Messenger bot service written in TypeScript 7 for Node 22+ (Node 26 recommended), built as ESM and running on `panindigan-automate@0.3.5`.
- AppState-only authentication: `FB_APPSTATE` is parsed and checked for the `c_user`, `xs` and `datr` cookies, and the library session is persisted under `data/session`. There is no email/password login.
- 280 commands across 11 categories — administration, moderation, information, utility, automation, entertainment, economy, leveling, games, media and AI — invoked with the `!` prefix and checked by a startup registry validator.
- Four stores with distinct ownership boundaries: PostgreSQL for authoritative business data, managed Turso (remote libSQL only) for operational history and scheduler checkpoints, MongoDB for document archives, and Redis for cooldowns, locks, deduplication, caching and rate limits.
- Economy with daily, weekly and monthly rewards, work and beg activities, daily streaks, a coin ledger and shop inventory.
- AI commands `ask1` through `ask6` with graduated coin prices, message length limits and per-level quotas; `ask6` is free and carries no application-level request-count limit.
- Global maintenance with scheduling, automatic start and finish, advance notices at 60/30/10/5 minutes, and exceptions for status/help commands and the owner.
- Developer announcements with a required final confirmation before broadcast and per-group delivery tracking.
- Redis-backed rate limiting with fail-closed cooldowns and progressive anti-spam delays.
- Strict Zod configuration validation, environment-only secret resolution and Pino redaction of sensitive log fields.
- Checksummed SQL migrations, JSON backup and restore scripts, a command verification script, and Docker and Docker Compose deployment files.

### Changed

- Applied migrations are treated as immutable: changes must be added as new migration files rather than edits to existing ones.
- Automatic library self-updates are disabled and the Messenger client is limited to options that exist in `panindigan-automate@0.3.5`, so deployments use a pinned, deterministic version.
- Configuration is loaded from a single `config.json` containing only settings and environment-variable names; all secret values are resolved from the environment before any client is constructed.

### Fixed

- Duplicate reward claims and duplicate AI charges are prevented with idempotency keys and unique constraints in PostgreSQL.
- Startup rejects overlapping owner/administrator IDs and AI price or quota combinations that would break the `ask1`–`ask6` ordering.
- A missing or inaccessible Turso database no longer falls back to an empty local SQLite file; startup fails instead of losing operational history.

### Security

- Secrets are never written to configuration files or logs; sensitive fields are redacted and database connection strings, AppState values and tokens are omitted from error output.
- Owner and administrator role changes are recorded in the audit log with critical severity.
- The Docker application image runs as the non-root `node` user, and Compose keeps all database services on an internal network with no ports published to the host.
