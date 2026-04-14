-- Migration 011: Bootstrap last_cron_success so heartbeat doesn't flatline on fresh deploys (ξ-C5)
--
-- /api/ops/cron-health returned null because feature_flags.last_cron_success had
-- never been written yet (the daily cron at 03:00 UTC hadn't fired since the most
-- recent deploy). Seed it to "now" so the heartbeat is healthy until the real
-- cron fires and overwrites it.

INSERT OR REPLACE INTO feature_flags (key, value, updated_at)
VALUES ('last_cron_success', datetime('now'), datetime('now'));
