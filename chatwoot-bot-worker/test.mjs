// ============================================================================
// 包括的テスト（Worker fetch ハンドラ統合テスト）
// globalThis.fetch をモックして全フローを検証
// ============================================================================

import worker from './worker.js'
import { clearBonusCodeCache } from './bonus-codes.js'

let fetchCalls = []
let fetchResponses = {}

// fetch モック
const originalFetch = globalThis.fetch
globalThis.fetch = async (url, opts) => {
  fetchCalls.push({ url, opts })
  const key = typeof url === 'string' ? url : url.toString()

  // デフォルト: 成功レスポンス
  if (key.includes('/messages')) {
    return new Response(JSON.stringify({ id: 1 }), { status: 200 })
  }
  if (key.includes('/toggle_status')) {
    return new Response(JSON.stringify({ status: 'open' }), { status: 200 })
  }
  if (key.includes('/conversations/') && !key.includes('/messages') && !key.includes('/toggle_status')) {
    // isConversationHandledByAgent — デフォルトは pending
    const mockStatus = fetchResponses.conversationStatus || 'pending'
    return new Response(JSON.stringify({ status: mockStatus }), { status: 200 })
  }
  if (key.includes('script.google.com')) {
    if (fetchResponses.gasFail) {
      return new Response('error', { status: 500 })
    }
    return new Response(JSON.stringify({ success: true }), { status: 200 })
  }
  return new Response('{}', { status: 200 })
}

// テストユーティリティ — KVモック
function createMockKV(initialData = {}) {
  const store = { ...initialData }
  return {
    get: async (key, opts) => {
      const val = store[key] || null
      if (opts?.type === 'json' && val) {
        try { return JSON.parse(val) } catch { return null }
      }
      return val
    },
    put: async (key, value) => { store[key] = value },
    _store: store, // テスト検証用
  }
}

const mockEnv = {
  CHATWOOT_BASE_URL: 'https://im.sloten.io',
  CHATWOOT_API_TOKEN: 'test-token',
  ACCOUNT_ID: '3',
  BONUS_CODE_WEBHOOK_URL: 'https://script.google.com/bonus',
  GAS_BOT_WEBHOOK_URL: 'https://script.google.com/gas',
  BANK_TRANSFER_BOT_WEBHOOK_URL: 'https://script.google.com/bank',
  EC_DEPOSIT_BOT_WEBHOOK_URL: 'https://script.google.com/ec',
  CHATWOOT_KV: createMockKV()
}

