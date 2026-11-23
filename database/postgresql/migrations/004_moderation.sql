-- Warnings, reports, moderation actions, mutes, blacklists and word filters.
CREATE TABLE IF NOT EXISTS warnings (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT REFERENCES messenger_groups(id) ON DELETE SET NULL,
  user_facebook_id TEXT NOT NULL,
  moderator_facebook_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reports (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT REFERENCES messenger_groups(id) ON DELETE SET NULL,
  reporter_facebook_id TEXT NOT NULL,
  target_facebook_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS moderation_actions (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT REFERENCES messenger_groups(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL,
  target_facebook_id TEXT NOT NULL,
  actor_facebook_id TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mutes (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES messenger_groups(id) ON DELETE CASCADE,
  user_facebook_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, user_facebook_id)
);

CREATE TABLE IF NOT EXISTS blacklist (
  id BIGSERIAL PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('user', 'group')),
  value TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (scope, value)
);

CREATE TABLE IF NOT EXISTS word_filters (
  id BIGSERIAL PRIMARY KEY,
  group_id BIGINT NOT NULL REFERENCES messenger_groups(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  action TEXT NOT NULL DEFAULT 'warn' CHECK (action IN ('warn', 'delete', 'mute')),
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (group_id, word)
);

CREATE INDEX IF NOT EXISTS idx_warnings_user ON warnings (user_facebook_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_actions_group ON moderation_actions (group_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mutes_expiry ON mutes (expires_at) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_word_filters_group ON word_filters (group_id);
