#!/usr/bin/env bash
set -e
cd "$(dirname "$0")/.."
echo "=== verify-syntax ===" && node scripts/verify-syntax.mjs
echo "=== verify-routes ===" && node scripts/verify-routes.mjs
echo "=== verify-schema ===" && node scripts/verify-schema.mjs
echo "=== verify-migration-idempotency ===" && node scripts/verify-migration-idempotency.mjs
echo "=== verify-cf-workers-patterns ===" && node scripts/verify-cf-workers-patterns.mjs
echo "=== ALL VERIFIED ==="