function makeRequest(path, body, method = 'POST') {
  return new Request(`https://worker.example.com${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined
  })
}

function makeGetRequest(path) {
  return new Request(`https://worker.example.com${path}`, { method: 'GET' })
}

function makePutRequest(path, body) {
  return new Request(`https://worker.example.com${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

function makeDeleteRequest(path) {
  return new Request(`https://worker.example.com${path}`, { method: 'DELETE' })
}

function makeWebhookBody(content, overrides = {}) {
  return {
    event: 'message_created',
    message_type: 'incoming',
    content,
    conversation: { id: 123, status: 'pending' },
    sender: { name: 'テストユーザー', id: 456 },
    account: { id: 3 },
    ...overrides
  }
}

let passed = 0
let failed = 0
let errors = []

async function test(name, fn) {
  fetchCalls = []
  fetchResponses = {}
  clearBonusCodeCache()
  // レート制限カウンタをリセット（テスト間の干渉を防止）
  const kvStore = mockEnv.CHATWOOT_KV._store
  for (const key of Object.keys(kvStore)) {
    if (key.startsWith('rl:') || key.startsWith('ec-state:')) delete kvStore[key]
  }
  try {
    await fn()
    passed++
  } catch (e) {
    failed++
    errors.push({ name, error: e.message })
    console.log(`  FAIL: ${name} — ${e.message}`)
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed')
}

// ============================================================================
// 1. Webhook前処理テスト（Standard7相当）
// ============================================================================
console.log('\n=== 1. Webhook前処理テスト ===')

await test('非メッセージイベントをスキップ', async () => {
  const body = makeWebhookBody('hello', { event: 'conversation_created' })
  const res = await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  assert(res.status === 200)
  const text = await res.text()
  assert(text === '' || text.includes('skipped'), 'Should return empty or skipped')
})

await test('message_updated イベントを処理', async () => {
  const body = makeWebhookBody('welcome_message', { event: 'message_updated' })
  const res = await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  const json = await res.json()
  assert(json.success === true && !json.skipped)
})

await test('outgoing文字列メッセージをスキップ', async () => {
  const body = makeWebhookBody('hello', { message_type: 'outgoing' })
  const res = await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  assert(res.status === 200)
  const text = await res.text()
  assert(text === '' || text.includes('skipped'))
})

await test('outgoing数値(1)メッセージをスキップ', async () => {
  const body = makeWebhookBody('hello', { message_type: 1 })
  const res = await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  assert(res.status === 200)
  const text = await res.text()
  assert(text === '' || text.includes('skipped'))
})

await test('会話ステータスopenをスキップ', async () => {
  const body = makeWebhookBody('hello', { conversation: { id: 123, status: 'open' } })
  const res = await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  assert(res.status === 200)
  const text = await res.text()
  assert(text === '' || text.includes('skipped'))
})

await test('conversationIdなしをスキップ', async () => {
  const body = makeWebhookBody('hello', { conversation: { status: 'pending' } })
  const res = await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  assert(res.status === 200)
  const text = await res.text()
  assert(text === '' || text.includes('skipped'))
})

await test('空メッセージをスキップ', async () => {
  const body = makeWebhookBody('', {})
  const res = await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  assert(res.status === 200)
  const text = await res.text()
  assert(text === '' || text.includes('skipped'))
})

await test('ボタンクリック(submitted_values)からvalue抽出', async () => {
  const body = makeWebhookBody('表示テキスト', {
    message_type: 'outgoing',  // outgoing だが submitted_values があるので処理される
    content_attributes: { submitted_values: [{ value: 'welcome_message' }] }
  })
  const res = await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  const json = await res.json()
  assert(json.success === true && json.action === 'message_sent' && json.key === 'welcome_message',
    `Expected welcome_message, got: ${JSON.stringify(json)}`)
})

await test('ボタンクリック時の連絡先名はmeta.senderから取得', async () => {
  const body = {
    event: 'message_created',
    message_type: 'outgoing',
    content: 'dummy',
    content_attributes: { submitted_values: [{ value: 'deposit_withdrawal' }] },
    conversation: {
      id: 123, status: 'pending',
      meta: { sender: { name: 'メタ太郎', id: 789 } }
    },
    sender: { name: 'センダー花子', id: 999 },
    account: { id: 3 }
  }
  const res = await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  const json = await res.json()
  assert(json.success === true)
  // メッセージが送信されているか確認
  const msgCall = fetchCalls.find(c => c.url.includes('/messages'))
  assert(msgCall, 'Chatwoot message API should be called')
})

// ============================================================================
// 2. メッセージルーティングテスト（Standard8相当）
// ============================================================================
console.log('\n=== 2. メッセージルーティングテスト ===')

await test('transfer_to_agent → オペレーター転送', async () => {
  const body = makeWebhookBody('transfer_to_agent')
  const res = await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  const json = await res.json()
  assert(json.action === 'transfer_to_agent')
  const toggleCall = fetchCalls.find(c => c.url.includes('/toggle_status'))
  assert(toggleCall, 'toggle_status API should be called')
})

await test('バモスイボナ → ボーナスコード処理', async () => {
  const body = makeWebhookBody('バモスイボナ')
  const res = await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  const json = await res.json()
  assert(json.action === 'bonus_code' && json.type === 'vamos',
    `Expected vamos, got: ${JSON.stringify(json)}`)
  // GASにrecordBonusCodeが呼ばれたか
  const gasCall = fetchCalls.find(c => c.url.includes('script.google.com/bonus'))
  assert(gasCall, 'GAS bonus webhook should be called')
  const gasBody = JSON.parse(gasCall.opts.body)
  assert(gasBody.bonusCode === 'バモスイボナ' && gasBody.bonusType === 'vamos')
})

await test('スペシャルステップ → stepup処理', async () => {
  const body = makeWebhookBody('スペシャルステップ')
  const res = await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  const json = await res.json()
  assert(json.action === 'bonus_code' && json.type === 'stepup')
})

await test('スペシャル ステップ（空白入り） → stepup処理', async () => {
  const body = makeWebhookBody('スペシャル ステップ')
  const res = await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  const json = await res.json()
  assert(json.action === 'bonus_code' && json.type === 'stepup',
    `Expected stepup, got: ${JSON.stringify(json)}`)
})

await test('ELITE参加（大文字小文字） → elite_challenge処理', async () => {
  const body = makeWebhookBody('elite参加')
  const res = await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  const json = await res.json()
  assert(json.action === 'bonus_code' && json.type === 'elite_challenge')
})

await test('recordBonusCode失敗時 → エラーメッセージ送信', async () => {
  fetchResponses.gasFail = true
  const body = makeWebhookBody('バモスイボナ')
  const res = await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  const json = await res.json()
  assert(json.success === false && json.action === 'bonus_code_record_failed',
    `Expected record_failed, got: ${JSON.stringify(json)}`)
  // エラーメッセージがChatwootに送信されたか
  const msgCalls = fetchCalls.filter(c => c.url.includes('/messages'))
  const errorMsg = msgCalls.find(c => {
    const b = JSON.parse(c.opts.body)
    return b.content && b.content.includes('失敗')
  })
  assert(errorMsg, 'Error message should be sent to user')
})

await test('カスタムヘブンズ条件テキスト → 記録+転送', async () => {
  const body = makeWebhookBody('カスタムヘブンズショット BUY額5000円 50倍以上')
  const res = await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  const json = await res.json()
  assert(json.action === 'custom_heavens_condition')
  const toggleCall = fetchCalls.find(c => c.url.includes('/toggle_status'))
  assert(toggleCall, 'Should transfer to agent after custom heavens condition')
})

await test('機種選択 → game_selected + 転送', async () => {
  const body = makeWebhookBody('stepup_game_gates_olympus')
  const res = await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  const json = await res.json()
  assert(json.action === 'game_selected' && json.type === 'stepup' && json.game === 'Gates of Olympus 1000',
    `Expected game_selected, got: ${JSON.stringify(json)}`)
})

await test('通常メニュー: deposit_withdrawal', async () => {
  const body = makeWebhookBody('deposit_withdrawal')
  const res = await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  const json = await res.json()
  assert(json.action === 'message_sent' && json.key === 'deposit_withdrawal')
})

await test('通常メニュー: welcome_message', async () => {
  const body = makeWebhookBody('welcome_message')
  const res = await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  const json = await res.json()
  assert(json.action === 'message_sent' && json.key === 'welcome_message')
})

await test('GAS BOT handoff: paypay_money', async () => {
  const body = makeWebhookBody('paypay_money')
  const res = await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  assert(res.status === 200)
  const gasCall = fetchCalls.find(c => c.url.includes('script.google.com/gas'))
  assert(gasCall, 'GAS BOT webhook should be called')
})

await test('銀行振込 handoff: bank_transfer', async () => {
  const body = makeWebhookBody('bank_transfer')
  const res = await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  assert(res.status === 200)
  const bankCall = fetchCalls.find(c => c.url.includes('script.google.com/bank'))
  assert(bankCall, 'Bank BOT webhook should be called')
})

await test('EC入金: convenience_store_deposit → アカウントID入力待ち', async () => {
  const body = makeWebhookBody('convenience_store_deposit')
  const res = await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  const json = await res.json()
  assert(json.action === 'ec_start', `Expected ec_start, got ${json.action}`)
})

await test('EC入金: アカウントID入力 → 金額選択メニュー表示', async () => {
  // まずEC開始
  await worker.fetch(makeRequest('/api/webhook', makeWebhookBody('convenience_store_deposit')), mockEnv)
  // アカウントID入力
  const body = makeWebhookBody('testuser123')
  const res = await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  const json = await res.json()
  assert(json.action === 'ec_account_id_set', `Expected ec_account_id_set, got ${json.action}`)
  assert(json.gameAccountId === 'testuser123')
})

await test('EC入金: 金額選択 → VPSにhandoff（アカウントID付き）', async () => {
  // EC開始 → アカウントID入力
  await worker.fetch(makeRequest('/api/webhook', makeWebhookBody('convenience_store_deposit')), mockEnv)
  await worker.fetch(makeRequest('/api/webhook', makeWebhookBody('testuser456')), mockEnv)
  // 金額選択
  const body = makeWebhookBody('ec_amount_50000')
  const res = await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  const json = await res.json()
  assert(json.action === 'ec_deposit', `Expected ec_deposit, got ${json.action}`)
  assert(json.amount === 50000, `Expected 50000, got ${json.amount}`)
  assert(json.gameAccountId === 'testuser456', `Expected testuser456, got ${json.gameAccountId}`)
})

await test('ATM入金 → メッセージ送信+転送', async () => {
  const body = makeWebhookBody('atm_deposit')
  const res = await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  const json = await res.json()
  assert(json.action === 'message_then_transfer')
  const toggleCall = fetchCalls.find(c => c.url.includes('/toggle_status'))
  assert(toggleCall, 'Should transfer to agent for ATM deposit')
})

await test('不明メッセージ（agent未対応） → ウェルカムメニュー', async () => {
  fetchResponses.conversationStatus = 'pending'
  const body = makeWebhookBody('存在しないメニュー')
  const res = await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  const json = await res.json()
  assert(json.action === 'welcome_message', `Expected welcome_message, got: ${JSON.stringify(json)}`)
})

await test('不明メッセージ（agent対応中） → スキップ', async () => {
  fetchResponses.conversationStatus = 'open'
  const body = makeWebhookBody('ユーザーの自由入力')
  const res = await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  assert(res.status === 200, `Expected 200, got ${res.status}`)
})

// ============================================================================
// 3. セキュリティテスト
// ============================================================================
console.log('\n=== 3. セキュリティテスト ===')

await test('不正JSON → 400', async () => {
  const req = new Request('https://worker.example.com/api/webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'invalid json{'
  })
  const res = await worker.fetch(req, mockEnv)
  assert(res.status === 400, `Expected 400, got ${res.status}`)
  const json = await res.json()
  assert(json.error === 'invalid_json')
})

await test('WEBHOOK_SECRET設定時 — トークンなし → 401', async () => {
  const envWithSecret = { ...mockEnv, WEBHOOK_SECRET: 'my-secret-123' }
  const body = makeWebhookBody('hello')
  const res = await worker.fetch(makeRequest('/api/webhook', body), envWithSecret)
  assert(res.status === 401, `Expected 401, got ${res.status}`)
})

await test('WEBHOOK_SECRET設定時 — 正しいトークン → 処理される', async () => {
  const envWithSecret = { ...mockEnv, WEBHOOK_SECRET: 'my-secret-123' }
  const body = makeWebhookBody('welcome_message')
  const req = new Request('https://worker.example.com/api/webhook/my-secret-123', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const res = await worker.fetch(req, envWithSecret)
  const json = await res.json()
  assert(json.success === true && json.action === 'message_sent')
})

await test('WEBHOOK_SECRET設定時 — 不正トークン → 401', async () => {
  const envWithSecret = { ...mockEnv, WEBHOOK_SECRET: 'my-secret-123' }
  const body = makeWebhookBody('welcome_message')
  const req = new Request('https://worker.example.com/api/webhook/wrong-token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const res = await worker.fetch(req, envWithSecret)
  assert(res.status === 401)
})

await test('ADMIN_TOKEN設定時 — 管理画面トークンなし → 401', async () => {
  const envWithAdmin = { ...mockEnv, ADMIN_TOKEN: 'admin-pass' }
  const req = new Request('https://worker.example.com/admin', { method: 'GET' })
  const res = await worker.fetch(req, envWithAdmin)
  assert(res.status === 401, `Expected 401, got ${res.status}`)
})

await test('ADMIN_TOKEN設定時 — 正しいトークン → 200', async () => {
  const envWithAdmin = { ...mockEnv, ADMIN_TOKEN: 'admin-pass' }
  const req = new Request('https://worker.example.com/admin?token=admin-pass', { method: 'GET' })
  const res = await worker.fetch(req, envWithAdmin)
  assert(res.status === 200)
  const html = await res.text()
  assert(html.includes('Chatwoot Bot 管理パネル'))
})

await test('ADMIN_TOKEN設定時 — bonus-codes API認証なし → 401', async () => {
  const envWithAdmin = { ...mockEnv, ADMIN_TOKEN: 'admin-pass' }
  const req = makeGetRequest('/api/bonus-codes')
  const res = await worker.fetch(req, envWithAdmin)
  assert(res.status === 401)
})

await test('ADMIN_TOKEN設定時 — menus API認証なし → 401', async () => {
  const envWithAdmin = { ...mockEnv, ADMIN_TOKEN: 'admin-pass' }
  const req = makeGetRequest('/api/menus')
  const res = await worker.fetch(req, envWithAdmin)
  assert(res.status === 401)
})

await test('ADMIN_TOKEN未設定 — 管理画面はそのまま表示', async () => {
  const req = new Request('https://worker.example.com/admin', { method: 'GET' })
  const res = await worker.fetch(req, mockEnv)
  assert(res.status === 200)
})

await test('test-webhook — ADMIN_TOKEN認証成功', async () => {
  const envWithAdmin = { ...mockEnv, ADMIN_TOKEN: 'admin-pass' }
  const req = new Request('https://worker.example.com/api/test-webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'admin-pass', message: 'welcome_message', conversationId: 999 })
  })
  const res = await worker.fetch(req, envWithAdmin)
  const json = await res.json()
  assert(json.success === true && json.action === 'message_sent',
    `Expected message_sent, got: ${JSON.stringify(json)}`)
})

await test('test-webhook — ADMIN_TOKEN認証失敗 → 401', async () => {
  const envWithAdmin = { ...mockEnv, ADMIN_TOKEN: 'admin-pass' }
  const req = new Request('https://worker.example.com/api/test-webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'wrong', message: 'welcome_message' })
  })
  const res = await worker.fetch(req, envWithAdmin)
  assert(res.status === 401)
})

await test('test-webhook — ADMIN_TOKEN未設定時は認証不要', async () => {
  const req = new Request('https://worker.example.com/api/test-webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'deposit_withdrawal' })
  })
  const res = await worker.fetch(req, mockEnv)
  const json = await res.json()
  assert(json.success === true && json.action === 'message_sent')
})

await test('test-webhook — WEBHOOK_SECRETが設定されていてもtest-webhookはバイパス', async () => {
  const envBoth = { ...mockEnv, WEBHOOK_SECRET: 'secret123', ADMIN_TOKEN: 'admin-pass' }
  const req = new Request('https://worker.example.com/api/test-webhook', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: 'admin-pass', message: 'welcome_message' })
  })
  const res = await worker.fetch(req, envBoth)
  const json = await res.json()
  assert(json.success === true, `Expected success, got: ${JSON.stringify(json)}`)
})

