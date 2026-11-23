-- groups domain schema.
-- Extracted from database/postgresql/schema/panindigan.sql (001_core.sql).
-- Reference only; the numbered migration files remain the executable source of truth.

CREATE TABLE IF NOT EXISTS messenger_groups (
  id BIGSERIAL PRIMARY KEY,
  thread_id TEXT NOT NULL UNIQUE,
  name TEXT,
  is_group BOOLEAN NOT NULL DEFAULT TRUE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  participant_count INTEGER NOT NULL DEFAULT 0,
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_preferences (
  group_id BIGINT NOT NULL REFERENCES messenger_groups(id) ON DELETE CASCADE,
  preference_key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, preference_key)
);

CREATE INDEX IF NOT EXISTS idx_messenger_groups_active ON messenger_groups (is_active, last_seen_at DESC);
