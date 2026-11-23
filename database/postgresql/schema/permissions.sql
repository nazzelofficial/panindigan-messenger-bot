-- permissions domain schema.
-- Extracted from database/postgresql/schema/panindigan.sql (001_core.sql).
-- Reference only; the numbered migration files remain the executable source of truth.

CREATE TABLE IF NOT EXISTS app_permissions (
  id BIGSERIAL PRIMARY KEY,
  subject_type TEXT NOT NULL CHECK (subject_type IN ('user', 'group')),
  subject_id TEXT NOT NULL,
  permission TEXT NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT TRUE,
  granted_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (subject_type, subject_id, permission)
);

CREATE TABLE IF NOT EXISTS application_settings (
  setting_key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_permissions_subject ON app_permissions (subject_type, subject_id);