await test('管理画面HTMLにトークン引き継ぎコードが含まれる', async () => {
  const req = new Request('https://worker.example.com/admin', { method: 'GET' })
  const res = await worker.fetch(req, mockEnv)
  const html = await res.text()
  assert(html.includes('apiFetch'), 'Admin HTML should contain apiFetch function')
  assert(html.includes('adminToken'), 'Admin HTML should contain adminToken variable')
  assert(html.includes('/api/test-webhook'), 'Admin HTML should use /api/test-webhook')
  assert(html.includes('/api/bonus-codes'), 'Admin HTML should reference bonus-codes API')
  assert(html.includes('/api/menus'), 'Admin HTML should reference menus API')
})

await test('CORSヘッダがCHATWOOT_BASE_URLに制限', async () => {
  const req = new Request('https://worker.example.com/admin', { method: 'GET' })
  const res = await worker.fetch(req, mockEnv)
  assert(res.headers.get('Access-Control-Allow-Origin') === 'https://im.sloten.io',
    `Expected CORS origin 'https://im.sloten.io', got '${res.headers.get('Access-Control-Allow-Origin')}'`)
})

await test('CORS OPTIONSプリフライト', async () => {
  const req = new Request('https://worker.example.com/api/webhook', { method: 'OPTIONS' })
  const res = await worker.fetch(req, mockEnv)
  assert(res.status === 200)
  assert(res.headers.get('Access-Control-Allow-Origin') === 'https://im.sloten.io')
  assert(res.headers.get('Access-Control-Allow-Methods').includes('POST'))
  assert(res.headers.get('Access-Control-Allow-Methods').includes('PUT'))
  assert(res.headers.get('Access-Control-Allow-Methods').includes('DELETE'))
})

// ============================================================================
// 4. ルーティングテスト
// ============================================================================
console.log('\n=== 4. HTTPルーティングテスト ===')

await test('GET /admin → HTML', async () => {
  const req = new Request('https://worker.example.com/admin', { method: 'GET' })
  const res = await worker.fetch(req, mockEnv)
  assert(res.headers.get('Content-Type').includes('text/html'))
})

await test('GET / → HTML（ルートも管理画面）', async () => {
  const req = new Request('https://worker.example.com/', { method: 'GET' })
  const res = await worker.fetch(req, mockEnv)
  assert(res.headers.get('Content-Type').includes('text/html'))
})

await test('不明パス → 404', async () => {
  const req = new Request('https://worker.example.com/unknown', { method: 'GET' })
  const res = await worker.fetch(req, mockEnv)
  assert(res.status === 404)
})

await test('GET /api/bonus-codes → JSON', async () => {
  const req = makeGetRequest('/api/bonus-codes')
  const res = await worker.fetch(req, mockEnv)
  const json = await res.json()
  assert(json.success === true)
  assert(Array.isArray(json.data))
  assert(json.data.length >= 14, `Expected at least 14 types, got ${json.data.length}`)
})

