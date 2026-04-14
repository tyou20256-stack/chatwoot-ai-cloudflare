// ============================================================
// Sloten AI CS — エスカレーション機能
// src/escalation.mjs
// Generated: 2026-04-13
//
// ■ 機能:
//   1. handleEscalation() — エスカレーション発生時の処理
//   2. AIサマリー自動生成
//   3. D1 escalation_queue への登録
//   4. Telegram管理者通知（オプション）
//   5. 自動トリガー（3回連続不満足検知）
//   6. 管理画面API（一覧/更新/統計）
//
// ■ 統合手順:
//   1. このファイルを src/escalation.mjs として配置
//   2. ai-cs-core.mjs から import して使用
//   3. migration-escalation.sql を D1 に実行
//   4. wrangler.toml に TELEGRAM_BOT_TOKEN / TELEGRAM_ADMIN_CHAT_ID を追加（オプション）
// ============================================================


// --- 理由 → 優先度マッピング ---
const REASON_PRIORITY_MAP = {
  rg_concern: 'critical',    // 依存症兆候は最優先
  anger: 'high',             // 怒りは高優先
  human_request: 'normal',   // ユーザー要望は通常
  unresolved: 'normal',      // 自動トリガーは通常
};

// --- 不満足回答パターン（自動トリガー検知用） ---
const UNRESOLVED_PATTERNS = [
  /確認いたします/,
  /お答えできません/,
  /お待ちください/,
  /担当.*確認/,
  /わかりかねます/,
  /対応できかねます/,
  /申し訳ございません.*お答え/,
  /情報.*持ち合わせ/,
];


// ============================================================
// コア: エスカレーション処理
// ============================================================

/**
 * エスカレーション発生時のメイン処理
 *
 * @param {Object} env - Cloudflare Workers env (DB, GEMINI_API_KEY, etc.)
 * @param {string} sessionId - チャットセッションID
 * @param {string} reason - エスカレーション理由 ('rg_concern' | 'human_request' | 'anger' | 'unresolved')
 * @param {string} userMessage - ユーザーの最新メッセージ
 * @param {Array} conversationHistory - 会話履歴 [{role, content}, ...]
 * @returns {Object} { escalationId, userResponse }
 */
export async function handleEscalation(env, sessionId, reason, userMessage, conversationHistory = []) {
  const priority = REASON_PRIORITY_MAP[reason] || 'normal';

  // 1. AIが会話サマリーを自動生成
  const aiSummary = await generateEscalationSummary(env, reason, userMessage, conversationHistory);

  // 2. D1のescalation_queueテーブルに登録
  const escalationId = await insertEscalation(env, {
    sessionId,
    reason,
    priority,
    userMessage,
    aiSummary,
    conversationHistory,
  });

  // 3. Telegram管理者グループに通知（オプション・非同期）
  // 失敗してもエスカレーション自体は成功扱い
  sendTelegramNotification(env, {
    escalationId,
    sessionId,
    reason,
    priority,
    userMessage,
    aiSummary,
  }).catch(e => console.error('[Escalation] Telegram通知失敗:', e.message));

  // 4. 自動トリガーカウンターをリセット
  await resetEscalationTracker(env, sessionId);

  // 5. ユーザー向けレスポンスを生成
  const userResponse = buildUserResponse(reason);

  return {
    escalationId,
    userResponse,
    priority,
    aiSummary,
  };
}


// ============================================================
// AIサマリー生成
// ============================================================

/**
 * Gemini を使って会話サマリーを生成
 * 失敗時はフォールバックで簡易サマリーを返す
 */
