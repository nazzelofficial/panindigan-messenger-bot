-- Extracted from database/postgresql/migrations/011_bank.sql (see panindigan.sql).
-- Bank balances are separate from the spendable wallet but remain in PostgreSQL.
CREATE TABLE IF NOT EXISTS bank_accounts (
  user_id BIGINT PRIMARY KEY REFERENCES bot_users(id) ON DELETE CASCADE,
  balance BIGINT NOT NULL DEFAULT 0 CHECK (balance >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_transactions (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES bot_users(id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('deposit', 'withdraw')),
  amount BIGINT NOT NULL CHECK (amount > 0),
  idempotency_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_user ON bank_transactions (user_id, created_at DESC);
