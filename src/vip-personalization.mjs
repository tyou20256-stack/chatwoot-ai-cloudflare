// TODO(kv-migration): Module-level state (vipConfigCache, userVipCache) is
// per-isolate. Consider migrating to KV (see kv-cache.mjs) once async caller
// propagation can be accommodated. Currently acceptable because this cache
// is per-tenant and 5-min TTL limits staleness exposure.
// ============================================================
// Sloten AI CS — VIPパーソナライゼーション モジュール
// src/vip-personalization.mjs
// Generated: 2026-04-13
// ============================================================
//
// BQからVIPレベルを取得し、AIプロンプトにVIPコンテキストを注入。
// VIPレベルに応じてトーン・エスカレーション閾値・自動人間対応を制御。
//
// 使い方:
//   import { getVIPContext, shouldAutoEscalate, buildVIPGreeting } from './vip-personalization.mjs';
//   const vip = await getVIPContext(env, username);
//   // vip.systemPromptSuffix を AIプロンプトに追加
//   // vip.shouldAutoEscalate → true なら即エスカレーション
// ============================================================

import { getUserProfile } from './bigquery.mjs';

// --- VIP設定キャッシュ（5分TTL） ---
let vipConfigCache = {};
const VIP_CACHE_TTL = 5 * 60 * 1000;

// --- ユーザーVIPレベルキャッシュ（10分TTL） ---
let userVipCache = {};
const USER_VIP_CACHE_TTL = 10 * 60 * 1000;

// ============================================================
// D1からVIP設定を読み込み
// ============================================================

async function getVIPConfigs(env, tenantId = 'tenant_default') {
  const now = Date.now();
  const cacheKey = tenantId;

  if (vipConfigCache[cacheKey] && (now - vipConfigCache[cacheKey].ts) < VIP_CACHE_TTL) {
    return vipConfigCache[cacheKey].data;
  }

  try {
    const { results } = await env.DB.prepare(
      `SELECT vip_level, display_name, tone, greeting_template,
              escalation_threshold, auto_human, priority_queue,
              custom_system_prompt_suffix, max_response_length, response_speed
       FROM vip_config
       WHERE tenant_id = ? AND is_active = 1
       ORDER BY sort_order ASC`
    ).bind(tenantId).all();

    const map = {};
    for (const r of (results || [])) {
      map[r.vip_level] = r;
    }

    vipConfigCache[cacheKey] = { data: map, ts: now };
    return map;
  } catch (e) {
    console.error('[getVIPConfigs] D1エラー:', e.message);
    return FALLBACK_VIP_CONFIG;
  }
}

// ============================================================
// BQからユーザーのVIPレベルを取得
// ============================================================

async function getUserVIPLevel(env, username) {
  if (!username) return { level: 'bronze', name: null };

  const now = Date.now();
  const cacheKey = username.toLowerCase();

  if (userVipCache[cacheKey] && (now - userVipCache[cacheKey].ts) < USER_VIP_CACHE_TTL) {
    return userVipCache[cacheKey].data;
  }

  try {
    const profile = await getUserProfile(env, username);
    if (!profile) {
      return { level: 'bronze', name: username };
    }

    // BQのbo_user_listからVIPレベルを推定
    // vip_level / tier / member_level フィールドを確認
    const vipLevel = normalizeVIPLevel(
      profile.vip_level || profile.tier || profile.member_level || profile.level
    );
    const displayName = profile.display_name || profile.username || username;

    const result = { level: vipLevel, name: displayName, profile };
    userVipCache[cacheKey] = { data: result, ts: now };
    return result;
  } catch (e) {
    console.error('[getUserVIPLevel] BQエラー:', e.message);
    return { level: 'bronze', name: username };
  }
}

/**
 * BQから返るVIPレベル文字列を正規化
 */
function normalizeVIPLevel(raw) {
  if (!raw) return 'bronze';
  const lower = String(raw).toLowerCase().trim();

  // 直接マッチ
  if (['bronze', 'silver', 'gold', 'platinum'].includes(lower)) return lower;

  // 数値ベース（1=bronze, 2=silver, 3=gold, 4+=platinum）
  const num = parseInt(lower, 10);
  if (!isNaN(num)) {
    if (num <= 1) return 'bronze';
    if (num === 2) return 'silver';
    if (num === 3) return 'gold';
    return 'platinum';
  }

  // 日本語対応
  if (/ブロンズ|初級/.test(lower)) return 'bronze';
  if (/シルバー|中級/.test(lower)) return 'silver';
  if (/ゴールド|上級/.test(lower)) return 'gold';
  if (/プラチナ|VIP|最上級/.test(lower)) return 'platinum';

  return 'bronze';
}

// ============================================================
// メイン: VIPコンテキスト取得
// handleAIChatV2() から呼ばれる統合関数
// ============================================================

