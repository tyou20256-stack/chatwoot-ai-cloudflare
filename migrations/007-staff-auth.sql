-- @idempotent (Phase ρ: tking510 should drop ALTER lines if column already exists)
-- Staff authentication columns
ALTER TABLE staff_members ADD COLUMN password_hash TEXT;
ALTER TABLE staff_members ADD COLUMN password_salt TEXT;
ALTER TABLE staff_members ADD COLUMN session_token_hash TEXT;
ALTER TABLE staff_members ADD COLUMN session_expires_at TEXT;
ALTER TABLE staff_members ADD COLUMN failed_attempts INTEGER DEFAULT 0;
ALTER TABLE staff_members ADD COLUMN locked_until TEXT;
ALTER TABLE staff_members ADD COLUMN last_login_at TEXT;

CREATE INDEX IF NOT EXISTS idx_staff_members_session_token ON staff_members(session_token_hash);
CREATE INDEX IF NOT EXISTS idx_staff_members_email ON staff_members(email);
