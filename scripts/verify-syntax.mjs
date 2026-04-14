// Phase ρ: syntax check using node --check (ESM-aware)
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = new URL('../src/', import.meta.url).pathname.replace(/^\//, '');

function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (f.endsWith('.mjs')) out.push(p);
  }
  return out;
}

let failed = 0;
const files = walk(ROOT);
for (const f of files) {
  const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
  if (r.status !== 0) {
    console.error(`FAIL ${f}:\n${r.stderr.split('\n').slice(0, 3).join('\n')}`);
    failed++;
  }
}
console.log(`\nverify-syntax: ${files.length} files checked, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
