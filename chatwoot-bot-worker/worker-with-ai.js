// ============================================================================
// Chatwoot Bot — Cloudflare Worker版（BotPress完全置き換え）+ AI Gateway 統合
// Standard7 + Standard8 v8.21 の全機能を統合 + 動的ボーナスコード管理
// Pattern A: メニュー未マッチの自由テキストを AI Gateway に委譲
// ============================================================================

/**
 * === 追加環境変数 (Pattern A / AI Gateway 統合) ===
 * AI_GATEWAY_URL           - 例: https://chatwoot-ai-gateway-staging-bk.rcc-aoki.workers.dev
 * AI_GATEWAY_SHARED_SECRET - 共有シークレット（AI Gateway 側で検証）※任意
 * AI_ENABLED               - 'true' で本稼働（ユーザーに AI応答を返す）
 * AI_SHADOW_MODE           - 'true' で Shadow mode（AI応答を生成ログのみ、ユーザーには返さない）
 */

import { messages } from './messages.js'
import { matchBonusCode, matchGameSelection, isCustomHeavensCondition } from './bonus-codes.js'
import { sendChatwootMessage, transferToAgent, isConversationHandledByAgent } from './chatwoot-api.js'
import { recordBonusCode, handoffToGasBot, handoffToBankBot, handoffToEcBot, getGasUrls } from './gas-webhooks.js'
import { getAdminHTML } from './admin.js'
import { handleBonusCodesAPI, handleMenusAPI } from './bonus-codes-api.js'

// λ5: 単一のフォールバックメッセージを全パス共通に
const AI_FALLBACK_MESSAGE = '申し訳ございません、ただいま混み合っております。少々お時間をおいてから再度お試しいただくか、「オペレーター」とお送りください。';

/**
 * Chatwoot ネイティブ typing indicator。失敗時は silent — 呼出元でフォールバック可能。
 * @returns {Promise<boolean>} true on 2xx, false otherwise
 */
async function setTypingStatus(conversationId, env, isTyping) {
  try {
    const baseUrl = env.CHATWOOT_BASE_URL || env.CHATWOOT_URL;
    const accountId = env.CHATWOOT_ACCOUNT_ID;
    const token = env.CHATWOOT_API_TOKEN;
    if (!baseUrl || !accountId || !token) return false;
    const url = `${baseUrl.replace(/\/$/, '')}/api/v1/accounts/${accountId}/conversations/${conversationId}/toggle_typing_status`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api_access_token': token },
      body: JSON.stringify({ typing_status: isTyping ? 'on' : 'off' }),
    });
    return r.ok;
  } catch {
    return false;
  }
}

/**
 * Pattern A: AI Gateway への委譲
 * メニューにマッチしない自由テキスト入力で呼び出される
 *
 * @param {string} userMessage - ユーザー入力
 * @param {string|number} conversationId - Chatwoot conversation id
 * @param {object} env - Worker 環境変数
 * @param {Array} conversationHistory - 過去メッセージ（任意）
 * @returns {Promise<string|null>} AI応答文字列 or null（失敗/無効/Shadow時）
 */
async function aiFallback(userMessage, conversationId, env, conversationHistory = [], contactId = null) {
  const gatewayUrl = env.AI_GATEWAY_URL
  // ο: secret rotation grace — try current first, allow PREV during rotation window.
  const sharedSecret = env.AI_GATEWAY_SHARED_SECRET
  const sharedSecretPrev = env.AI_GATEWAY_SHARED_SECRET_PREV
  if (!gatewayUrl) {
    console.log('[aiFallback] AI_GATEWAY_URL not configured, skipping')
    return null
  }
  const shadowMode = env.AI_SHADOW_MODE === 'true'
  const aiEnabled = env.AI_ENABLED === 'true'
  if (!aiEnabled && !shadowMode) {
    return null
  }

  const requestId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  console.log(JSON.stringify({ event: 'ai_fallback_call', request_id: requestId, conversation_id: conversationId }))

  const controller = new AbortController()
  // λ3: Gateway 側の Gemini timeout(10s) にヘッドルームを持たせ、競合 abort を防ぐ
  const timeout = setTimeout(() => controller.abort(), 12000)
  try {
    const r = await fetch(`${gatewayUrl.replace(/\/$/, '')}/api/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://chatwoot-bot.internal',
        'X-Request-ID': requestId,
        ...(sharedSecret ? { 'X-AgentBot-Secret': sharedSecret } : {}),
      },
      body: JSON.stringify({
        message: userMessage,
        conversation_id: conversationId,
        // τ-H6: forward contact/user id so Gateway analytics + escalation_session_id are accurate
        user_id: contactId || `chatwoot:${conversationId}`,
        conversation_history: (conversationHistory || []).slice(-6),
      }),
      signal: controller.signal,
    })
    clearTimeout(timeout)
    // ο: secret rotation grace — on 401, retry once with PREV secret if available.
    if (r.status === 401 && sharedSecretPrev && sharedSecretPrev !== sharedSecret) {
      console.warn('[aiFallback] 401 on current secret — retrying with PREV secret')
      try {
        const r2 = await fetch(`${gatewayUrl.replace(/\/$/, '')}/api/ai/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Origin': 'https://chatwoot-bot.internal',
            'X-Request-ID': requestId,
            'X-AgentBot-Secret': sharedSecretPrev,
          },
          body: JSON.stringify({ message: userMessage, conversation_id: conversationId, conversation_history: (conversationHistory || []).slice(-6) }),
          signal: controller.signal,
        })
        if (r2.ok) {
          const d2 = await r2.json()
          return d2.reply || d2.response || null
        }
      } catch (_) {}
    }
    if (!r.ok) {
      console.warn('[aiFallback] Gateway returned', r.status, 'request_id=', requestId)
      try {
        await sendChatwootMessage(env, (env.CHATWOOT_ACCOUNT_ID || ''), conversationId,
          AI_FALLBACK_MESSAGE, null)
      } catch (_) {}
      return null
    }
    const data = await r.json()
    const reply = data.reply || data.response || null

    // ο: Honor escalate flag — Gateway has already persisted to escalation_queue (ξ-C2).
    // Surface the reply (which is the operator-routing message) and tag the conversation
    // so the operator UI sees it. Don't append menu buttons in escalation mode.
    if (data.escalate === true) {
      console.log(JSON.stringify({ event: 'ai_escalate', request_id: requestId, conversation_id: conversationId, reason: data.reason || null, priority: data.priority || null }))
      try {
        // Best-effort: assign a conversation label so operator dashboard filters it
        if (env.CHATWOOT_API_TOKEN && env.CHATWOOT_BASE_URL && env.CHATWOOT_ACCOUNT_ID) {
          await fetch(`${env.CHATWOOT_BASE_URL.replace(/\/$/, '')}/api/v1/accounts/${env.CHATWOOT_ACCOUNT_ID}/conversations/${conversationId}/labels`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'api_access_token': env.CHATWOOT_API_TOKEN },
            body: JSON.stringify({ labels: [`escalation:${data.reason || 'unknown'}`] }),
          }).catch(() => {})
        }
      } catch (_) {}
      // Return a sentinel so caller can skip menu append.
      return { __escalate: true, reply }
    }

    if (shadowMode && !aiEnabled) {
      // Persist to KV for analysis (TTL 30 days) if SHADOW_LOG binding exists
      if (env.SHADOW_LOG) {
        const key = `shadow:${conversationId}:${Date.now()}`
        await env.SHADOW_LOG.put(key, JSON.stringify({
          user_message: (userMessage || '').slice(0, 500),
          ai_reply: (reply || '').slice(0, 1000),
          timestamp: new Date().toISOString(),
          request_id: requestId,
        }), { expirationTtl: 30 * 86400 }).catch(e => console.error('[shadow-log] failed:', e.message))
      }
      console.log('[aiFallback][SHADOW]', JSON.stringify({
        request_id: requestId,
        conversationId,
        userMessage: (userMessage || '').slice(0, 100),
        reply: (reply || '').slice(0, 200),
      }))
      return null
    }
    return reply
  } catch (e) {
    clearTimeout(timeout)
    console.error('[aiFallback] error:', e.message, 'request_id=', requestId)
    try {
      await sendChatwootMessage(env, (env.CHATWOOT_ACCOUNT_ID || ''), conversationId,
        '申し訳ございません、一時的にご質問にお答えできません。別の表現でお試しいただくか、「オペレーター」とお送りください。', null)
    } catch (_) {}
    return null
  }
}

