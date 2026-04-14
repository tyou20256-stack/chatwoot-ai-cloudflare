// ⚠️ 弊社側暫定実装 — tking510 納品版で置き換え予定

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

function getTenantId(request, body) {
  const url = new URL(request.url);
  return (body && body.tenant_id) || url.searchParams.get('tenant_id') || 'tenant_default';
}

export async function handleWidgetConfigGet(request, env, corsHeaders) {
  try {
    const tenantId = getTenantId(request, null);
    const { results } = await env.DB.prepare(
      'SELECT key, value FROM widget_config WHERE tenant_id = ?'
    ).bind(tenantId).all();
    const config = {};
    for (const row of results || []) {
      config[row.key] = row.value;
    }
    return ok({ success: true, config }, corsHeaders);
  } catch (e) {
    console.error('handleWidgetConfigGet:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleWidgetConfigPut(request, env, corsHeaders) {
  const parsed = await parseJson(request, corsHeaders);
  if (parsed.response) return parsed.response;
  const body = parsed.body || {};
  const tenantId = getTenantId(request, body);
  try {
    // body は {key: value, ...} のフラット JSON。tenant_id は予約フィールドで除外。
    const entries = Object.entries(body).filter(([k]) => k !== 'tenant_id');
    let updated = 0;
    for (const [key, rawValue] of entries) {
      if (!key || typeof key !== 'string') continue;
      const value = rawValue === null || rawValue === undefined
        ? null
        : (typeof rawValue === 'string' ? rawValue : JSON.stringify(rawValue));
      const existing = await env.DB.prepare(
        'SELECT id FROM widget_config WHERE tenant_id = ? AND key = ?'
      ).bind(tenantId, key).first();
      if (existing) {
        await env.DB.prepare(
          `UPDATE widget_config SET value = ?, updated_at = datetime('now') WHERE id = ?`
        ).bind(value, existing.id).run();
      } else {
        await env.DB.prepare(
          `INSERT INTO widget_config (tenant_id, key, value) VALUES (?, ?, ?)`
        ).bind(tenantId, key, value).run();
      }
      updated++;
    }
    return ok({ success: true, updated }, corsHeaders);
  } catch (e) {
    console.error('handleWidgetConfigPut:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}
