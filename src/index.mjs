/**
 * src/index.mjs — chatwoot-ai-gateway エントリポイント (staging-bk 版)
 *
 * 弊社側で作成した最小ルーター。納品側の実装と差分がある可能性あり、
 * 納品側 src/index.mjs が入手でき次第マージ検討。
 *
 * ルート一覧:
 *   POST /api/ai/chat              — AI チャット応答
 *   GET  /api/ai/status            — 機能状態
 *   POST /api/ai/toggle            — 🔒 AI ON/OFF (Bearer)
 *   GET  /api/ai/stats             — 🔒 統計 (Bearer)
 *   POST /api/ai/faq-cache/clear   — 🔒 FAQキャッシュクリア (Bearer)
 *   GET  /api/escalations          — エスカレーション一覧
 *   PUT  /api/escalations/:id      — 更新
 *   GET  /api/escalations/stats    — 統計
 *   GET  /api/campaigns            — キャンペーン一覧
 *   POST /api/campaigns            — 🔒 作成 (Bearer)
 *   PUT  /api/campaigns/:id        — 🔒 更新 (Bearer)
 *   DELETE /api/campaigns/:id      — 🔒 削除 (Bearer)
 *   GET  /api/vip/config/:level    — VIP設定取得
 *   POST /api/vip/config           — 🔒 VIP設定更新 (Bearer)
 *   GET  /api/vip/user/:username   — VIP情報取得
 *   GET  /api/ab-tests             — A/Bテスト一覧
 *   POST /api/ab-tests             — 🔒 作成 (Bearer)
 *   PUT  /api/ab-tests/:id         — 🔒 更新 (Bearer)
 *   GET  /api/ab-tests/:id/results — 結果取得
 *   POST /api/proactive/check      — プロアクティブCS判定
 *   GET  /api/proactive/triggers   — 🔒 トリガー一覧 (Bearer)
 *   POST /api/proactive/triggers   — 🔒 作成 (Bearer)
 *   DELETE /api/proactive/triggers/:id — 🔒 削除 (Bearer)
 *   POST /api/proactive/log        — ログ
 *   GET  /health                   — ヘルスチェック
 */

import { handleScheduled } from './scheduled.mjs';
import { buildCorsHeaders, handleCorsPreflight } from './cors-helper.mjs';
import { verifyAdminAuth, unauthorizedResponse, verifyAgentBotSecret, authenticate, setPrincipal } from './auth-helper.mjs';
import { handleStaffLogin, handleStaffLogout, handleStaffMe } from './handlers/staff-auth.mjs';
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from './rate-limiter.mjs';

import {
  handleAIChatV2,
  handleAIStatus,
  handleAIToggle,
  handleAIStatsEndpoint,
  handleFAQCacheClear,
} from './ai-chat-handler.mjs';

import {
  handleGetEscalations,
  handleUpdateEscalation,
  handleEscalationStats,
} from './escalation.mjs';

import {
  handleCampaignsGet,
  handleCampaignsPost,
  handleCampaignsPut,
  handleCampaignsDelete,
  handleDeactivateExpired,
  handleCampaignCacheClear,
} from './campaigns.mjs';

import {
  handleVIPConfigGet,
  handleVIPConfigPost,
  handleVIPUserGet,
} from './vip-personalization.mjs';

import {
  handleABTestsList,
  handleABTestCreate,
  handleABTestUpdate,
  handleABTestResults,
} from './ab-testing.mjs';

import {
  handleProactiveCheck,
  handleProactiveTriggersGet,
  handleProactiveTriggersPost,
  handleProactiveTriggersDelete,
  handleProactiveLog,
} from './proactive-cs.mjs';

