-- Core identity, groups, preferences and application permissions.
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

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id BIGINT NOT NULL REFERENCES bot_users(id) ON DELETE CASCADE,
  preference_key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, preference_key)
);

CREATE TABLE IF NOT EXISTS group_preferences (
  group_id BIGINT NOT NULL REFERENCES messenger_groups(id) ON DELETE CASCADE,
  preference_key TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (group_id, preference_key)
);

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

CREATE INDEX IF NOT EXISTS idx_bot_users_role ON bot_users (is_owner, is_admin);
CREATE INDEX IF NOT EXISTS idx_messenger_groups_active ON messenger_groups (is_active, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_permissions_subject ON app_permissions (subject_type, subject_id);
