-- economy domain schema.
-- Extracted from database/postgresql/schema/panindigan.sql (002_economy.sql).
-- Reference only; the numbered migration files remain the executable source of truth.

-- Durable coin balances, transactions, reward claims and shop inventory.
CREATE TABLE IF NOT EXISTS coin_accounts (
  user_id BIGINT PRIMARY KEY REFERENCES bot_users(id) ON DELETE CASCADE,
  balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  lifetime_earned BIGINT NOT NULL DEFAULT 0 CHECK (lifetime_earned >= 0),
  lifetime_spent BIGINT NOT NULL DEFAULT 0 CHECK (lifetime_spent >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coin_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES bot_users(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  transaction_type TEXT NOT NULL,
  reference_id TEXT,
  description TEXT NOT NULL DEFAULT '',
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reward_claims (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES bot_users(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL,
  reward_period TEXT NOT NULL,
  amount BIGINT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  next_eligible_at TIMESTAMPTZ NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  UNIQUE (user_id, reward_type, reward_period)
);

CREATE TABLE IF NOT EXISTS shop_items (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  price BIGINT NOT NULL CHECK (price > 0),
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_items (
  user_id BIGINT NOT NULL REFERENCES bot_users(id) ON DELETE CASCADE,
  item_id BIGINT NOT NULL REFERENCES shop_items(id) ON DELETE CASCADE,
  quantity BIGINT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE IF NOT EXISTS economy_audit (
  id BIGSERIAL PRIMARY KEY,
  actor_id TEXT,
  target_id TEXT NOT NULL,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coin_transactions_user ON coin_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reward_claims_user ON reward_claims (user_id, reward_type, claimed_at DESC);
CREATE INDEX IF NOT EXISTS idx_economy_audit_target ON economy_audit (target_id, created_at DESC);
