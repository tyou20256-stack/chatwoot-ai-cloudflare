#!/usr/bin/env node
// ============================================================================
// Chatwoot Bot ヘルスチェック & 構成検証スクリプト
// 使い方: node healthcheck.mjs
// エラー発生時やデプロイ後に実行して全体の正常性を確認する
// ============================================================================

const WORKER_URL = 'https://chatwoot-bot.rcc-aoki.workers.dev'
const CHATWOOT_URL = 'https://im.sloten.io'
const CHATWOOT_TOKEN = 'e6UfxZDFY9UUqmUiCBFXdcB5'
const CHATWOOT_ACCOUNT = 3
const WEBHOOK_SECRET = 'KgiSKMHkVNTZsK6eFXpAUwCx'

let passed = 0, failed = 0
const errors = []

async function check(name, fn) {
  try {
    const result = await fn()
    if (result === true) {
      console.log(`  ✅ ${name}`)
      passed++
    } else {
      console.log(`  ❌ ${name} — ${result}`)
      failed++
      errors.push({ name, error: result })
    }
  } catch (e) {
    console.log(`  ❌ ${name} — ${e.message}`)
    failed++
    errors.push({ name, error: e.message })
  }
}

// ============================================================================
console.log('\n🔍 1. Worker 基本動作')
// ============================================================================

await check('Worker応答', async () => {
  const r = await fetch(`${WORKER_URL}/admin?token=invalid`)
  return r.status === 401 ? true : `Expected 401, got ${r.status}`
})

await check('Webhook エンドポイント', async () => {
  const r = await fetch(`${WORKER_URL}/api/webhook/${WEBHOOK_SECRET}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'message_created', message_type: 'incoming',
      content: 'welcome_message',
      conversation: { id: 99990, status: 'pending' },
      sender: { name: 'healthcheck', id: 0 },
      account: { id: CHATWOOT_ACCOUNT }
    })
  })
  const j = await r.json()
  return j.action === 'message_sent' ? true : `Got action: ${j.action}`
})

await check('ボーナスコード（ゲートリアン）', async () => {
  const r = await fetch(`${WORKER_URL}/api/webhook/${WEBHOOK_SECRET}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'message_created', message_type: 'incoming',
      content: '\u30b2\u30fc\u30c8\u30ea\u30a2\u30f3',
      conversation: { id: 99991, status: 'pending' },
      sender: { name: 'healthcheck', id: 0 },
      account: { id: CHATWOOT_ACCOUNT }
    })
  })
  const j = await r.json()
  return j.action === 'bonus_code' && j.type === 'gatorian' ? true : `Got: ${JSON.stringify(j)}`
})

await check('EC コールバック', async () => {
  const r = await fetch(`${WORKER_URL}/api/ec-callback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId: 99992, paymentNumber: 'HC-TEST' })
  })
  const j = await r.json()
  return j.success === true ? true : `Got: ${JSON.stringify(j)}`
})

// ============================================================================
console.log('\n🔍 2. Chatwoot Agent Bot 設定')
// ============================================================================

await check('Agent Bot ID 5 存在 & URL設定', async () => {
  const r = await fetch(`${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT}/agent_bots`, {
    headers: { 'api_access_token': CHATWOOT_TOKEN }
  })
  const bots = await r.json()
  const bot5 = bots.find(b => b.id === 5)
  if (!bot5) return 'Agent Bot ID 5 が存在しない'
  if (!bot5.outgoing_url || bot5.outgoing_url === '') return 'Agent Bot ID 5 の outgoing_url が空'
  if (!bot5.outgoing_url.includes('chatwoot-bot.rcc-aoki.workers.dev')) return `URL不正: ${bot5.outgoing_url}`
  return true
})

await check('Agent Bot → Inbox 1 (Sloten) 割り当て', async () => {
  const r = await fetch(`${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT}/inboxes/1/agent_bot`, {
    headers: { 'api_access_token': CHATWOOT_TOKEN }
  })
  const j = await r.json()
  if (!j.agent_bot) return 'Inbox 1 に Agent Bot が割り当てられていない'
  if (j.agent_bot.id !== 5) return `Inbox 1 に Agent Bot ID ${j.agent_bot.id} が割り当て（期待: 5）`
  return true
})

// ============================================================================
console.log('\n🔍 3. Chatwoot Webhooks (GAS BOT)')
// ============================================================================

const expectedWebhooks = [
  { name: 'PayPay GAS', urlFragment: 'AKfycbx4ig' },
  { name: '銀行振込 GAS', urlFragment: 'AKfycbx5488' },
  { name: 'EC GAS', urlFragment: 'AKfycbx45Ly' },
]

const whRes = await fetch(`${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT}/webhooks`, {
  headers: { 'api_access_token': CHATWOOT_TOKEN }
})
const webhooks = (await whRes.json()).payload?.webhooks || []

for (const expected of expectedWebhooks) {
  await check(`Webhook: ${expected.name}`, async () => {
    const found = webhooks.find(w => w.url.includes(expected.urlFragment))
    if (!found) return `未登録（${expected.urlFragment}...）`
    if (!found.subscriptions.includes('message_created')) return 'message_created が未購読'
    return true
  })
}

await check('Worker Webhook が重複登録されていない', async () => {
  const workerWh = webhooks.find(w => w.url.includes('chatwoot-bot.rcc-aoki.workers.dev'))
  if (workerWh) return `Worker Webhook ID ${workerWh.id} が重複登録されている（Agent Bot経由のみが正しい）`
  return true
})

// ============================================================================
console.log('\n🔍 4. GAS 疎通テスト')
// ============================================================================

const gasUrls = [
  { name: 'ボーナスコード GAS', url: 'https://script.google.com/macros/s/AKfycbxOCUUwDLF_IL7eJxqqxVxozm9REbEwumVk_psZGvaS55q9yPy2aI4z3-ARZYUSE2X2/exec' },
  { name: 'PayPay GAS', url: 'https://script.google.com/macros/s/AKfycbx4igBgqkqbJPSOJ3jy7XcKs_Z1cMswJ_qU68A18HQwv6wzvJM46XBGFp-ZqisQF30K/exec' },
  { name: '銀行振込 GAS', url: 'https://script.google.com/macros/s/AKfycbx5488Yw2THGM2Un8YTEZ6D8qqMd5LGLREeBIGmhvkeBOI9iOphHddRTwsKCsq8QiaK/exec' },
]

for (const gas of gasUrls) {
  await check(`${gas.name} GET応答`, async () => {
    const r = await fetch(gas.url, { redirect: 'follow' })
    return r.ok ? true : `HTTP ${r.status}`
  })
}

await check('VPS EC サーバー応答', async () => {
  try {
    const r = await fetch('http://109.199.100.85:3001/', { signal: AbortSignal.timeout(5000) })
    return true
  } catch (e) {
    return `接続失敗: ${e.message}`
  }
})

// ============================================================================
// 結果サマリ
// ============================================================================
console.log('\n' + '='.repeat(50))
console.log(`ヘルスチェック結果: ${passed} ✅ / ${failed} ❌ / ${passed + failed} TOTAL`)
if (errors.length > 0) {
  console.log('\n🚨 問題一覧:')
  errors.forEach(e => console.log(`  - ${e.name}: ${e.error}`))
  console.log('\n📖 対応手順: project_chatwoot_bot.md を参照')
}
console.log('='.repeat(50))

process.exit(failed > 0 ? 1 : 0)
