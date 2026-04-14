-- @idempotent (Phase ρ: tking510 should drop ALTER lines if column already exists)
-- staff_members プロフィール項目拡張
-- ALTER TABLE で段階的に追加（SQLite は DROP COLUMN 非対応なので追加のみ）

ALTER TABLE staff_members ADD COLUMN avatar_url TEXT;
ALTER TABLE staff_members ADD COLUMN phone TEXT;
ALTER TABLE staff_members ADD COLUMN department TEXT;
ALTER TABLE staff_members ADD COLUMN hired_at TEXT;
ALTER TABLE staff_members ADD COLUMN bio TEXT;
ALTER TABLE staff_members ADD COLUMN language TEXT DEFAULT 'ja';
