// ============================================================================
// GAS Webhook 連携（4つの外部サービス）
// ============================================================================

import { transferToAgent } from './chatwoot-api.js'

// KV優先でGAS URLを取得（KV → env fallback）
export async function getGasUrls(env) {
  try {
    const raw = await env.CHATWOOT_KV.get('gas-urls')
    if (raw) {
      const saved = JSON.parse(raw)
      return {
        BONUS_CODE_WEBHOOK_URL: saved.BONUS_CODE_WEBHOOK_URL || env.BONUS_CODE_WEBHOOK_URL || '',
        GAS_BOT_WEBHOOK_URL: saved.GAS_BOT_WEBHOOK_URL || env.GAS_BOT_WEBHOOK_URL || '',
        BANK_TRANSFER_BOT_WEBHOOK_URL: saved.BANK_TRANSFER_BOT_WEBHOOK_URL || env.BANK_TRANSFER_BOT_WEBHOOK_URL || '',
        EC_DEPOSIT_BOT_WEBHOOK_URL: saved.EC_DEPOSIT_BOT_WEBHOOK_URL || env.EC_DEPOSIT_BOT_WEBHOOK_URL || '',
      }
    }
  } catch (e) { /* KV読込失敗時はenv fallback */ }
  return {
    BONUS_CODE_WEBHOOK_URL: env.BONUS_CODE_WEBHOOK_URL || '',
    GAS_BOT_WEBHOOK_URL: env.GAS_BOT_WEBHOOK_URL || '',
    BANK_TRANSFER_BOT_WEBHOOK_URL: env.BANK_TRANSFER_BOT_WEBHOOK_URL || '',
    EC_DEPOSIT_BOT_WEBHOOK_URL: env.EC_DEPOSIT_BOT_WEBHOOK_URL || '',
  }
}

// ボーナスコードをスプレッドシートに記録（全種類共通）
export async function recordBonusCode(env, conversationId, userName, bonusCode, bonusType, extra = {}) {
  const gasUrls = await getGasUrls(env)
  const webhookUrl = gasUrls.BONUS_CODE_WEBHOOK_URL
  if (!webhookUrl) {
    console.error('BONUS_CODE_WEBHOOK_URL is not configured')
    return { success: false, message: 'webhook_url_not_configured' }
  }
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userName,
        conversationId,
        bonusCode,
        bonusType,
        ...extra
      })
    })

    if (!response.ok) {
      console.error('Record bonus code error:', response.status)
      return { success: false }
    }

    return await response.json()
  } catch (error) {
    console.error('Record bonus code error:', error.message)
    return { success: false, message: error.message }
  }
}

// GAS BOTへの引き渡し（PayPay入金フロー用）
export async function handoffToGasBot(env, accountId, conversationId, paymentMethod, contactName) {
  const gasUrls = await getGasUrls(env)
  const webhookUrl = gasUrls.GAS_BOT_WEBHOOK_URL
  if (!webhookUrl) {
    console.error('GAS_BOT_WEBHOOK_URL is not configured')
    await transferToAgent(env, accountId, conversationId)
    return { ok: false, reason: 'url_not_configured' }
  }
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'handoff',
        conversation_id: conversationId,
        payment_method: paymentMethod,
        contact_name: contactName || ''
      })
    })

    const status = response.status
    let bodyText = ''
    try { bodyText = await response.text() } catch (e) { bodyText = '(read failed)' }

    if (!response.ok) {
      console.error('GAS BOT handoff error:', status, bodyText)
      await transferToAgent(env, accountId, conversationId)
      return { ok: false, reason: 'http_error', status, body: bodyText }
    }

    return { ok: true, status, body: bodyText }
  } catch (error) {
    console.error('GAS BOT handoff error:', error.message)
    await transferToAgent(env, accountId, conversationId)
    return { ok: false, reason: 'fetch_error', message: error.message }
  }
}

// GAS BOTへの引き渡し（銀行振込入金フロー用）
export async function handoffToBankBot(env, accountId, conversationId, contactName, contactId) {
  const gasUrls = await getGasUrls(env)
  const webhookUrl = gasUrls.BANK_TRANSFER_BOT_WEBHOOK_URL
  if (!webhookUrl) {
    console.error('BANK_TRANSFER_BOT_WEBHOOK_URL is not configured')
    await transferToAgent(env, accountId, conversationId)
    return false
  }
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'bank_handoff',
        conversation_id: conversationId,
        contact_name: contactName || '',
        chat_id: contactId || ''
      })
    })

    if (!response.ok) {
      console.error('Bank BOT handoff error:', response.status)
      await transferToAgent(env, accountId, conversationId)
      return false
    }

    return true
  } catch (error) {
    console.error('Bank BOT handoff error:', error.message)
    await transferToAgent(env, accountId, conversationId)
    return false
  }
}

// VPS EC入金サーバーへの引き渡し（コンビニ入金フロー用）
// VPS: http://109.199.100.85:3001/ec-order
export async function handoffToEcBot(env, accountId, conversationId, contactName, amount = 0) {
  const gasUrls = await getGasUrls(env)
  const webhookUrl = gasUrls.EC_DEPOSIT_BOT_WEBHOOK_URL
  if (!webhookUrl) {
    console.error('EC_DEPOSIT_BOT_WEBHOOK_URL is not configured')
    await transferToAgent(env, accountId, conversationId)
    return false
  }

  // コールバックURL（VPSが決済番号をPOSTする先）
  const callbackUrl = 'https://chatwoot-bot.rcc-aoki.workers.dev/api/ec-callback'

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amount,
        conversationId: conversationId,
        accountId: parseInt(accountId) || 3,
        callbackUrl: callbackUrl
      })
    })

    if (!response.ok) {
      console.error('EC BOT handoff error:', response.status)
      await transferToAgent(env, accountId, conversationId)
      return false
    }

    return true
  } catch (error) {
    console.error('EC BOT handoff error:', error.message)
    await transferToAgent(env, accountId, conversationId)
    return false
  }
}