async function generateEscalationSummary(env, reason, userMessage, conversationHistory) {
  // 会話が短い場合は簡易サマリー
  if (conversationHistory.length <= 2) {
    return `[${reasonToLabel(reason)}] ユーザー発言: "${userMessage.slice(0, 200)}"`;
  }

  try {
    if (!env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY未設定');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    // 直近10メッセージをサマリー対象に
    const recentHistory = conversationHistory.slice(-10);
    const historyText = recentHistory
      .map(m => `${m.role === 'user' ? 'ユーザー' : 'AI'}: ${m.content}`)
      .join('\n');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'x-goog-api-key': env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: `あなたはカスタマーサポートのエスカレーション担当です。
以下の会話履歴を読み、人間オペレーターへの引き継ぎサマリーを日本語で作成してください。

フォーマット:
【要約】1-2文で状況を要約
【ユーザーの要望】何を求めているか
【対応状況】AIが何を回答したか
【引き継ぎ理由】${reasonToLabel(reason)}
【推奨対応】オペレーターが最初にすべきこと

200文字以内で簡潔に。`,
            }],
          },
          contents: [{
            role: 'user',
            parts: [{ text: `会話履歴:\n${historyText}\n\n最新メッセージ: ${userMessage}` }],
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 300,
          },
        }),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`Gemini ${response.status}`);

    const data = await response.json();
    const summary = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!summary) throw new Error('空レスポンス');

    return summary;

  } catch (e) {
    console.error('[generateEscalationSummary] 失敗:', e.message);
    // フォールバック: 簡易サマリー
    const lastMessages = conversationHistory.slice(-4)
      .map(m => `${m.role === 'user' ? 'U' : 'A'}: ${m.content.slice(0, 80)}`)
      .join(' | ');
    return `[${reasonToLabel(reason)}] 最新: "${userMessage.slice(0, 100)}" / 履歴: ${lastMessages}`;
  }
}


// ============================================================
// D1操作
// ============================================================

/**
 * escalation_queue にレコードを挿入
 */
async function insertEscalation(env, { sessionId, reason, priority, userMessage, aiSummary, conversationHistory }) {
  try {
    const result = await env.DB.prepare(`
      INSERT INTO escalation_queue (session_id, reason, priority, user_message, ai_summary, conversation_history, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'pending', datetime('now'))
    `).bind(
      sessionId,
      reason,
      priority,
      userMessage,
      aiSummary,
      JSON.stringify(conversationHistory.slice(-20)), // 直近20メッセージを保存
    ).run();

    // D1 の .run() が返す meta.last_row_id を使用（並行挿入でも安全）
    const id = result?.meta?.last_row_id;
    return typeof id === 'number' ? id : null;

  } catch (e) {
    console.error('[insertEscalation] D1エラー:', e.message);
    return null;
  }
}

/**
 * 自動トリガー: 連続不満足カウンターを更新
 * @returns {boolean} true = 自動エスカレーション閾値に到達
 */
export async function trackUnresolvedResponse(env, sessionId, aiResponse) {
  // AI回答が不満足パターンに一致するか
  const isUnresolved = UNRESOLVED_PATTERNS.some(p => p.test(aiResponse));

  if (!isUnresolved) {
    // 解決済み → カウンターリセット
    await resetEscalationTracker(env, sessionId);
    return false;
  }

  try {
    // UPSERT: カウンターを+1
    await env.DB.prepare(`
      INSERT INTO escalation_tracker (session_id, consecutive_unresolved, last_updated)
      VALUES (?, 1, datetime('now'))
      ON CONFLICT(session_id) DO UPDATE SET
        consecutive_unresolved = consecutive_unresolved + 1,
        last_updated = datetime('now')
    `).bind(sessionId).run();

    // 現在のカウントを取得
    const row = await env.DB.prepare(
      'SELECT consecutive_unresolved FROM escalation_tracker WHERE session_id = ?'
    ).bind(sessionId).first();

    const count = row?.consecutive_unresolved || 0;

    // 3回連続で閾値到達
    if (count >= 3) {
      console.log(`[AutoEscalation] session=${sessionId} が ${count}回連続不満足 → 自動エスカレーション`);
      return true;
    }

    return false;

  } catch (e) {
    console.error('[trackUnresolvedResponse] D1エラー:', e.message);
    return false;
  }
}

/**
 * エスカレーショントラッカーをリセット
 */
async function resetEscalationTracker(env, sessionId) {
  try {
    await env.DB.prepare(
      'DELETE FROM escalation_tracker WHERE session_id = ?'
    ).bind(sessionId).run();
  } catch (e) {
    console.error('[resetEscalationTracker] D1エラー:', e.message);
  }
}


// ============================================================
// Telegram管理者通知
// ============================================================

/**
 * Telegram Bot APIで管理者グループに通知
 * env.TELEGRAM_BOT_TOKEN と env.TELEGRAM_ADMIN_CHAT_ID が必要
 */
