// ============================================
// Sloten AI CS — 感情エンジン統合ガイド
// emotion-integration.mjs
// ============================================
//
// ai-chat-handler.mjs への統合差分を示すファイル。
// 実際のコード変更箇所を明示。
//
// ============================================


// ============================================
// 変更1: import追加（ai-chat-handler.mjs 冒頭）
// ============================================

/*
--- ai-chat-handler.mjs の先頭に追加 ---

import {
  analyzeEmotion,
  adjustTone,
  buildEmotionPromptInjection,
  processEmotion,
  EmotionTracker,
} from './emotion-engine.mjs';
*/


// ============================================
// 変更2: handleAIChatV2() への統合
// ============================================
//
// 以下は ai-chat-handler.mjs の handleAIChatV2() 内の
// Step 3 と Step 4 の間に挿入する変更。
//
// 既存コードへの影響を最小限にするため、
// 感情分析は既存のフローに「追加」する形で統合。

/**
 * handleAIChatV2() 内の変更箇所を示す擬似コード:
 *
 * === 既存Step 3: エスカレーション検知の後 ===
 *
 * 【追加】Step 3.5: 感情分析＋トラッキング
 */

// --- ここから統合コード（handleAIChatV2内に追加） ---

/*

  // ============================================
  // Step 3.5: 感情分析＋セッショントラッキング
  // ============================================
  const emotionContext = processEmotion(cleanMessage, '', conversationHistory);
  const emotionResult = emotionContext.emotion;

  console.log(`[handleAIChatV2] 感情分析: ${emotionResult.emotion} (score=${emotionResult.score}, matches=${emotionResult.matches.join(',')})`);

  // --- 連続怒り検知 → 自動エスカレーション提案 ---
  if (emotionContext.shouldEscalate) {
    console.log(`[handleAIChatV2] 自動エスカレーション: reason=${emotionContext.escalationReason}`);

    await recordAIStats(env, {
      model: 'emotion-escalation',
      intent: `auto_escalation_${emotionContext.escalationReason}`,
      escalated: true,
      responseTimeMs: Date.now() - startTime,
      inputLength: cleanMessage.length,
      filtered: false,
    });

    return new Response(JSON.stringify({
      reply: emotionContext.escalationMessage,
      language: detectedLang,
      type: 'auto_escalation',
      reason: emotionContext.escalationReason,
      priority: 'high',
      escalate: true,
      model: 'emotion-tracker',
      emotion: {
        detected: emotionResult.emotion,
        score: emotionResult.score,
        tracker: emotionContext.trackerSummary,
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

*/


// --- Step 4 の変更: systemPrompt に感情指示を注入 ---

/*

  // ============================================
  // Step 4: Gemini API呼び出し（感情指示注入済み）
  // ============================================

  // 既存の怒り検知ロジック (isAngry) は感情エンジンに統合
  // ↓ この行を変更:
  // (旧) if (isAngry) { systemPrompt += angryInstruction; }
  // (新) 感情分析結果をプロンプトに注入

  // --- 感情指示をシステムプロンプトに注入 ---
  systemPrompt = buildEmotionPromptInjection(emotionResult, systemPrompt);

  const aiResult = await callAIWithFallback(env, systemPrompt, cleanMessage, conversationHistory);

*/


// --- Step 5 の変更: 出力フィルタの前にトーン調整を追加 ---

/*

  // ============================================
  // Step 5: トーン調整 + 出力フィルタ
  // ============================================

  // 5a. トーン調整（感情ベース）
  const toneResult = adjustTone(emotionResult, aiResult.text);
  const toneAdjustedText = toneResult.response;

  // 5b. 出力フィルタ（既存の禁止回答チェック — トーン調整後に適用）
  const filterResult = filterOutput(toneAdjustedText);
  const finalResponse = filterResult.response;
  const wasFiltered = !filterResult.safe;

*/


// --- Step 6 の変更: レスポンスに感情データを追加 ---

/*

  // ============================================
  // Step 6: レスポンス返却（感情データ付き）
  // ============================================

  return new Response(JSON.stringify({
    reply: finalResponse,
    language: detectedLang,
    type: emotionResult.emotion === 'angry' ? 'angry_customer' : 'ai_response',
    model: aiResult.model,
    fallback: aiResult.fallback,
    filtered: wasFiltered,
    ...(wasFiltered && { filteredCategory: filterResult.blockedCategory }),
    truncated,
    responseTimeMs,
    // --- 感情分析データ（新規追加） ---
    emotion: {
      detected: emotionResult.emotion,
      score: emotionResult.score,
      secondary: emotionResult.secondary,
      toneAdjusted: toneResult.toneAdjusted,
      toneAdjustment: toneResult.adjustment,
    },
    ...(emotionResult.emotion === 'angry' && { anger_detected: true }),
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });

*/


// ============================================
// 変更3: conversation_history に感情データを付与
// ============================================
//
// フロントエンド側で conversation_history に emotion を保存する:
//
// ```javascript
// // フロントエンド（チャットUI）側
// const response = await fetch('/api/ai/chat', { ... });
// const data = await response.json();
//
// // 会話履歴に感情データを保存
// conversationHistory.push({
//   role: 'user',
//   content: userMessage,
//   emotion: data.emotion,  // { detected, score, secondary }
// });
// conversationHistory.push({
//   role: 'assistant',
//   content: data.reply,
// });
// ```
//
// これにより次回リクエスト時に EmotionTracker が履歴から
// 感情トレンドを復元し、連続怒り検知が機能する。


// ============================================
// 変更4: 管理API追加（/api/ai/status に感情統計を追加）
// ============================================

