-- Durable schedules restored after restarts and their execution history.
CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id TEXT PRIMARY KEY,
  job_kind TEXT NOT NULL,
  payload JSONB NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  timezone_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'succeeded', 'failed', 'cancelled')),
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  maximum_attempts INTEGER NOT NULL DEFAULT 5 CHECK (maximum_attempts > 0),
  next_attempt_at TIMESTAMPTZ,
  locked_by TEXT,
  locked_until TIMESTAMPTZ,
  created_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS job_runs (
  id BIGSERIAL PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES scheduled_jobs(id) ON DELETE CASCADE,
  attempt INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('started', 'succeeded', 'failed')),
  error TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_due ON scheduled_jobs (status, due_at);
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_lock ON scheduled_jobs (locked_until) WHERE locked_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_runs_job ON job_runs (job_id, attempt DESC);