async function sendTelegramNotification(env, { escalationId, sessionId, reason, priority, userMessage, aiSummary }) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_ADMIN_CHAT_ID) {
    console.log('[Telegram通知] BOT_TOKEN or ADMIN_CHAT_ID 未設定 → スキップ');
    return;
  }

  const priorityEmoji = {
    critical: '🔴',
    high: '🟠',
    normal: '🟡',
  };

  const text = `${priorityEmoji[priority] || '⚪'} *エスカレーション #${escalationId || '?'}*

📋 *理由:* ${reasonToLabel(reason)}
⚡ *優先度:* ${priority.toUpperCase()}
💬 *セッション:* \`${sessionId || '不明'}\`

📩 *ユーザー発言:*
${escapeMarkdown(userMessage?.slice(0, 300) || '(なし)')}

📝 *AIサマリー:*
${escapeMarkdown(aiSummary?.slice(0, 500) || '(生成失敗)')}

🔗 管理画面で対応してください。`;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_ADMIN_CHAT_ID,
          text,
          parse_mode: 'Markdown',
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text().catch(() => 'unknown');
      throw new Error(`Telegram API ${response.status}: ${err.slice(0, 200)}`);
    }

    console.log(`[Telegram通知] エスカレーション #${escalationId} 通知送信完了`);

  } catch (e) {
    console.error('[sendTelegramNotification] 失敗:', e.message);
    throw e; // 呼び出し元の .catch() で処理
  }
}

function escapeMarkdown(text) {
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, '\\$&');
}


// ============================================================
// 管理画面API エンドポイント
// ============================================================

/**
 * GET /api/escalations — エスカレーション一覧（pending優先）
 * クエリパラメータ:
 *   ?status=pending|assigned|resolved (任意)
 *   ?limit=20 (デフォルト20、最大100)
 *   ?offset=0
 */
