// ⚠️ 弊社側暫定実装 — tking510 納品版で置き換え予定
// /api/ai/activity-log — ai_stats テーブルから最近の AI 実行を返す

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };
function json(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, ...JSON_HEADERS } });
}

export async function handleAIActivityLog(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 500);
    const { results } = await env.DB.prepare(
      `SELECT id,
              date,
              model,
              intent,
              escalated,
              response_time_ms,
              input_length,
              created_at,
              NULL AS conversation_id,
              intent AS action,
              NULL AS confidence,
              CASE WHEN escalated = 1 THEN 'escalated' ELSE 'answered' END AS result
       FROM ai_stats
       ORDER BY created_at DESC
       LIMIT ?`
    ).bind(limit).all();
    return json({ success: true, activity: results || [], logs: results || [] }, 200, corsHeaders);
  } catch (e) {
    console.error('handleAIActivityLog:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}
