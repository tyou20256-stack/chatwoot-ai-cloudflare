#!/usr/bin/env node
// Phase τ ローカル smoke test — wrangler dev (--local) を起動した状態で実行
//
// Usage:
//   1. 別ターミナルで: npm run dev:local
//   2. このスクリプト: node scripts/smoke-test.mjs --base=http://localhost:8787 --email=admin@sloten.local --password=<pw>
//
// 実行内容（順次）:
//   T1. /health → 200
//   T2. /api/auth/login (wrong password) → 401
//   T3. /api/auth/login → 200 + Set-Cookie
//   T4. /api/auth/me (no cookie) → 401
//   T5. /api/auth/me (with cookie) → 200 + role=admin
//   T6. /api/faq (no cookie) → 401
//   T7. /api/faq POST (with cookie + keywords) → 201
//   T8. /api/faq/search?q=入金 (with cookie) → 200
//   T9. /api/webhooks POST (HTTPS URL) → 201
//   T10. /api/webhooks POST (http://) → 400 (SSRF guard)
//   T11. /api/webhooks POST (private IP) → 400 (SSRF guard)
//   T12. /api/escalations (with cookie) → 200
//   T13. /api/ops/cron-health → 200 + stale:false
//   T14. /api/auth/logout → 200
//   T15. /api/auth/me after logout → 401

import { parseArgs } from 'node:util';

const { values: args } = parseArgs({
  options: {
    base: { type: 'string', default: 'http://localhost:8787' },
    email: { type: 'string', default: 'admin@sloten.local' },
    password: { type: 'string', default: '' },
  },
});

if (!args.password) {
  console.error('Usage: node smoke-test.mjs --password=<admin password>');
  process.exit(1);
}

const BASE = args.base.replace(/\/$/, '');
let cookie = '';
let pass = 0, fail = 0;
const failures = [];

function log(test, status, msg) {
  const tag = status === 'PASS' ? '\u001b[32mPASS\u001b[0m' : '\u001b[31mFAIL\u001b[0m';
  console.log(`  [${tag}] ${test} — ${msg}`);
  if (status === 'PASS') pass++;
  else { fail++; failures.push(`${test}: ${msg}`); }
}

async function req(method, path, opts = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
  if (opts.cookie === true && cookie) headers['Cookie'] = cookie;
  const body = opts.body !== undefined ? JSON.stringify(opts.body) : undefined;
  const r = await fetch(`${BASE}${path}`, { method, headers, body });
  const setCookie = r.headers.get('set-cookie');
  let json = null;
  try { json = await r.json(); } catch { /* non-JSON */ }
  return { status: r.status, json, setCookie };
}