// ---- Tier A/B/C 弊社側暫定ハンドラ（tking510 納品版で置き換え予定）----
import {
  handleTenantsGet, handleTenantsPost, handleTenantsPut, handleTenantsDelete,
} from './handlers/tenants.mjs';
import {
  handleFaqGet, handleFaqGetOne, handleFaqPost, handleFaqPut, handleFaqDelete, handleFaqSearch,
} from './handlers/faq.mjs';
import {
  handleTagsGet, handleTagsPost, handleTagsPut, handleTagsDelete,
} from './handlers/tags.mjs';
import {
  handleTemplatesGet, handleTemplatesPost, handleTemplatesPut, handleTemplatesDelete,
} from './handlers/templates.mjs';
import {
  handleChannelsGet, handleChannelsPost, handleChannelsPut, handleChannelsDelete,
} from './handlers/channels.mjs';
import {
  handleUsersGet, handleUsersPost, handleUsersPut, handleUsersDelete,
} from './handlers/users.mjs';
import {
  handleSlaGet, handleSlaPost, handleSlaPut, handleSlaDelete, handleSlaDashboard,
} from './handlers/sla.mjs';
import {
  handleBusinessHoursGet, handleBusinessHoursPut, handleBusinessHoursStatus,
} from './handlers/business-hours.mjs';
import {
  handleAuditLogsGet, handleAuditLogsPost,
} from './handlers/audit-logs.mjs';
import {
  handleConversationsGet, handleConversationsGetOne, handleConversationsPut, handleConversationsDelete, handleConversationsSearch,
} from './handlers/conversations.mjs';
import {
  handleFilesGet, handleFilesGetOne, handleFilesDelete, handleFilesUpload, handleFileDownload,
} from './handlers/files.mjs';
import {
  handleBonusCodesGet, handleBonusCodesGetOne, handleBonusCodesPost, handleBonusCodesPut, handleBonusCodesDelete, handleBonusCodeUsageGet,
} from './handlers/bonus-codes.mjs';
import {
  handleKnowledgeSourcesGet, handleKnowledgeSourcesGetOne, handleKnowledgeSourcesPost, handleKnowledgeSourcesPut, handleKnowledgeSourcesDelete,
} from './handlers/knowledge-sources.mjs';
import {
  handleSheetIntegrationsGet, handleSheetIntegrationsPost, handleSheetIntegrationsPut, handleSheetIntegrationsDelete,
} from './handlers/sheet-integrations.mjs';
import {
  handleDashboardStats,
} from './handlers/dashboard.mjs';
import {
  handleWebhooksGet, handleWebhooksGetOne, handleWebhooksPost, handleWebhooksPut, handleWebhooksDelete, handleWebhooksDeliveries, handleWebhooksTest,
} from './handlers/webhooks.mjs';
import {
  handleAutomationRulesGet, handleAutomationRulesGetOne, handleAutomationRulesPost, handleAutomationRulesPut, handleAutomationRulesDelete,
} from './handlers/automation-rules.mjs';
import {
  handleAnalyticsGet, handleAnalyticsSummary, handleAnalyticsSatisfaction,
} from './handlers/analytics.mjs';

// ---- Phase 2/3 新規 ----
import {
  handleConversationMessages, handleMessagesGet, handleMessagesPost, handleMessagesDelete,
} from './handlers/messages.mjs';
import {
  handleConversationTagsGet, handleConversationTagAdd, handleConversationTagRemove,
} from './handlers/conversation-tags.mjs';
import {
  handleConversationReply, handleConversationModeSet, handleAIConversationGet,
} from './handlers/conversations.mjs';
import {
  handleAiCharactersGet, handleAiCharactersGetOne, handleAiCharactersPost, handleAiCharactersPut, handleAiCharactersDelete,
} from './handlers/ai-characters.mjs';
import {
  handleStaffMembersGet, handleStaffMembersGetOne, handleStaffMembersPost, handleStaffMembersPut, handleStaffMembersDelete,
} from './handlers/staff-members.mjs';
import {
  handleWelcomeMenuGet, handleWelcomeMenuPut, handleWelcomeMenuItemsGet, handleWelcomeMenuItemsPost, handleWelcomeMenuItemsPut, handleWelcomeMenuItemsDelete,
} from './handlers/welcome-menu.mjs';
import {
  handleWidgetConfigGet, handleWidgetConfigPut,
} from './handlers/widget-config.mjs';
import {
  handleAIActivityLog,
} from './handlers/ai-activity-log.mjs';

/**
 * 認証が必要なルートで auth guard を付与
 */
function withAuth(handler, options = {}) {
  return async (request, env, corsHeaders, ...args) => {
    const auth = await authenticate(request, env, options);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
    // τ-Cτ1: store principal via WeakMap (Request is immutable in CF Workers)
    setPrincipal(request, auth.principal);
    return handler(request, env, corsHeaders, ...args);
  };
}