// HMAC-SHA256 署名検証（Chatwoot Webhook）
async function verifyWebhookSignature(request, secret) {
  if (!secret) return true  // WEBHOOK_SECRET未設定時はスキップ（後方互換）
  const signature = request.headers.get('x-chatwoot-signature')
  if (!signature) return true  // ヘッダーなし = HMAC未使用（URLパス認証のみで通過）
  const body = await request.clone().text()
  const encoder = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(body))
  const expected = Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')
  return signature === expected
}

// 入力サニタイズ（制御文字除去 + 長さ制限）
function sanitizeInput(str, maxLen = 500) {
  if (typeof str !== 'string') return ''
  return str.substring(0, maxLen).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
}

// KVベースのレート制限
async function checkRateLimit(env, key, maxRequests, windowSeconds) {
  const rlKey = `rl:${key}`
  try {
    const now = Math.floor(Date.now() / 1000)
    const raw = await env.CHATWOOT_KV.get(rlKey)
    const data = raw ? JSON.parse(raw) : { count: 0, start: now }
    if (now - data.start > windowSeconds) {
      data.count = 1; data.start = now
    } else {
      data.count++
    }
    await env.CHATWOOT_KV.put(rlKey, JSON.stringify(data), { expirationTtl: windowSeconds * 2 })
    return data.count <= maxRequests
  } catch (e) {
    return true  // KV障害時はレート制限をバイパス（可用性優先）
  }
}

// エラーログ（KVに蓄積、管理画面で表示）
async function logError(env, type, details) {
  try {
    const raw = await env.CHATWOOT_KV.get('error-log')
    const errors = raw ? JSON.parse(raw) : []
    errors.unshift({ ts: new Date().toISOString(), type, ...details })
    if (errors.length > 100) errors.length = 100
    await env.CHATWOOT_KV.put('error-log', JSON.stringify(errors))
  } catch (e) { /* silent — ログ失敗でメイン処理を止めない */ }
}

// --- 管理画面セッション: HMAC署名トークン + HttpOnly cookie ---
async function signAdminToken(env) {
  const secret = env.ADMIN_SESSION_KEY
  if (!secret) throw new Error('ADMIN_SESSION_KEY not configured')
  const exp = Math.floor(Date.now() / 1000) + 8 * 3600
  const b64 = btoa(JSON.stringify({ exp }))
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(b64))
  const sigHex = [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('')
  return `${b64}.${sigHex}`
}

async function verifyAdminToken(token, env) {
  if (!token) return null
  const secret = env.ADMIN_SESSION_KEY
  if (!secret) return null
  const [b64, sig] = token.split('.')
  if (!b64 || !sig) return null
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey('raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const expected = await crypto.subtle.sign('HMAC', key, enc.encode(b64))
  const expectedHex = [...new Uint8Array(expected)].map(b => b.toString(16).padStart(2, '0')).join('')
  if (sig !== expectedHex) return null
  try {
    const p = JSON.parse(atob(b64))
    if (p.exp < Math.floor(Date.now() / 1000)) return null
    return p
  } catch { return null }
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  let diff = a.length ^ b.length
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
  }
  return diff === 0
}

function parseCookies(header) {
  const out = {}
  if (!header) return out
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx < 0) continue
    const k = part.slice(0, idx).trim()
    const v = part.slice(idx + 1).trim()
    if (k) out[k] = decodeURIComponent(v)
  }
  return out
}

