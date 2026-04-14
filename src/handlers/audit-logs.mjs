// ⚠️ 弊社側暫定実装 — tking510 納品版で置き換え予定

import { authenticate } from '../auth-helper.mjs';

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

function json(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...JSON_HEADERS },
  });
}

export async function handleAuditLogsGet(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10) || 100, 1000);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10) || 0;
    const userId = url.searchParams.get('user_id');
    const action = url.searchParams.get('action');
    const daysParam = parseInt(url.searchParams.get('days') || '0', 10);
    const q = url.searchParams.get('q');

    const where = [];
    const binds = [];
    if (userId) { where.push('user_id = ?'); binds.push(userId); }
    if (action) { where.push('action = ?'); binds.push(action); }
    if (Number.isFinite(daysParam) && daysParam > 0) {
      where.push("created_at >= datetime('now', ?)");
      binds.push(`-${daysParam} days`);
    }
    if (q && q.trim()) {
      where.push('(action LIKE ? OR resource_type LIKE ? OR details LIKE ?)');
      const like = `%${q}%`;
      binds.push(like, like, like);
    }

    // Alias columns for HTML-expected shape.
    const sql = `SELECT *, user_id AS actor_id, NULL AS actor_name, 'user' AS actor_type
      FROM audit_logs${where.length ? ' WHERE ' + where.join(' AND ') : ''}
      ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    binds.push(limit, offset);

    const { results } = await env.DB.prepare(sql).bind(...binds).all();
    return json({ success: true, logs: results || [] }, 200, corsHeaders);
  } catch (e) {
    console.error('handleAuditLogsGet:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleAuditLogsPost(request, env, corsHeaders) {
  // Bind user_id to authenticated principal — body-supplied user_id is IGNORED.
  const auth = await authenticate(request, env);
  if (!auth.ok) return json({ success: false, error: 'Unauthorized' }, 401, corsHeaders);

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON' }, 400, corsHeaders);
  }

  try {
    const {
      tenant_id = 'tenant_default',
      action,
      resource_type = null,
      resource_id = null,
      details = null,
    } = body || {};

    if (!action) {
      return json({ success: false, error: 'action is required' }, 400, corsHeaders);
    }

    // Derive user_id from authenticated principal; admin_token path writes null.
    const userId = auth.principal?.type === 'session' ? auth.principal.staff_id : null;

    const ip = request.headers.get('CF-Connecting-IP') || null;
    const ua = request.headers.get('User-Agent') || null;
    const detailsStr = typeof details === 'string' ? details : (details ? JSON.stringify(details) : null);

    const result = await env.DB.prepare(
      `INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, details, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(tenant_id, userId, action, resource_type, resource_id, detailsStr, ip, ua).run();

    return json({ success: true, id: result.meta?.last_row_id }, 201, corsHeaders);
  } catch (e) {
    console.error('handleAuditLogsPost:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}
