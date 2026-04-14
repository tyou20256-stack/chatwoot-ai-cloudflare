// Phase ρ: parse production-full-fixed.sql + migrations 003-099 to build canonical schema,
// then scan handler INSERT/UPDATE statements for unknown columns.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\//, '');
const HANDLERS = join(ROOT, 'src', 'handlers');

function stripSqlComments(s) {
  // Strip -- line comments and /* */ block comments
  return s.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

function parseCreateTable(sql) {
  sql = stripSqlComments(sql);
  const tables = {};
  const re = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`]?(\w+)["`]?\s*\(([\s\S]*?)\);/gi;
  let m;
  while ((m = re.exec(sql))) {
    const name = m[1];
    const body = m[2];
    const cols = new Set();
    // Split by comma at top level (ignore commas inside parens)
    const parts = [];
    let depth = 0, buf = '';
    for (const ch of body) {
      if (ch === '(') depth++;
      else if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { parts.push(buf); buf = ''; continue; }
      buf += ch;
    }
    if (buf.trim()) parts.push(buf);
    for (const part of parts) {
      const t = part.trim();
      if (!t || /^(FOREIGN|PRIMARY|UNIQUE|CHECK|CONSTRAINT)\b/i.test(t)) continue;
      const cm = t.match(/^["`]?(\w+)["`]?\s+/);
      if (cm) cols.add(cm[1]);
    }
    tables[name] = cols;
  }
  return tables;
}

function applyAlter(tables, sql) {
  // Order: 1. CREATE TABLE first, 2. ALTER ADD, 3. DROP, 4. RENAME
  const newTables = parseCreateTable(sql);
  for (const [n, c] of Object.entries(newTables)) tables[n] = c;

  const re = /ALTER\s+TABLE\s+(?:IF\s+EXISTS\s+)?["`]?(\w+)["`]?\s+ADD\s+(?:COLUMN\s+)?["`]?(\w+)["`]?/gi;
  let m;
  while ((m = re.exec(sql))) {
    const t = m[1], c = m[2];
    if (!tables[t]) tables[t] = new Set();
    tables[t].add(c);
  }
  // DROP TABLE
  const dropRe = /DROP\s+TABLE\s+(?:IF\s+EXISTS\s+)?["`]?(\w+)["`]?/gi;
  while ((m = dropRe.exec(sql))) delete tables[m[1]];
  // RENAME (after CREATE/DROP)
  const renameRe = /ALTER\s+TABLE\s+(\w+)\s+RENAME\s+TO\s+(\w+)/gi;
  while ((m = renameRe.exec(sql))) {
    if (tables[m[1]]) { tables[m[2]] = tables[m[1]]; delete tables[m[1]]; }
  }
}

const baseSql = readFileSync(join(ROOT, 'production-full-fixed.sql'), 'utf8');
const tables = parseCreateTable(baseSql);

const migDir = join(ROOT, 'migrations');
const migs = readdirSync(migDir).filter(f => f.endsWith('.sql')).sort();
for (const f of migs) {
  applyAlter(tables, readFileSync(join(migDir, f), 'utf8'));
}

let failed = 0;
const handlers = readdirSync(HANDLERS).filter(f => f.endsWith('.mjs'));
for (const h of handlers) {
  const src = readFileSync(join(HANDLERS, h), 'utf8');
  // Find INSERT INTO <table> (col1, col2, ...) statements (skip dynamic via ${cols.join})
  const insRe = /INSERT\s+INTO\s+(\w+)\s*\(([^)]+)\)/gi;
  let m;
  while ((m = insRe.exec(src))) {
    const table = m[1];
    if (!tables[table]) continue; // unknown table — skip (may be alias)
    const colsRaw = m[2];
    if (colsRaw.includes('${')) continue; // dynamic — skip (handler builds at runtime)
    const cols = colsRaw.split(',').map(c => c.trim().replace(/[`"]/g, ''));
    for (const c of cols) {
      if (!c || !/^\w+$/.test(c)) continue;
      if (!tables[table].has(c)) {
        console.error(`FAIL ${h}: INSERT references ${table}.${c} (column not in schema)`);
        failed++;
      }
    }
  }
  // Find UPDATE <table> SET col = ?
  const updRe = /UPDATE\s+(\w+)\s+SET\s+([\s\S]*?)\s+WHERE/gi;
  while ((m = updRe.exec(src))) {
    const table = m[1];
    if (!tables[table]) continue;
    const setBody = m[2];
    const colRe = /(\w+)\s*=/g;
    let cm;
    while ((cm = colRe.exec(setBody))) {
      const c = cm[1];
      if (!tables[table].has(c)) {
        console.error(`FAIL ${h}: UPDATE references ${table}.${c} (column not in schema)`);
        failed++;
      }
    }
  }
}
console.log(`\nverify-schema: ${Object.keys(tables).length} tables loaded, ${handlers.length} handlers scanned, ${failed} failures`);
process.exit(failed === 0 ? 0 : 1);
