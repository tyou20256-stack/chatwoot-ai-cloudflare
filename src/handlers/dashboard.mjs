// ⚠️ 弊社側暫定実装 — tking510 納品版で置き換え予定

import { withEtag } from '../etag-helper.mjs';

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

function json(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...JSON_HEADERS },
  });
}

export async function handleDashboardStats(request, env, corsHeaders) {
  try {
    const row = await env.DB.prepare(
      `SELECT
         COUNT(*) AS total,
         SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open_count,
         SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolved_count,
         SUM(CASE WHEN ai_handled = 1 THEN 1 ELSE 0 END) AS ai_count
       FROM conversations`
    ).first();

    const total = Number(row?.total || 0);
    const open = Number(row?.open_count || 0);
    const resolved = Number(row?.resolved_count || 0);
    const aiCount = Number(row?.ai_count || 0);
    const ai_rate = total > 0 ? Math.round((aiCount / total) * 100) : 0;

    // HTML互換のため、ネスト形状 + フラット形状の両方を返す
    const body = JSON.stringify({
      success: true,
      stats: { total, open, resolved, ai_rate },
      total_conversations: total,
      open_conversations: open,
      resolved_conversations: resolved,
      ai_resolution_rate: ai_rate,
    });
    return await withEtag(request, body, 200, corsHeaders);
  } catch (e) {
    console.error('handleDashboardStats:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}
