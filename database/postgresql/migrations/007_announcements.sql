-- Developer announcements and per-group delivery tracking.
CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  announcement_type TEXT NOT NULL CHECK (announcement_type IN ('general', 'maintenance', 'interruption', 'release', 'update', 'security', 'emergency')),
  priority TEXT NOT NULL CHECK (priority IN ('normal', 'important', 'urgent')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('draft', 'scheduled', 'delivering', 'completed', 'partially_failed', 'failed', 'cancelled')),
  total_targets INTEGER NOT NULL DEFAULT 0 CHECK (total_targets >= 0),
  successful_deliveries INTEGER NOT NULL DEFAULT 0 CHECK (successful_deliveries >= 0),
  failed_deliveries INTEGER NOT NULL DEFAULT 0 CHECK (failed_deliveries >= 0),
  confirmed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS announcement_deliveries (
  id BIGSERIAL PRIMARY KEY,
  announcement_id TEXT NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
  thread_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  error TEXT,
  sent_at TIMESTAMPTZ,
  idempotency_key TEXT NOT NULL UNIQUE,
  UNIQUE (announcement_id, thread_id)
);

CREATE INDEX IF NOT EXISTS idx_announcements_status ON announcements (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcement_deliveries ON announcement_deliveries (announcement_id, status);