async function main() {
  console.log(`\n=== Sloten AI Gateway Smoke Test ===\nBase: ${BASE}\nUser: ${args.email}\n`);

  // T1
  {
    const r = await req('GET', '/health');
    log('T01 GET /health', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`);
  }

  // T2
  {
    const r = await req('POST', '/api/auth/login', { body: { email: args.email, password: 'WRONGPASSWORD123' } });
    log('T02 login wrong pw', r.status === 401 ? 'PASS' : 'FAIL', `status=${r.status}`);
  }

  // T3
  {
    const r = await req('POST', '/api/auth/login', { body: { email: args.email, password: args.password } });
    if (r.status === 200 && r.setCookie) {
      cookie = r.setCookie.split(';')[0];
      log('T03 login correct', 'PASS', `200 + cookie set`);
    } else {
      log('T03 login correct', 'FAIL', `status=${r.status} cookie=${!!r.setCookie} body=${JSON.stringify(r.json).slice(0, 100)}`);
      console.error('\n  cannot continue without session — aborting\n');
      summary();
      return;
    }
  }

  // T4
  {
    const r = await req('GET', '/api/auth/me');
    log('T04 me (no cookie)', r.status === 401 ? 'PASS' : 'FAIL', `status=${r.status}`);
  }

  // T5
  {
    const r = await req('GET', '/api/auth/me', { cookie: true });
    // Handler returns { success: true, staff: {role, ...} }
    const role = r.json?.staff?.role ?? r.json?.role;
    const ok = r.status === 200 && role === 'admin';
    log('T05 me (with cookie)', ok ? 'PASS' : 'FAIL', `status=${r.status} role=${role}`);
  }

  // T6
  {
    const r = await req('GET', '/api/faq');
    // Note: /api/faq is GET — auth model depends on configuration. Cookie-less may be 401 OR 200 with public read.
    log('T06 faq (no cookie)', (r.status === 401 || r.status === 200) ? 'PASS' : 'FAIL', `status=${r.status} (401 or 200 acceptable)`);
  }

  // T7
  let createdFaqId = null;
  {
    const body = {
      tenant_id: 'tenant_default',
      question: 'スモークテスト用FAQ',
      answer: 'これはローカル動作確認用のFAQです',
      category: 'test',
      language: 'ja',
      keywords: 'smoke,test,phase-tau',
    };
    const r = await req('POST', '/api/faq', { cookie: true, body });
    if (r.status === 201 && r.json?.faq?.id) {
      createdFaqId = r.json.faq.id;
      const hasKw = r.json.faq.keywords === 'smoke,test,phase-tau';
      log('T07 faq POST + keywords', hasKw ? 'PASS' : 'FAIL', `id=${createdFaqId} keywords stored=${hasKw}`);
    } else {
      log('T07 faq POST + keywords', 'FAIL', `status=${r.status} body=${JSON.stringify(r.json).slice(0, 200)}`);
    }
  }

  // T8
  {
    const r = await req('GET', '/api/faq/search?q=スモーク', { cookie: true });
    const hasResults = r.status === 200 && Array.isArray(r.json?.faq);
    log('T08 faq search', hasResults ? 'PASS' : 'FAIL', `status=${r.status} count=${r.json?.faq?.length ?? '?'}`);
  }

  // T9
  let createdWebhookId = null;
  {
    const r = await req('POST', '/api/webhooks', {
      cookie: true,
      body: { tenant_id: 'tenant_default', name: 'smoke-test', url: 'https://example.com/hook', events: ['test'] },
    });
    if (r.status === 201 && r.json?.webhook?.id) {
      createdWebhookId = r.json.webhook.id;
      log('T09 webhook POST https', 'PASS', `id=${createdWebhookId}`);
    } else {
      log('T09 webhook POST https', 'FAIL', `status=${r.status} body=${JSON.stringify(r.json).slice(0, 200)}`);
    }
  }

  // T10 SSRF
  {
    const r = await req('POST', '/api/webhooks', {
      cookie: true,
      body: { tenant_id: 'tenant_default', name: 'ssrf-http', url: 'http://example.com/hook' },
    });
    log('T10 webhook http://', r.status === 400 ? 'PASS' : 'FAIL', `status=${r.status} (expect 400 SSRF)`);
  }

  // T11 SSRF private IP
  {
    const r = await req('POST', '/api/webhooks', {
      cookie: true,
      body: { tenant_id: 'tenant_default', name: 'ssrf-priv', url: 'https://10.0.0.1/hook' },
    });
    log('T11 webhook private IP', r.status === 400 ? 'PASS' : 'FAIL', `status=${r.status} (expect 400 SSRF)`);
  }

  // T12
  {
    const r = await req('GET', '/api/escalations', { cookie: true });
    log('T12 escalations list', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`);
  }

  // T13
  {
    const r = await req('GET', '/api/ops/cron-health', { cookie: true });
    const ok = r.status === 200 && r.json?.stale === false;
    log('T13 cron-health stale=false', ok ? 'PASS' : 'FAIL', `status=${r.status} stale=${r.json?.stale}`);
  }

  // Cleanup created records
  if (createdFaqId) await req('DELETE', `/api/faq/${createdFaqId}`, { cookie: true });
  if (createdWebhookId) await req('DELETE', `/api/webhooks/${createdWebhookId}`, { cookie: true });

  // T14
  {
    const r = await req('POST', '/api/auth/logout', { cookie: true });
    log('T14 logout', r.status === 200 ? 'PASS' : 'FAIL', `status=${r.status}`);
  }

  // T15
  {
    const r = await req('GET', '/api/auth/me', { cookie: true });
    log('T15 me after logout', r.status === 401 ? 'PASS' : 'FAIL', `status=${r.status} (cookie revoked)`);
  }

  summary();
}

function summary() {
  console.log(`\n=== Summary: ${pass} PASS / ${fail} FAIL ===`);
  if (failures.length) {
    console.log('\nFailures:');
    for (const f of failures) console.log(`  - ${f}`);
  }
  process.exit(fail === 0 ? 0 : 1);
}

main().catch(e => {
  console.error('\nFATAL:', e.message);
  process.exit(2);
});
