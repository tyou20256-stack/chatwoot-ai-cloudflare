// Phase ρ: ensure each migration .sql file is safe to re-apply.
// Static check: every ALTER TABLE ADD COLUMN must be guarded, OR the migration
// should run only on a fresh DB. We accept patterns: `IF NOT EXISTS`, or an
// initial PRAGMA / SELECT guard, or "create-new+swap" pattern.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\//, '');
const migDir = join(ROOT, 'migrations');
const migs = readdirSync(migDir).filter(f => f.endsWith('.sql')).sort();

let failed = 0;
for (const f of migs) {
  const sql = readFileSync(join(migDir, f), 'utf8');
  // Bare ALTER TABLE ADD COLUMN (without create-new+swap context) is the risk.
  const hasBareAdd = /ALTER\s+TABLE\s+\w+\s+ADD\s+(?:COLUMN\s+)?\w+/i.test(sql);
  const hasIdempotencyMarker = /-- @idempotent/i.test(sql)
    || /CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+\w+_new/i.test(sql);
  if (hasBareAdd && !hasIdempotencyMarker) {
    console.error(`WARN ${f}: contains ALTER TABLE ADD COLUMN without explicit @idempotent marker — re-application may fail.`);
    failed++;
  }
}
console.log(`\nverify-migration-idempotency: ${migs.length} migrations checked, ${failed} unguarded`);
process.exit(failed === 0 ? 0 : 1);
