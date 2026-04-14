#!/usr/bin/env node
// Phase φ-E: Extract INCOMING customer questions from Chatwoot,
// cluster by topic, emit seed-knowledge-sources-faq.sql with frequent Q&A pairs.
//
// Privacy:
//   - Customer messages ARE fetched but PII is masked before clustering/output
//   - Only aggregated question patterns are stored (no individual customer data)
import { readFileSync, writeFileSync } from 'node:fs';

const BASE = 'https://im.slot-h.com';
const ACCOUNT_ID = 3;
const TOKEN = readFileSync('C:/tmp/cw_token.txt', 'utf8').trim();
const MAX_CONVERSATIONS = parseInt(process.argv[2] || '1500', 10);
const OUT = process.argv[3] || 'seeds/seed-knowledge-sources-faq.sql';

function maskPII(s) {
  if (!s) return '';
  return s
    .replace(/[A-Za-z0-9._+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[EMAIL]')
    .replace(/0[789]0[-\s]?\d{4}[-\s]?\d{4}/g, '[PHONE]')
    .replace(/\b\d{12,18}\b/g, '[ACCT]')
    .replace(/¥\s?\d{1,3}(?:,?\d{3})*/g, '¥[AMT]')
    .replace(/\d{1,3}(?:,\d{3})+\s*円/g, '[AMT]円')
    .replace(/\b[a-zA-Z0-9]{8,}@\b/g, '[ID]@')
    .replace(/[a-zA-Z]{3,}\d{2,5}\b/g, (m) => /^(http|sloten|chatwoot)/i.test(m) ? m : '[ID]');
}

async function api(path) {
  const r = await fetch(`${BASE}${path}`, { headers: { 'api_access_token': TOKEN } });
  if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`);
  return r.json();
}

console.log(`Fetching up to ${MAX_CONVERSATIONS} conversations...`);

// Collect customer-first-messages (the opening question of each conversation)
// and subsequent customer follow-ups
const allIncoming = [];
let fetched = 0;
const seen = new Set();

for (const status of ['resolved', 'open']) {
  let page = 1;
  while (fetched < MAX_CONVERSATIONS) {
    let data;
    try { data = await api(`/api/v1/accounts/${ACCOUNT_ID}/conversations?status=${status}&page=${page}&assignee_type=me_or_unassigned`); }
    catch (e) { break; }
    const convs = data.data?.payload || [];
    if (!convs.length) break;
    for (const c of convs) {
      if (seen.has(c.id)) continue;
      seen.add(c.id);
      if (fetched >= MAX_CONVERSATIONS) break;
      try {
        const msgRes = await api(`/api/v1/accounts/${ACCOUNT_ID}/conversations/${c.id}/messages`);
        const msgs = msgRes.payload || [];
        for (const m of msgs) {
          if (m.message_type !== 0) continue; // incoming only
          if (!m.content || typeof m.content !== 'string') continue;
          const txt = m.content.trim();
          if (txt.length < 5 || txt.length > 300) continue;
          // Skip menu-button responses (exact menu tokens)
          if (/^(はい|いいえ|次へ|戻る|メインメニュー|入金|出金|ボーナス|サポート|YES|NO|OK)$/i.test(txt)) continue;
          // Skip pure numbers / amounts
          if (/^¥?[\d,.\s]+円?$/.test(txt)) continue;
          // Skip pure IDs
          if (/^[a-zA-Z0-9_-]{4,20}$/.test(txt)) continue;
          allIncoming.push(maskPII(txt));
        }
        fetched++;
        if (fetched % 50 === 0) console.log(`  ${fetched} convs → ${allIncoming.length} customer msgs`);
      } catch (_) { /* skip */ }
    }
    page++;
    if (page > 100) break;
  }
}

console.log(`\nTotal: ${fetched} conversations, ${allIncoming.length} customer messages`);

// === Topic categorization ===
const TOPICS = {
  '入金': /入金|デポジット|振込|送金|チャージ|反映(されない|待ち)?|着金/,
  '出金': /出金|引[きぎ]出し|払い戻し|ポイント[がの]反映/,
  'KYC': /本人確認|KYC|身分証|書類|確認書|運転免許|パスポート|マイナンバー/,
  'ボーナス': /ボーナス|プロモ|キャンペーン|入金不要|フリースピン|ボーナスコード|賭け条件/,
  'アカウント': /アカウント|登録|ログイン|パスワード|メール|電話番号|退会/,
  '決済方法': /PayPay|銀行(振込)?|コンビニ|ローソン|ビットコイン|仮想通貨|BTC|ETH|ATM/,
  'ゲーム': /スロット|バカラ|ルーレット|ポーカー|ブラックジャック|機種|プロバイダ|ライブカジノ/,
  'トラブル': /エラー|不具合|動かない|固まる|落ちる|読み込み|ログインできない/,
  '操作方法': /どうやって|方法|手順|やり方|教えて|使い方/,
  'サポート': /オペレーター|スタッフ|担当|連絡|問い合わせ|質問|聞きたい/,
  'VIP': /VIP|ステータス|ランク|特典/,
  '確認': /確認|教えて|わからない|わかりません|\?|？/,
};

function topicOf(text) {
  for (const [name, re] of Object.entries(TOPICS)) {
    if (re.test(text)) return name;
  }
  return 'その他';
}

// === Cluster by topic + normalized prefix ===
function normalize(s) {
  return s.replace(/\s+/g, ' ').replace(/[「」『』！？!?。、,.\-✨🎰💰📷✅😊🎉💸🏦🏪😱🙏😭😢🙇]/g, '').toLowerCase().trim();
}
function prefix(s, n = 12) { return normalize(s).slice(0, n); }

const byTopic = new Map();
for (const m of allIncoming) {
  const t = topicOf(m);
  if (t === 'その他') continue;
  if (!byTopic.has(t)) byTopic.set(t, new Map());
  const byPfx = byTopic.get(t);
  const p = prefix(m);
  if (!p) continue;
  if (!byPfx.has(p)) byPfx.set(p, []);
  byPfx.get(p).push(m);
}

// === Select top-N clusters per topic ===
const faqItems = []; // {topic, question, count, variants}
for (const [topic, byPfx] of byTopic) {
  const clusters = [...byPfx.entries()]
    .filter(([_, arr]) => arr.length >= 2)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 10); // top 10 per topic
  for (const [pfx, arr] of clusters) {
    const sorted = [...arr].sort((a, b) => a.length - b.length);
    const rep = sorted[Math.floor(sorted.length / 2)];
    if (rep.length < 8) continue;
    const variants = [...new Set(arr.map(a => a.slice(0, 50)))].slice(0, 3);
    faqItems.push({ topic, question: rep, count: arr.length, variants });
  }
}

console.log(`Generated ${faqItems.length} FAQ items across ${byTopic.size} topics`);

// === Generate KB-style markdown + SQL ===
const byTopicOut = new Map();
for (const f of faqItems) {
  if (!byTopicOut.has(f.topic)) byTopicOut.set(f.topic, []);
  byTopicOut.get(f.topic).push(f);
}

function sqlEsc(s) { return s.replace(/'/g, "''"); }

const lines = [];
lines.push('-- @idempotent — seed-knowledge-sources-faq.sql');
lines.push('-- Frequent customer questions extracted from real Chatwoot conversations.');
lines.push(`-- Source: ${fetched} conversations scanned, ${allIncoming.length} customer messages,`);
lines.push(`-- ${faqItems.length} frequent question patterns across ${byTopic.size} topics.`);
lines.push('-- PII masked. source_type=real_faq to distinguish from manual_kb (11 staff-written articles).');
lines.push('');
lines.push("DELETE FROM knowledge_sources WHERE source_type = 'real_faq' AND tenant_id = 'tenant_default';");
lines.push('');

let priority = 100;
for (const [topic, items] of byTopicOut) {
  const title = `顧客頻出質問 — ${topic}`;
  // Build markdown body with all Q patterns in this topic
  const body = [];
  body.push(`# ${title}`);
  body.push('');
  body.push(`実顧客対応履歴から抽出された、${topic} に関する頻出質問パターンです。`);
  body.push('AI 応答の参考や、新規 FAQ 記事作成の基礎資料として利用できます。');
  body.push('');
  body.push('## 頻出パターン（出現回数順）');
  body.push('');
  let rank = 1;
  for (const f of items.sort((a, b) => b.count - a.count)) {
    body.push(`### ${rank}. ${f.question} (${f.count}件)`);
    if (f.variants.length > 1) {
      body.push('');
      body.push('類似パターン:');
      for (const v of f.variants) body.push(`- ${v}`);
    }
    body.push('');
    rank++;
  }
  const content = body.join('\n');
  const metadata = JSON.stringify({
    topic,
    total_questions: items.length,
    total_count: items.reduce((s, f) => s + f.count, 0),
    source: 'chatwoot_incoming_extraction',
  });
  lines.push(`INSERT INTO knowledge_sources (tenant_id, url, title, content, metadata, source_type, priority, category, is_active, created_at, updated_at) VALUES (`);
  lines.push(`  'tenant_default',`);
  lines.push(`  NULL,`);
  lines.push(`  '${sqlEsc(title)}',`);
  lines.push(`  '${sqlEsc(content)}',`);
  lines.push(`  '${sqlEsc(metadata)}',`);
  lines.push(`  'real_faq',`);
  lines.push(`  ${priority},`);
  lines.push(`  '${sqlEsc(topic)}',`);
  lines.push(`  1,`);
  lines.push(`  datetime('now'), datetime('now')`);
  lines.push(`);`);
  lines.push('');
  priority++;
}

writeFileSync(OUT, lines.join('\n'));
console.log(`\nWrote ${OUT}`);
console.log('Topic distribution:');
for (const [topic, items] of byTopicOut) {
  console.log(`  ${topic}: ${items.length} patterns, ${items.reduce((s, f) => s + f.count, 0)} total occurrences`);
}
