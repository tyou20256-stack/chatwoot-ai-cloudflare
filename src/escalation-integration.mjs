// ============================================================
// Sloten AI CS — エスカレーション統合パッチ
// ai-cs-core.mjs の handleAIChatV2() に適用する差分
// Generated: 2026-04-13
//
// ■ 適用手順:
//   1. ai-cs-core.mjs のセクションAに import を追加
//   2. handleAIChatV2() の RG/エスカレーション/怒り検知部分を置換
//   3. AI応答後に自動トリガーチェックを追加
//   4. ルーターにエスカレーションAPIを追加
// ============================================================


// ============================================================
// STEP 1: import文を追加（セクションA に追記）
// ============================================================
//
// import {
//   handleEscalation,
//   trackUnresolvedResponse,
//   handleGetEscalations,
//   handleUpdateEscalation,
//   handleEscalationStats,
// } from './escalation.mjs';


// ============================================================
// STEP 2: handleAIChatV2() 内の検知処理を置換
// ============================================================

/**
 * RG検知部分を以下に置換（セクション4: --- 4. RG キーワード検知 --- のブロック全体）
 */
async function _PATCH_rgDetection(cleanMessage, env, sessionId, conversationHistory, corsHeaders, startTime) {
  // --- 4. RG（責任あるギャンブル）キーワード検知 → エスカレーション実行 ---
  if (RG_KEYWORDS.test(cleanMessage)) {
    const escalation = await handleEscalation(
      env,
      sessionId || `anon-${Date.now()}`,
      'rg_concern',
      cleanMessage,
      conversationHistory
    );

    await recordAIStats(env, {
      model: 'escalation',
      intent: 'rg_concern',
      escalated: true,
      responseTimeMs: Date.now() - startTime,
      inputLength: cleanMessage.length,
    });

    return new Response(JSON.stringify({
      response: escalation.userResponse,
      type: 'escalation',
      reason: 'rg_concern',
      escalate: true,
      escalation_id: escalation.escalationId,
      priority: escalation.priority,
      model: 'rg-detection',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  return null;
}

/**
 * エスカレーションキーワード検知部分を以下に置換（セクション5 のブロック全体）
 */
async function _PATCH_escalationDetection(cleanMessage, env, sessionId, conversationHistory, corsHeaders, startTime) {
  // --- 5. エスカレーションキーワード検知 → エスカレーション実行 ---
  if (ESCALATION_KEYWORDS.test(cleanMessage)) {
    const escalation = await handleEscalation(
      env,
      sessionId || `anon-${Date.now()}`,
      'human_request',
      cleanMessage,
      conversationHistory
    );

    await recordAIStats(env, {
      model: 'escalation',
      intent: 'escalation',
      escalated: true,
      responseTimeMs: Date.now() - startTime,
      inputLength: cleanMessage.length,
    });

    return new Response(JSON.stringify({
      response: escalation.userResponse,
      type: 'escalation',
      reason: 'human_request',
      escalate: true,
      escalation_id: escalation.escalationId,
      priority: escalation.priority,
      model: 'escalation-detection',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  return null;
}

/**
 * 怒り検知部分の強化（セクション6 の後に追加）
 * 2回以上の怒り表現で自動エスカレーション
 */
async function _PATCH_angerEscalation(cleanMessage, conversationHistory, env, sessionId, corsHeaders, startTime) {
  if (!ANGER_PATTERNS.test(cleanMessage)) return null;

  // 会話履歴中の怒りメッセージ数をカウント
  const angerCount = conversationHistory
    .filter(m => m.role === 'user' && ANGER_PATTERNS.test(m.content))
    .length;

  // 現在のメッセージ含め2回以上 → エスカレーション
  if (angerCount + 1 >= 2) {
    const escalation = await handleEscalation(
      env,
      sessionId || `anon-${Date.now()}`,
      'anger',
      cleanMessage,
      conversationHistory
    );

    await recordAIStats(env, {
      model: 'escalation',
      intent: 'anger',
      escalated: true,
      responseTimeMs: Date.now() - startTime,
      inputLength: cleanMessage.length,
    });

    return new Response(JSON.stringify({
      response: escalation.userResponse,
      type: 'escalation',
      reason: 'anger',
      escalate: true,
      escalation_id: escalation.escalationId,
      priority: escalation.priority,
      model: 'anger-detection',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return null; // 怒りはあるが1回目 → 通常AI応答（共感付き）
}


// ============================================================
// STEP 3: AI応答後の自動トリガーチェック（セクション8と9の間に追加）
// ============================================================

/**
 * AI応答後、不満足パターンチェック → 3回連続で自動エスカレーション
 * handleAIChatV2() の出力フィルタリング後、レスポンス返却前に挿入
 */
async function _PATCH_autoEscalationCheck(finalResponse, env, sessionId, cleanMessage, conversationHistory, corsHeaders, startTime) {
  // セッションIDがない場合はスキップ
  if (!sessionId) return null;

  const shouldEscalate = await trackUnresolvedResponse(env, sessionId, finalResponse);

  if (shouldEscalate) {
    const escalation = await handleEscalation(
      env,
      sessionId,
      'unresolved',
      cleanMessage,
      conversationHistory
    );

    await recordAIStats(env, {
      model: 'escalation',
      intent: 'auto_unresolved',
      escalated: true,
      responseTimeMs: Date.now() - startTime,
      inputLength: cleanMessage.length,
    });

    // AI応答の代わりにエスカレーション応答を返す
    return new Response(JSON.stringify({
      response: escalation.userResponse,
      type: 'escalation',
      reason: 'unresolved',
      escalate: true,
      escalation_id: escalation.escalationId,
      priority: escalation.priority,
      model: 'auto-escalation',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return null; // 自動エスカレーション不要 → 通常レスポンスを返す
}


// ============================================================
// STEP 4: ルーター追加（セクションF に追記）
// ============================================================
//
// 既存の fetch ハンドラ内のルーティング部分に以下を追加:
//
// ```javascript
// // === エスカレーション管理API ===
// if (url.pathname === '/api/escalations' && request.method === 'GET') {
//   return handleGetEscalations(request, env, corsHeaders);
// }
// if (url.pathname === '/api/escalations/stats' && request.method === 'GET') {
//   return handleEscalationStats(request, env, corsHeaders);
// }
// // PUT /api/escalations/:id
// const escalationMatch = url.pathname.match(/^\/api\/escalations\/(\d+)$/);
// if (escalationMatch && request.method === 'PUT') {
//   return handleUpdateEscalation(request, env, corsHeaders, parseInt(escalationMatch[1], 10));
// }
// ```


// ============================================================
// STEP 5: handleAIChatV2 の request.json() パース後に sessionId を取得
// ============================================================
//
// 変更前:
//   const { message, conversation_history: conversationHistory = [] } = body;
//
// 変更後:
//   const { message, session_id: sessionId, conversation_history: conversationHistory = [] } = body;
//
// ※ フロントエンドから session_id を送信するよう対応が必要


// ============================================================
// STEP 6: wrangler.toml に環境変数を追加（オプション）
// ============================================================
//
// [vars]
// # Telegram管理者通知（設定しない場合は通知スキップ）
// # TELEGRAM_BOT_TOKEN = "your-bot-token"
// # TELEGRAM_ADMIN_CHAT_ID = "-1001234567890"
//
// ※ 本番ではシークレットとして設定:
// wrangler secret put TELEGRAM_BOT_TOKEN
// wrangler secret put TELEGRAM_ADMIN_CHAT_ID
