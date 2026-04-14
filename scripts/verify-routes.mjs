// Phase ρ: verify every handler imported in index.mjs is actually exported.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('../src/', import.meta.url).pathname.replace(/^\//, '');
const indexSrc = readFileSync(join(ROOT, 'index.mjs'), 'utf8');

// Extract `import { a, b } from './handlers/x.mjs'`
const importRe = /import\s*\{([^}]+)\}\s*from\s*['"](\.\/[^'"]+\.mjs)['"]/g;
let failed = 0;
let total = 0;
let m;
while ((m = importRe.exec(indexSrc))) {
  const names = m[1].split(',').map(s => s.trim().split(/\s+as\s+/)[0]).filter(Boolean);
  const path = join(ROOT, m[2]);
  let src;
  try { src = readFileSync(path, 'utf8'); }
  catch (e) { console.error(`FAIL: cannot read ${path}: ${e.message}`); failed++; continue; }
  for (const name of names) {
    total++;
    const exported = new RegExp(`export\\s+(?:async\\s+)?(?:function|const|let|var|class)\\s+${name}\\b`).test(src)
      || new RegExp(`export\\s*\\{[^}]*\\b${name}\\b[^}]*\\}`).test(src);
    if (!exported) {
      console.error(`FAIL: ${name} imported by index.mjs but not exported from ${m[2]}`);
      failed++;
    }
  }
}
console.log(`\nverify-routes: ${total} imports checked, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
