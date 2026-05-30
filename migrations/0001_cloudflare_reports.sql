CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL CHECK (scope IN ('global', 'country')),
  slug TEXT NOT NULL DEFAULT 'global',
  title TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  public_path TEXT NOT NULL,
  generated_at TEXT NOT NULL,
  report_date TEXT NOT NULL,
  is_current INTEGER NOT NULL DEFAULT 0,
  provider TEXT,
  model TEXT,
  status TEXT NOT NULL DEFAULT 'ready',
  metadata TEXT
);

CREATE INDEX IF NOT EXISTS idx_reports_lookup
  ON reports (scope, slug, is_current, generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_history
  ON reports (scope, slug, generated_at DESC);
