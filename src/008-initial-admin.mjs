#!/usr/bin/env node
/**
 * 008-initial-admin.mjs — Windows/Cross-platform Node 版の初期 admin 作成
 *
 * Usage:
 *   node migrations/008-initial-admin.mjs > /tmp/admin-insert.sql 2> /tmp/admin-credentials.txt
 *   cat /tmp/admin-credentials.txt   # ←一度だけ表示。secure channel で tking510 へ
 *   npx wrangler d1 execute chatwoot_rag_db --remote --file=/tmp/admin-insert.sql
 *
 * PBKDF2-SHA256 600,000 iter / 16B salt / 32B output — phase ζ 以降の標準設定
 */
import crypto from 'node:crypto';

// Strong 18-char password
const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
let password = '';
const bytes = crypto.randomBytes(18);
for (let i = 0; i < 18; i++) password += charset[bytes[i] % charset.length];
password += '!@#'[crypto.randomInt(3)] + crypto.randomInt(100).toString().padStart(2, '0');

const salt = crypto.randomBytes(16);
const saltHex = salt.toString('hex');
// ITERATIONS は auth-helper.mjs の hashPassword と一致させる
const ITERATIONS = 100000; // CF Workers cap
const hash = crypto.pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256').toString('hex');

process.stderr.write('=== INITIAL ADMIN CREDENTIALS (SHOW ONCE) ===\n');
process.stderr.write(`Email:    admin@sloten.local\n`);
process.stderr.write(`Password: ${password}\n`);
process.stderr.write(`Iterations: ${ITERATIONS} (PBKDF2-SHA256)\n`);
process.stderr.write(`=============================================\n`);
process.stderr.write(`\n⚠️  Store this password in a password manager IMMEDIATELY.\n`);
process.stderr.write(`    Transfer to tking510 via secure channel (encrypted message, 1Password share, etc.)\n`);
process.stderr.write(`    The password will NEVER be recoverable once this terminal is closed.\n`);

process.stdout.write(`INSERT OR IGNORE INTO staff_members (
  tenant_id, name, email, role,
  password_hash, password_salt,
  is_active, failed_attempts,
  created_at, updated_at
) VALUES (
  'tenant_default',
  'Initial Admin',
  'admin@sloten.local',
  'admin',
  '${hash}',
  '${saltHex}',
  1,
  0,
  datetime('now'),
  datetime('now')
);
`);