function notFound(corsHeaders) {
  return new Response(JSON.stringify({ error: 'Not Found' }), {
    status: 404,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function methodNotAllowed(corsHeaders) {
  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
    status: 405,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

export default {
  async fetch(request, env, ctx) {
    // Preflight
    if (request.method === 'OPTIONS') {
      return handleCorsPreflight(request, env);
    }

    const corsHeaders = buildCorsHeaders(request, env);
    // Correlation ID: propagate X-Request-ID from caller or mint one; echo on response.
    const requestId = request.headers.get('X-Request-ID') || (crypto.randomUUID ? crypto.randomUUID() : '');
    if (requestId) corsHeaders['X-Request-ID'] = requestId;
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    try {
      // ---- Health ---- (skip rate limit)
      if (path === '/health' || path === '/') {
        return new Response(JSON.stringify({
          status: 'ok',
          ts: new Date().toISOString(),
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' } });
      }

      // ---- Rate limiting (edge-level, before route matching) ----
      // 1) Global per-IP: 60 req/min on all /api/*
      if (path.startsWith('/api/')) {
        const globalCheck = await checkRateLimit(
          env,
          getRateLimitKey(request, 'ip'),
          60,
          60,
          ctx
        );
        if (!globalCheck.allowed) return rateLimitResponse(globalCheck, corsHeaders);

        // 3) Admin mutations: 30 req/min on POST/PUT/DELETE /api/*
        if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
          const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
          const mutCheck = await checkRateLimit(env, `adminmut:${ip}`, 30, 60, ctx);
          if (!mutCheck.allowed) return rateLimitResponse(mutCheck, corsHeaders);
        }
      }

      // ---- Staff Authentication (cookie-based) ----
      if (path === '/api/auth/login' && method === 'POST') {
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        const loginCheck = await checkRateLimit(env, `login:${ip}`, 10, 600, ctx);
        if (!loginCheck.allowed) return rateLimitResponse(loginCheck, corsHeaders);
        return handleStaffLogin(request, env, corsHeaders);
      }
      if (path === '/api/auth/logout' && method === 'POST') return handleStaffLogout(request, env, corsHeaders);
      if (path === '/api/auth/me' && method === 'GET') return handleStaffMe(request, env, corsHeaders);
      // ξ-H2: alias for frontends expecting /api/staff-members/me
      if (path === '/api/staff-members/me' && method === 'GET') return handleStaffMe(request, env, corsHeaders);

      // ---- Public widget endpoints (no auth — read-only, CORS-open) ----
      if (path === '/api/public/jackpot' && method === 'GET') {
        try {
          const row = await env.DB.prepare(
            `SELECT value FROM feature_flags WHERE key = 'jackpot_amount'`
          ).first();
          const row2 = await env.DB.prepare(
            `SELECT value FROM feature_flags WHERE key = 'jackpot_updated_at'`
          ).first();
          const amount = row?.value ? Number(row.value) : 5000000;
          const updatedAt = row2?.value || null;
          return new Response(JSON.stringify({
            amount: Number.isFinite(amount) ? amount : 5000000,
            currency: 'JPY',
            label: 'ドリームポット',
            updated_at: updatedAt,
          }), {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': 'public, max-age=30',
            },
          });
        } catch (e) {
          console.error('[jackpot] fetch failed:', e.message);
          return new Response(JSON.stringify({ amount: 5000000, currency: 'JPY', label: 'ドリームポット', updated_at: null }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
          });
        }
      }
      if (path === '/api/widget-config/jackpot' && method === 'PUT') {
        return withAuth(async (req, env, corsHeaders) => {
          let body;
          try { body = await req.json(); } catch { body = {}; }
          const amount = Number(body.amount);
          if (!Number.isFinite(amount) || amount < 0 || amount > 1e12) {
            return new Response(JSON.stringify({ error: 'amount must be a positive number' }), {
              status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
            });
          }
          try {
            await env.DB.batch([
              env.DB.prepare(`INSERT OR REPLACE INTO feature_flags (key, value, updated_at) VALUES ('jackpot_amount', ?, datetime('now'))`).bind(String(Math.floor(amount))),
              env.DB.prepare(`INSERT OR REPLACE INTO feature_flags (key, value, updated_at) VALUES ('jackpot_updated_at', datetime('now'), datetime('now'))`),
            ]);
            return new Response(JSON.stringify({ success: true, amount: Math.floor(amount) }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
            });
          } catch (e) {
            console.error('[jackpot:set]', e.message);
            return new Response(JSON.stringify({ error: 'Internal error' }), {
              status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
            });
          }
        })(request, env, corsHeaders);
      }

      // ---- AI Chat ----
      if (path === '/api/ai/chat' && method === 'POST') {
        // AgentBot shared secret check (if configured)
        const agentAuth = verifyAgentBotSecret(request, env);
        if (!agentAuth.ok) {
          return new Response(JSON.stringify({ error: agentAuth.error }), {
            status: agentAuth.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
          });
        }

        // 2) AI chat specific: 50 req / 10 min per IP
        const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
        const aiCheck = await checkRateLimit(env, `aichat:${ip}`, 50, 600, ctx);
        if (!aiCheck.allowed) return rateLimitResponse(aiCheck, corsHeaders);

        const r = await handleAIChatV2(request, env, corsHeaders, null, ctx);
        return r || new Response(JSON.stringify({ error: 'AI handler returned null' }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
        });
      }
      if (path === '/api/ai/status' && method === 'GET') {
        return handleAIStatus(request, env, corsHeaders);
      }
      if (path === '/api/ai/toggle' && method === 'POST') {
        return handleAIToggle(request, env, corsHeaders);  // auth inside
      }
      if (path === '/api/ai/stats' && method === 'GET') {
        return handleAIStatsEndpoint(request, env, corsHeaders);  // auth inside
      }
      if (path === '/api/ai/faq-cache/clear' && method === 'POST') {
        return withAuth(handleFAQCacheClear)(request, env, corsHeaders);
      }

      // ---- Ops: cron health (ι4) ----
      if (path === '/api/ops/cron-health' && method === 'GET') {
        return withAuth(async (req, env, corsHeaders) => {
          try {
            const row = await env.DB.prepare(
              `SELECT value FROM feature_flags WHERE key = 'last_cron_success'`
            ).first();
            const lastSuccess = row?.value || null;
            let stale = true;
            let hoursAgo = null;
            if (lastSuccess) {
              hoursAgo = (Date.now() - new Date(lastSuccess).getTime()) / (1000 * 3600);
              stale = hoursAgo > 26;
            }
            return new Response(JSON.stringify({ last_success: lastSuccess, hours_ago: hoursAgo, stale }), {
              status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
            });
          } catch (e) {
            console.error('[ops/cron-health]', e.message);
            return new Response(JSON.stringify({ error: 'Internal error' }), {
              status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
            });
          }
        })(request, env, corsHeaders);
      }

      // ---- Escalations ----
      const escMatch = path.match(/^\/api\/escalations(?:\/(\d+))?(?:\/stats)?$/);
      if (path === '/api/escalations' && method === 'GET') {
        return withAuth(handleGetEscalations)(request, env, corsHeaders);
      }
      if (path === '/api/escalations/stats' && method === 'GET') {
        return withAuth(handleEscalationStats)(request, env, corsHeaders);
      }
      if (escMatch && escMatch[1] && method === 'PUT') {
        return withAuth(handleUpdateEscalation)(request, env, corsHeaders, parseInt(escMatch[1], 10));
      }

      // ---- Campaigns ----
      const campMatch = path.match(/^\/api\/campaigns(?:\/(\d+))?$/);
      if (path === '/api/campaigns' && method === 'GET') {
        return handleCampaignsGet(request, env, corsHeaders);
      }
      if (path === '/api/campaigns' && method === 'POST') {
        return withAuth(handleCampaignsPost)(request, env, corsHeaders);
      }
      if (campMatch && campMatch[1] && method === 'PUT') {
        return withAuth(handleCampaignsPut)(request, env, corsHeaders, parseInt(campMatch[1], 10));
      }
      if (campMatch && campMatch[1] && method === 'DELETE') {
        return withAuth(handleCampaignsDelete, { minRole: 'admin' })(request, env, corsHeaders, parseInt(campMatch[1], 10));
      }
      if (path === '/api/campaigns/deactivate-expired' && method === 'POST') {
        return withAuth(handleDeactivateExpired)(request, env, corsHeaders);
      }
      if (path === '/api/campaigns/cache/clear' && method === 'POST') {
        return withAuth(handleCampaignCacheClear)(request, env, corsHeaders);
      }

      // ---- VIP ----
      const vipUserMatch = path.match(/^\/api\/vip\/user\/(.+)$/);
      if (path.startsWith('/api/vip/config') && method === 'GET') {
        return handleVIPConfigGet(request, env, corsHeaders);
      }
      if (path === '/api/vip/config' && method === 'POST') {
        return withAuth(handleVIPConfigPost)(request, env, corsHeaders);
      }
      if (vipUserMatch && method === 'GET') {
        return handleVIPUserGet(request, env, corsHeaders, decodeURIComponent(vipUserMatch[1]));
      }

      // ---- A/B Tests ----
      const abMatch = path.match(/^\/api\/ab-tests(?:\/(\d+))?(?:\/results)?$/);
      if (path === '/api/ab-tests' && method === 'GET') {
        return handleABTestsList(request, env, corsHeaders);
      }
      if (path === '/api/ab-tests' && method === 'POST') {
        return withAuth(handleABTestCreate)(request, env, corsHeaders);
      }
      if (abMatch && abMatch[1] && path.endsWith('/results') && method === 'GET') {
        return handleABTestResults(request, env, corsHeaders, parseInt(abMatch[1], 10));
      }
      if (abMatch && abMatch[1] && method === 'PUT') {
        return withAuth(handleABTestUpdate)(request, env, corsHeaders, parseInt(abMatch[1], 10));
      }

      // ---- Proactive CS ----
      const proTrigMatch = path.match(/^\/api\/proactive\/triggers(?:\/(\d+))?$/);
      if (path === '/api/proactive/check' && method === 'GET') {
        return withAuth(handleProactiveCheck)(request, env, corsHeaders);
      }
      if (path === '/api/proactive/triggers' && method === 'GET') {
        return withAuth(handleProactiveTriggersGet)(request, env, corsHeaders);
      }
      if (path === '/api/proactive/triggers' && method === 'POST') {
        return withAuth(handleProactiveTriggersPost)(request, env, corsHeaders);
      }
      if (proTrigMatch && proTrigMatch[1] && method === 'DELETE') {
        return withAuth(handleProactiveTriggersDelete, { minRole: 'admin' })(request, env, corsHeaders, parseInt(proTrigMatch[1], 10));
      }
      if (path === '/api/proactive/log' && method === 'POST') {
        return withAuth(handleProactiveLog)(request, env, corsHeaders);
      }

      // ================================================
      // ---- Tier A/B/C 弊社側暫定ルート ----
      // ================================================

      // ---- Tenants ----
      const tenantMatch = path.match(/^\/api\/tenants(?:\/([^/]+))?$/);
      if (path === '/api/tenants' && method === 'GET') return withAuth(handleTenantsGet)(request, env, corsHeaders);
      if (path === '/api/tenants' && method === 'POST') return withAuth(handleTenantsPost, { minRole: 'admin' })(request, env, corsHeaders);
      if (tenantMatch && tenantMatch[1] && method === 'PUT') return withAuth(handleTenantsPut, { minRole: 'admin' })(request, env, corsHeaders, decodeURIComponent(tenantMatch[1]));
      if (tenantMatch && tenantMatch[1] && method === 'DELETE') return withAuth(handleTenantsDelete, { minRole: 'admin' })(request, env, corsHeaders, decodeURIComponent(tenantMatch[1]));

      // ---- FAQ ----
      const faqMatch = path.match(/^\/api\/faq(?:\/(\d+))?$/);
      if (path === '/api/faq/search' && method === 'GET') return handleFaqSearch(request, env, corsHeaders);
      if (path === '/api/faq' && method === 'GET') return handleFaqGet(request, env, corsHeaders);
      if (path === '/api/faq' && method === 'POST') return withAuth(handleFaqPost, { minRole: 'agent' })(request, env, corsHeaders);
      if (faqMatch && faqMatch[1] && method === 'GET') return handleFaqGetOne(request, env, corsHeaders, parseInt(faqMatch[1], 10));
      if (faqMatch && faqMatch[1] && method === 'PUT') return withAuth(handleFaqPut, { minRole: 'agent' })(request, env, corsHeaders, parseInt(faqMatch[1], 10));
      if (faqMatch && faqMatch[1] && method === 'DELETE') return withAuth(handleFaqDelete, { minRole: 'admin' })(request, env, corsHeaders, parseInt(faqMatch[1], 10));

      // ---- Tags ----
      const tagMatch = path.match(/^\/api\/tags(?:\/(\d+))?$/);
      if (path === '/api/tags' && method === 'GET') return withAuth(handleTagsGet)(request, env, corsHeaders);
      if (path === '/api/tags' && method === 'POST') return withAuth(handleTagsPost, { minRole: 'agent' })(request, env, corsHeaders);
      if (tagMatch && tagMatch[1] && method === 'PUT') return withAuth(handleTagsPut, { minRole: 'agent' })(request, env, corsHeaders, parseInt(tagMatch[1], 10));
      if (tagMatch && tagMatch[1] && method === 'DELETE') return withAuth(handleTagsDelete, { minRole: 'admin' })(request, env, corsHeaders, parseInt(tagMatch[1], 10));

      // ---- Templates ----
      const tplMatch = path.match(/^\/api\/templates(?:\/(\d+))?$/);
      if (path === '/api/templates' && method === 'GET') return withAuth(handleTemplatesGet)(request, env, corsHeaders);
      if (path === '/api/templates' && method === 'POST') return withAuth(handleTemplatesPost, { minRole: 'admin' })(request, env, corsHeaders);
      if (tplMatch && tplMatch[1] && method === 'PUT') return withAuth(handleTemplatesPut, { minRole: 'admin' })(request, env, corsHeaders, parseInt(tplMatch[1], 10));
      if (tplMatch && tplMatch[1] && method === 'DELETE') return withAuth(handleTemplatesDelete, { minRole: 'admin' })(request, env, corsHeaders, parseInt(tplMatch[1], 10));

      // ---- Channels ----
      const chMatch = path.match(/^\/api\/channels(?:\/(\d+))?$/);
      if (path === '/api/channels' && method === 'GET') return withAuth(handleChannelsGet)(request, env, corsHeaders);
      if (path === '/api/channels' && method === 'POST') return withAuth(handleChannelsPost, { minRole: 'admin' })(request, env, corsHeaders);
      if (chMatch && chMatch[1] && method === 'PUT') return withAuth(handleChannelsPut, { minRole: 'admin' })(request, env, corsHeaders, parseInt(chMatch[1], 10));
      if (chMatch && chMatch[1] && method === 'DELETE') return withAuth(handleChannelsDelete, { minRole: 'admin' })(request, env, corsHeaders, parseInt(chMatch[1], 10));

      // ---- Users ----
      const userMatch = path.match(/^\/api\/users(?:\/(\d+))?$/);
      if (path === '/api/users' && method === 'GET') return withAuth(handleUsersGet)(request, env, corsHeaders);
      if (path === '/api/users' && method === 'POST') return withAuth(handleUsersPost, { minRole: 'admin' })(request, env, corsHeaders);
      if (userMatch && userMatch[1] && method === 'PUT') return withAuth(handleUsersPut, { minRole: 'admin' })(request, env, corsHeaders, parseInt(userMatch[1], 10));
      if (userMatch && userMatch[1] && method === 'DELETE') return withAuth(handleUsersDelete, { minRole: 'admin' })(request, env, corsHeaders, parseInt(userMatch[1], 10));

      // ---- SLA ----
      const slaMatch = path.match(/^\/api\/sla(?:\/(\d+))?$/);
      if (path === '/api/sla/dashboard' && method === 'GET') return withAuth(handleSlaDashboard)(request, env, corsHeaders);
      if (path === '/api/sla' && method === 'GET') return withAuth(handleSlaGet)(request, env, corsHeaders);
      if (path === '/api/sla' && method === 'POST') return withAuth(handleSlaPost, { minRole: 'admin' })(request, env, corsHeaders);
      if (slaMatch && slaMatch[1] && method === 'PUT') return withAuth(handleSlaPut, { minRole: 'admin' })(request, env, corsHeaders, parseInt(slaMatch[1], 10));
      if (slaMatch && slaMatch[1] && method === 'DELETE') return withAuth(handleSlaDelete, { minRole: 'admin' })(request, env, corsHeaders, parseInt(slaMatch[1], 10));

      // ---- Business Hours ----
      if (path === '/api/business-hours/status' && method === 'GET') return handleBusinessHoursStatus(request, env, corsHeaders);
      if (path === '/api/business-hours' && method === 'GET') return withAuth(handleBusinessHoursGet)(request, env, corsHeaders);
      if (path === '/api/business-hours' && method === 'PUT') return withAuth(handleBusinessHoursPut)(request, env, corsHeaders);

      // ---- Audit Logs ----
      if (path === '/api/audit-logs' && method === 'GET') return withAuth(handleAuditLogsGet)(request, env, corsHeaders);
      if (path === '/api/audit-logs' && method === 'POST') return withAuth(handleAuditLogsPost)(request, env, corsHeaders);

      // ---- Conversations ----
      const convMatch = path.match(/^\/api\/conversations(?:\/(\d+))?$/);
      if (path === '/api/conversations/search' && method === 'GET') return withAuth(handleConversationsSearch)(request, env, corsHeaders);
      if (path === '/api/conversations' && method === 'GET') return withAuth(handleConversationsGet)(request, env, corsHeaders);
      if (convMatch && convMatch[1] && method === 'GET') return withAuth(handleConversationsGetOne)(request, env, corsHeaders, parseInt(convMatch[1], 10));
      if (convMatch && convMatch[1] && method === 'PUT') return withAuth(handleConversationsPut)(request, env, corsHeaders, parseInt(convMatch[1], 10));
      if (convMatch && convMatch[1] && method === 'DELETE') return withAuth(handleConversationsDelete, { minRole: 'admin' })(request, env, corsHeaders, parseInt(convMatch[1], 10));

      // ---- Files ----
      const fileMatch = path.match(/^\/api\/files(?:\/(\d+))?$/);
      if (path === '/api/files/upload' && method === 'POST') return withAuth(handleFilesUpload)(request, env, corsHeaders);
      if (path === '/api/files' && method === 'GET') return withAuth(handleFilesGet)(request, env, corsHeaders);
      const fileDownloadMatch = path.match(/^\/api\/files\/(\d+)\/download$/);
      if (fileDownloadMatch && method === 'GET') return withAuth(handleFileDownload)(request, env, corsHeaders, parseInt(fileDownloadMatch[1], 10));
      if (fileMatch && fileMatch[1] && method === 'GET') return withAuth(handleFilesGetOne)(request, env, corsHeaders, parseInt(fileMatch[1], 10));
      if (fileMatch && fileMatch[1] && method === 'DELETE') return withAuth(handleFilesDelete, { minRole: 'admin' })(request, env, corsHeaders, parseInt(fileMatch[1], 10));

      // ---- Bonus Codes ----
      const bcMatch = path.match(/^\/api\/bonus-codes(?:\/(\d+))?$/);
      if (path === '/api/bonus-code-usage' && method === 'GET') return withAuth(handleBonusCodeUsageGet)(request, env, corsHeaders);
      if (path === '/api/bonus-codes' && method === 'GET') return withAuth(handleBonusCodesGet)(request, env, corsHeaders);
      if (path === '/api/bonus-codes' && method === 'POST') return withAuth(handleBonusCodesPost, { minRole: 'admin' })(request, env, corsHeaders);
      if (bcMatch && bcMatch[1] && method === 'GET') return withAuth(handleBonusCodesGetOne)(request, env, corsHeaders, parseInt(bcMatch[1], 10));
      if (bcMatch && bcMatch[1] && method === 'PUT') return withAuth(handleBonusCodesPut, { minRole: 'admin' })(request, env, corsHeaders, parseInt(bcMatch[1], 10));
      if (bcMatch && bcMatch[1] && method === 'DELETE') return withAuth(handleBonusCodesDelete, { minRole: 'admin' })(request, env, corsHeaders, parseInt(bcMatch[1], 10));

      // ---- Knowledge Sources ----
      const ksMatch = path.match(/^\/api\/knowledge-sources(?:\/(\d+))?$/);
      if (path === '/api/knowledge-sources' && method === 'GET') return withAuth(handleKnowledgeSourcesGet)(request, env, corsHeaders);
      if (path === '/api/knowledge-sources' && method === 'POST') return withAuth(handleKnowledgeSourcesPost)(request, env, corsHeaders);
      if (ksMatch && ksMatch[1] && method === 'GET') return withAuth(handleKnowledgeSourcesGetOne)(request, env, corsHeaders, parseInt(ksMatch[1], 10));
      if (ksMatch && ksMatch[1] && method === 'PUT') return withAuth(handleKnowledgeSourcesPut)(request, env, corsHeaders, parseInt(ksMatch[1], 10));
      if (ksMatch && ksMatch[1] && method === 'DELETE') return withAuth(handleKnowledgeSourcesDelete, { minRole: 'admin' })(request, env, corsHeaders, parseInt(ksMatch[1], 10));

      // ---- Sheet Integrations ----
      const siMatch = path.match(/^\/api\/sheet-integrations(?:\/(\d+))?$/);
      if (path === '/api/sheet-integrations' && method === 'GET') return withAuth(handleSheetIntegrationsGet)(request, env, corsHeaders);
      if (path === '/api/sheet-integrations' && method === 'POST') return withAuth(handleSheetIntegrationsPost)(request, env, corsHeaders);
      if (siMatch && siMatch[1] && method === 'PUT') return withAuth(handleSheetIntegrationsPut)(request, env, corsHeaders, parseInt(siMatch[1], 10));
      if (siMatch && siMatch[1] && method === 'DELETE') return withAuth(handleSheetIntegrationsDelete, { minRole: 'admin' })(request, env, corsHeaders, parseInt(siMatch[1], 10));

      // ---- Dashboard ----
      if (path === '/api/dashboard/stats' && method === 'GET') return withAuth(handleDashboardStats)(request, env, corsHeaders);

      // ---- Webhooks ----
      const whMatch = path.match(/^\/api\/webhooks(?:\/(\d+))?(?:\/test)?$/);
      if (path === '/api/webhooks/deliveries' && method === 'GET') return withAuth(handleWebhooksDeliveries)(request, env, corsHeaders);
      if (path === '/api/webhooks' && method === 'GET') return withAuth(handleWebhooksGet)(request, env, corsHeaders);
      if (path === '/api/webhooks' && method === 'POST') return withAuth(handleWebhooksPost, { minRole: 'admin' })(request, env, corsHeaders);
      if (whMatch && whMatch[1] && path.endsWith('/test') && method === 'POST') return withAuth(handleWebhooksTest, { minRole: 'admin' })(request, env, corsHeaders, parseInt(whMatch[1], 10));
      if (whMatch && whMatch[1] && !path.endsWith('/test') && method === 'GET') return withAuth(handleWebhooksGetOne)(request, env, corsHeaders, parseInt(whMatch[1], 10));
      if (whMatch && whMatch[1] && !path.endsWith('/test') && method === 'PUT') return withAuth(handleWebhooksPut, { minRole: 'admin' })(request, env, corsHeaders, parseInt(whMatch[1], 10));
      if (whMatch && whMatch[1] && !path.endsWith('/test') && method === 'DELETE') return withAuth(handleWebhooksDelete, { minRole: 'admin' })(request, env, corsHeaders, parseInt(whMatch[1], 10));

      // ---- Automation Rules ----
      const arMatch = path.match(/^\/api\/automation-rules(?:\/(\d+))?$/);
      if (path === '/api/automation-rules' && method === 'GET') return withAuth(handleAutomationRulesGet)(request, env, corsHeaders);
      if (path === '/api/automation-rules' && method === 'POST') return withAuth(handleAutomationRulesPost, { minRole: 'admin' })(request, env, corsHeaders);
      if (arMatch && arMatch[1] && method === 'GET') return withAuth(handleAutomationRulesGetOne)(request, env, corsHeaders, parseInt(arMatch[1], 10));
      if (arMatch && arMatch[1] && method === 'PUT') return withAuth(handleAutomationRulesPut, { minRole: 'admin' })(request, env, corsHeaders, parseInt(arMatch[1], 10));
      if (arMatch && arMatch[1] && method === 'DELETE') return withAuth(handleAutomationRulesDelete, { minRole: 'admin' })(request, env, corsHeaders, parseInt(arMatch[1], 10));

      // ---- Analytics ----
      if (path === '/api/analytics/summary' && method === 'GET') return withAuth(handleAnalyticsSummary)(request, env, corsHeaders);
      if (path === '/api/analytics/satisfaction' && method === 'GET') return withAuth(handleAnalyticsSatisfaction)(request, env, corsHeaders);
      if (path === '/api/analytics' && method === 'GET') return withAuth(handleAnalyticsGet)(request, env, corsHeaders);

      // ---- Conversation detail: messages / tags / reply ----
      const convMsgMatch = path.match(/^\/api\/conversations\/(\d+)\/messages$/);
      if (convMsgMatch && method === 'GET') return withAuth(handleConversationMessages)(request, env, corsHeaders, parseInt(convMsgMatch[1], 10));

      const convReplyMatch = path.match(/^\/api\/conversations\/(\d+)\/reply$/);
      if (convReplyMatch && method === 'POST') return withAuth(handleConversationReply)(request, env, corsHeaders, parseInt(convReplyMatch[1], 10));

      const convTagsMatch = path.match(/^\/api\/conversations\/(\d+)\/tags(?:\/(\d+))?$/);
      if (convTagsMatch && !convTagsMatch[2] && method === 'GET') return withAuth(handleConversationTagsGet)(request, env, corsHeaders, parseInt(convTagsMatch[1], 10));
      if (convTagsMatch && !convTagsMatch[2] && method === 'POST') return withAuth(handleConversationTagAdd)(request, env, corsHeaders, parseInt(convTagsMatch[1], 10));
      if (convTagsMatch && convTagsMatch[2] && method === 'DELETE') return withAuth(handleConversationTagRemove, { minRole: 'admin' })(request, env, corsHeaders, parseInt(convTagsMatch[1], 10), parseInt(convTagsMatch[2], 10));

      // ---- Messages ----
      const msgMatch = path.match(/^\/api\/messages(?:\/(\d+))?$/);
      if (path === '/api/messages' && method === 'GET') return withAuth(handleMessagesGet)(request, env, corsHeaders);
      if (path === '/api/messages' && method === 'POST') return withAuth(handleMessagesPost)(request, env, corsHeaders);
      if (msgMatch && msgMatch[1] && method === 'DELETE') return withAuth(handleMessagesDelete, { minRole: 'admin' })(request, env, corsHeaders, parseInt(msgMatch[1], 10));

      // ---- AI aux ----
      if (path === '/api/ai/conversation-mode' && method === 'POST') return withAuth(handleConversationModeSet)(request, env, corsHeaders);
      if (path === '/api/ai/activity-log' && method === 'GET') return withAuth(handleAIActivityLog)(request, env, corsHeaders);
      const aiConvMatch = path.match(/^\/api\/ai\/conversation\/(\d+)$/);
      if (aiConvMatch && method === 'GET') return withAuth(handleAIConversationGet)(request, env, corsHeaders, parseInt(aiConvMatch[1], 10));

      // ---- AI Characters ----
      const aiCharMatch = path.match(/^\/api\/ai-characters(?:\/(\d+))?$/);
      if (path === '/api/ai-characters' && method === 'GET') return withAuth(handleAiCharactersGet)(request, env, corsHeaders);
      if (path === '/api/ai-characters' && method === 'POST') return withAuth(handleAiCharactersPost, { minRole: 'admin' })(request, env, corsHeaders);
      if (aiCharMatch && aiCharMatch[1] && method === 'GET') return withAuth(handleAiCharactersGetOne)(request, env, corsHeaders, parseInt(aiCharMatch[1], 10));
      if (aiCharMatch && aiCharMatch[1] && method === 'PUT') return withAuth(handleAiCharactersPut, { minRole: 'admin' })(request, env, corsHeaders, parseInt(aiCharMatch[1], 10));
      if (aiCharMatch && aiCharMatch[1] && method === 'DELETE') return withAuth(handleAiCharactersDelete, { minRole: 'admin' })(request, env, corsHeaders, parseInt(aiCharMatch[1], 10));

      // ---- Staff Members ----
      const staffMatch = path.match(/^\/api\/staff-members(?:\/(\d+))?$/);
      if (path === '/api/staff-members' && method === 'GET') return withAuth(handleStaffMembersGet)(request, env, corsHeaders);
      if (path === '/api/staff-members' && method === 'POST') return withAuth(handleStaffMembersPost, { minRole: 'admin' })(request, env, corsHeaders);
      if (staffMatch && staffMatch[1] && method === 'GET') return withAuth(handleStaffMembersGetOne)(request, env, corsHeaders, parseInt(staffMatch[1], 10));
      if (staffMatch && staffMatch[1] && method === 'PUT') return withAuth(handleStaffMembersPut, { minRole: 'admin' })(request, env, corsHeaders, parseInt(staffMatch[1], 10));
      if (staffMatch && staffMatch[1] && method === 'DELETE') return withAuth(handleStaffMembersDelete, { minRole: 'admin' })(request, env, corsHeaders, parseInt(staffMatch[1], 10));

      // ---- Welcome Menu ----
      const wmItemMatch = path.match(/^\/api\/welcome-menu\/items(?:\/(\d+))?$/);
      if (path === '/api/welcome-menu' && method === 'GET') return withAuth(handleWelcomeMenuGet)(request, env, corsHeaders);
      if (path === '/api/welcome-menu' && method === 'PUT') return withAuth(handleWelcomeMenuPut)(request, env, corsHeaders);
      if (path === '/api/welcome-menu/items' && method === 'GET') return withAuth(handleWelcomeMenuItemsGet)(request, env, corsHeaders);
      if (path === '/api/welcome-menu/items' && method === 'POST') return withAuth(handleWelcomeMenuItemsPost, { minRole: 'admin' })(request, env, corsHeaders);
      if (wmItemMatch && wmItemMatch[1] && method === 'PUT') return withAuth(handleWelcomeMenuItemsPut, { minRole: 'admin' })(request, env, corsHeaders, parseInt(wmItemMatch[1], 10));
      if (wmItemMatch && wmItemMatch[1] && method === 'DELETE') return withAuth(handleWelcomeMenuItemsDelete, { minRole: 'admin' })(request, env, corsHeaders, parseInt(wmItemMatch[1], 10));

      // ---- Widget Config ----
      if (path === '/api/widget-config' && method === 'GET') return withAuth(handleWidgetConfigGet)(request, env, corsHeaders);
      if (path === '/api/widget-config' && method === 'PUT') return withAuth(handleWidgetConfigPut)(request, env, corsHeaders);

      return notFound(corsHeaders);

    } catch (e) {
      console.error('[router] unhandled error:', e.message, e.stack);
      return new Response(JSON.stringify({ error: 'Internal error' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
      });
    }
  },

  async scheduled(event, env, ctx) {
    return handleScheduled(event, env, ctx);
  },
};
