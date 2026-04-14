// Phase τ: detect Cloudflare Workers anti-patterns via static analysis.
// Catches the kind of bug that "static syntax check + schema check" can't find,
// where code is syntactically valid but violates Worker runtime constraints.
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

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

// Pattern definitions: { name, severity, re, message, allowFile? }
const PATTERNS = [
  {
    name: 'request-mutation',
    severity: 'CRITICAL',
    re: /\brequest\.__\w+\s*=/g,
    message: 'Request object is immutable in CF Workers — assignment silently fails. Use WeakMap (see auth-helper.setPrincipal).',
  },
  {
    name: 'sync-setTimeout-long',
    severity: 'HIGH',
    re: /setTimeout\s*\(\s*[^,]+,\s*([3-9]\d{4,}|[1-9]\d{5,})/g,
    message: 'setTimeout > 30s in a request handler may exceed Worker CPU/wall-time budget.',
  },
  {
    name: 'limit-bind',
    severity: 'INFO',
    re: /LIMIT\s+\?/g,
    message: 'D1 supports `LIMIT ?` in current versions, but inlining a validated integer is more portable.',
    allowFile: ['scripts/'],
  },
  {
    name: 'console-trace-pii',
    severity: 'INFO',
    // Match only when an obvious value-bearing token (variable / dotted access / template) follows the keyword
    re: /console\.(log|error|warn)\([^)]*(?:password|cardNumber|card_number|cvv)\s*[:=,]?\s*[a-zA-Z_]\w*/gi,
    message: 'PII variable potentially logged — verify masked.',
  },
  {
    name: 'kv-no-await',
    severity: 'INFO',
    re: /^(?!.*(?:\bawait\b|\bctx\.waitUntil\b|\.catch\(|\.then\(|=\s*env)).*\b(?:env\.\w+_KV|env\.STATE_KV|env\.RATE_LIMITER|env\.SHADOW_LOG)\.put\(/gm,
    message: 'KV.put without await/waitUntil/.catch — verify the promise is tracked elsewhere.',
  },
  {
    name: 'crypto-randomuuid-fallback',
    severity: 'MEDIUM',
    re: /\bcrypto\s*&&\s*crypto\.randomUUID/g,
    message: 'crypto.randomUUID is always available in modern CF Workers — defensive check is dead code.',
    allowFile: [], // info only
  },
  {
    name: 'global-side-effect',
    severity: 'MEDIUM',
    re: /^globalThis\.\w+\s*=\s*(?!function|undefined|null|0|''|\[\]|\{\})/gm,
    message: 'Mutating globalThis at module scope leaks state across requests — use module-level const + WeakMap.',
  },
];

let critical = 0, high = 0, medium = 0, info = 0;
const files = walk(ROOT);
for (const f of files) {
  const src = readFileSync(f, 'utf8');
  const rel = f.replace(ROOT, '').replace(/\\/g, '/');
  for (const p of PATTERNS) {
    if (p.allowFile && p.allowFile.some(a => rel.includes(a))) continue;
    p.re.lastIndex = 0;
    let m;
    while ((m = p.re.exec(src))) {
      const line = src.slice(0, m.index).split('\n').length;
      const log = (p.severity === 'INFO') ? console.log : console.error;
      log(`${p.severity} [${p.name}] ${rel}:${line}: ${p.message}`);
      if (p.severity !== 'INFO') log(`  > ${m[0].trim().slice(0, 120)}`);
      if (p.severity === 'CRITICAL') critical++;
      else if (p.severity === 'HIGH') high++;
      else if (p.severity === 'MEDIUM') medium++;
      else info++;
    }
  }
}

console.log(`\nverify-cf-workers-patterns: ${files.length} files scanned`);
console.log(`  CRITICAL: ${critical}, HIGH: ${high}, MEDIUM: ${medium}, INFO: ${info}`);
// Fail only on CRITICAL or HIGH; INFO is advisory.
process.exit((critical + high) === 0 ? 0 : 1);
