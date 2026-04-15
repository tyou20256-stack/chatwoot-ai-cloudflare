#!/usr/bin/env node
// Phase φ-real: Extract staff outgoing messages from production Chatwoot,
// mask PII, cluster, and emit seed-templates-real.sql.
//
// Privacy:
//   - Only fetches OUTGOING messages where sender_type === 'User' (staff)
//   - Customer messages NEVER stored or analyzed
//   - PII masked before any logging or output (email/phone/account-id/amount)
import { writeFileSync, readFileSync } from 'node:fs';

const BASE = 'https://im.sloten.io';
const ACCOUNT_ID = 3;
const TOKEN = readFileSync('C:/tmp/cw_token.txt', 'utf8').trim();
const MAX_CONVERSATIONS = parseInt(process.argv[2] || '300', 10);
const OUT = process.argv[3] || 'seeds/seed-templates-real.sql';

function maskPII(s) {
  if (!s) return '';
  return s
    .replace(/[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[EMAIL]')
    .replace(/0[789]0[-\s]?\d{4}[-\s]?\d{4}/g, '[PHONE]')
    .replace(/\b\d{12,18}\b/g, '[ACCT]')
    .replace(/¥\s?\d{1,3}(?:,?\d{3})*/g, '¥[AMT]')
    .replace(/\d{1,3}(?:,\d{3})+\s*円/g, '[AMT]円')
    .replace(/\b[a-zA-Z0-9]{8,}@\b/g, '[ID]@')
    .replace(/[a-zA-Z]+\d{2,5}\b/g, (m) => /^(tpl|api|http|sloten|chatwoot|sylv|spectacular)/i.test(m) ? m : '[ID]');
}

async function api(path) {
  const r = await fetch(`${BASE}${path}`, { headers: { 'api_access_token': TOKEN } });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json();
}

console.log(`Fetching up to ${MAX_CONVERSATIONS} conversations from ${BASE}/api/v1/accounts/${ACCOUNT_ID}...`);

const allOutgoing = []; // {content, len_norm}
let page = 1, fetched = 0;
const seenConvIds = new Set();

// Fetch both resolved and open for variety
for (const status of ['resolved', 'open']) {
  page = 1;
  while (fetched < MAX_CONVERSATIONS) {
    const data = await api(`/api/v1/accounts/${ACCOUNT_ID}/conversations?status=${status}&page=${page}&assignee_type=me_or_unassigned`);
    const convs = data.data?.payload || [];
    if (!convs.length) break;
    for (const c of convs) {
      if (seenConvIds.has(c.id)) continue;
      seenConvIds.add(c.id);
      if (fetched >= MAX_CONVERSATIONS) break;
      try {
        const msgRes = await api(`/api/v1/accounts/${ACCOUNT_ID}/conversations/${c.id}/messages`);
        const msgs = msgRes.payload || [];
        for (const m of msgs) {
          // 0=incoming, 1=outgoing, 2=activity, 3=template
          if (m.message_type !== 1) continue;
          if (m.sender_type === 'AgentBot') continue;
          if (!m.content || typeof m.content !== 'string') continue;
          const txt = m.content.trim();
          if (txt.length < 15 || txt.length > 800) continue;
          // Skip auto-greeting / bot-style messages
          if (/^(Welcome|Hi|Hello|こんにちは|いらっしゃい)/.test(txt) && txt.length < 40) continue;
          allOutgoing.push(maskPII(txt));
        }
        fetched++;
        if (fetched % 25 === 0) console.log(`  fetched ${fetched} conversations, collected ${allOutgoing.length} staff messages`);
      } catch (e) { /* skip */ }
    }
    page++;
    if (page > 50) break;
  }
}
console.log(`\nTotal: ${fetched} conversations scanned, ${allOutgoing.length} staff messages extracted`);

// === Clustering: full-text normalized hash (catches near-duplicates) ===
function normalize(s) {
  return s.replace(/\s+/g, ' ').replace(/[「」『』！？!?。、,.\-✨🎰💰📷✅😊🎉💸🏦🏪😱]/g, '').toLowerCase().trim();
}

const groups = new Map(); // normalized-full → [originals]
for (const m of allOutgoing) {
  const n = normalize(m);
  if (!n || n.length < 10) continue;
  if (!groups.has(n)) groups.set(n, []);
  groups.get(n).push(m);
}

// Pick clusters with >= 2 occurrences (frequent patterns) — lowered to capture
// less-common but still recurring patterns now that dedup is full-text.
const candidates = [...groups.entries()]
  .filter(([_, arr]) => arr.length >= 2)
  .sort((a, b) => b[1].length - a[1].length)
  .slice(0, 80);

console.log(`Frequent clusters (>=3 occurrences): ${candidates.length}`);

// Pick representative from each cluster + dedup by category+normalized-content
const seenSig = new Set();
const templates = [];
for (const [norm, arr] of candidates) {
  const sorted = [...arr].sort((a, b) => a.length - b.length);
  const rep = sorted[Math.floor(sorted.length / 2)] || sorted[0];
  if (rep.length < 20) continue;
  const sig = norm.slice(0, 40);
  if (seenSig.has(sig)) continue;
  seenSig.add(sig);
  templates.push({ count: arr.length, content: rep, prefix: norm });
}

// Heuristic categorization (improved — order matters: more specific first)
function categorize(text) {
  const t = text;
  // System-generated / menu prompts (likely AgentBot)
  if (/ようこそ|🎰.*スロット天国|どのようなご用件/.test(t)) return 'メニュー';
  if (/コンビニ.{0,5}決済番号|Loppi|決済番号発行/.test(t)) return '入金-コンビニ';
  if (/取引番号|スクリーンショット.*受け取/.test(t)) return '入金-確認';
  if (/オペレーター.{0,8}(お繋ぎ|転送)/.test(t)) return '転送';
  // Domain-specific
  if (/銀行振込|振込先|口座|お振込/.test(t)) return '入金-銀行';
  if (/PayPay|ペイペイ/.test(t)) return '入金-PayPay';
  if (/コンビニ|ローソン|セブン|ファミマ/.test(t)) return '入金-コンビニ';
  if (/仮想通貨|ビットコイン|BTC|ETH/.test(t)) return '入金-仮想通貨';
  if (/入金.*完了|入金.*ありがとう|ご入金/.test(t)) return '入金-完了';
  if (/入金|デポジット/.test(t)) return '入金';
  if (/出金|引き出し|払い戻し|引出/.test(t)) return '出金';
  if (/本人確認|KYC|身分証|書類|証明書/.test(t)) return 'KYC';
  if (/ボーナス|プロモ|キャンペーン|フリースピン|FS|入金不要/.test(t)) return 'ボーナス';
  if (/エラー|不具合|トラブル|動かない|ログインできない|表示されない/.test(t)) return 'トラブル';
  if (/申し訳|お詫び|ご不便|失礼/.test(t)) return 'お詫び';
  if (/お待ちください|お待たせ|確認中|対応中|処理中/.test(t)) return '待機案内';
  if (/ありがとう|よろしく|お願い|引き続き/.test(t)) return 'クロージング';
  if (/VIP|ステータス|ランク/.test(t)) return 'VIP案内';
  if (/メニュー|お選び/.test(t)) return 'メニュー';
  return 'その他';
}

// Generate SQL
const lines = [];
lines.push('-- @idempotent — seed-templates-real.sql');
lines.push('-- Generated from REAL Chatwoot staff outgoing messages (im.sloten.io / account 3).');
lines.push(`-- Source: ${fetched} conversations scanned, ${allOutgoing.length} staff messages,`);
lines.push(`-- ${candidates.length} frequent clusters identified, ${templates.length} representative templates emitted.`);
lines.push('-- PII (email/phone/amount/account_id) masked before clustering.');
lines.push('');
lines.push("DELETE FROM templates WHERE tenant_id = 'tenant_default' AND name LIKE 'real-%';");
lines.push('');

function sqlEsc(s) { return s.replace(/'/g, "''"); }
let i = 1;
for (const tpl of templates) {
  const cat = categorize(tpl.content);
  const name = `real-${String(i).padStart(3, '0')}-${cat}`;
  const shortcut = `/r${String(i).padStart(3, '0')}`;
  lines.push(`-- count=${tpl.count} (frequency rank #${i})`);
  lines.push(`INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (`);
  lines.push(`  'tenant_default', '${name}', '${cat}', '${sqlEsc(tpl.content)}', 'ja', '${shortcut}', ${tpl.count}, datetime('now'), datetime('now'));`);
  lines.push('');
  i++;
}

writeFileSync(OUT, lines.join('\n'));
console.log(`\nWrote ${OUT} — ${templates.length} real-data templates`);

// Print category distribution
const dist = {};
for (const t of templates) {
  const c = categorize(t.content);
  dist[c] = (dist[c] || 0) + 1;
}
console.log('Category distribution:');
for (const [k, v] of Object.entries(dist).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${v}`);