/**
 * VIPコンテキストを取得
 * @param {object} env - Workers環境変数
 * @param {string} username - ユーザー名
 * @param {string} tenantId - テナントID
 * @returns {Promise<VIPContext>}
 *
 * @typedef {object} VIPContext
 * @property {string} level - VIPレベル ('bronze'|'silver'|'gold'|'platinum')
 * @property {string} displayName - 表示名
 * @property {string} tone - トーン設定
 * @property {string|null} greeting - パーソナライズされたグリーティング
 * @property {number} escalationThreshold - エスカレーション閾値
 * @property {boolean} shouldAutoEscalate - 自動エスカレーション
 * @property {boolean} priorityQueue - 優先キュー
 * @property {string} systemPromptSuffix - AIプロンプト追加テキスト
 * @property {number} maxResponseLength - レスポンス最大文字数
 * @property {string} responseSpeed - 'instant' | 'normal'
 * @property {boolean} enabled - VIP機能有効フラグ
 */
export async function getVIPContext(env, username, tenantId = 'tenant_default') {
  // VIP機能有効チェック
  const enabled = await isVIPEnabled(env, tenantId);
  if (!enabled) {
    return {
      level: 'bronze',
      displayName: username || null,
      tone: 'friendly',
      greeting: null,
      escalationThreshold: 3,
      shouldAutoEscalate: false,
      priorityQueue: false,
      systemPromptSuffix: '',
      maxResponseLength: 200,
      responseSpeed: 'normal',
      enabled: false,
    };
  }

  const [userVip, configs] = await Promise.all([
    getUserVIPLevel(env, username),
    getVIPConfigs(env, tenantId),
  ]);

  const config = configs[userVip.level] || configs['bronze'] || FALLBACK_VIP_CONFIG['bronze'];
  const displayName = userVip.name || username;

  // グリーティング生成
  let greeting = null;
  if (config.greeting_template && displayName) {
    greeting = config.greeting_template.replace(/\{name\}/g, displayName);
  }

  return {
    level: userVip.level,
    displayName,
    tone: config.tone || 'friendly',
    greeting,
    escalationThreshold: config.escalation_threshold ?? 3,
    shouldAutoEscalate: !!config.auto_human,
    priorityQueue: !!config.priority_queue,
    systemPromptSuffix: config.custom_system_prompt_suffix || '',
    maxResponseLength: config.max_response_length || 200,
    responseSpeed: config.response_speed || 'normal',
    enabled: true,
  };
}

/**
 * VIPコンテキストをAIシステムプロンプトに注入するテキストを生成
 */
export function buildVIPPromptInjection(vipContext) {
  if (!vipContext.enabled || vipContext.level === 'bronze') {
    return '';
  }

  const parts = [`\n\n■ VIP対応情報`];

  if (vipContext.greeting) {
    parts.push(`- このお客様への挨拶: 「${vipContext.greeting}」`);
  }

  parts.push(`- VIPレベル: ${vipContext.level.toUpperCase()}`);

  switch (vipContext.tone) {
    case 'polite':
      parts.push('- お名前でお呼びし、より丁寧な言葉遣いで対応してください');
      break;
    case 'premium':
      parts.push('- 最高級の敬語と特別感のある対応をしてください。感謝の気持ちを伝えてください');
      break;
    case 'vip':
      parts.push('- VIPサポートとして、最高のおもてなし対応をしてください');
      break;
  }

  if (vipContext.systemPromptSuffix) {
    parts.push(`- ${vipContext.systemPromptSuffix}`);
  }

  if (vipContext.maxResponseLength && vipContext.maxResponseLength !== 200) {
    parts.push(`- 応答は${vipContext.maxResponseLength}文字以内を目安にしてください`);
  }

  return parts.join('\n');
}

/**
 * 自動エスカレーション判定
 * platinum → 即エスカレーション
 * gold → AI 1回応答後
 * silver → AI 2回応答後
 * bronze → AI 3回応答後
 */
export function shouldEscalate(vipContext, aiResponseCount) {
  if (vipContext.shouldAutoEscalate) return true;
  return aiResponseCount >= vipContext.escalationThreshold;
}

// ============================================================
// 管理API: VIP設定CRUD
// ============================================================

/**
 * GET /api/vip/config — VIP設定一覧
 */
export async function handleVIPConfigGet(request, env, corsHeaders) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenant') || 'tenant_default';

  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM vip_config WHERE tenant_id = ? ORDER BY sort_order ASC'
    ).bind(tenantId).all();

    return jsonResponse({ success: true, configs: results || [] }, corsHeaders);
  } catch (e) {
    return jsonResponse({ success: false, error: 'Internal error' }, corsHeaders, 500);
  }
}

/**
 * POST /api/vip/config — VIP設定更新
 * Body: { vip_level, display_name, tone, greeting_template, escalation_threshold, auto_human, ... }
 */
