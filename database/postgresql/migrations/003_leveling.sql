-- Experience, levels, level rewards and temporary boosts.
CREATE TABLE IF NOT EXISTS user_levels (
  user_id BIGINT PRIMARY KEY REFERENCES bot_users(id) ON DELETE CASCADE,
  xp BIGINT NOT NULL DEFAULT 0 CHECK (xp >= 0),
  total_xp BIGINT NOT NULL DEFAULT 0 CHECK (total_xp >= 0),
  level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1),
  last_message_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS level_rewards (
  level INTEGER PRIMARY KEY CHECK (level >= 1),
  reward_label TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS xp_boosts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES bot_users(id) ON DELETE CASCADE,
  multiplier NUMERIC(5, 2) NOT NULL CHECK (multiplier > 0),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_levels_xp ON user_levels (xp DESC);
CREATE INDEX IF NOT EXISTS idx_user_levels_level ON user_levels (level DESC);
CREATE INDEX IF NOT EXISTS idx_xp_boosts_user ON xp_boosts (user_id, expires_at DESC);
