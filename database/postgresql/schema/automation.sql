-- automation domain schema.
-- Extracted from database/postgresql/schema/panindigan.sql (008_automation.sql).
-- Reference only; the numbered migration files remain the executable source of truth.

-- Per-group automation configuration and response rules.
CREATE TABLE IF NOT EXISTS group_settings (
  thread_id TEXT PRIMARY KEY,
  welcome_message TEXT NOT NULL DEFAULT '',
  goodbye_message TEXT NOT NULL DEFAULT '',
  auto_react_emoji TEXT NOT NULL DEFAULT '',
  auto_delete_seconds INTEGER NOT NULL DEFAULT 0 CHECK (auto_delete_seconds >= 0),
  announcement_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS auto_responses (
  id BIGSERIAL PRIMARY KEY,
  thread_id TEXT NOT NULL,
  trigger_text TEXT NOT NULL,
  response_text TEXT NOT NULL,
  match_mode TEXT NOT NULL DEFAULT 'exact' CHECK (match_mode IN ('exact', 'contains', 'prefix')),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (thread_id, trigger_text)
);

CREATE TABLE IF NOT EXISTS keyword_triggers (
  id BIGSERIAL PRIMARY KEY,
  thread_id TEXT NOT NULL,
  keyword TEXT NOT NULL,
  response_text TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (thread_id, keyword)
);

CREATE TABLE IF NOT EXISTS automation_runs (
  id BIGSERIAL PRIMARY KEY,
  thread_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auto_responses_thread ON auto_responses (thread_id, active);
CREATE INDEX IF NOT EXISTS idx_keyword_triggers_thread ON keyword_triggers (thread_id, active);
CREATE INDEX IF NOT EXISTS idx_automation_runs_thread ON automation_runs (thread_id, created_at DESC);
