// ============================================================================
// Chatwoot API 呼び出し（axios → fetch 移植）
// ============================================================================

// Chatwootにメッセージ送信（input_select対応）
export async function sendChatwootMessage(env, accountId, conversationId, content, items) {
  const payload = {
    content,
    message_type: 'outgoing'
  }

  if (items && items.length > 0) {
    payload.content_type = 'input_select'
    payload.content_attributes = { items }
  }

  try {
    const response = await fetch(
      `${env.CHATWOOT_BASE_URL}/api/v1/accounts/${accountId}/conversations/${conversationId}/messages`,
      {
        method: 'POST',
        headers: {
          'api_access_token': env.CHATWOOT_API_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }
    )

    if (!response.ok) {
      console.error('Chatwoot send error:', response.status, await response.text())
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('Chatwoot send error:', error.message)
    return null
  }
}

// オペレーターに転送（メッセージ送信 + ステータスをopenに変更 + bot 沈黙フラグ）
// 冪等性: 直近 5 分以内に同一会話で転送済みなら、メッセージ再送・ステータス再設定をスキップ
export async function transferToAgent(env, accountId, conversationId) {
  // 冪等チェック: 既に転送済みならスキップ
  try {
    if (env.CHATWOOT_KV) {
      const last = await env.CHATWOOT_KV.get(`transferred:${conversationId}`)
      if (last && Date.now() - parseInt(last) < 5 * 60 * 1000) {
        return true  // 既に転送済み、重複送信を防止
      }
    }
  } catch (_) { /* fall through to send */ }

  // ステップ1: メッセージを送信
  await sendChatwootMessage(
    env, accountId, conversationId,
    'オペレーターにお繋ぎします。ご用件をお書きになって、そのままお待ちください。',
    null
  )

  // ステップ1.5: bot 沈黙フラグを KV に立てる（2h TTL、担当割当ての遅延対策）
  try {
    if (env.CHATWOOT_KV) {
      await env.CHATWOOT_KV.put(`transferred:${conversationId}`, String(Date.now()), { expirationTtl: 7200 })
    }
  } catch (_) { /* best effort */ }

  // ステップ2: 会話のステータスを「open」に変更
  try {
    const response = await fetch(
      `${env.CHATWOOT_BASE_URL}/api/v1/accounts/${accountId}/conversations/${conversationId}/toggle_status`,
      {
        method: 'POST',
        headers: {
          'api_access_token': env.CHATWOOT_API_TOKEN,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: 'open' })
      }
    )

    if (!response.ok) {
      console.error('Toggle status error:', response.status, await response.text())
      return false
    }

    return true
  } catch (error) {
    console.error('Toggle status error:', error.message)
    return false
  }
}

// 会話ステータスチェック（GAS BOT/オペレーター対応中か判定）
export async function isConversationHandledByAgent(env, accountId, conversationId) {
  try {
    const response = await fetch(
      `${env.CHATWOOT_BASE_URL}/api/v1/accounts/${accountId}/conversations/${conversationId}`,
      {
        method: 'GET',
        headers: {
          'api_access_token': env.CHATWOOT_API_TOKEN,
          'Content-Type': 'application/json'
        }
      }
    )

    if (!response.ok) {
      console.error('Status check error:', response.status)
      return false
    }

    const data = await response.json()
    // Bot should stay silent ONLY when a human operator is actively handling.
    // Conditions:
    //   - status === 'open' AND
    //   - someone is explicitly assigned (meta.assignee.id)
    // open + unassigned = still a bot-handling candidate.
    const isOpen = data.status === 'open'
    const assigneeId = data?.meta?.assignee?.id || null
    return isOpen && !!assigneeId
  } catch (error) {
    console.error('Status check error:', error.message)
    return false
  }
}
