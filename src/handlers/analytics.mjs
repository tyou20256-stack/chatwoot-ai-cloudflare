// 弊社側暫定実装 — tking510 納品版で置き換え予定

const json = (obj, status, corsHeaders) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
const ok = (obj, corsHeaders) => json(obj, 200, corsHeaders);
const err = (msg, status, corsHeaders) => json({ success: false, error: msg }, status, corsHeaders);

function parseDays(url) {
  let days = parseInt(url.searchParams.get('days') || '7', 10);
  if (!Number.isFinite(days)) days = 7;
  if (days < 1) days = 1;
  if (days > 365) days = 365;
  return days;
}

export async function handleAnalyticsGet(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const days = parseDays(url);
    const since = `-${days} days`;

    const totalRow = await env.DB.prepare(
      `SELECT COUNT(*) AS c FROM conversations WHERE created_at >= datetime('now', ?)`
    ).bind(since).first();
    const total = totalRow?.c || 0;

    const byStatus = await env.DB.prepare(
      `SELECT status, COUNT(*) AS count FROM conversations
       WHERE created_at >= datetime('now', ?)
       GROUP BY status`
    ).bind(since).all();

    const daily = await env.DB.prepare(
      `SELECT date(created_at) AS date, COUNT(*) AS count FROM conversations
       WHERE created_at >= datetime('now', ?)
       GROUP BY date(created_at)
       ORDER BY date ASC`
    ).bind(since).all();

    // Hourly distribution (best-effort; stub if the query fails).
    let hourlyResults = [];
    try {
      const hourly = await env.DB.prepare(
        `SELECT strftime('%H', created_at) AS hour, COUNT(*) AS count FROM conversations
         WHERE created_at >= datetime('now', ?)
         GROUP BY hour ORDER BY hour ASC`
      ).bind(since).all();
      hourlyResults = hourly.results || [];
    } catch (_) { hourlyResults = []; }

    // Intent breakdown from ai_stats (best-effort).
    let intentResults = [];
    try {
      const intent = await env.DB.prepare(
        `SELECT intent, COUNT(*) AS count FROM ai_stats
         WHERE created_at >= datetime('now', ?)
         GROUP BY intent ORDER BY count DESC`
      ).bind(since).all();
      intentResults = intent.results || [];
    } catch (_) { intentResults = []; }

    // Language breakdown — messages.metadata may contain language; skip if join fails.
    const languageResults = [];

    return ok({
      success: true,
      total_conversations: total,
      daily_conversations: daily.results || [],
      language_breakdown: languageResults,
      intent_breakdown: intentResults,
      hourly_distribution: hourlyResults,
      analytics: {
        total,
        by_status: byStatus.results || [],
        daily: daily.results || [],
      },
    }, corsHeaders);
  } catch (e) {
    console.error('handleAnalyticsGet:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleAnalyticsSummary(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const days = parseDays(url);
    const since = `-${days} days`;

    // 実スキーマに first_response_time_seconds / resolution_time_seconds 列がないため
    // resolved_at - created_at の差分（秒）で代替算出
    const convRow = await env.DB.prepare(
      `SELECT
         COUNT(*) AS total_conversations,
         SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved,
         SUM(CASE WHEN ai_handled = 1 THEN 1 ELSE 0 END) AS ai_handled,
         NULL AS avg_first_response_seconds,
         AVG(CASE WHEN resolved_at IS NOT NULL
                  THEN (julianday(resolved_at) - julianday(created_at)) * 86400 END) AS avg_resolution_seconds
       FROM conversations
       WHERE created_at >= datetime('now', ?)`
    ).bind(since).first();

    const aiRow = await env.DB.prepare(
      `SELECT
         COUNT(*) AS total_ai_requests,
         SUM(escalated) AS total_escalated
       FROM ai_stats
       WHERE created_at >= datetime('now', ?)`
    ).bind(since).first();

    const byModel = await env.DB.prepare(
      `SELECT model, COUNT(*) AS count,
              AVG(response_time_ms) AS avg_response_time_ms,
              SUM(escalated) AS escalated
       FROM ai_stats
       WHERE created_at >= datetime('now', ?)
       GROUP BY model
       ORDER BY count DESC
       LIMIT 5`
    ).bind(since).all();

    const totalAi = aiRow?.total_ai_requests || 0;
    const totalEscalated = aiRow?.total_escalated || 0;
    const escalationRate = totalAi > 0 ? (totalEscalated / totalAi) * 100 : 0;

    return ok({
      success: true,
      // HTML-expected flat fields.
      metric_totals: [],
      avg_ai_confidence: null,
      top_languages: [],
      summary: {
        total_conversations: convRow?.total_conversations || 0,
        resolved: convRow?.resolved || 0,
        ai_handled: convRow?.ai_handled || 0,
        avg_first_response_seconds: convRow?.avg_first_response_seconds ?? null,
        avg_resolution_seconds: convRow?.avg_resolution_seconds ?? null,
        total_ai_requests: totalAi,
        ai_escalation_rate: escalationRate,
        by_model: byModel.results || [],
      },
    }, corsHeaders);
  } catch (e) {
    console.error('handleAnalyticsSummary:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleAnalyticsSatisfaction(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const days = parseDays(url);
    const since = `-${days} days`;

    const row = await env.DB.prepare(
      `SELECT AVG(satisfaction_rating) AS avg_rating, COUNT(*) AS rated
       FROM conversations
       WHERE satisfaction_rating IS NOT NULL
         AND created_at >= datetime('now', ?)`
    ).bind(since).first();

    const distRes = await env.DB.prepare(
      `SELECT satisfaction_rating AS rating, COUNT(*) AS count
       FROM conversations
       WHERE satisfaction_rating IS NOT NULL
         AND created_at >= datetime('now', ?)
       GROUP BY satisfaction_rating`
    ).bind(since).all();

    const distMap = new Map();
    for (const r of (distRes.results || [])) {
      distMap.set(Number(r.rating), r.count);
    }
    const distribution = [];
    for (let i = 1; i <= 5; i++) {
      distribution.push({ rating: i, count: distMap.get(i) || 0 });
    }

    // Resolution time aggregates.
    let resolution_time = { average_hours: null, min_hours: null, max_hours: null };
    try {
      const rt = await env.DB.prepare(
        `SELECT
           AVG((julianday(resolved_at) - julianday(created_at)) * 24) AS average_hours,
           MIN((julianday(resolved_at) - julianday(created_at)) * 24) AS min_hours,
           MAX((julianday(resolved_at) - julianday(created_at)) * 24) AS max_hours
         FROM conversations
         WHERE resolved_at IS NOT NULL AND created_at >= datetime('now', ?)`
      ).bind(since).first();
      if (rt) resolution_time = {
        average_hours: rt.average_hours ?? null,
        min_hours: rt.min_hours ?? null,
        max_hours: rt.max_hours ?? null,
      };
    } catch (_) { /* stub on failure */ }

    // AI vs human counts.
    let ai_vs_human = [];
    try {
      const avh = await env.DB.prepare(
        `SELECT ai_handled, COUNT(*) AS count FROM conversations
         WHERE created_at >= datetime('now', ?)
         GROUP BY ai_handled`
      ).bind(since).all();
      ai_vs_human = avh.results || [];
    } catch (_) { ai_vs_human = []; }

    return ok({
      success: true,
      resolution_time,
      ai_vs_human,
      tag_performance: [],
      satisfaction: {
        average_rating: row?.avg_rating ?? null,
        rated_conversations: row?.rated || 0,
        distribution,
      },
    }, corsHeaders);
  } catch (e) {
    console.error('handleAnalyticsSatisfaction:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}
