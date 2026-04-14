#!/usr/bin/env node
// Phase ρ-Cπ2: Idempotent migration applier for Cloudflare D1.
//
// Wraps `wrangler d1 execute` and:
//   1. Reads each migrations/*.sql in order
//   2. For each ALTER TABLE ADD COLUMN, checks PRAGMA table_info(<table>) first
//      via `wrangler d1 execute --command='PRAGMA table_info(<table>)'`
//   3. Skips ALTER lines whose column already exists
//   4. Applies the remaining SQL via wrangler
//
// Usage:
//   node scripts/apply-migrations.mjs --db=<db-name> [--remote] [--from=003] [--config=wrangler.dev.toml]
//
// This protects against partial migration aborts when re-applying.
// τ-fix: now uses `--json` for PRAGMA parsing (Wrangler 4.x compatible) and
// forwards optional --config so it works against alternate environments.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const args = Object.fromEntries(process.argv.slice(2).map(a => {
  const [k, v] = a.replace(/^--/, '').split('=');
  return [k, v ?? true];
}));
if (!args.db) {
  console.error('Usage: node apply-migrations.mjs --db=<name> [--remote] [--from=003] [--config=path]');
  process.exit(1);
}
const remote = args.remote ? '--remote' : '--local';
const from = args.from || '000';
const configArgs = args.config ? ['--config', args.config] : [];
const isWindows = process.platform === 'win32';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\//, '');
const migDir = join(ROOT, 'migrations');
const files = readdirSync(migDir).filter(f => f.endsWith('.sql') && f >= from + '-').sort();

async function wranglerFile(filePath, extraArgs = []) {
  // shell:true on Windows to handle .cmd resolution; args are controlled (not user input).
  const r = spawnSync(npxCmd, ['wrangler', 'd1', 'execute', args.db, remote, ...configArgs, '--file', filePath, ...extraArgs], { encoding: 'utf8', shell: isWindows });
  return { code: r.status, out: r.stdout, err: r.stderr };
}

async function existingCols(table) {
  const fs = await import('node:fs');
  const tmp = join(migDir, `.tmp-pragma-${table}.sql`);
  fs.writeFileSync(tmp, `PRAGMA table_info(${table});`);
  const r = await wranglerFile(tmp, ['--json']);
  try { fs.unlinkSync(tmp); } catch (_) {}
  if (r.code !== 0) return null;
  const cols = new Set();
  try {
    const start = (r.out || '').indexOf('[');
    if (start < 0) return cols;
    const json = JSON.parse(r.out.slice(start));
    for (const rs of json) {
      for (const row of (rs.results || [])) if (row.name) cols.add(row.name);
    }
  } catch (e) {
    for (const line of (r.out || '').split('\n')) {
      const m = line.match(/^\s*\d+\s*\|\s*(\w+)/);
      if (m) cols.add(m[1]);
    }
  }
  return cols;
}

for (const f of files) {
  console.log(`\n--- ${f} ---`);
  const sql = readFileSync(join(migDir, f), 'utf8');
  // Strip lines that try to ADD a column that already exists.
  const filtered = [];
  for (const line of sql.split('\n')) {
    const am = line.match(/^\s*ALTER\s+TABLE\s+(\w+)\s+ADD\s+(?:COLUMN\s+)?(\w+)/i);
    if (am) {
      const cols = await existingCols(am[1]);
      if (cols && cols.has(am[2])) {
        console.log(`  SKIP (exists): ${am[1]}.${am[2]}`);
        continue;
      }
    }
    filtered.push(line);
  }
  const finalSql = filtered.join('\n').trim();
  if (!finalSql) { console.log('  nothing to apply'); continue; }
  // Write to temp + execute via --file (commands have quoting issues with multiline)
  const tmp = join(migDir, `.tmp-${f}`);
  const fs = await import('node:fs');
  fs.writeFileSync(tmp, finalSql);
  const r = spawnSync(npxCmd, ['wrangler', 'd1', 'execute', args.db, remote, ...configArgs, '--file', tmp], { encoding: 'utf8', stdio: 'inherit', shell: isWindows });
  fs.unlinkSync(tmp);
  if (r.status !== 0) { console.error(`  FAILED applying ${f}`); process.exit(2); }
}
console.log('\nAll migrations applied.');
