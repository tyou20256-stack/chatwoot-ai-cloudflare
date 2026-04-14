// 弊社側暫定実装 — tking510 納品版で置き換え予定

const json = (obj, status, corsHeaders) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
const ok = (obj, corsHeaders) => json(obj, 200, corsHeaders);
const err = (msg, status, corsHeaders) => json({ success: false, error: msg }, status, corsHeaders);

async function parseJson(request, corsHeaders) {
  try { return { body: await request.json() }; }
  catch { return { response: err('Invalid JSON', 400, corsHeaders) }; }
}

// NOTE: HTML may send `escalation_enabled` and `notify_before_breach_minutes`.
// Schema lacks these columns, so we silently ignore them (don't fail the request).
const SLA_COLS = ['tenant_id', 'name', 'priority', 'first_response_minutes', 'resolution_minutes', 'business_hours_only', 'is_active'];

export async function handleSlaGet(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenant_id') || 'tenant_default';
    const { results } = await env.DB.prepare(
      'SELECT * FROM sla_policies WHERE tenant_id = ? ORDER BY id ASC'
    ).bind(tenantId).all();
    const rows = results || [];
    // Return both keys: `policies` (HTML-expected) and `sla_policies` (legacy).
    return ok({ success: true, policies: rows, sla_policies: rows }, corsHeaders);
  } catch (e) {
    console.error('handleSlaGet:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleSlaPost(request, env, corsHeaders) {
  const parsed = await parseJson(request, corsHeaders);
  if (parsed.response) return parsed.response;
  const {
    tenant_id = 'tenant_default', name, priority = null,
    first_response_minutes = null, resolution_minutes = null,
    business_hours_only = 1, is_active = 1,
  } = parsed.body;
  if (!name) return err('name is required', 400, corsHeaders);
  try {
    const result = await env.DB.prepare(
      `INSERT INTO sla_policies (tenant_id, name, priority, first_response_minutes, resolution_minutes, business_hours_only, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(tenant_id, name, priority, first_response_minutes, resolution_minutes, business_hours_only ? 1 : 0, is_active ? 1 : 0).run();
    const id = result.meta?.last_row_id;
    const sla_policy = await env.DB.prepare('SELECT * FROM sla_policies WHERE id = ?').bind(id).first();
    return json({ success: true, sla_policy }, 201, corsHeaders);
  } catch (e) {
    console.error('handleSlaPost:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleSlaPut(request, env, corsHeaders, id) {
  const parsed = await parseJson(request, corsHeaders);
  if (parsed.response) return parsed.response;
  try {
    const existing = await env.DB.prepare('SELECT * FROM sla_policies WHERE id = ?').bind(id).first();
    if (!existing) return err('SLA policy not found', 404, corsHeaders);
    const sets = [];
    const vals = [];
    for (const col of SLA_COLS) {
      if (col in parsed.body) {
        sets.push(`${col} = ?`);
        const v = parsed.body[col];
        vals.push((col === 'is_active' || col === 'business_hours_only') ? (v ? 1 : 0) : v);
      }
    }
    if (sets.length === 0) return ok({ success: true, sla_policy: existing }, corsHeaders);
    vals.push(id);
    await env.DB.prepare(`UPDATE sla_policies SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    const sla_policy = await env.DB.prepare('SELECT * FROM sla_policies WHERE id = ?').bind(id).first();
    return ok({ success: true, sla_policy }, corsHeaders);
  } catch (e) {
    console.error('handleSlaPut:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleSlaDelete(request, env, corsHeaders, id) {
  try {
    const existing = await env.DB.prepare('SELECT id FROM sla_policies WHERE id = ?').bind(id).first();
    if (!existing) return err('SLA policy not found', 404, corsHeaders);
    await env.DB.prepare('DELETE FROM sla_policies WHERE id = ?').bind(id).run();
    return ok({ success: true, deleted: Number(id) }, corsHeaders);
  } catch (e) {
    console.error('handleSlaDelete:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleSlaDashboard(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenant_id') || 'tenant_default';
    const row = await env.DB.prepare(
      'SELECT COUNT(*) AS total FROM sla_policies WHERE tenant_id = ? AND is_active = 1'
    ).bind(tenantId).first();
    const total = row?.total || 0;
    // HTML-flat shape + legacy nested sla_stats.
    return ok({
      success: true,
      met_today: 0,
      breached_today: 0,
      at_risk: 0,
      avg_response_minutes: 0,
      recent_events: [],
      sla_stats: { total, breached: 0, within_sla: total },
    }, corsHeaders);
  } catch (e) {
    console.error('handleSlaDashboard:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}
