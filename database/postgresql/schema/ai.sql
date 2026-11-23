-- ai domain schema.
-- Extracted from database/postgresql/schema/panindigan.sql (005_ai.sql).
-- Reference only; the numbered migration files remain the executable source of truth.

-- AI usage accounting, quotas, feedback and cancellation requests.
CREATE TABLE IF NOT EXISTS ai_usage (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES bot_users(id) ON DELETE CASCADE,
  command_level TEXT NOT NULL CHECK (command_level IN ('ask1', 'ask2', 'ask3', 'ask4', 'ask5', 'ask6')),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  usage_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  coin_charge INTEGER NOT NULL DEFAULT 0,
  refund_status TEXT NOT NULL DEFAULT 'none' CHECK (refund_status IN ('none', 'partial', 'full', 'not_applicable')),
  success BOOLEAN NOT NULL,
  failure_reason TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_request_quotas (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES bot_users(id) ON DELETE CASCADE,
  command_level TEXT NOT NULL CHECK (command_level IN ('ask1', 'ask2', 'ask3', 'ask4', 'ask5')),
  period_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
  UNIQUE (user_id, command_level, period_start)
);

CREATE TABLE IF NOT EXISTS ai_feedback (
  id BIGSERIAL PRIMARY KEY,
  usage_id BIGINT NOT NULL REFERENCES ai_usage(id) ON DELETE CASCADE,
  user_id BIGINT NOT NULL REFERENCES bot_users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_cancellations (
  id BIGSERIAL PRIMARY KEY,
  request_key TEXT NOT NULL UNIQUE,
  user_id BIGINT NOT NULL REFERENCES bot_users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_level ON ai_usage (command_level, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_quota_period ON ai_request_quotas (user_id, command_level, period_start);
