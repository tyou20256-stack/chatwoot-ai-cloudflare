// TODO(kv-migration): Module-level state (campaignCache) is per-isolate.
// Consider migrating to KV (see kv-cache.mjs) once async caller propagation
// can be accommodated. Currently acceptable because this cache is per-tenant
// and 5-min TTL limits staleness exposure.
// ============================================
// Sloten AI CS — キャンペーン管理 + FAQ自動連携
// campaigns.mjs
// Created: 2026-04-13
// ============================================
//
// キャンペーン CRUD API
// キャンペーン→FAQ 自動生成/更新/削除
// 期限切れキャンペーン自動無効化
// アクティブキャンペーンのプロンプト動的注入
// ============================================

// --- キャッシュ（3分TTL）---
let campaignCache = {};
const CAMPAIGN_CACHE_TTL = 3 * 60 * 1000;

/**
 * キャンペーンキャッシュクリア
 */
export function clearCampaignCache(tenantId) {
  if (tenantId) {
    delete campaignCache[tenantId];
  } else {
    campaignCache = {};
  }
}

// ============================================
// 1. FAQ自動生成ロジック
// ============================================

/**
 * キャンペーン情報からFAQ質問文を生成
 */
function generateFAQQuestion(campaign) {
  return `${campaign.title}とは何ですか？`;
}

/**
 * キャンペーン情報からFAQ回答文を生成
 */
function generateFAQAnswer(campaign) {
  let answer = `${campaign.title}は、${campaign.description}`;

  // C3対策: ボーナスコード値は AgentBot 側のメニューで完結
  if (campaign.bonus_code) {
    answer += `\n※ ボーナスコードは、チャットメニューの「ボーナスコード入力」からご選択ください。`;
  }

  if (campaign.conditions) {
    answer += `\n条件: ${campaign.conditions}`;
  }

  if (campaign.start_date && campaign.end_date) {
    answer += `\n期間: ${campaign.start_date}〜${campaign.end_date}`;
  } else if (campaign.end_date) {
    answer += `\n期限: ${campaign.end_date}まで`;
  }

  return answer;
}

/**
 * 期限切れ用のFAQ回答を生成
 */
function generateExpiredFAQAnswer(campaign) {
  return `${campaign.title}は終了いたしました。最新のキャンペーン情報につきましては、サイトのプロモーションページをご確認くださいませ。`;
}

/**
 * キャンペーンからFAQエントリを自動生成（D1 INSERT）
 * @returns {number} 生成されたFAQ ID
 */
async function campaignToFAQ(env, campaign) {
  const question = generateFAQQuestion(campaign);
  const answer = generateFAQAnswer(campaign);
  const tenantId = campaign.tenant_id || 'tenant_default';

  const result = await env.DB.prepare(`
    INSERT INTO faq (tenant_id, question, answer, category, is_active, sort_order, campaign_id, created_at, updated_at)
    VALUES (?, ?, ?, 'campaign', 1, 0, ?, datetime('now'), datetime('now'))
  `).bind(tenantId, question, answer, campaign.id).run();

  return result.meta?.last_row_id;
}

/**
 * キャンペーン更新時にFAQも自動更新
 */
