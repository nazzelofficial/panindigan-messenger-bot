-- maintenance domain schema.
-- Extracted from database/postgresql/schema/panindigan.sql (006_maintenance.sql).
-- Reference only; the numbered migration files remain the executable source of truth.

-- Persistent global maintenance schedules, notifications and state history.
CREATE TABLE IF NOT EXISTS maintenances (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  timezone_name TEXT NOT NULL,
  expected_duration_ms BIGINT NOT NULL CHECK (expected_duration_ms > 0),
  status TEXT NOT NULL CHECK (status IN ('OFF', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
  notice_message TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actual_start_at TIMESTAMPTZ,
  actual_end_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notification_status TEXT NOT NULL DEFAULT 'pending',
  CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS maintenance_notifications (
  id BIGSERIAL PRIMARY KEY,
  maintenance_id TEXT NOT NULL REFERENCES maintenances(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  lead_time_minutes INTEGER NOT NULL DEFAULT 0,
  thread_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed')),
  error TEXT,
  sent_at TIMESTAMPTZ,
  idempotency_key TEXT NOT NULL UNIQUE,
  UNIQUE (maintenance_id, notification_type, lead_time_minutes, thread_id)
);

CREATE TABLE IF NOT EXISTS maintenance_history (
  id BIGSERIAL PRIMARY KEY,
  maintenance_id TEXT NOT NULL REFERENCES maintenances(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenances (status, starts_at);
CREATE INDEX IF NOT EXISTS idx_maintenance_notifications ON maintenance_notifications (maintenance_id, notification_type);
CREATE INDEX IF NOT EXISTS idx_maintenance_history ON maintenance_history (maintenance_id, created_at DESC);
