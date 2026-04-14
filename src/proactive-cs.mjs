// TODO(kv-migration): Module-level state (triggersCache) is per-isolate.
// Consider migrating to KV (see kv-cache.mjs) once async caller propagation
// can be accommodated — current sync accessors would require an adapter layer.
// Currently acceptable because this cache is per-tenant and 5-min TTL limits
// staleness exposure.
// ============================================================
// Sloten AI CS — プロアクティブCS モジュール
// src/proactive-cs.mjs
// Generated: 2026-04-13
// ============================================================
//
// ユーザーの行動コンテキストに応じて、AIが先回りして
// メッセージとクイックリプライを返す。
//
// API: GET /api/proactive?context=deposit_page_long_stay&session_id=xxx&user=xxx
// 管理: GET /api/proactive/triggers (一覧)
//       POST /api/proactive/triggers (作成/更新)
//       DELETE /api/proactive/triggers/:id
//       POST /api/proactive/log (表示/クリックログ記録)
// ============================================================

// --- キャッシュ（5分TTL） ---
let triggersCache = {};
const TRIGGERS_CACHE_TTL = 5 * 60 * 1000;

/**
 * D1からプロアクティブトリガー一覧を取得（キャッシュ付き）
 */
async function getProactiveTriggers(env, tenantId = 'tenant_default') {
  const now = Date.now();
  const cacheKey = tenantId;
  if (triggersCache[cacheKey] && (now - triggersCache[cacheKey].ts) < TRIGGERS_CACHE_TTL) {
    return triggersCache[cacheKey].data;
  }
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, trigger_key, display_name, message, quick_replies,
              condition_type, condition_params, priority,
              cooldown_hours, max_displays_per_session
       FROM proactive_triggers
       WHERE tenant_id = ? AND is_active = 1
       ORDER BY priority ASC`
    ).bind(tenantId).all();

    const parsed = (results || []).map(r => ({
      ...r,
      quick_replies: safeJsonParse(r.quick_replies, []),
      condition_params: safeJsonParse(r.condition_params, {}),
    }));

    triggersCache[cacheKey] = { data: parsed, ts: now };
    return parsed;
  } catch (e) {
    console.error('[getProactiveTriggers] D1エラー:', e.message);
    return FALLBACK_TRIGGERS;
  }
}

/**
 * プロアクティブCSフラグ確認
 */
async function isProactiveEnabled(env, tenantId = 'tenant_default') {
  try {
    const row = await env.DB.prepare(
      "SELECT config_value FROM ai_config WHERE tenant_id = ? AND config_key = 'proactive_enabled' LIMIT 1"
    ).bind(tenantId).first();
    return row?.config_value === 'true';
  } catch {
    return false;
  }
}

// ============================================================
// クールダウン判定: 同一ユーザー・同一トリガーへの重複表示を防ぐ
// ============================================================

async function checkCooldown(env, triggerId, sessionId, userIdentifier, cooldownHours) {
  try {
    const since = new Date(Date.now() - cooldownHours * 3600000).toISOString();
    const row = await env.DB.prepare(
      `SELECT COUNT(*) as cnt FROM proactive_trigger_log
       WHERE trigger_id = ? AND (session_id = ? OR user_identifier = ?)
       AND action = 'displayed' AND created_at > ?`
    ).bind(triggerId, sessionId, userIdentifier || '', since).first();
    return (row?.cnt || 0) > 0; // true = クールダウン中（表示しない）
  } catch {
    return false; // エラー時は表示許可（安全側）
  }
}

// ============================================================
// メインAPI: GET /api/proactive
// クエリパラメータ:
//   context: トリガーキー (deposit_page_long_stay etc.)
//   session_id: チャットセッションID
//   user: ユーザー名（任意）
//   page: 現在のページURL（任意）
//   dwell_seconds: ページ滞在秒数（任意）
// ============================================================

export async function handleProactiveCheck(request, env, corsHeaders) {
  const url = new URL(request.url);
  const context = url.searchParams.get('context');
  const sessionId = url.searchParams.get('session_id') || 'anonymous';
  const userIdentifier = url.searchParams.get('user') || null;
  const page = url.searchParams.get('page') || '';
  const dwellSeconds = parseInt(url.searchParams.get('dwell_seconds') || '0', 10);
  const tenantId = url.searchParams.get('tenant') || 'tenant_default';

  // プロアクティブCS無効チェック
  const enabled = await isProactiveEnabled(env, tenantId);
  if (!enabled) {
    return jsonResponse({ proactive: false, reason: 'disabled' }, corsHeaders);
  }

  const triggers = await getProactiveTriggers(env, tenantId);

  // context指定あり → そのトリガーのみ検索
  if (context) {
    const trigger = triggers.find(t => t.trigger_key === context);
    if (!trigger) {
      return jsonResponse({ proactive: false, reason: 'no_matching_trigger' }, corsHeaders);
    }

    // クールダウン判定
    const inCooldown = await checkCooldown(env, trigger.id, sessionId, userIdentifier, trigger.cooldown_hours);
    if (inCooldown) {
      return jsonResponse({ proactive: false, reason: 'cooldown' }, corsHeaders);
    }

    // 条件マッチ判定
    if (!matchCondition(trigger, { page, dwellSeconds, userIdentifier })) {
      return jsonResponse({ proactive: false, reason: 'condition_not_met' }, corsHeaders);
    }

    // ログ記録（非同期・失敗しても返却に影響なし）
    logTriggerEvent(env, tenantId, trigger.id, sessionId, userIdentifier, 'displayed', null, page).catch(() => {});

    return jsonResponse({
      proactive: true,
      trigger_key: trigger.trigger_key,
      message: trigger.message,
      quick_replies: trigger.quick_replies,
    }, corsHeaders);
  }

  // context未指定 → 全トリガーを優先順にチェック
  for (const trigger of triggers) {
    const inCooldown = await checkCooldown(env, trigger.id, sessionId, userIdentifier, trigger.cooldown_hours);
    if (inCooldown) continue;

    if (matchCondition(trigger, { page, dwellSeconds, userIdentifier })) {
      logTriggerEvent(env, tenantId, trigger.id, sessionId, userIdentifier, 'displayed', null, page).catch(() => {});
      return jsonResponse({
        proactive: true,
        trigger_key: trigger.trigger_key,
        message: trigger.message,
        quick_replies: trigger.quick_replies,
      }, corsHeaders);
    }
  }

  return jsonResponse({ proactive: false, reason: 'no_triggers_matched' }, corsHeaders);
}

// ============================================================
// 条件マッチ判定
// ============================================================

function matchCondition(trigger, ctx) {
  const params = trigger.condition_params;

  switch (trigger.condition_type) {
    case 'page_dwell': {
      // ページパターンマッチ + 滞在時間閾値
      const pattern = params.page_pattern || '';
      const threshold = params.threshold_seconds || 180;
      if (ctx.dwellSeconds < threshold) return false;
      if (pattern && ctx.page) {
        try {
          const re = new RegExp(pattern, 'i');
          return re.test(ctx.page);
        } catch {
          return ctx.page.includes(pattern);
        }
      }
      return true; // パターン未設定ならページ問わず発火
    }

    case 'first_visit':
      // クライアント側でcookie未設定を判定して呼ぶ前提
      return true;

    case 'time_based':
      // BQから期限チェックが必要→クライアント側で判定済みとして扱う
      return true;

    case 'behavior':
      // cookie / last_visit でクライアント側が判定済み
      return true;

    default:
      return true;
  }
}

// ============================================================
// 管理API: トリガーCRUD
// ============================================================

/**
 * GET /api/proactive/triggers — 全トリガー一覧
 */
export async function handleProactiveTriggersGet(request, env, corsHeaders) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenant') || 'tenant_default';

  try {
    const { results } = await env.DB.prepare(
      `SELECT * FROM proactive_triggers WHERE tenant_id = ? ORDER BY priority ASC, created_at DESC`
    ).bind(tenantId).all();

    const parsed = (results || []).map(r => ({
      ...r,
      quick_replies: safeJsonParse(r.quick_replies, []),
      condition_params: safeJsonParse(r.condition_params, {}),
    }));

    return jsonResponse({ success: true, triggers: parsed }, corsHeaders);
  } catch (e) {
    return jsonResponse({ success: false, error: 'Internal error' }, corsHeaders, 500);
  }
}

/**
 * POST /api/proactive/triggers — 作成 or 更新
 * Body: { trigger_key, display_name, message, quick_replies, condition_type, condition_params, priority, cooldown_hours, is_active }
 */
export async function handleProactiveTriggersPost(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const tenantId = body.tenant_id || 'tenant_default';

    if (!body.trigger_key || !body.message) {
      return jsonResponse({ success: false, error: 'trigger_key と message は必須です' }, corsHeaders, 400);
    }

    await env.DB.prepare(
      `INSERT INTO proactive_triggers (tenant_id, trigger_key, display_name, description, message, quick_replies, condition_type, condition_params, priority, cooldown_hours, max_displays_per_session, is_active, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(tenant_id, trigger_key) DO UPDATE SET
         display_name = excluded.display_name,
         description = excluded.description,
         message = excluded.message,
         quick_replies = excluded.quick_replies,
         condition_type = excluded.condition_type,
         condition_params = excluded.condition_params,
         priority = excluded.priority,
         cooldown_hours = excluded.cooldown_hours,
         max_displays_per_session = excluded.max_displays_per_session,
         is_active = excluded.is_active,
         updated_at = datetime('now')`
    ).bind(
      tenantId,
      body.trigger_key,
      body.display_name || body.trigger_key,
      body.description || null,
      body.message,
      JSON.stringify(body.quick_replies || []),
      body.condition_type || 'page_dwell',
      JSON.stringify(body.condition_params || {}),
      body.priority ?? 5,
      body.cooldown_hours ?? 24,
      body.max_displays_per_session ?? 1,
      body.is_active ?? 1,
    ).run();

    // キャッシュクリア
    delete triggersCache[tenantId];

    return jsonResponse({ success: true, message: 'トリガーを保存しました' }, corsHeaders);
  } catch (e) {
    return jsonResponse({ success: false, error: 'Internal error' }, corsHeaders, 500);
  }
}

/**
 * DELETE /api/proactive/triggers/:id
 */
export async function handleProactiveTriggersDelete(request, env, corsHeaders, triggerId) {
  try {
    await env.DB.prepare('DELETE FROM proactive_triggers WHERE id = ?').bind(triggerId).run();
    triggersCache = {}; // 全キャッシュクリア
    return jsonResponse({ success: true, message: '削除しました' }, corsHeaders);
  } catch (e) {
    return jsonResponse({ success: false, error: 'Internal error' }, corsHeaders, 500);
  }
}

// ============================================================
// ログ記録API: POST /api/proactive/log
// Body: { trigger_key, session_id, user, action, clicked_reply, page }
// ============================================================

export async function handleProactiveLog(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const tenantId = body.tenant_id || 'tenant_default';
    const triggerKey = body.trigger_key;
    const sessionId = body.session_id || 'anonymous';
    const action = body.action || 'displayed';
    const clickedReply = body.clicked_reply || null;
    const page = body.page || null;
    const user = body.user || null;

    // trigger_key → trigger_id 解決
    const trigger = await env.DB.prepare(
      'SELECT id FROM proactive_triggers WHERE tenant_id = ? AND trigger_key = ? LIMIT 1'
    ).bind(tenantId, triggerKey).first();

    if (!trigger) {
      return jsonResponse({ success: false, error: 'trigger not found' }, corsHeaders, 404);
    }

    await logTriggerEvent(env, tenantId, trigger.id, sessionId, user, action, clickedReply, page);
    return jsonResponse({ success: true }, corsHeaders);
  } catch (e) {
    return jsonResponse({ success: false, error: 'Internal error' }, corsHeaders, 500);
  }
}

// ============================================================
// 内部ヘルパー
// ============================================================

async function logTriggerEvent(env, tenantId, triggerId, sessionId, userIdentifier, action, clickedReply, page) {
  await env.DB.prepare(
    `INSERT INTO proactive_trigger_log (tenant_id, trigger_id, session_id, user_identifier, action, clicked_reply, page_context)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(tenantId, triggerId, sessionId, userIdentifier, action, clickedReply, page).run();
}

function safeJsonParse(str, fallback) {
  try {
    return typeof str === 'string' ? JSON.parse(str) : str;
  } catch {
    return fallback;
  }
}

function jsonResponse(data, corsHeaders, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/**
 * キャッシュクリア（管理API用）
 */
export function clearProactiveCache() {
  triggersCache = {};
}

// ============================================================
// フォールバックトリガー（D1障害時）
// ============================================================

const FALLBACK_TRIGGERS = [
  {
    id: 1,
    trigger_key: 'deposit_page_long_stay',
    display_name: '入金ページ長期滞在',
    message: '入金でお困りですか？入金方法のご案内や、PayPayでの入金手順をお伝えできます。',
    quick_replies: ['入金方法を知りたい', 'PayPayで入金', '大丈夫です'],
    condition_type: 'page_dwell',
    condition_params: { page_pattern: '/deposit|/payment|入金', threshold_seconds: 180 },
    priority: 1,
    cooldown_hours: 24,
    max_displays_per_session: 1,
  },
  {
    id: 2,
    trigger_key: 'first_visit',
    display_name: '初回訪問ウェルカム',
    message: 'スロット天国へようこそ！初めての方は入金不要ボーナスからお試しいただけます。',
    quick_replies: ['入金不要ボーナスとは？', 'ゲームを見る', '大丈夫です'],
    condition_type: 'first_visit',
    condition_params: { cookie_key: 'sloten_visited' },
    priority: 2,
    cooldown_hours: 720,
    max_displays_per_session: 1,
  },
  {
    id: 3,
    trigger_key: 'bonus_expiring',
    display_name: 'ボーナス期限切れ間近',
    message: 'お持ちのボーナスの有効期限が明日までです。ボーナスの使い方をご案内しましょうか？',
    quick_replies: ['ボーナスの使い方', '賭け条件を確認', '大丈夫です'],
    condition_type: 'time_based',
    condition_params: { check_type: 'bonus_expiry', hours_before: 24 },
    priority: 1,
    cooldown_hours: 48,
    max_displays_per_session: 1,
  },
  {
    id: 4,
    trigger_key: 'returning_after_absence',
    display_name: '久しぶりの再訪問',
    message: 'お久しぶりです！新しいキャンペーンやゲームが追加されています。',
    quick_replies: ['新キャンペーン', '新着ゲーム', '大丈夫です'],
    condition_type: 'behavior',
    condition_params: { absence_days: 7, cookie_key: 'sloten_last_visit' },
    priority: 3,
    cooldown_hours: 168,
    max_displays_per_session: 1,
  },
];
