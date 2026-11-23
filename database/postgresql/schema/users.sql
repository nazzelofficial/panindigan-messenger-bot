-- users domain schema.
-- Extracted from database/postgresql/schema/panindigan.sql (001_core.sql).
-- Reference only; the numbered migration files remain the executable source of truth.

CREATE TABLE IF NOT EXISTS bot_users (
  id BIGSERIAL PRIMARY KEY,
  facebook_id TEXT NOT NULL UNIQUE,
  display_name TEXT,
  locale TEXT NOT NULL DEFAULT 'en-PH',
  is_owner BOOLEAN NOT NULL DEFAULT FALSE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id BIGINT NOT NULL REFERENCES bot_users(id) ON DELETE CASCADE,
  preference_key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, preference_key)
);

CREATE INDEX IF NOT EXISTS idx_bot_users_role ON bot_users (is_owner, is_admin);