export async function handleVIPConfigPost(request, env, corsHeaders) {
  try {
    const body = await request.json();
    const tenantId = body.tenant_id || 'tenant_default';

    if (!body.vip_level) {
      return jsonResponse({ success: false, error: 'vip_level は必須です' }, corsHeaders, 400);
    }

    await env.DB.prepare(
      `INSERT INTO vip_config (tenant_id, vip_level, display_name, tone, greeting_template, escalation_threshold, auto_human, priority_queue, custom_system_prompt_suffix, max_response_length, response_speed, sort_order, is_active, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
       ON CONFLICT(tenant_id, vip_level) DO UPDATE SET
         display_name = excluded.display_name,
         tone = excluded.tone,
         greeting_template = excluded.greeting_template,
         escalation_threshold = excluded.escalation_threshold,
         auto_human = excluded.auto_human,
         priority_queue = excluded.priority_queue,
         custom_system_prompt_suffix = excluded.custom_system_prompt_suffix,
         max_response_length = excluded.max_response_length,
         response_speed = excluded.response_speed,
         sort_order = excluded.sort_order,
         is_active = excluded.is_active,
         updated_at = datetime('now')`
    ).bind(
      tenantId,
      body.vip_level,
      body.display_name || body.vip_level,
      body.tone || 'friendly',
      body.greeting_template || null,
      body.escalation_threshold ?? 3,
      body.auto_human ? 1 : 0,
      body.priority_queue ? 1 : 0,
      body.custom_system_prompt_suffix || null,
      body.max_response_length ?? 200,
      body.response_speed || 'normal',
      body.sort_order ?? 0,
      body.is_active ?? 1,
    ).run();

    // キャッシュクリア
    delete vipConfigCache[tenantId];

    return jsonResponse({ success: true, message: 'VIP設定を保存しました' }, corsHeaders);
  } catch (e) {
    return jsonResponse({ success: false, error: 'Internal error' }, corsHeaders, 500);
  }
}

/**
 * GET /api/vip/user/:username — ユーザーのVIPコンテキスト取得
 */
export async function handleVIPUserGet(request, env, corsHeaders, username) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenant') || 'tenant_default';

  try {
    const vipContext = await getVIPContext(env, username, tenantId);
    return jsonResponse({ success: true, vip: vipContext }, corsHeaders);
  } catch (e) {
    return jsonResponse({ success: false, error: 'Internal error' }, corsHeaders, 500);
  }
}

/**
 * VIPインタラクションログ記録
 */
export async function logVIPInteraction(env, tenantId, sessionId, username, vipLevel, wasAutoEscalated, aiResponseCount) {
  try {
    await env.DB.prepare(
      `INSERT INTO vip_interaction_log (tenant_id, session_id, user_identifier, vip_level, was_auto_escalated, ai_response_count)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(tenantId, sessionId, username, vipLevel, wasAutoEscalated ? 1 : 0, aiResponseCount).run();
  } catch (e) {
    console.error('[logVIPInteraction] ログ記録エラー:', e.message);
  }
}

// ============================================================
// ヘルパー
// ============================================================

async function isVIPEnabled(env, tenantId) {
  try {
    const row = await env.DB.prepare(
      "SELECT config_value FROM ai_config WHERE tenant_id = ? AND config_key = 'vip_enabled' LIMIT 1"
    ).bind(tenantId).first();
    return row?.config_value === 'true';
  } catch {
    return false;
  }
}

function jsonResponse(data, corsHeaders, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export function clearVIPCache() {
  vipConfigCache = {};
  userVipCache = {};
}

// ============================================================
// フォールバックVIP設定
// ============================================================

const FALLBACK_VIP_CONFIG = {
  bronze: {
    vip_level: 'bronze',
    display_name: 'ブロンズ',
    tone: 'friendly',
    greeting_template: null,
    escalation_threshold: 3,
    auto_human: 0,
    priority_queue: 0,
    custom_system_prompt_suffix: '通常のお客様として、親しみやすく丁寧に対応してください。',
    max_response_length: 200,
    response_speed: 'normal',
  },
  silver: {
    vip_level: 'silver',
    display_name: 'シルバー',
    tone: 'polite',
    greeting_template: '{name}様',
    escalation_threshold: 2,
    auto_human: 0,
    priority_queue: 0,
    custom_system_prompt_suffix: 'シルバー会員のお客様です。お名前でお呼びし、より丁寧な言葉遣いで対応してください。',
    max_response_length: 200,
    response_speed: 'normal',
  },
  gold: {
    vip_level: 'gold',
    display_name: 'ゴールド',
    tone: 'premium',
    greeting_template: '{name}様、いつもご利用ありがとうございます',
    escalation_threshold: 1,
    auto_human: 0,
    priority_queue: 1,
    custom_system_prompt_suffix: 'ゴールド会員の大切なお客様です。感謝を伝え、特別感のある対応をしてください。',
    max_response_length: 200,
    response_speed: 'instant',
  },
  platinum: {
    vip_level: 'platinum',
    display_name: 'プラチナ',
    tone: 'vip',
    greeting_template: '{name}様、VIPサポートでございます',
    escalation_threshold: 0,
    auto_human: 1,
    priority_queue: 1,
    custom_system_prompt_suffix: 'プラチナVIP会員の最重要顧客です。最高級のおもてなしで対応してください。',
    max_response_length: 200,
    response_speed: 'instant',
  },
};
