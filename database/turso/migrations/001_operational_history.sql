-- Durable operational history for the provisioned Turso database "panindigan".
CREATE TABLE IF NOT EXISTS command_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  command_name TEXT NOT NULL,
  thread_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  argument_length INTEGER NOT NULL DEFAULT 0,
  success INTEGER NOT NULL DEFAULT 1,
  error TEXT,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS command_analytics (
  command_name TEXT NOT NULL,
  usage_day TEXT NOT NULL,
  executions INTEGER NOT NULL DEFAULT 0,
  failures INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (command_name, usage_day)
);

CREATE TABLE IF NOT EXISTS automation_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id TEXT NOT NULL,
  kind TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS operational_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  action TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_command_history_name ON command_history (command_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_command_history_thread ON command_history (thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_command_analytics_day ON command_analytics (usage_day DESC);
CREATE INDEX IF NOT EXISTS idx_automation_history_thread ON automation_history (thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operational_activity_category ON operational_activity (category, created_at DESC);