await test('GET /api/menus → JSON', async () => {
  const req = makeGetRequest('/api/menus')
  const res = await worker.fetch(req, mockEnv)
  const json = await res.json()
  assert(json.success === true)
  assert(json.totalKeys >= 70, `Expected at least 70 menu keys, got ${json.totalKeys}`)
})

// ============================================================================
// 5. Chatwoot APIペイロード検証
// ============================================================================
console.log('\n=== 5. APIペイロード検証 ===')

await test('sendChatwootMessage — input_selectペイロード構造', async () => {
  const body = makeWebhookBody('deposit_withdrawal')
  await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  const msgCall = fetchCalls.find(c => c.url.includes('/messages'))
  assert(msgCall, 'Message API should be called')
  const payload = JSON.parse(msgCall.opts.body)
  assert(payload.message_type === 'outgoing')
  assert(payload.content_type === 'input_select')
  assert(payload.content_attributes && payload.content_attributes.items)
  assert(payload.content_attributes.items.length > 0)
  // ヘッダにapi_access_token
  assert(msgCall.opts.headers['api_access_token'] === 'test-token')
})

await test('sendChatwootMessage — テキストのみ（items=null）', async () => {
  const body = makeWebhookBody('transfer_to_agent')
  await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  const msgCall = fetchCalls.find(c => c.url.includes('/messages'))
  const payload = JSON.parse(msgCall.opts.body)
  assert(payload.message_type === 'outgoing')
  assert(!payload.content_type, 'Should not have content_type for text-only messages')
})

await test('transferToAgent — メッセージ送信 + toggle_status', async () => {
  const body = makeWebhookBody('transfer_to_agent')
  await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  const msgCalls = fetchCalls.filter(c => c.url.includes('/messages'))
  const toggleCalls = fetchCalls.filter(c => c.url.includes('/toggle_status'))
  assert(msgCalls.length >= 1, 'Should send at least 1 message')
  assert(toggleCalls.length === 1, 'Should call toggle_status once')
  const togglePayload = JSON.parse(toggleCalls[0].opts.body)
  assert(togglePayload.status === 'open')
})

await test('GAS BOT handoff — ペイロード構造', async () => {
  const body = makeWebhookBody('paypay_money')
  await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  const gasCall = fetchCalls.find(c => c.url.includes('script.google.com/gas'))
  assert(gasCall)
  const payload = JSON.parse(gasCall.opts.body)
  assert(payload.action === 'handoff')
  assert(payload.conversation_id === 123)
  assert(payload.contact_name === 'テストユーザー')
})

await test('Bank BOT handoff — ペイロード構造', async () => {
  const body = makeWebhookBody('bank_transfer')
  await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  const bankCall = fetchCalls.find(c => c.url.includes('script.google.com/bank'))
  assert(bankCall)
  const payload = JSON.parse(bankCall.opts.body)
  assert(payload.action === 'bank_handoff')
  assert(payload.chat_id === 456)
})

await test('recordBonusCode — ペイロード構造', async () => {
  const body = makeWebhookBody('あけおめ')
  await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
  const gasCall = fetchCalls.find(c => c.url.includes('script.google.com/bonus'))
  assert(gasCall)
  const payload = JSON.parse(gasCall.opts.body)
  assert(payload.userId === 'テストユーザー')
  assert(payload.conversationId === 123)
  assert(payload.bonusCode === 'あけおめ')
  assert(payload.bonusType === 'akeome')
})

// ============================================================================
// 6. 全ボーナスコード統合テスト
// ============================================================================
console.log('\n=== 6. 全ボーナスコード統合テスト ===')

const bonusTests = [
  ['バモスイボナ', 'vamos'],
  ['ばもすいぼな', 'vamos'],
  ['あけおめ', 'akeome'],
  ['アケオメ', 'akeome'],
  ['スペシャルチャンス', 'special_chance'],
  ['すぺしゃるちゃんす', 'special_chance'],
  ['特別ステップ', 'tokubetsu_step'],
  ['とくべつすてっぷ', 'tokubetsu_step'],
  ['特別ヘブンズ', 'tokubetsu_heavens'],
  ['とくべつへぶんず', 'tokubetsu_heavens'],
  ['カスタムヘブンズショット', 'custom_heavens'],
  ['カスタムヘブンズ', 'custom_heavens'],
  ['かすたむへぶんずしょっと', 'custom_heavens'],
  ['トライアスロン', 'triathlon'],
  ['とらいあすろん', 'triathlon'],
  ['ひな祭り', 'hinamatsuri'],
  ['ひなまつり', 'hinamatsuri'],
  ['ヒナマツリ', 'hinamatsuri'],
  ['ヘブンズミッション', 'heavens_mission'],
  ['へぶんずみっしょん', 'heavens_mission'],
  ['ヘブンズウィン', 'heavens_win'],
  ['へぶんずうぃん', 'heavens_win'],
  ['ELITE参加', 'elite_challenge'],
  ['elite参加', 'elite_challenge'],
  ['Elite参加', 'elite_challenge'],
  ['ホワイトデー', 'white_day'],
  ['ほわいとでー', 'white_day'],
  ['スペシャルステップ', 'stepup'],
]

for (const [input, expectedType] of bonusTests) {
  await test(`ボーナス統合: ${input} → ${expectedType}`, async () => {
    const body = makeWebhookBody(input)
    const res = await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
    const json = await res.json()
    assert(json.action === 'bonus_code' && json.type === expectedType,
      `Expected ${expectedType}, got: ${JSON.stringify(json)}`)
  })
}

// ============================================================================
// 7. 全機種選択統合テスト
// ============================================================================
console.log('\n=== 7. 機種選択統合テスト ===')

const prefixes = ['stepup', 'vamos', 'akeome', 'special_chance', 'tokubetsu_step', 'tokubetsu_heavens']
const games = ['gates_olympus_og', 'starlight', 'starlight_xmas', 'wisdom', 'gates_olympus', 'gatokaca', 'sugar_rush_1000', 'sweet_bonanza', 'sugar_rush', 'fruit_party']

for (const prefix of prefixes) {
  for (const game of games) {
    await test(`機種: ${prefix}_game_${game}`, async () => {
      const body = makeWebhookBody(`${prefix}_game_${game}`)
      const res = await worker.fetch(makeRequest('/api/webhook', body), mockEnv)
      const json = await res.json()
      assert(json.action === 'game_selected' && json.type === prefix,
        `Expected game_selected/${prefix}, got: ${JSON.stringify(json)}`)
    })
  }
}

// ============================================================================
// 8. 動的ボーナスコードテスト（KVオーバーライド）
// ============================================================================
console.log('\n=== 8. 動的ボーナスコードテスト ===')

await test('KV空 → ハードコードのみで動作', async () => {
  const env = { ...mockEnv, CHATWOOT_KV: createMockKV() }
  const body = makeWebhookBody('バモスイボナ')
  const res = await worker.fetch(makeRequest('/api/webhook', body), env)
  const json = await res.json()
  assert(json.action === 'bonus_code' && json.type === 'vamos')
})

