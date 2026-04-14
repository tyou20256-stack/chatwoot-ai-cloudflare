-- @idempotent (Phase τ smoke test discovery: staff_members.is_active was missing)
-- Migration 014: Add is_active to staff_members
--
-- src/auth-helper.mjs:289 reads row.is_active from staff_members and denies session
-- if false. migrations/008-initial-admin.mjs INSERTs is_active=1. The column was
-- never created in production-full-fixed.sql or any prior migration. Without this,
-- staff login fails 500 immediately after deployment.

ALTER TABLE staff_members ADD COLUMN is_active INTEGER DEFAULT 1;
UPDATE staff_members SET is_active = 1 WHERE is_active IS NULL;
CREATE INDEX IF NOT EXISTS idx_staff_members_active ON staff_members(is_active, role);