/*

// handleAIStatus() に追加:
// ai_statsテーブルから感情関連の統計を取得

const emotionStats = await env.DB.prepare(`
  SELECT intent, COUNT(*) as count
  FROM ai_stats
  WHERE date = ? AND intent LIKE 'auto_escalation_%'
  GROUP BY intent
`).bind(today).all();

// レスポンスに追加:
// emotion_escalations: emotionStats.results || []

*/


// ============================================
// 完全統合版 handleAIChatV2（差し替え用）
// ============================================
//
// 以下は、感情エンジンを完全統合した handleAIChatV2 の全体像。
// ai-chat-handler.mjs の既存 handleAIChatV2 をこれに差し替える。

import {
  analyzeEmotion,
  adjustTone,
  buildEmotionPromptInjection,
  processEmotion,
  EmotionTracker,
} from './emotion-engine.mjs';

/**
 * 感情エンジン統合版 handleAIChatV2
 * （元のhandleAIChatV2に感情分析を統合した完全版）
 */
export async function handleAIChatV2_withEmotion(request, env, corsHeaders, brand = null) {
  // --- 以下の関数は ai-chat-handler.mjs から利用 ---
  // isAIEnabled, sanitizeInput, detectLanguage, detectEscalation,
  // detectEscalationEN, getEscalationResponseEN, buildLocalizedContext,
  // buildSystemPrompt, callAIWithFallback, filterOutput, recordAIStats

  const startTime = Date.now();

  // --- リクエストパース ---
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const { message, conversation_id, user_id, conversation_history: conversationHistory = [] } = body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return new Response(JSON.stringify({ error: 'メッセージが空です' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  const userMessage = message.trim();

  // Step 0: フィーチャーフラグ
  // const aiEnabled = await isAIEnabled(env);
  // if (!aiEnabled) return null;

  // Step 1: ボーナスコード照合（既存ロジック維持 — 省略）

  // Step 2: 入力サニタイズ（既存ロジック維持 — 省略）
  // const { sanitized: cleanMessage, truncated, injectionDetected } = sanitizeInput(userMessage);
  const cleanMessage = userMessage; // 簡略化（実際はsanitizeInputを使用）

  // Step 3: 言語検知 + RG/エスカレーション検知（既存ロジック維持 — 省略）
  // const detectedLang = detectLanguage(cleanMessage);
  // const escalation = detectEscalation(cleanMessage);
  // if (escalation.escalate) { ... }
  const detectedLang = 'ja';

  // ======================================================
  // Step 3.5: 🆕 感情分析＋セッショントラッキング
  // ======================================================
  const emotionResult = analyzeEmotion(cleanMessage);

  console.log(`[Emotion] detected=${emotionResult.emotion} score=${emotionResult.score} matches=[${emotionResult.matches.join(', ')}]`);

  // --- セッション感情トラッキング（連続怒り検知） ---
  const tracker = new EmotionTracker();
  // conversation_historyにemotionフィールドがあれば復元
  tracker.restoreFromHistory(conversationHistory);
  const trackResult = tracker.track(emotionResult);

  // --- 連続怒り → 自動エスカレーション ---
  if (trackResult.shouldEscalate) {
    const escalationMsg = EmotionTracker.getEscalationMessage(trackResult.reason);

    console.log(`[Emotion] 自動エスカレーション: reason=${trackResult.reason}, consecutiveAngry=${trackResult.consecutiveAngry}`);

    // await recordAIStats(env, { ... });

    return new Response(JSON.stringify({
      reply: escalationMsg,
      language: detectedLang,
      type: 'auto_escalation',
      reason: trackResult.reason,
      priority: 'high',
      escalate: true,
      model: 'emotion-tracker',
      emotion: {
        detected: emotionResult.emotion,
        score: emotionResult.score,
        secondary: emotionResult.secondary,
        tracker: tracker.getSummary(),
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  // ======================================================
  // Step 4: Gemini API呼び出し（感情指示注入済み）
  // ======================================================

  // 多言語対応プロンプト構築（既存ロジック）
  let systemPrompt = '（既存のシステムプロンプト）'; // 実際: await buildSystemPrompt(env, brand);

  // 🆕 感情指示をシステムプロンプトに注入
  systemPrompt = buildEmotionPromptInjection(emotionResult, systemPrompt);

  // const aiResult = await callAIWithFallback(env, systemPrompt, cleanMessage, conversationHistory);
  const aiResult = { text: '（Geminiの応答）', model: 'gemini-2.5-flash-lite', fallback: false }; // プレースホルダー

  // ======================================================
  // Step 5: 🆕 トーン調整 + 出力フィルタ
  // ======================================================

  // 5a. 感情ベースのトーン調整
  const toneResult = adjustTone(emotionResult, aiResult.text);

  // 5b. 出力フィルタ（既存の禁止回答チェック）
  // const filterResult = filterOutput(toneResult.response);
  const finalResponse = toneResult.response;

  // ======================================================
  // Step 6: レスポンス返却（感情データ付き）
  // ======================================================
  const responseTimeMs = Date.now() - startTime;

  return new Response(JSON.stringify({
    reply: finalResponse,
    language: detectedLang,
    type: emotionResult.emotion === 'angry' ? 'angry_customer' : 'ai_response',
    model: aiResult.model,
    fallback: aiResult.fallback,
    responseTimeMs,
    // 🆕 感情分析データ
    emotion: {
      detected: emotionResult.emotion,
      score: emotionResult.score,
      secondary: emotionResult.secondary,
      matches: emotionResult.matches,
      toneAdjusted: toneResult.toneAdjusted,
      toneAdjustment: toneResult.adjustment,
      trend: trackResult.emotionTrend,
      consecutiveAngry: trackResult.consecutiveAngry,
    },
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}