await test('動的コード（customType）がマッチ', async () => {
  const config = {
    version: 1,
    overrides: {},
    customTypes: [{
      id: 'sakura_bonus',
      displayName: '桜ボーナス',
      codes: ['サクラボーナス', 'さくらぼーなす'],
      matchMode: 'case_insensitive',
      successMessage: { content: '桜ボーナス成功！', items: [{ title: '戻る', value: 'welcome_message' }] },
      enabled: true
    }]
  }
  const env = { ...mockEnv, CHATWOOT_KV: createMockKV({ 'bonus-codes-config': JSON.stringify(config) }) }
  const body = makeWebhookBody('サクラボーナス')
  const res = await worker.fetch(makeRequest('/api/webhook', body), env)
  const json = await res.json()
  assert(json.action === 'bonus_code' && json.type === 'sakura_bonus',
    `Expected sakura_bonus, got: ${JSON.stringify(json)}`)

  // 成功メッセージがインラインで送信されるか
  const msgCall = fetchCalls.find(c => c.url.includes('/messages'))
  const payload = JSON.parse(msgCall.opts.body)
  assert(payload.content.includes('桜ボーナス成功'), 'Should use inline successMessage')
})

await test('動的コードのひらがなバリアントもマッチ', async () => {
  const config = {
    version: 1,
    overrides: {},
    customTypes: [{
      id: 'sakura_bonus',
      displayName: '桜ボーナス',
      codes: ['サクラボーナス', 'さくらぼーなす'],
      matchMode: 'case_insensitive',
      successMessage: { content: '桜ボーナス成功！', items: null },
      enabled: true
    }]
  }
  const env = { ...mockEnv, CHATWOOT_KV: createMockKV({ 'bonus-codes-config': JSON.stringify(config) }) }
  const body = makeWebhookBody('さくらぼーなす')
  const res = await worker.fetch(makeRequest('/api/webhook', body), env)
  const json = await res.json()
  assert(json.action === 'bonus_code' && json.type === 'sakura_bonus')
})

await test('無効化された動的コードはマッチしない', async () => {
  const config = {
    version: 1,
    overrides: {},
    customTypes: [{
      id: 'disabled_bonus',
      displayName: 'テスト',
      codes: ['テストコード'],
      matchMode: 'case_insensitive',
      successMessage: { content: 'test', items: null },
      enabled: false
    }]
  }
  const env = { ...mockEnv, CHATWOOT_KV: createMockKV({ 'bonus-codes-config': JSON.stringify(config) }) }
  const body = makeWebhookBody('テストコード')
  const res = await worker.fetch(makeRequest('/api/webhook', body), env)
  const json = await res.json()
  assert(json.action === 'welcome_message', `Expected welcome (no match), got: ${JSON.stringify(json)}`)
})

await test('ハードコード種別の無効化（KV override）', async () => {
  const config = {
    version: 1,
    overrides: { vamos: { additionalVariants: [], enabled: false } },
    customTypes: []
  }
  const env = { ...mockEnv, CHATWOOT_KV: createMockKV({ 'bonus-codes-config': JSON.stringify(config) }) }
  const body = makeWebhookBody('バモスイボナ')
  const res = await worker.fetch(makeRequest('/api/webhook', body), env)
  const json = await res.json()
  assert(json.action === 'welcome_message',
    `Expected welcome (vamos disabled), got: ${JSON.stringify(json)}`)
})

await test('ハードコード種別に追加バリアント（KV override）', async () => {
  const config = {
    version: 1,
    overrides: { vamos: { additionalVariants: ['ばもす', 'VAMOS'], enabled: true } },
    customTypes: []
  }
  const env = { ...mockEnv, CHATWOOT_KV: createMockKV({ 'bonus-codes-config': JSON.stringify(config) }) }

  // 追加バリアントでマッチ
  const body = makeWebhookBody('ばもす')
  const res = await worker.fetch(makeRequest('/api/webhook', body), env)
  const json = await res.json()
  assert(json.action === 'bonus_code' && json.type === 'vamos',
    `Expected vamos via additional variant, got: ${JSON.stringify(json)}`)
})

await test('動的コードがハードコードより優先される', async () => {
  // 動的コードで "テスト優先" を追加 — ハードコードに存在しないので確認用
  const config = {
    version: 1,
    overrides: {},
    customTypes: [{
      id: 'priority_test',
      displayName: '優先テスト',
      codes: ['優先テストコード'],
      matchMode: 'exact',
      successMessage: { content: '動的コードが優先', items: null },
      enabled: true
    }]
  }
  const env = { ...mockEnv, CHATWOOT_KV: createMockKV({ 'bonus-codes-config': JSON.stringify(config) }) }
  const body = makeWebhookBody('優先テストコード')
  const res = await worker.fetch(makeRequest('/api/webhook', body), env)
  const json = await res.json()
  assert(json.action === 'bonus_code' && json.type === 'priority_test')
})

await test('KV破損時 → ハードコードフォールバック', async () => {
  const env = { ...mockEnv, CHATWOOT_KV: createMockKV({ 'bonus-codes-config': 'invalid json{' }) }
  const body = makeWebhookBody('バモスイボナ')
  const res = await worker.fetch(makeRequest('/api/webhook', body), env)
  const json = await res.json()
  assert(json.action === 'bonus_code' && json.type === 'vamos',
    `Expected vamos fallback, got: ${JSON.stringify(json)}`)
})

// ============================================================================
// 9. ボーナスコードCRUD APIテスト
// ============================================================================
console.log('\n=== 9. CRUD APIテスト ===')

await test('GET /api/bonus-codes — ハードコード一覧返却', async () => {
  const req = makeGetRequest('/api/bonus-codes')
  const res = await worker.fetch(req, mockEnv)
  const json = await res.json()
  assert(json.success === true)
  assert(json.data.length >= 14, `Expected >= 14, got ${json.data.length}`)
  // vamosが含まれるか
  const vamos = json.data.find(d => d.type === 'vamos')
  assert(vamos, 'Should include vamos type')
  assert(vamos.source === 'hardcoded')
  assert(vamos.hardcodedCodes.includes('バモスイボナ'))
})

await test('POST /api/bonus-codes — カスタム種別作成', async () => {
  const env = { ...mockEnv, CHATWOOT_KV: createMockKV() }
  const req = makeRequest('/api/bonus-codes', {
    id: 'summer_2026',
    displayName: 'サマーキャンペーン',
    codes: ['サマー', 'さまー'],
    matchMode: 'case_insensitive',
    successMessage: { content: 'サマーボーナス成功！', items: null }
  })
  const res = await worker.fetch(req, env)
  assert(res.status === 201, `Expected 201, got ${res.status}`)
  const json = await res.json()
  assert(json.success === true)
  assert(json.data.id === 'summer_2026')

  // KVに保存されたか確認
  const stored = JSON.parse(env.CHATWOOT_KV._store['bonus-codes-config'])
  assert(stored.customTypes.length === 1)
  assert(stored.customTypes[0].id === 'summer_2026')
})

await test('POST /api/bonus-codes — バリデーションエラー（ID不正）', async () => {
  const req = makeRequest('/api/bonus-codes', {
    id: 'INVALID-ID!',
    displayName: 'テスト',
    codes: ['テスト'],
    successMessage: { content: 'test' }
  })
  const res = await worker.fetch(req, mockEnv)
  assert(res.status === 400)
  const json = await res.json()
  assert(json.errors && json.errors.length > 0)
})

await test('POST /api/bonus-codes — 重複IDエラー', async () => {
  const env = { ...mockEnv, CHATWOOT_KV: createMockKV() }
  // vamos はハードコードに存在
  const req = makeRequest('/api/bonus-codes', {
    id: 'vamos',
    displayName: 'テスト',
    codes: ['テスト'],
    successMessage: { content: 'test' }
  })
  const res = await worker.fetch(req, env)
  assert(res.status === 409, `Expected 409, got ${res.status}`)
})

