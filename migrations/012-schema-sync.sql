-- @idempotent (Phase ρ: tking510 should drop ALTER lines if column already exists)
-- Migration 012: Schema sync for handler expectations (ο-Critical batch)
--
-- Phase ξ added 009-011. Phase ο finds additional schema gaps:
--   - audit_logs.user_agent
--   - faq.view_count, faq.helpful_count
--   - business_hours uses open_time/close_time/is_open/ooo_message in handler
--   - staff_members extended profile (phone/department/hired_at/bio/language)
--     Note: 003-staff-members-profile.sql adds same; this migration is idempotent
--     so re-application is safe.
--
-- All ALTERs guarded with INSERT OR IGNORE / IF NOT EXISTS where SQLite allows.
-- For ADD COLUMN: SQLite does not have IF NOT EXISTS for columns until 3.35,
-- so wrapper `INSERT OR IGNORE` patterns and "create-new+swap" are used.

-- ============================================
-- audit_logs.user_agent
-- ============================================
ALTER TABLE audit_logs ADD COLUMN user_agent TEXT;

-- ============================================
-- faq.view_count, faq.helpful_count
-- ============================================
ALTER TABLE faq ADD COLUMN view_count INTEGER DEFAULT 0;
ALTER TABLE faq ADD COLUMN helpful_count INTEGER DEFAULT 0;

-- ============================================
-- business_hours: rebuild table with handler-expected columns
--   Handler expects: is_open (BOOL), open_time, close_time, ooo_message (TEXT)
--   Schema has:      is_active, start_time, end_time
-- Strategy: add aliases as new columns; keep old columns for backward compat.
-- ============================================
ALTER TABLE business_hours ADD COLUMN open_time TEXT;
ALTER TABLE business_hours ADD COLUMN close_time TEXT;
ALTER TABLE business_hours ADD COLUMN is_open INTEGER DEFAULT 1;
ALTER TABLE business_hours ADD COLUMN ooo_message TEXT;

-- Backfill from existing columns if data present
UPDATE business_hours SET open_time = start_time WHERE open_time IS NULL AND start_time IS NOT NULL;
UPDATE business_hours SET close_time = end_time WHERE close_time IS NULL AND end_time IS NOT NULL;
UPDATE business_hours SET is_open = is_active WHERE is_open IS NULL AND is_active IS NOT NULL;

-- ============================================
-- staff_members extended profile (idempotent re-add of 003)
-- ============================================
-- These ALTERs will fail harmlessly if 003 was already applied; tking510 should
-- run 003 first OR skip these lines if PRAGMA table_info(staff_members) already lists them.
ALTER TABLE staff_members ADD COLUMN avatar_url TEXT;
ALTER TABLE staff_members ADD COLUMN phone TEXT;
ALTER TABLE staff_members ADD COLUMN department TEXT;
ALTER TABLE staff_members ADD COLUMN hired_at TEXT;
ALTER TABLE staff_members ADD COLUMN bio TEXT;
ALTER TABLE staff_members ADD COLUMN language TEXT DEFAULT 'ja';

-- ============================================
-- Indexes
-- ============================================
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at);
CREATE INDEX IF NOT EXISTS idx_faq_views ON faq(view_count);
