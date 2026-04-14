-- Migration 011: Bootstrap last_cron_success so heartbeat doesn't flatline on fresh deploys (ξ-C5)
--
-- /api/ops/cron-health returned null because feature_flags.last_cron_success had
-- never been written yet (the daily cron at 03:00 UTC hadn't fired since the most
-- recent deploy). Seed it to "now" so the heartbeat is healthy until the real
-- cron fires and overwrites it.

-- ρ-Cπ3: ensure feature_flags exists before INSERT (fresh deploy safety)
CREATE TABLE IF NOT EXISTS feature_flags (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

INSERT OR REPLACE INTO feature_flags (key, value, updated_at)
VALUES ('last_cron_success', datetime('now'), datetime('now'));