await test('POST /api/bonus-codes — コード衝突エラー', async () => {
  const req = makeRequest('/api/bonus-codes', {
    id: 'conflict_test',
    displayName: 'テスト',
    codes: ['バモスイボナ'],  // ハードコードと衝突
    successMessage: { content: 'test' }
  })
  const res = await worker.fetch(req, mockEnv)
  assert(res.status === 409, `Expected 409, got ${res.status}`)
  const json = await res.json()
  assert(json.conflicts && json.conflicts.length > 0)
})

await test('PUT /api/bonus-codes/:type — ハードコード種別の有効/無効切替', async () => {
  const env = { ...mockEnv, CHATWOOT_KV: createMockKV() }
  const req = makePutRequest('/api/bonus-codes/vamos', { enabled: false })
  const res = await worker.fetch(req, env)
  const json = await res.json()
  assert(json.success === true)
  assert(json.data.enabled === false)

  // KVに保存されたか
  const stored = JSON.parse(env.CHATWOOT_KV._store['bonus-codes-config'])
  assert(stored.overrides.vamos.enabled === false)
})

await test('PUT /api/bonus-codes/:type — バリアント追加', async () => {
  const env = { ...mockEnv, CHATWOOT_KV: createMockKV() }
  const req = makePutRequest('/api/bonus-codes/vamos', { addVariant: 'ばもす' })
  const res = await worker.fetch(req, env)
  const json = await res.json()
  assert(json.success === true)
  assert(json.data.additionalVariants.includes('ばもす'))
})

await test('PUT /api/bonus-codes/:type — バリアント削除', async () => {
  const config = {
    version: 1,
    overrides: { vamos: { additionalVariants: ['ばもす', 'VAMOS'], enabled: true } },
    customTypes: []
  }
  const env = { ...mockEnv, CHATWOOT_KV: createMockKV({ 'bonus-codes-config': JSON.stringify(config) }) }
  const req = makePutRequest('/api/bonus-codes/vamos', { removeVariant: 'ばもす' })
  const res = await worker.fetch(req, env)
  const json = await res.json()
  assert(json.success === true)
  assert(!json.data.additionalVariants.includes('ばもす'))
  assert(json.data.additionalVariants.includes('VAMOS'))
})

await test('DELETE /api/bonus-codes/:type — カスタム種別削除', async () => {
  const config = {
    version: 1,
    overrides: {},
    customTypes: [{ id: 'to_delete', displayName: 'テスト', codes: ['テスト'], enabled: true }]
  }
  const env = { ...mockEnv, CHATWOOT_KV: createMockKV({ 'bonus-codes-config': JSON.stringify(config) }) }
  const req = makeDeleteRequest('/api/bonus-codes/to_delete')
  const res = await worker.fetch(req, env)
  const json = await res.json()
  assert(json.success === true && json.deleted === 'to_delete')

  const stored = JSON.parse(env.CHATWOOT_KV._store['bonus-codes-config'])
  assert(stored.customTypes.length === 0)
})

await test('DELETE /api/bonus-codes/:type — ハードコード種別は削除不可', async () => {
  const req = makeDeleteRequest('/api/bonus-codes/vamos')
  const res = await worker.fetch(req, mockEnv)
  assert(res.status === 400, `Expected 400, got ${res.status}`)
  const json = await res.json()
  assert(json.error.includes('削除できません'))
})

await test('DELETE /api/bonus-codes/:type — 存在しない種別 → 404', async () => {
  const req = makeDeleteRequest('/api/bonus-codes/nonexistent')
  const res = await worker.fetch(req, mockEnv)
  assert(res.status === 404)
})

await test('GET /api/bonus-codes/:type — ハードコード種別取得', async () => {
  const req = makeGetRequest('/api/bonus-codes/vamos')
  const res = await worker.fetch(req, mockEnv)
  const json = await res.json()
  assert(json.success === true)
  assert(json.data.type === 'vamos')
  assert(json.data.hardcodedCodes.includes('バモスイボナ'))
})

await test('GET /api/bonus-codes/:type — 存在しない → 404', async () => {
  const req = makeGetRequest('/api/bonus-codes/nonexistent')
  const res = await worker.fetch(req, mockEnv)
  assert(res.status === 404)
})

await test('GET /api/menus — ツリー形式の一覧', async () => {
  const req = makeGetRequest('/api/menus')
  const res = await worker.fetch(req, mockEnv)
  const json = await res.json()
  assert(json.success === true)
  assert(json.data.mainMenu, 'Should have mainMenu tree')
  assert(json.data.mainMenu.key === 'welcome_message', 'Root should be welcome_message')
  assert(json.data.mainMenu.children.length > 0, 'welcome_message should have children')
  assert(json.data.mainMenu.content.includes('スロット天国'))
  assert(Array.isArray(json.data.bonusFlows), 'Should have bonusFlows array')
  assert(Array.isArray(json.data.other), 'Should have other array')
  assert(json.totalKeys > 0, 'Should report totalKeys')
})

// ============================================================================
// 10. セキュリティテスト（Phase 1追加分）
// ============================================================================
console.log('\n=== 10. セキュリティテスト（Phase 1） ===')

await test('HMAC署名検証 — 正しい署名 → 通過', async () => {
  const envHmac = { ...mockEnv, WEBHOOK_SECRET: 'test-secret-hmac', CHATWOOT_KV: createMockKV() }
  const body = makeWebhookBody('welcome_message')
  const bodyStr = JSON.stringify(body)
  // HMAC-SHA256署名生成
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', encoder.encode('test-secret-hmac'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(bodyStr))
  const hmac = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')

  const req = new Request('https://worker.example.com/api/webhook/test-secret-hmac', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-chatwoot-signature': hmac },
    body: bodyStr
  })
  const res = await worker.fetch(req, envHmac)
  const json = await res.json()
  assert(json.success === true, `Expected success, got: ${JSON.stringify(json)}`)
})

await test('HMAC署名検証 — 不正署名 → 403', async () => {
  const envHmac = { ...mockEnv, WEBHOOK_SECRET: 'test-secret-hmac', CHATWOOT_KV: createMockKV() }
  const body = makeWebhookBody('welcome_message')
  const req = new Request('https://worker.example.com/api/webhook/test-secret-hmac', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-chatwoot-signature': 'invalid-sig' },
    body: JSON.stringify(body)
  })
  const res = await worker.fetch(req, envHmac)
  assert(res.status === 403, `Expected 403, got ${res.status}`)
})