function getAdminLoginHTML(error) {
  const errorHtml = error ? `<div class="err">${error}</div>` : ''
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Admin Login</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
body{font-family:system-ui,-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}
.card{background:#1e293b;padding:32px;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.4);width:320px}
h1{margin:0 0 20px;font-size:20px}
input{width:100%;padding:10px;box-sizing:border-box;background:#0f172a;border:1px solid #334155;color:#e2e8f0;border-radius:6px;font-size:14px;margin-bottom:12px}
button{width:100%;padding:10px;background:#3b82f6;color:#fff;border:0;border-radius:6px;font-size:14px;cursor:pointer}
button:hover{background:#2563eb}
.err{background:#7f1d1d;color:#fecaca;padding:8px 12px;border-radius:6px;margin-bottom:12px;font-size:13px}
</style></head><body>
<form class="card" id="f">
<h1>Admin Login</h1>
${errorHtml}
<input type="password" id="pw" placeholder="Password" autofocus required>
<button type="submit">Login</button>
</form>
<script>
document.getElementById('f').addEventListener('submit', async (e) => {
  e.preventDefault()
  const pw = document.getElementById('pw').value
  const r = await fetch('/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pw }),
    credentials: 'same-origin',
  })
  if (r.ok) { location.href = '/admin' }
  else { location.href = '/admin?err=1' }
})
</script></body></html>`
}

// CORSヘッダー生成
function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.CHATWOOT_BASE_URL || 'https://im.sloten.io',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    const headers = corsHeaders(env)

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers })
    }

    try {
      const jsonHeaders = { 'Content-Type': 'application/json', ...headers }

      // --- 管理画面ログイン (POST) ---
      if (url.pathname === '/admin/login' && request.method === 'POST') {
        // Early env validation — avoid 500 after successful password verification
        if (!env.ADMIN_PASSWORD || !env.ADMIN_SESSION_KEY) {
          return new Response(JSON.stringify({
            error: 'Admin authentication is not configured. Contact operator to set ADMIN_PASSWORD and ADMIN_SESSION_KEY secrets.',
          }), { status: 503, headers: jsonHeaders })
        }
        let loginBody
        try { loginBody = await request.json() }
        catch { return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400, headers: jsonHeaders }) }
        const pw = loginBody && typeof loginBody.password === 'string' ? loginBody.password : ''
        const expected = env.ADMIN_PASSWORD || ''
        if (!expected || !timingSafeEqual(pw, expected)) {
          return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: jsonHeaders })
        }
        let token
        try {
          token = await signAdminToken(env)
        } catch (e) {
          console.error('[admin-login] signAdminToken failed:', e.message)
          return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
            status: 503,
            headers: jsonHeaders,
          })
        }
        const cookie = `chatwoot_admin_session=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Max-Age=28800; Path=/admin`
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...jsonHeaders, 'Set-Cookie': cookie },
        })
      }

      // --- 管理画面ログアウト ---
      if (url.pathname === '/admin/logout' && request.method === 'POST') {
        const cookie = `chatwoot_admin_session=; HttpOnly; Secure; SameSite=Strict; Max-Age=0; Path=/admin`
        return new Response(null, {
          status: 302,
          headers: { ...headers, 'Set-Cookie': cookie, 'Location': '/admin' },
        })
      }

      // --- 管理画面（Cookieセッション認証） ---
      if (url.pathname === '/admin' || url.pathname === '/') {
        if (env.ADMIN_PASSWORD || env.ADMIN_SESSION_KEY) {
          const cookies = parseCookies(request.headers.get('Cookie'))
          const sessionTok = cookies['chatwoot_admin_session']
          const payload = await verifyAdminToken(sessionTok, env)
          if (!payload) {
            return new Response(getAdminLoginHTML(url.searchParams.get('err') ? 'Invalid password' : ''), {
              status: 200,
              headers: { 'Content-Type': 'text/html; charset=utf-8', ...headers },
            })
          }
        }
        return new Response(getAdminHTML(), {
          headers: { 'Content-Type': 'text/html; charset=utf-8', ...headers }
        })
      }

      // --- Chatwoot Webhook受信（メイン機能） ---
      if ((url.pathname === '/api/webhook' || url.pathname.startsWith('/api/webhook/')) && request.method === 'POST') {
        // 全Webhookリクエストを無条件ログ（診断用）
        const hasSig = request.headers.get('x-chatwoot-signature') ? 'yes' : 'no'
        const pathToken = url.pathname.split('/api/webhook/')[1] || ''
        await logError(env, 'webhook_received', { path: url.pathname.substring(0, 50), hasSig, hasToken: pathToken ? 'yes' : 'no' })

        // URLパストークン認証
        if (env.WEBHOOK_SECRET) {
          if (pathToken !== env.WEBHOOK_SECRET) {
            await logError(env, 'webhook_auth_failed', { pathToken: pathToken.substring(0, 8) + '...', hasSig })
            return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: jsonHeaders })
          }
        }
        // HMAC署名検証（追加レイヤー）
        const hmacValid = await verifyWebhookSignature(request, env.WEBHOOK_SECRET)
        if (!hmacValid) {
          await logError(env, 'webhook_hmac_failed', { hasSig })
          return new Response(JSON.stringify({ error: 'invalid_signature' }), { status: 403, headers: jsonHeaders })
        }

        let body
        try {
          body = await request.json()
        } catch (e) {
          await logError(env, 'webhook_parse_failed', { error: e.message })
          return new Response(JSON.stringify({ success: false, error: 'invalid_json' }), { status: 400, headers: jsonHeaders })
        }

        // レート制限（会話ID単位 30req/min）
        const convId = body?.conversation?.id
        if (convId) {
          const allowed = await checkRateLimit(env, `wh:${convId}`, 30, 60)
          if (!allowed) {
            return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429, headers: jsonHeaders })
          }
        }

        const result = await handleWebhook(body, env)

        // Agent Botプロトコル対応:
        // GAS BOT管理中（conversation_open）やoutgoingメッセージの場合、
        // Chatwoot Agent Botが「エラー」と判定しないよう空のレスポンスを返す
        if (result?.skipped) {
          return new Response('', { status: 200, headers })
        }

        return new Response(JSON.stringify(result), { headers: jsonHeaders })
      }

      // --- 管理API共通認証 ---
      const isAdminAPI = url.pathname === '/api/test-webhook' ||
        url.pathname.startsWith('/api/bonus-codes') ||
        url.pathname === '/api/menus' ||
        url.pathname === '/api/audit-log' ||
        url.pathname === '/api/errors' ||
        url.pathname === '/api/test-gas' ||
        url.pathname === '/api/gas-urls' ||
        url.pathname === '/api/backup' ||
        url.pathname === '/api/restore'

      if (isAdminAPI) {
        // Admin認証チェック
        if (env.ADMIN_TOKEN) {
          let authToken
          if (request.method === 'POST') {
            try {
              const clonedBody = await request.clone().json()
              authToken = clonedBody.token || url.searchParams.get('token')
            } catch (e) {
              authToken = url.searchParams.get('token')
            }
          } else {
            authToken = url.searchParams.get('token')
          }
          if (authToken !== env.ADMIN_TOKEN) {
            return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: jsonHeaders })
          }
        }
        // レート制限（管理API 60req/min）
        const allowed = await checkRateLimit(env, 'admin', 60, 60)
        if (!allowed) {
          return new Response(JSON.stringify({ error: 'rate_limited' }), { status: 429, headers: jsonHeaders })
        }
      }

      // --- テストWebhook ---
      if (url.pathname === '/api/test-webhook' && request.method === 'POST') {
        let reqBody
        try { reqBody = await request.json() } catch (e) {
          return new Response(JSON.stringify({ success: false, error: 'invalid_json' }), { status: 400, headers: jsonHeaders })
        }
        const webhookBody = {
          event: 'message_created',
          message_type: 'incoming',
          content: reqBody.message || 'welcome_message',
          conversation: { id: reqBody.conversationId || 999, status: 'pending' },
          sender: { name: 'テストユーザー', id: 1 },
          account: { id: parseInt(env.ACCOUNT_ID) || 3 }
        }
        const result = await handleWebhook(webhookBody, env)
        return new Response(JSON.stringify(result), { headers: jsonHeaders })
      }

      // --- GAS Webhook URL設定 ---
      if (url.pathname === '/api/gas-urls' && request.method === 'GET') {
        const raw = await env.CHATWOOT_KV.get('gas-urls')
        const saved = raw ? JSON.parse(raw) : {}
        return new Response(JSON.stringify({
          success: true,
          data: {
            BONUS_CODE_WEBHOOK_URL: saved.BONUS_CODE_WEBHOOK_URL || env.BONUS_CODE_WEBHOOK_URL || '',
            GAS_BOT_WEBHOOK_URL: saved.GAS_BOT_WEBHOOK_URL || env.GAS_BOT_WEBHOOK_URL || '',
            BANK_TRANSFER_BOT_WEBHOOK_URL: saved.BANK_TRANSFER_BOT_WEBHOOK_URL || env.BANK_TRANSFER_BOT_WEBHOOK_URL || '',
            EC_DEPOSIT_BOT_WEBHOOK_URL: saved.EC_DEPOSIT_BOT_WEBHOOK_URL || env.EC_DEPOSIT_BOT_WEBHOOK_URL || '',
          }
        }), { headers: jsonHeaders })
      }

      if (url.pathname === '/api/gas-urls' && request.method === 'POST') {
        let reqBody
        try { reqBody = await request.json() } catch (e) {
          return new Response(JSON.stringify({ success: false, error: 'invalid_json' }), { status: 400, headers: jsonHeaders })
        }
        const keys = ['BONUS_CODE_WEBHOOK_URL', 'GAS_BOT_WEBHOOK_URL', 'BANK_TRANSFER_BOT_WEBHOOK_URL', 'EC_DEPOSIT_BOT_WEBHOOK_URL']
        const urls = {}
        for (const k of keys) {
          if (typeof reqBody[k] === 'string') urls[k] = reqBody[k].trim()
        }
        await env.CHATWOOT_KV.put('gas-urls', JSON.stringify(urls))
        return new Response(JSON.stringify({ success: true, message: 'GAS URL設定を保存しました' }), { headers: jsonHeaders })
      }

      // --- EC入金コールバック（VPSから決済番号受信） ---
      if (url.pathname === '/api/ec-callback' && request.method === 'POST') {
        // ο: enforce shared secret on EC callback (was unauthenticated)
        if (env.EC_CALLBACK_SECRET) {
          const provided = request.headers.get('X-EC-Secret') || ''
          // timing-safe-ish compare
          const a = provided, b = env.EC_CALLBACK_SECRET
          let diff = a.length ^ b.length
          for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0)
          if (diff !== 0) {
            return new Response(JSON.stringify({ success: false, error: 'unauthorized' }), { status: 401, headers: jsonHeaders })
          }
        } else {
          console.warn('[ec-callback] EC_CALLBACK_SECRET not set — endpoint is open')
        }
        let reqBody
        try { reqBody = await request.json() } catch (e) {
          return new Response(JSON.stringify({ success: false, error: 'invalid_json' }), { status: 400, headers: jsonHeaders })
        }
        const cbConvId = reqBody.conversationId
        const paymentNumber = reqBody.paymentNumber || reqBody.orderNumber || reqBody.payment_number
        const cbAccountId = reqBody.accountId || parseInt(env.ACCOUNT_ID) || 3
        const cbStatus = reqBody.status || 'completed'

        if (!cbConvId || !paymentNumber) {
          return new Response(JSON.stringify({ success: false, error: 'missing conversationId or paymentNumber' }), { status: 400, headers: jsonHeaders })
        }

        if (cbStatus === 'error' || cbStatus === 'failed') {
          await sendChatwootMessage(env, cbAccountId, cbConvId,
            `⚠️ EC入金の処理中にエラーが発生しました。\n\nお手数ですが、オペレーターにお問い合わせください。`,
            [{ title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }]
          )
          await logError(env, 'ec_callback_error', { conversationId: cbConvId, status: cbStatus, error: reqBody.error })
          return new Response(JSON.stringify({ success: true, action: 'error_notified' }), { headers: jsonHeaders })
        }

        // KVからゲームアカウントIDと金額を取得
        const ecState = await getEcState(env, cbConvId)
        const gameAccountId = ecState?.gameAccountId || ''
        const ecAmount = ecState?.amount || reqBody.amount || reqBody.requestedAmount || 0

        // GAS EC BOTにコールバックデータを転送（スプレッドシート記録用）
        try {
          const ecGasUrl = 'https://script.google.com/macros/s/AKfycbx45Ly5iUpozJ7qVBReYXNJnjQ22_No3H7RUo-QrixAmKgtwgBshOibJjCj8ZBiafoAPw/exec'
          await fetch(ecGasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...reqBody,
              success: true,
              accountId: gameAccountId,
              amount: ecAmount,
            })
          })
        } catch (e) {
          console.error('GAS EC callback forward error:', e.message)
        }

        // EC状態をクリア
        try { await env.CHATWOOT_KV.delete(`ec-state:${cbConvId}`) } catch (e) {}

        // ChatWootにメッセージ送信
        const amount = ecAmount
        const orderNum = reqBody.orderNumber || ''
        const confirmNum = reqBody.confirmationNumber || reqBody.confirmNumber || ''
        const expiry = reqBody.expiryDate || reqBody.deadline || ''

        await sendChatwootMessage(env, cbAccountId, cbConvId,
          `🎉 **コンビニ決済番号発行完了**\n\n` +
          `💰 **金額**: ¥${Number(amount).toLocaleString()}\n` +
          `🔢 **決済番号**: ${paymentNumber}\n` +
          (confirmNum ? `🔑 **確認番号**: ${confirmNum}\n` : '') +
          (expiry ? `⏰ **支払期限**: ${expiry}\n` : '') +
          `\n📍 **お支払い方法**\n` +
          `1. 最寄りのローソンへお越しください\n` +
          `2. Loppiで決済番号・確認番号を入力\n` +
          `3. レシートが発行されたらレジでお支払い\n` +
          `\n❗ 期限内にお支払いをお済ませください` +
          (orderNum ? `\n\n📋 **注文番号**: ${orderNum}` : ''),
          [{ title: '↩️ メインメニューに戻る', value: 'welcome_message' }]
        )
        await logError(env, 'ec_callback_ok', { conversationId: cbConvId, paymentNumber })
        return new Response(JSON.stringify({ success: true, action: 'payment_number_sent' }), { headers: jsonHeaders })
      }

      // --- EC URL デバッグ ---
      if (url.pathname === '/api/debug-ec' && request.method === 'GET') {
        // ο: gate behind explicit env flag + shared secret
        if (env.ALLOW_DEBUG_EC !== 'true') {
          return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: jsonHeaders })
        }
        if (env.EC_CALLBACK_SECRET) {
          const provided = request.headers.get('X-EC-Secret') || ''
          if (provided !== env.EC_CALLBACK_SECRET) {
            return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: jsonHeaders })
          }
        }
        const gasUrls = await getGasUrls(env)
        const ecUrl = gasUrls.EC_DEPOSIT_BOT_WEBHOOK_URL
        // 実際にVPSにテストリクエスト送信
        let fetchResult = {}
        try {
          const testBody = JSON.stringify({ amount: 0, conversationId: 0, accountId: 3, callbackUrl: 'https://chatwoot-bot.rcc-aoki.workers.dev/api/ec-callback', test: true })
          const r = await fetch(ecUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: testBody })
          const text = await r.text()
          fetchResult = { status: r.status, ok: r.ok, body: text.substring(0, 200) }
        } catch (e) {
          fetchResult = { error: e.message }
        }
        return new Response(JSON.stringify({
          ecUrl,
          isHttp: ecUrl?.startsWith('http://'),
          fetchResult,
        }, null, 2), { headers: jsonHeaders })
      }

      // --- GAS疎通テスト ---
      if (url.pathname === '/api/test-gas' && request.method === 'POST') {
        const results = await handleGasTest(env)
        return new Response(JSON.stringify({ success: true, results }), { headers: jsonHeaders })
      }

      // --- 監査ログ ---
      if (url.pathname === '/api/audit-log' && request.method === 'GET') {
        const raw = await env.CHATWOOT_KV.get('audit-log')
        return new Response(JSON.stringify({ success: true, data: raw ? JSON.parse(raw) : [] }), { headers: jsonHeaders })
      }

      // --- エラーログ ---
      if (url.pathname === '/api/errors' && request.method === 'GET') {
        const raw = await env.CHATWOOT_KV.get('error-log')
        return new Response(JSON.stringify({ success: true, data: raw ? JSON.parse(raw) : [] }), { headers: jsonHeaders })
      }

      // --- バックアップ ---
      if (url.pathname === '/api/backup' && request.method === 'GET') {
        const config = await env.CHATWOOT_KV.get('bonus-codes-config')
        const audit = await env.CHATWOOT_KV.get('audit-log')
        return new Response(JSON.stringify({
          success: true,
          exportedAt: new Date().toISOString(),
          data: {
            'bonus-codes-config': config ? JSON.parse(config) : null,
            'audit-log': audit ? JSON.parse(audit) : [],
          }
        }), { headers: jsonHeaders })
      }

      // --- リストア ---
      if (url.pathname === '/api/restore' && request.method === 'POST') {
        let reqBody
        try { reqBody = await request.json() } catch (e) {
          return new Response(JSON.stringify({ success: false, error: 'invalid_json' }), { status: 400, headers: jsonHeaders })
        }
        if (reqBody.data?.['bonus-codes-config']) {
          await env.CHATWOOT_KV.put('bonus-codes-config', JSON.stringify(reqBody.data['bonus-codes-config']))
        }
        if (reqBody.data?.['audit-log']) {
          await env.CHATWOOT_KV.put('audit-log', JSON.stringify(reqBody.data['audit-log']))
        }
        return new Response(JSON.stringify({ success: true, message: 'リストア完了' }), { headers: jsonHeaders })
      }

      // --- ボーナスコード管理API ---
      if (url.pathname.startsWith('/api/bonus-codes')) {
        return await handleBonusCodesAPI(request, url, env, headers)
      }

      // --- メニュー一覧API ---
      if (url.pathname === '/api/menus') {
        return await handleMenusAPI(url, env, headers)
      }

      return new Response('Not Found', { status: 404, headers })
    } catch (error) {
      console.error('Worker error:', error)
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...headers }
      })
    }
  }
}

// EC入金 状態管理（KV: ec-state:{conversationId}）
async function getEcState(env, conversationId) {
  try {
    const raw = await env.CHATWOOT_KV.get(`ec-state:${conversationId}`)
    return raw ? JSON.parse(raw) : null
  } catch (e) { return null }
}

async function saveEcState(env, conversationId, state) {
  try {
    await env.CHATWOOT_KV.put(`ec-state:${conversationId}`, JSON.stringify(state), { expirationTtl: 3600 }) // 1時間で自動削除
  } catch (e) { console.error('saveEcState error:', e.message) }
}

// GAS疎通テスト
async function handleGasTest(env) {
  const gasUrls = await getGasUrls(env)
  const urls = [
    { name: 'ボーナスコード記録', url: gasUrls.BONUS_CODE_WEBHOOK_URL },
    { name: 'PayPay入金', url: gasUrls.GAS_BOT_WEBHOOK_URL },
    { name: '銀行振込', url: gasUrls.BANK_TRANSFER_BOT_WEBHOOK_URL },
    { name: 'コンビニ入金', url: gasUrls.EC_DEPOSIT_BOT_WEBHOOK_URL },
  ]
  const results = []
  for (const u of urls) {
    if (!u.url) { results.push({ name: u.name, status: '未設定', ok: false }); continue }
    try {
      const start = Date.now()
      const r = await fetch(u.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{"test":true}' })
      results.push({ name: u.name, status: r.status, ms: Date.now() - start, ok: r.ok })
    } catch (e) {
      results.push({ name: u.name, status: e.message, ok: false })
    }
  }
  return results
}

// ============================================================================
// Webhook処理（Standard7 + Standard8 統合）
// ============================================================================

async function handleWebhook(body, env) {
  // --- Standard7: 前処理 ---
  const eventType = body?.event

  // message_created / message_updated のみ処理
  if (eventType !== 'message_created' && eventType !== 'message_updated') {
    return { success: true, skipped: true, reason: 'not_message_event' }
  }

  // submitted_values の存在チェック（ステータスチェックより先に判定）
  const submittedValues = body?.content_attributes?.submitted_values

  // 会話ステータスチェック: open かつ assignee_id がある（= 人間担当者割り当て済み）
  // 場合のみスキップ。status=open / assignee=unassigned は bot の対応対象。
  // ボタンクリック（submitted_values）は明示的ユーザー操作なので常に処理する。
  const conversationStatus = body?.conversation?.status
  const assigneeId = body?.conversation?.meta?.assignee?.id
    || body?.conversation?.assignee_id
    || null
  if (conversationStatus === 'open' && assigneeId && !submittedValues) {
    return { success: true, skipped: true, reason: 'operator_assigned' }
  }

  // outgoingメッセージ（ボット自身の発言）はスキップ（ボタンクリック除く）
  // message_type は文字列 'outgoing' または数値 1 の場合がある
  const msgType = body?.message_type
  if (!submittedValues && (msgType === 'outgoing' || msgType === 1)) {
    return { success: true, skipped: true, reason: 'outgoing_message' }
  }

  // メッセージ内容を取得（サニタイズ）
  let messageText = sanitizeInput(body?.content || '', 1000)
  let isButtonClick = false

  if (submittedValues && submittedValues.length > 0) {
    messageText = submittedValues[0].value
    isButtonClick = true
  }

  // 連絡先名を取得（Standard7のフォールバックロジック + サニタイズ）
  let contactName = ''
  let contactId = ''

  if (isButtonClick) {
    contactName = body?.conversation?.meta?.sender?.name || ''
    contactId = body?.conversation?.meta?.sender?.id || ''
  } else {
    contactName = body?.sender?.name || ''
    contactId = body?.sender?.id || ''
  }

  // フォールバック
  if (!contactName) {
    contactName = body?.conversation?.meta?.sender?.name
      || body?.sender?.name
      || body?.contact?.name
      || ''
  }
  if (!contactId) {
    contactId = body?.conversation?.meta?.sender?.id
      || body?.sender?.id
      || body?.contact?.id
      || ''
  }

  const conversationId = body?.conversation?.id
  const accountId = body?.account?.id || parseInt(env.ACCOUNT_ID) || 3

  if (!conversationId) {
    return { success: true, skipped: true, reason: 'no_conversation_id' }
  }

  if (!messageText) {
    return { success: true, skipped: true, reason: 'empty_message' }
  }

  // サニタイズ適用
  contactName = sanitizeInput(contactName, 100)

  // --- Standard8: メインルーティング ---
  return await routeMessage(env, accountId, conversationId, messageText, contactName, contactId)
}

// ============================================================================
// メッセージルーティング（Standard8 メイン処理の完全移植）
// ============================================================================

async function routeMessage(env, accountId, conversationId, messageText, contactName, contactId) {
  const userName = contactName || `会話ID: ${conversationId}`

  // 1. オペレーター転送
  if (messageText === 'transfer_to_agent') {
    await transferToAgent(env, accountId, conversationId)
    return { success: true, action: 'transfer_to_agent' }
  }

  // 1.5. Pattern A: AI 応答後のバウンダリボタンハンドラ
  if (messageText === 'ai_resolved') {
    await sendChatwootMessage(env, accountId, conversationId,
      '✅ ご解決できてよかったです！\n\nまたご不明点があればいつでもお声がけください。',
      [{ title: '📋 メインメニュー', value: 'welcome_message' }]
    )
    await logError(env, 'ai_resolved', { conversationId })
    return { success: true, action: 'ai_resolved' }
  }
  if (messageText === 'escalate_human') {
    await sendChatwootMessage(env, accountId, conversationId,
      '🙋 オペレーターにお繋ぎします。\n\n順番にご対応しておりますので、少々お待ちください。',
      null
    )
    await transferToAgent(env, accountId, conversationId)
    await logError(env, 'ai_escalated', { conversationId })
    return { success: true, action: 'escalate_human' }
  }
  if (messageText === 'main_menu') {
    const welcomeConfig = messages.welcome_message
    await sendChatwootMessage(env, accountId, conversationId, welcomeConfig.content, welcomeConfig.items)
    return { success: true, action: 'main_menu' }
  }

  // 2. ボーナスコード検証（ハードコード + 動的KV統合）
  // デバッグ: 入力テキストとマッチ結果をログ
  let bonusMatch
  try {
    bonusMatch = await matchBonusCode(messageText, env)
  } catch (e) {
    await logError(env, 'bonus_match_error', { messageText, error: e.message })
    bonusMatch = { matched: false }
  }
  if (messageText && !bonusMatch.matched && !messages[messageText]) {
    await logError(env, 'unmatched_input', { messageText, bonusMatched: bonusMatch.matched })
  }

  if (bonusMatch.matched) {
    // 金額付き汎用コード
    if (bonusMatch.type === 'valid_bonus') {
      const recorded = await recordBonusCode(env, conversationId, userName, messageText, 'bonus', { amount: bonusMatch.amount })
      if (recorded.success === false) {
        await sendChatwootMessage(env, accountId, conversationId,
          '⚠️ ボーナスコードの記録に失敗しました。お手数ですがもう一度お試しください。',
          [{ title: '↩️ メインメニューに戻る', value: 'welcome_message' }]
        )
        return { success: false, action: 'bonus_code_record_failed', type: bonusMatch.type }
      }
      await sendChatwootMessage(env, accountId, conversationId,
        `✅ ボーナスコードを受け付けました！\n\n**ボーナスコード:** ${messageText}\n**参加希望金額:** ${bonusMatch.amount}\n\nお申込ありがとうございます。担当者が確認後、ボーナスを付与いたします。\n\nしばらくお待ちください。`,
        [{ title: '↩️ メインメニューに戻る', value: 'welcome_message' }]
      )
      return { success: true, action: 'bonus_code', type: bonusMatch.type }
    }

    // スプレッドシートに記録（gasTypeがあればそちらを優先）
    const recorded = await recordBonusCode(env, conversationId, userName, bonusMatch.code, bonusMatch.gasType || bonusMatch.type)
    if (recorded.success === false) {
      await sendChatwootMessage(env, accountId, conversationId,
        '⚠️ ボーナスコードの記録に失敗しました。お手数ですがもう一度お試しください。',
        [{ title: '↩️ メインメニューに戻る', value: 'welcome_message' }]
      )
      return { success: false, action: 'bonus_code_record_failed', type: bonusMatch.type }
    }

    // 成功メッセージを送信（動的コードはインライン、ハードコードはmessages参照）
    if (bonusMatch.successMessage) {
      await sendChatwootMessage(env, accountId, conversationId,
        bonusMatch.successMessage.content, bonusMatch.successMessage.items)
    } else if (bonusMatch.successKey) {
      const successConfig = messages[bonusMatch.successKey]
      if (successConfig) {
        await sendChatwootMessage(env, accountId, conversationId, successConfig.content, successConfig.items)
      }
    }

    // プランコード等: 成功メッセージ後にエージェント転送
    if (bonusMatch.transferAfter) {
      await transferToAgent(env, accountId, conversationId)
    }

    return { success: true, action: 'bonus_code', type: bonusMatch.type }
  }

  // 3. カスタムヘブンズショット条件テキスト検出
  if (isCustomHeavensCondition(messageText)) {
    await recordBonusCode(env, conversationId, userName, 'カスタムヘブンズショット', 'custom_heavens_condition', { conditionText: messageText })

    const conditionMsg = messages.custom_heavens_condition_received.content.replace('{condition_text}', messageText)
    await sendChatwootMessage(env, accountId, conversationId, conditionMsg, null)
    await transferToAgent(env, accountId, conversationId)

    return { success: true, action: 'custom_heavens_condition' }
  }

  // 4. 機種選択ボタン処理（6種 × 10機種）
  const gameMatch = matchGameSelection(messageText)

  if (gameMatch) {
    // テンプレートメッセージのキーを決定
    const gameSelectedKey = `${gameMatch.type}_game_selected`
    const gameSelectedConfig = messages[gameSelectedKey]

    if (gameSelectedConfig) {
      const gameMsg = gameSelectedConfig.content.replace('{game_name}', gameMatch.gameName)
      await sendChatwootMessage(env, accountId, conversationId, gameMsg, null)
    }

    await transferToAgent(env, accountId, conversationId)
    return { success: true, action: 'game_selected', type: gameMatch.type, game: gameMatch.gameName }
  }

  // 4.5. EC入金フロー（状態管理: KV `ec-state:{convId}`）
  // Step A: アカウントID入力待ち → KVに保存 → 金額選択メニュー表示
  const ecState = await getEcState(env, conversationId)
  if (ecState?.step === 'waiting_account_id') {
    const inputId = messageText.trim()
    if (inputId.length < 3 || inputId.length > 20 || !/^[a-zA-Z0-9]+$/.test(inputId)) {
      await sendChatwootMessage(env, accountId, conversationId,
        '❌ アカウントIDは英数字3〜20文字で入力してください。\n\n例: syt2525m, riv3633, hiromu',
        null
      )
      return { success: true, action: 'ec_invalid_account_id' }
    }
    await saveEcState(env, conversationId, { step: 'waiting_amount', gameAccountId: inputId })
    await sendChatwootMessage(env, accountId, conversationId,
      `✅ アカウントID: **${inputId}**\n\nご希望の入金額を選択してください。`,
      [
        { title: '💰 ¥10,000 〜 ¥100,000', value: 'ec_amount_range_1' },
        { title: '💰 ¥110,000 〜 ¥200,000', value: 'ec_amount_range_2' },
        { title: '↩️ キャンセル', value: 'welcome_message' }
      ]
    )
    return { success: true, action: 'ec_account_id_set', gameAccountId: inputId }
  }

  // Step B: 金額選択 → VPSに送信（gameAccountIdをKVから取得）
  if (messageText.startsWith('ec_amount_') && !messageText.includes('range')) {
    const amount = parseInt(messageText.replace('ec_amount_', ''))
    if (amount >= 10000 && amount <= 200000 && amount % 10000 === 0) {
      const state = await getEcState(env, conversationId)
      const gameAccountId = state?.gameAccountId || ''
      if (!gameAccountId) {
        // アカウントID未入力 → 最初からやり直し
        await saveEcState(env, conversationId, { step: 'waiting_account_id' })
        await sendChatwootMessage(env, accountId, conversationId,
          '🏪 コンビニ入金\n\nまず、**スロット天国のアカウントID**を入力してください。\n\n例: syt2525m, riv3633, hiromu',
          null
        )
        return { success: true, action: 'ec_need_account_id' }
      }
      // KVにamountも保存（コールバック時に使用）
      await saveEcState(env, conversationId, { step: 'processing', gameAccountId, amount })
      await sendChatwootMessage(env, accountId, conversationId,
        `✅ **入金申請受付完了**\n\n💰 **金額**: ¥${amount.toLocaleString()}\n🆔 **アカウント**: ${gameAccountId}\n\n⏳ **決済番号発行中...**\n約10分程度お時間をいただきます。\n発行完了次第、こちらのチャットにてお知らせいたします。`,
        null
      )
      const result = await handoffToEcBot(env, accountId, conversationId, contactName, amount)
      return { success: !!result, action: 'ec_deposit', amount, gameAccountId }
    }
  }

  // 5. 通常メニュー処理
  const messageConfig = messages[messageText]

  if (!messageConfig) {
    // メニューキーに一致しない → 会話ステータスチェック
    const isHandled = await isConversationHandledByAgent(env, accountId, conversationId)
    if (isHandled) {
      return { success: true, skipped: true, reason: 'handled_by_agent' }
    }

    // Pattern A: AI Gateway フォールバック
    // AgentBot のメニューにマッチしない自由テキスト入力 → AI Gateway に委譲
    // EC フロー等の状態管理中は既に上位で処理済みなのでここには来ない
    let nativeTypingOk = false
    let typingTimer = null
    try {
      // λ4: Chatwoot ネイティブ typing indicator を優先。失敗時は 500ms 遅延メッセージにフォールバック
      nativeTypingOk = await setTypingStatus(conversationId, env, true)
      if (!nativeTypingOk) {
        typingTimer = setTimeout(() => {
          sendChatwootMessage(env, accountId, conversationId, '💭 少々お待ちください...', null).catch(() => {})
        }, 500)
      }
      // ο: forward last messages from Chatwoot for AI context continuity
      let history = []
      try {
        if (env.CHATWOOT_API_TOKEN && env.CHATWOOT_BASE_URL) {
          const r = await fetch(`${env.CHATWOOT_BASE_URL.replace(/\/$/, '')}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`, {
            headers: { 'api_access_token': env.CHATWOOT_API_TOKEN },
          })
          if (r.ok) {
            const j = await r.json()
            const arr = Array.isArray(j?.payload) ? j.payload : (Array.isArray(j) ? j : [])
            history = arr.slice(-10).map(m => ({
              role: m.message_type === 0 ? 'user' : 'assistant',
              content: typeof m.content === 'string' ? m.content.slice(0, 1000) : '',
            })).filter(m => m.content)
          }
        }
      } catch (_) { /* best effort */ }
      const aiResult = await aiFallback(messageText, conversationId, env, history, contactId)
      if (typingTimer) { clearTimeout(typingTimer); typingTimer = null }
      if (nativeTypingOk) { await setTypingStatus(conversationId, env, false).catch(() => {}); nativeTypingOk = false }

      // ο: aiFallback may return either a string (legacy) or {__escalate, reply} (escalation).
      if (aiResult && typeof aiResult === 'object' && aiResult.__escalate) {
        // Send escalation reply WITHOUT menu buttons — operator handles from here.
        await sendChatwootMessage(env, accountId, conversationId, aiResult.reply || AI_FALLBACK_MESSAGE, null)
        await logError(env, 'ai_escalated', { conversationId, userMessage: messageText.slice(0, 100) })
        return { success: true, action: 'ai_escalation' }
      }

      // ρ-Cπ6: tolerate unknown object shapes — try .reply / .response before dropping
      let aiReply = null
      if (typeof aiResult === 'string') {
        aiReply = aiResult
      } else if (aiResult && typeof aiResult === 'object') {
        aiReply = aiResult.reply || aiResult.response || null
        if (!aiReply) console.warn('[aiFallback] unrecognized object shape, keys:', Object.keys(aiResult).join(','))
      }
      if (aiReply) {
        await sendChatwootMessage(env, accountId, conversationId, aiReply, [
          { title: '✅ 解決した', value: 'ai_resolved' },
          { title: '🙋 オペレーター呼出', value: 'escalate_human' },
          { title: '📋 メインメニュー', value: 'main_menu' },
        ])
        await logError(env, 'ai_reply_sent', { conversationId, userMessage: messageText.slice(0, 100) })
        return { success: true, action: 'ai_fallback_reply' }
      }
    } catch (e) {
      await logError(env, 'ai_fallback_error', { conversationId, error: e.message })
    } finally {
      // ο: typing indicator cleanup on ALL paths (success, escalate, exception)
      if (typingTimer) { try { clearTimeout(typingTimer) } catch (_) {} }
      if (nativeTypingOk) { try { await setTypingStatus(conversationId, env, false) } catch (_) {} }
    }

    // デフォルト: ウェルカムメニュー
    const welcomeConfig = messages.welcome_message
    await sendChatwootMessage(env, accountId, conversationId, welcomeConfig.content, welcomeConfig.items)
    return { success: true, action: 'welcome_message' }
  }

  // 6. GAS BOTハンドオフ分岐（GAS BOTが自分でメッセージを送るので、Workerからは送らない）
  // skipped: true を返してAgent Botプロトコルの空レスポンスにする
  if (messageConfig.handoff_to_gasbot) {
    await handoffToGasBot(env, accountId, conversationId, messageConfig.payment_method, contactName)
    return { success: true, skipped: true, reason: 'gasbot_handoff' }
  }

  if (messageConfig.handoff_to_bank_bot) {
    await handoffToBankBot(env, accountId, conversationId, contactName, contactId)
    return { success: true, skipped: true, reason: 'bank_bot_handoff' }
  }

  // 6.5. EC入金開始（アカウントID入力待ち状態をKVに保存）
  if (messageConfig.ec_start) {
    await saveEcState(env, conversationId, { step: 'waiting_account_id' })
    await sendChatwootMessage(env, accountId, conversationId, messageConfig.content, messageConfig.items)
    return { success: true, action: 'ec_start' }
  }

  // 7. エージェント転送フラグ付きメッセージ
  if (messageConfig.transfer_to_agent) {
    await sendChatwootMessage(env, accountId, conversationId, messageConfig.content, messageConfig.items)
    await transferToAgent(env, accountId, conversationId)
    return { success: true, action: 'message_then_transfer' }
  }

  // 8. 通常メッセージ送信
  await sendChatwootMessage(env, accountId, conversationId, messageConfig.content, messageConfig.items)
  return { success: true, action: 'message_sent', key: messageText }
}