async function updateCampaignFAQ(env, campaign) {
  const question = generateFAQQuestion(campaign);
  const answer = generateFAQAnswer(campaign);

  // linked_faq_id経由で更新
  if (campaign.linked_faq_id) {
    await env.DB.prepare(`
      UPDATE faq SET question = ?, answer = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(question, answer, campaign.is_active ? 1 : 0, campaign.linked_faq_id).run();
    return;
  }

  // campaign_id経由で更新（フォールバック）
  await env.DB.prepare(`
    UPDATE faq SET question = ?, answer = ?, is_active = ?, updated_at = datetime('now')
    WHERE campaign_id = ? AND tenant_id = ?
  `).bind(question, answer, campaign.is_active ? 1 : 0, campaign.id, campaign.tenant_id || 'tenant_default').run();
}

/**
 * キャンペーン削除時にFAQも自動削除（論理削除）
 */
async function deleteCampaignFAQ(env, campaignId, tenantId = 'tenant_default') {
  await env.DB.prepare(`
    UPDATE faq SET is_active = 0, updated_at = datetime('now')
    WHERE campaign_id = ? AND tenant_id = ?
  `).bind(campaignId, tenantId).run();
}


// ============================================
// 2. 期限切れ自動無効化
// ============================================

/**
 * 期限切れキャンペーンを自動無効化
 * - end_dateが過去 → is_active=0
 * - 関連FAQも is_active=0 にし、回答を「終了しました」に差し替え
 *
 * @returns {{ deactivated: number, faqUpdated: number }}
 */
export async function deactivateExpiredCampaigns(env, tenantId = 'tenant_default') {
  const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Step 1: 期限切れかつまだアクティブなキャンペーンを取得
  const { results: expired } = await env.DB.prepare(`
    SELECT id, title, description, linked_faq_id
    FROM campaigns
    WHERE tenant_id = ? AND is_active = 1 AND end_date IS NOT NULL AND end_date < ?
  `).bind(tenantId, now).all();

  if (!expired || expired.length === 0) {
    return { deactivated: 0, faqUpdated: 0 };
  }

  let faqUpdated = 0;

  // Step 2: 各キャンペーンを無効化
  for (const campaign of expired) {
    // キャンペーンを無効化
    await env.DB.prepare(`
      UPDATE campaigns SET is_active = 0, updated_at = datetime('now') WHERE id = ?
    `).bind(campaign.id).run();

    // 関連FAQの回答を「終了しました」に差し替え + 無効化
    const expiredAnswer = generateExpiredFAQAnswer(campaign);

    if (campaign.linked_faq_id) {
      await env.DB.prepare(`
        UPDATE faq SET answer = ?, is_active = 0, updated_at = datetime('now') WHERE id = ?
      `).bind(expiredAnswer, campaign.linked_faq_id).run();
      faqUpdated++;
    } else {
      const result = await env.DB.prepare(`
        UPDATE faq SET answer = ?, is_active = 0, updated_at = datetime('now')
        WHERE campaign_id = ? AND tenant_id = ?
      `).bind(expiredAnswer, campaign.id, tenantId).run();
      if (result.meta?.changes > 0) faqUpdated++;
    }
  }

  // キャッシュクリア
  clearCampaignCache(tenantId);

  return { deactivated: expired.length, faqUpdated };
}


// ============================================
// 3. アクティブキャンペーン取得 + プロンプト注入
// ============================================

/**
 * アクティブなキャンペーン一覧を取得（キャッシュ付き）
 */
export async function getActiveCampaigns(env, tenantId = 'tenant_default') {
  const now = Date.now();
  const cacheKey = tenantId;

  if (campaignCache[cacheKey] && (now - campaignCache[cacheKey].timestamp) < CAMPAIGN_CACHE_TTL) {
    return campaignCache[cacheKey].data;
  }

  const today = new Date().toISOString().split('T')[0];

  const { results } = await env.DB.prepare(`
    SELECT id, title, description, bonus_code, conditions, start_date, end_date
    FROM campaigns
    WHERE tenant_id = ? AND is_active = 1
      AND (start_date IS NULL OR start_date <= ?)
      AND (end_date IS NULL OR end_date >= ?)
    ORDER BY end_date ASC NULLS LAST, id DESC
  `).bind(tenantId, today, today).all();

  const data = results || [];
  campaignCache[cacheKey] = { data, timestamp: now };
  return data;
}

/**
 * アクティブキャンペーンをシステムプロンプト用テキストに変換
 * buildSystemPrompt() に追加注入する形式
 *
 * 出力例:
 * ■ 現在のキャンペーン
 * 1. Play'n GO 熱春祭りトーナメント（〜4/30）: 最大200FS獲得
 * 2. ゾロ目チャレンジ: 最大30%CB
 */
export async function buildCampaignPromptInjection(env, tenantId = 'tenant_default') {
  const campaigns = await getActiveCampaigns(env, tenantId);

  if (!campaigns || campaigns.length === 0) {
    return ''; // キャンペーンなし→注入なし
  }

  let text = '\n\n■ 現在のキャンペーン\n';
  text += '以下のキャンペーンは現在有効です。お客様から問い合わせがあった場合は正確に案内してください。\n';

  campaigns.forEach((c, i) => {
    let line = `${i + 1}. ${c.title}`;

    if (c.end_date) {
      line += `（〜${c.end_date}）`;
    }

    line += `: ${c.description}`;

    // C3対策: bonus_code 値をプロンプトに含めない（AgentBot メニューへ誘導）
    if (c.bonus_code) {
      line += ` （ボーナスコードはメニューからご利用ください）`;
    }

    if (c.conditions) {
      line += `（${c.conditions}）`;
    }

    text += line + '\n';
  });

  text += '\nキャンペーン情報にない内容については「確認いたします」と回答してください。\n';

  return text;
}


// ============================================
// 4. 管理画面 API ハンドラー
// ============================================

/**
 * GET /api/campaigns — キャンペーン一覧
 */
export async function handleCampaignsGet(request, env, corsHeaders) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenant_id') || 'tenant_default';
  const includeInactive = url.searchParams.get('include_inactive') === '1';

  // リクエスト時に期限切れチェックを実行
  await deactivateExpiredCampaigns(env, tenantId);

  let query = 'SELECT * FROM campaigns WHERE tenant_id = ?';
  if (!includeInactive) {
    query += ' AND is_active = 1';
  }
  query += ' ORDER BY created_at DESC';

  const { results } = await env.DB.prepare(query).bind(tenantId).all();

  return new Response(JSON.stringify({
    success: true,
    campaigns: results || [],
    count: results?.length || 0,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/**
 * POST /api/campaigns — キャンペーン新規登録（+ FAQ自動生成）
 */
export async function handleCampaignsPost(request, env, corsHeaders) {
  const body = await request.json();
  const {
    tenant_id = 'tenant_default',
    title,
    description,
    bonus_code = null,
    conditions = null,
    start_date = null,
    end_date = null,
    is_active = 1,
    auto_faq = 1,
  } = body;

  if (!title || !description) {
    return new Response(JSON.stringify({
      success: false,
      error: 'title と description は必須です',
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  // Step 1: キャンペーンをINSERT
  const insertResult = await env.DB.prepare(`
    INSERT INTO campaigns (tenant_id, title, description, bonus_code, conditions, start_date, end_date, is_active, auto_faq, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).bind(tenant_id, title, description, bonus_code, conditions, start_date, end_date, is_active, auto_faq).run();

  const campaignId = insertResult.meta?.last_row_id;

  // Step 2: auto_faqが有効ならFAQを自動生成
  let linkedFaqId = null;
  if (auto_faq && is_active) {
    const campaign = { id: campaignId, tenant_id, title, description, bonus_code, conditions, start_date, end_date };
    linkedFaqId = await campaignToFAQ(env, campaign);

    // campaigns.linked_faq_idを更新
    if (linkedFaqId) {
      await env.DB.prepare(`
        UPDATE campaigns SET linked_faq_id = ? WHERE id = ?
      `).bind(linkedFaqId, campaignId).run();
    }
  }

  // キャッシュクリア
  clearCampaignCache(tenant_id);

  return new Response(JSON.stringify({
    success: true,
    campaign_id: campaignId,
    linked_faq_id: linkedFaqId,
    message: auto_faq ? 'キャンペーン登録完了（FAQ自動生成済み）' : 'キャンペーン登録完了',
  }), {
    status: 201,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/**
 * PUT /api/campaigns/:id — キャンペーン更新（+ FAQ自動更新）
 */
export async function handleCampaignsPut(request, env, corsHeaders, campaignId) {
  const body = await request.json();

  // 既存キャンペーンを取得
  const existing = await env.DB.prepare('SELECT * FROM campaigns WHERE id = ?').bind(campaignId).first();
  if (!existing) {
    return new Response(JSON.stringify({ success: false, error: 'キャンペーンが見つかりません' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  // マージ更新
  const updated = {
    title: body.title ?? existing.title,
    description: body.description ?? existing.description,
    bonus_code: body.bonus_code ?? existing.bonus_code,
    conditions: body.conditions ?? existing.conditions,
    start_date: body.start_date ?? existing.start_date,
    end_date: body.end_date ?? existing.end_date,
    is_active: body.is_active ?? existing.is_active,
    auto_faq: body.auto_faq ?? existing.auto_faq,
    tenant_id: existing.tenant_id,
    linked_faq_id: existing.linked_faq_id,
    id: campaignId,
  };

  await env.DB.prepare(`
    UPDATE campaigns SET title = ?, description = ?, bonus_code = ?, conditions = ?,
      start_date = ?, end_date = ?, is_active = ?, auto_faq = ?, updated_at = datetime('now')
    WHERE id = ?
  `).bind(
    updated.title, updated.description, updated.bonus_code, updated.conditions,
    updated.start_date, updated.end_date, updated.is_active, updated.auto_faq,
    campaignId,
  ).run();

  // FAQ自動更新
  if (updated.auto_faq) {
    await updateCampaignFAQ(env, updated);
  }

  // キャッシュクリア
  clearCampaignCache(updated.tenant_id);

  return new Response(JSON.stringify({
    success: true,
    message: 'キャンペーン更新完了',
    campaign_id: campaignId,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/**
 * DELETE /api/campaigns/:id — キャンペーン削除（+ FAQ自動無効化）
 */
export async function handleCampaignsDelete(request, env, corsHeaders, campaignId) {
  const existing = await env.DB.prepare('SELECT * FROM campaigns WHERE id = ?').bind(campaignId).first();
  if (!existing) {
    return new Response(JSON.stringify({ success: false, error: 'キャンペーンが見つかりません' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
    });
  }

  // FAQ自動無効化
  await deleteCampaignFAQ(env, campaignId, existing.tenant_id);

  // キャンペーン削除（物理削除）
  await env.DB.prepare('DELETE FROM campaigns WHERE id = ?').bind(campaignId).run();

  // キャッシュクリア
  clearCampaignCache(existing.tenant_id);

  return new Response(JSON.stringify({
    success: true,
    message: 'キャンペーン削除完了（関連FAQ無効化済み）',
    campaign_id: campaignId,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/**
 * POST /api/campaigns/deactivate-expired — 手動トリガー用
 */
export async function handleDeactivateExpired(request, env, corsHeaders) {
  const url = new URL(request.url);
  const tenantId = url.searchParams.get('tenant_id') || 'tenant_default';

  const result = await deactivateExpiredCampaigns(env, tenantId);

  return new Response(JSON.stringify({
    success: true,
    ...result,
    message: `${result.deactivated}件のキャンペーンを無効化、${result.faqUpdated}件のFAQを更新`,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

/**
 * POST /api/campaigns/cache/clear — キャッシュクリア
 */
export async function handleCampaignCacheClear(request, env, corsHeaders) {
  clearCampaignCache();
  return new Response(JSON.stringify({ success: true, message: 'キャンペーンキャッシュクリア完了' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}