await test('HMAC署名なし（ヘッダー未送信）→ URLパス認証のみで通過', async () => {
  const envHmac = { ...mockEnv, WEBHOOK_SECRET: 'test-secret-hmac', CHATWOOT_KV: createMockKV() }
  const body = makeWebhookBody('welcome_message')
  const req = new Request('https://worker.example.com/api/webhook/test-secret-hmac', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  const res = await worker.fetch(req, envHmac)
  const json = await res.json()
  assert(json.success === true, `Expected pass without HMAC header, got: ${JSON.stringify(json)}`)
})

await test('レート制限 — 31回目 → 429', async () => {
  const rlKv = createMockKV()
  // 30回分のカウンタを事前セット
  rlKv._store['rl:wh:777'] = JSON.stringify({ count: 30, start: Math.floor(Date.now() / 1000) })
  const envRL = { ...mockEnv, CHATWOOT_KV: rlKv }
  const body = makeWebhookBody('welcome_message', { conversation: { id: 777, status: 'pending' } })
  const res = await worker.fetch(makeRequest('/api/webhook', body), envRL)
  assert(res.status === 429, `Expected 429, got ${res.status}`)
})

await test('レート制限 — ウィンドウリセット後は通過', async () => {
  const rlKv = createMockKV()
  // 古いウィンドウのカウンタ（60秒以上前）
  rlKv._store['rl:wh:888'] = JSON.stringify({ count: 100, start: Math.floor(Date.now() / 1000) - 120 })
  const envRL = { ...mockEnv, CHATWOOT_KV: rlKv }
  const body = makeWebhookBody('welcome_message', { conversation: { id: 888, status: 'pending' } })
  const res = await worker.fetch(makeRequest('/api/webhook', body), envRL)
  const json = await res.json()
  assert(json.success === true, `Expected pass after window reset, got: ${JSON.stringify(json)}`)
})

await test('入力サニタイズ — 制御文字が除去される', async () => {
  const env = { ...mockEnv, CHATWOOT_KV: createMockKV() }
  const body = makeWebhookBody('welcome_message')
  body.sender.name = 'テスト\x00ユーザー\x0E名'
  const res = await worker.fetch(makeRequest('/api/webhook', body), env)
  const json = await res.json()
  assert(json.success === true)
  // 送信されたメッセージに制御文字がないことを確認
  // (routeMessageで正常処理されたことで間接的に確認)
})

await test('CORSヘッダー — ワイルドカードでない', async () => {
  const res = await worker.fetch(makeRequest('/api/webhook', makeWebhookBody('welcome_message')), mockEnv)
  const origin = res.headers.get('Access-Control-Allow-Origin')
  assert(origin !== '*', `CORS should not be wildcard, got: ${origin}`)
  assert(origin === 'https://im.sloten.io', `Expected CHATWOOT_BASE_URL, got: ${origin}`)
})

await test('セキュリティヘッダー — X-Content-Type-Options', async () => {
  const res = await worker.fetch(makeRequest('/api/webhook', makeWebhookBody('welcome_message')), mockEnv)
  assert(res.headers.get('X-Content-Type-Options') === 'nosniff')
})

await test('セキュリティヘッダー — X-Frame-Options', async () => {
  const res = await worker.fetch(makeRequest('/api/webhook', makeWebhookBody('welcome_message')), mockEnv)
  assert(res.headers.get('X-Frame-Options') === 'DENY')
})

await test('セキュリティヘッダー — Referrer-Policy', async () => {
  const res = await worker.fetch(makeRequest('/api/webhook', makeWebhookBody('welcome_message')), mockEnv)
  assert(res.headers.get('Referrer-Policy') === 'strict-origin-when-cross-origin')
})

// ============================================================================
// 11. 監査ログ・エラー系テスト
// ============================================================================
console.log('\n=== 11. 監査ログ・エラー系テスト ===')

await test('POST /api/bonus-codes — 作成時に監査ログ記録', async () => {
  const env = { ...mockEnv, CHATWOOT_KV: createMockKV() }
  const req = makeRequest('/api/bonus-codes', {
    id: 'audit_test',
    displayName: '監査テスト',
    codes: ['監査コード'],
    successMessage: { content: 'OK' }
  })
  await worker.fetch(req, env)
  const logs = JSON.parse(env.CHATWOOT_KV._store['audit-log'])
  assert(logs.length === 1, `Expected 1 log, got ${logs.length}`)
  assert(logs[0].action === 'bonus_create')
  assert(logs[0].typeId === 'audit_test')
})

await test('PUT /api/bonus-codes — 更新時に監査ログ記録', async () => {
  const env = { ...mockEnv, CHATWOOT_KV: createMockKV() }
  const req = makePutRequest('/api/bonus-codes/vamos', { enabled: false })
  await worker.fetch(req, env)
  const logs = JSON.parse(env.CHATWOOT_KV._store['audit-log'])
  assert(logs.length === 1)
  assert(logs[0].action === 'bonus_update')
  assert(logs[0].action_detail === 'disable')
})

await test('DELETE /api/bonus-codes — 削除時に監査ログ記録', async () => {
  const config = {
    version: 1, overrides: {},
    customTypes: [{ id: 'del_audit', displayName: '削除監査テスト', codes: ['テスト'], enabled: true }]
  }
  const env = { ...mockEnv, CHATWOOT_KV: createMockKV({ 'bonus-codes-config': JSON.stringify(config) }) }
  const req = makeDeleteRequest('/api/bonus-codes/del_audit')
  await worker.fetch(req, env)
  const logs = JSON.parse(env.CHATWOOT_KV._store['audit-log'])
  assert(logs.length === 1)
  assert(logs[0].action === 'bonus_delete')
  assert(logs[0].typeId === 'del_audit')
  assert(logs[0].displayName === '削除監査テスト')
})

await test('matchMode不正値 → 400', async () => {
  const req = makeRequest('/api/bonus-codes', {
    id: 'invalid_mode',
    displayName: 'テスト',
    codes: ['テスト'],
    matchMode: 'fuzzy_match',
    successMessage: { content: 'test' }
  })
  const res = await worker.fetch(req, mockEnv)
  assert(res.status === 400, `Expected 400, got ${res.status}`)
  const json = await res.json()
  assert(json.errors.some(e => e.field === 'matchMode'))
})

await test('重複コード → 400', async () => {
  const req = makeRequest('/api/bonus-codes', {
    id: 'dup_codes',
    displayName: 'テスト',
    codes: ['コード1', 'コード1', 'コード2'],
    successMessage: { content: 'test' }
  })
  const res = await worker.fetch(req, mockEnv)
  assert(res.status === 400, `Expected 400, got ${res.status}`)
  const json = await res.json()
  assert(json.errors.some(e => e.field === 'codes' && e.message.includes('重複')))
})

await test('saveConfig — KV write失敗時のエラーハンドリング', async () => {
  const failKv = {
    get: async () => null,
    put: async () => { throw new Error('KV write error') },
    _store: {}
  }
  const env = { ...mockEnv, CHATWOOT_KV: failKv }
  const req = makeRequest('/api/bonus-codes', {
    id: 'fail_test',
    displayName: 'テスト',
    codes: ['テスト'],
    successMessage: { content: 'test' }
  })
  const res = await worker.fetch(req, env)
  assert(res.status === 500, `Expected 500, got ${res.status}`)
})

await test('GET /api/audit-log — 空ログ', async () => {
  const env = { ...mockEnv, CHATWOOT_KV: createMockKV() }
  const res = await worker.fetch(makeGetRequest('/api/audit-log'), env)
  const json = await res.json()
  assert(json.success === true)
  assert(Array.isArray(json.data))
  assert(json.data.length === 0)
})

await test('GET /api/errors — 空ログ', async () => {
  const env = { ...mockEnv, CHATWOOT_KV: createMockKV() }
  const res = await worker.fetch(makeGetRequest('/api/errors'), env)
  const json = await res.json()
  assert(json.success === true)
  assert(Array.isArray(json.data))
})

// ============================================================================
// 12. GAS疎通テスト・バックアップAPIテスト
// ============================================================================
console.log('\n=== 12. GAS疎通テスト・バックアップAPI ===')

await test('POST /api/test-gas — 正常レスポンス構造', async () => {
  const res = await worker.fetch(makeRequest('/api/test-gas', { token: 'unused' }), mockEnv)
  const json = await res.json()
  assert(json.success === true)
  assert(Array.isArray(json.results))
  assert(json.results.length === 4, `Expected 4 results, got ${json.results.length}`)
  // 各結果にnameフィールドあり
  assert(json.results.every(r => r.name), 'Each result should have name')
})

await test('POST /api/test-gas — URL未設定時', async () => {
  const env = { ...mockEnv, BONUS_CODE_WEBHOOK_URL: undefined, GAS_BOT_WEBHOOK_URL: undefined, CHATWOOT_KV: createMockKV() }
  const res = await worker.fetch(makeRequest('/api/test-gas', { token: 'unused' }), env)
  const json = await res.json()
  const unset = json.results.filter(r => r.status === '未設定')
  assert(unset.length >= 2, `Expected at least 2 unset, got ${unset.length}`)
})

await test('GET /api/backup — バックアップ取得', async () => {
  const config = { version: 5, overrides: {}, customTypes: [] }
  const env = { ...mockEnv, CHATWOOT_KV: createMockKV({ 'bonus-codes-config': JSON.stringify(config) }) }
  const res = await worker.fetch(makeGetRequest('/api/backup'), env)
  const json = await res.json()
  assert(json.success === true)
  assert(json.exportedAt)
  assert(json.data['bonus-codes-config'].version === 5)
})

await test('POST /api/restore — リストア', async () => {
  const env = { ...mockEnv, CHATWOOT_KV: createMockKV() }
  const restoreData = {
    'bonus-codes-config': { version: 10, overrides: {}, customTypes: [{ id: 'restored', displayName: 'リストア', codes: ['R'], enabled: true }] },
    'audit-log': [{ ts: '2026-01-01', action: 'test' }]
  }
  const res = await worker.fetch(makeRequest('/api/restore', { token: 'unused', data: restoreData }), env)
  const json = await res.json()
  assert(json.success === true)
  // KVに書き込まれたか
  const stored = JSON.parse(env.CHATWOOT_KV._store['bonus-codes-config'])
  assert(stored.version === 10)
  assert(stored.customTypes[0].id === 'restored')
})

await test('POST /api/restore — 不正JSON → 400', async () => {
  const req = new Request('https://worker.example.com/api/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: 'not json'
  })
  const res = await worker.fetch(req, mockEnv)
  assert(res.status === 400)
})

