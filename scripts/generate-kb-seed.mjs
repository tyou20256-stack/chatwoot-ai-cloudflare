#!/usr/bin/env node
// Phase φ (phi): convert chatwoot-bot-patched/knowledge-base/*.md into
// INSERT statements for knowledge_sources table.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const KB_DIR = process.argv[2] || join(process.cwd(), '..', 'sloten-ai-delivery-bk', 'chatwoot-bot-patched', 'knowledge-base');
const OUT = process.argv[3] || join(process.cwd(), 'seeds', 'seed-knowledge-sources.sql');

function sqlEsc(s) { return String(s == null ? '' : s).replace(/'/g, "''"); }

function parseFrontmatter(md) {
  const m = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: md };
  const meta = {};
  for (const line of m[1].split('\n')) {
    const km = line.match(/^(\w+):\s*(.+)$/);
    if (!km) continue;
    let v = km[2].trim();
    if (v.startsWith('[') && v.endsWith(']')) {
      v = v.slice(1, -1).split(',').map(x => x.trim()).filter(Boolean);
    }
    meta[km[1]] = v;
  }
  return { meta, body: m[2].trim() };
}

const inserts = [];
inserts.push('-- @idempotent — seed-knowledge-sources.sql (Phase φ)');
inserts.push('-- Converts the 11 chatwoot-bot-patched/knowledge-base/*.md files into D1 rows.');
inserts.push('-- Re-running is safe because we DELETE by source_type+title first.');
inserts.push("DELETE FROM knowledge_sources WHERE source_type = 'manual_kb' AND tenant_id = 'tenant_default';");
inserts.push('');

const files = readdirSync(KB_DIR).filter(f => /^\d{2}-.+\.md$/.test(f)).sort();
let priority = 1;
for (const f of files) {
  const md = readFileSync(join(KB_DIR, f), 'utf8');
  const { meta, body } = parseFrontmatter(md);
  const title = meta.title || f.replace(/\.md$/, '');
  const category = meta.category || 'general';
  const keywords = Array.isArray(meta.keywords) ? meta.keywords.join(',') : (meta.keywords || '');
  const escalateKw = Array.isArray(meta.escalate_keywords) ? meta.escalate_keywords.join(',') : (meta.escalate_keywords || '');
  const aiSafe = meta.ai_safe === 'true' || meta.ai_safe === true ? 1 : 0;
  const metadataJson = JSON.stringify({
    keywords: keywords.split(',').map(s => s.trim()).filter(Boolean),
    escalate_keywords: escalateKw.split(',').map(s => s.trim()).filter(Boolean),
    ai_safe: !!aiSafe,
    source_file: f,
    last_updated: meta.last_updated || null,
  });

  inserts.push(`INSERT INTO knowledge_sources (tenant_id, url, title, content, metadata, source_type, priority, category, is_active, created_at, updated_at) VALUES (`);
  inserts.push(`  'tenant_default',`);
  inserts.push(`  NULL,`);
  inserts.push(`  '${sqlEsc(title)}',`);
  inserts.push(`  '${sqlEsc(body)}',`);
  inserts.push(`  '${sqlEsc(metadataJson)}',`);
  inserts.push(`  'manual_kb',`);
  inserts.push(`  ${priority},`);
  inserts.push(`  '${sqlEsc(category)}',`);
  inserts.push(`  1,`);
  inserts.push(`  datetime('now'), datetime('now')`);
  inserts.push(`);`);
  inserts.push('');
  priority++;
}

inserts.push(`-- Total: ${files.length} knowledge_sources rows seeded.`);
writeFileSync(OUT, inserts.join('\n'));
console.log(`Wrote ${OUT} (${files.length} rows)`);