export async function handleGetEscalations(request, env, corsHeaders) {
  const url = new URL(request.url);
  const statusFilter = url.searchParams.get('status');
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '20', 10), 100);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  try {
    let query, params;

    if (statusFilter) {
      query = `
        SELECT * FROM escalation_queue
        WHERE status = ?
        ORDER BY
          CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,
          created_at DESC
        LIMIT ? OFFSET ?
      `;
      params = [statusFilter, limit, offset];
    } else {
      query = `
        SELECT * FROM escalation_queue
        ORDER BY
          CASE status WHEN 'pending' THEN 0 WHEN 'assigned' THEN 1 ELSE 2 END,
          CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END,
          created_at DESC
        LIMIT ? OFFSET ?
      `;
      params = [limit, offset];
    }

    const { results } = await env.DB.prepare(query).bind(...params).all();

    // 総件数
    let countQuery, countParams;
    if (statusFilter) {
      countQuery = 'SELECT COUNT(*) as total FROM escalation_queue WHERE status = ?';
      countParams = [statusFilter];
    } else {
      countQuery = 'SELECT COUNT(*) as total FROM escalation_queue';
      countParams = [];
    }
    const countRow = await env.DB.prepare(countQuery).bind(...countParams).first();

    return new Response(JSON.stringify({
      escalations: results || [],
      total: countRow?.total || 0,
      limit,
      offset,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
    });

  } catch (e) {
    console.error('[handleGetEscalations] D1エラー:', e.message);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}

/**
 * PUT /api/escalations/:id — ステータス更新
 * ボディ: { "status": "assigned"|"resolved", "assigned_to": "name", "resolution_note": "..." }
 */
export async function handleUpdateEscalation(request, env, corsHeaders, escalationId) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const { status, assigned_to, resolution_note } = body;

  // バリデーション
  const validStatuses = ['pending', 'assigned', 'resolved'];
  if (status && !validStatuses.includes(status)) {
    return new Response(JSON.stringify({ error: `Invalid status. Must be: ${validStatuses.join(', ')}` }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  try {
    // 既存レコード確認
    const existing = await env.DB.prepare(
      'SELECT * FROM escalation_queue WHERE id = ?'
    ).bind(escalationId).first();

    if (!existing) {
      return new Response(JSON.stringify({ error: 'Escalation not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    // 更新
    const newStatus = status || existing.status;
    const newAssignedTo = assigned_to || existing.assigned_to;
    const newNote = resolution_note || existing.resolution_note;
    const resolvedAt = newStatus === 'resolved' ? "datetime('now')" : null;

    if (newStatus === 'resolved') {
      await env.DB.prepare(`
        UPDATE escalation_queue
        SET status = ?, assigned_to = ?, resolution_note = ?, resolved_at = datetime('now')
        WHERE id = ?
      `).bind(newStatus, newAssignedTo, newNote, escalationId).run();
    } else {
      await env.DB.prepare(`
        UPDATE escalation_queue
        SET status = ?, assigned_to = ?, resolution_note = ?
        WHERE id = ?
      `).bind(newStatus, newAssignedTo, newNote, escalationId).run();
    }

    // 更新後のレコードを返す
    const updated = await env.DB.prepare(
      'SELECT * FROM escalation_queue WHERE id = ?'
    ).bind(escalationId).first();

    return new Response(JSON.stringify({
      success: true,
      escalation: updated,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
    });

  } catch (e) {
    console.error('[handleUpdateEscalation] D1エラー:', e.message);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}

/**
 * GET /api/escalations/stats — エスカレーション統計
 */
export async function handleEscalationStats(request, env, corsHeaders) {
  const today = new Date().toISOString().split('T')[0];

  try {
    // ステータス別カウント
    const { results: statusCounts } = await env.DB.prepare(`
      SELECT status, COUNT(*) as count
      FROM escalation_queue
      GROUP BY status
    `).all();

    // 本日の件数
    const todayCount = await env.DB.prepare(`
      SELECT COUNT(*) as count
      FROM escalation_queue
      WHERE created_at >= ?
    `).bind(today + 'T00:00:00').first();

    // 優先度別 pending
    const { results: pendingByPriority } = await env.DB.prepare(`
      SELECT priority, COUNT(*) as count
      FROM escalation_queue
      WHERE status = 'pending'
      GROUP BY priority
      ORDER BY CASE priority WHEN 'critical' THEN 0 WHEN 'high' THEN 1 ELSE 2 END
    `).all();

    // 理由別内訳（本日）
    const { results: reasonBreakdown } = await env.DB.prepare(`
      SELECT reason, COUNT(*) as count
      FROM escalation_queue
      WHERE created_at >= ?
      GROUP BY reason
      ORDER BY count DESC
    `).bind(today + 'T00:00:00').all();

    // 平均解決時間（過去7日）
    const avgResolution = await env.DB.prepare(`
      SELECT AVG(
        (julianday(resolved_at) - julianday(created_at)) * 24 * 60
      ) as avg_minutes
      FROM escalation_queue
      WHERE status = 'resolved'
        AND resolved_at IS NOT NULL
        AND created_at >= datetime('now', '-7 days')
    `).first();

    // pending総数
    const pendingTotal = await env.DB.prepare(
      "SELECT COUNT(*) as count FROM escalation_queue WHERE status = 'pending'"
    ).first();

    return new Response(JSON.stringify({
      date: today,
      pending_count: pendingTotal?.count || 0,
      today_count: todayCount?.count || 0,
      by_status: statusCounts || [],
      pending_by_priority: pendingByPriority || [],
      today_by_reason: reasonBreakdown || [],
      avg_resolution_minutes: Math.round(avgResolution?.avg_minutes || 0),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
    });

  } catch (e) {
    console.error('[handleEscalationStats] D1エラー:', e.message);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}


// ============================================================
// ユーティリティ
// ============================================================

/**
 * 理由コード → 日本語ラベル
 */
function reasonToLabel(reason) {
  const labels = {
    rg_concern: '依存症兆候検知（RG）',
    human_request: 'ユーザー要望（オペレーター希望）',
    anger: '強い不満・怒り検知',
    unresolved: '自動検知（3回連続未解決）',
  };
  return labels[reason] || reason;
}

/**
 * 理由に応じたユーザー向けレスポンスを生成
 */
function buildUserResponse(reason) {
  switch (reason) {
    case 'rg_concern':
      return 'お気持ちをお聞かせいただきありがとうございます。お客様のお話をしっかりとお伺いするため、専門のスタッフにお繋ぎいたします。少々お待ちくださいませ。\n\n📌 もしお急ぎの場合は、以下の相談窓口もご利用いただけます:\n・消費者ホットライン: 188\n・よりそいホットライン: 0120-279-338';

    case 'human_request':
      return 'かしこまりました。より専門的な対応が可能なオペレーターにお繋ぎいたします。これまでの会話内容は引き継がせていただきますので、少々お待ちくださいませ。';

    case 'anger':
      return 'ご不快な思いをさせてしまい、大変申し訳ございません。担当スタッフが直接ご対応させていただきます。少々お待ちくださいませ。';

    case 'unresolved':
      return 'ご質問に十分にお答えできず、申し訳ございません。より適切にご対応するため、スタッフにお繋ぎいたします。少々お待ちくださいませ。';

    default:
      return 'スタッフにお繋ぎいたします。少々お待ちくださいませ。';
  }
}


// ============================================================
// エクスポート
// ============================================================
export {
  reasonToLabel,
  buildUserResponse,
  REASON_PRIORITY_MAP,
  UNRESOLVED_PATTERNS,
};