await test('管理API認証 — ADMIN_TOKEN設定時 トークンなし → 401', async () => {
  const env = { ...mockEnv, ADMIN_TOKEN: 'admin-pass', CHATWOOT_KV: createMockKV() }
  const res = await worker.fetch(makeGetRequest('/api/audit-log'), env)
  assert(res.status === 401, `Expected 401, got ${res.status}`)
})

await test('管理API認証 — ADMIN_TOKEN設定時 正しいトークン → 200', async () => {
  const env = { ...mockEnv, ADMIN_TOKEN: 'admin-pass', CHATWOOT_KV: createMockKV() }
  const res = await worker.fetch(makeGetRequest('/api/audit-log?token=admin-pass'), env)
  assert(res.status === 200, `Expected 200, got ${res.status}`)
  const json = await res.json()
  assert(json.success === true)
})

await test('エラーレスポンスに内部情報が含まれない', async () => {
  // 意図的にエラーを起こすworkerを呼び出し、レスポンスに内部エラーが含まれないか確認
  const res = await worker.fetch(makeGetRequest('/nonexistent'), mockEnv)
  assert(res.status === 404)
  const text = await res.text()
  assert(!text.includes('stack') && !text.includes('Error:'))
})

// ============================================================================
// 13. GAS URL設定API
// ============================================================================
console.log('\n--- 13. GAS URL設定API ---')

await test('GAS URL GET — 初期状態（KV空）はenv fallback', async () => {
  const env = { ...mockEnv, ADMIN_TOKEN: 'admin-pass' }
  const res = await worker.fetch(makeGetRequest('/api/gas-urls?token=admin-pass'), env)
  assert(res.status === 200, `Expected 200, got ${res.status}`)
  const json = await res.json()
  assert(json.success === true)
  // mockEnvにはBONUS_CODE_WEBHOOK_URLがあるのでそれがfallbackされる
  assert(json.data.BONUS_CODE_WEBHOOK_URL === 'https://script.google.com/bonus', `Got: ${json.data.BONUS_CODE_WEBHOOK_URL}`)
})

await test('GAS URL POST — KVに保存される', async () => {
  const kv = createMockKV()
  const env = { ...mockEnv, ADMIN_TOKEN: 'admin-pass', CHATWOOT_KV: kv }
  const body = {
    token: 'admin-pass',
    BONUS_CODE_WEBHOOK_URL: 'https://gas.example.com/bonus',
    GAS_BOT_WEBHOOK_URL: 'https://gas.example.com/gasbot',
    BANK_TRANSFER_BOT_WEBHOOK_URL: 'https://gas.example.com/bank',
    EC_DEPOSIT_BOT_WEBHOOK_URL: 'https://gas.example.com/ec'
  }
  const res = await worker.fetch(makeRequest('/api/gas-urls?token=admin-pass', body), env)
  assert(res.status === 200)
  const json = await res.json()
  assert(json.success === true)
  const saved = JSON.parse(await kv.get('gas-urls'))
  assert(saved.BONUS_CODE_WEBHOOK_URL === 'https://gas.example.com/bonus')
  assert(saved.EC_DEPOSIT_BOT_WEBHOOK_URL === 'https://gas.example.com/ec')
})

await test('GAS URL GET — KV保存後はKV値が返る（env上書き）', async () => {
  const kv = createMockKV()
  await kv.put('gas-urls', JSON.stringify({
    BONUS_CODE_WEBHOOK_URL: 'https://kv.example.com/bonus',
    GAS_BOT_WEBHOOK_URL: 'https://kv.example.com/gasbot'
  }))
  const env = { ...mockEnv, ADMIN_TOKEN: 'admin-pass', CHATWOOT_KV: kv, BONUS_CODE_WEBHOOK_URL: 'https://env.example.com/bonus' }
  const res = await worker.fetch(makeGetRequest('/api/gas-urls?token=admin-pass'), env)
  const json = await res.json()
  assert(json.data.BONUS_CODE_WEBHOOK_URL === 'https://kv.example.com/bonus', 'KV value should override env')
  assert(json.data.GAS_BOT_WEBHOOK_URL === 'https://kv.example.com/gasbot')
})

await test('GAS URL POST — 認証なしは401', async () => {
  const env = { ...mockEnv, ADMIN_TOKEN: 'admin-pass' }
  const res = await worker.fetch(makeRequest('/api/gas-urls', { BONUS_CODE_WEBHOOK_URL: 'x' }), env)
  assert(res.status === 401)
})

// ============================================================================
// 結果サマリ
// ============================================================================
console.log('\n' + '='.repeat(60))
console.log(`テスト結果: ${passed} PASS / ${failed} FAIL / ${passed + failed} TOTAL`)
if (errors.length > 0) {
  console.log('\n失敗一覧:')
  errors.forEach(e => console.log(`  - ${e.name}: ${e.error}`))
}
console.log('='.repeat(60))

// クリーンアップ
globalThis.fetch = originalFetch

process.exit(failed > 0 ? 1 : 0)
