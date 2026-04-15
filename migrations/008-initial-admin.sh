#!/bin/bash
# Usage: ./008-initial-admin.sh
# Generates a random password, hashes it with PBKDF2-SHA256 (100k iter, 16B salt),
# and outputs INSERT SQL for the admin@sloten.local account.
# The plaintext password is printed to stderr ONCE — copy it to a password manager.
set -euo pipefail

PASSWORD=$(openssl rand -base64 18 | tr -d '=+/')
SALT=$(openssl rand -hex 16)
HASH=$(node -e "
const crypto = require('crypto');
const pw = process.argv[1];
const salt = Buffer.from(process.argv[2], 'hex');
const hash = crypto.pbkdf2Sync(pw, salt, 100000, 32, 'sha256').toString('hex');
console.log(hash);
" "$PASSWORD" "$SALT")

echo "=== INITIAL ADMIN CREDENTIALS (SHOW ONCE) ===" >&2
echo "Email:    admin@sloten.local" >&2
echo "Password: $PASSWORD" >&2
echo "=============================================" >&2

cat <<EOF
INSERT OR IGNORE INTO staff_members (
  tenant_id, name, email, role, password_hash, password_salt,
  failed_attempts, created_at, updated_at
) VALUES (
  'tenant_default',
  'Initial Admin',
  'admin@sloten.local',
  'admin',
  '$HASH',
  '$SALT',
  0,
  datetime('now'),
  datetime('now')
);
EOF
