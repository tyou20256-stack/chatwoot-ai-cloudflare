// 弊社側暫定実装 — tking510 納品版で置き換え予定

const json = (obj, status, corsHeaders) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });

const ok = (obj, corsHeaders) => json(obj, 200, corsHeaders);
const err = (msg, status, corsHeaders) => json({ success: false, error: msg }, status, corsHeaders);

async function parseJson(request, corsHeaders) {
  try {
    return { body: await request.json() };
  } catch {
    return { response: err('Invalid JSON', 400, corsHeaders) };
  }
}

// HTML互換: slug, plan, business_hours_start, business_hours_end, timezone を settings JSON に格納
const TENANT_COLS = ['name', 'domain', 'settings', 'is_active'];
const SETTINGS_ALIAS_FIELDS = ['slug', 'plan', 'business_hours_start', 'business_hours_end', 'timezone'];

function packSettings(body) {
  // HTML から来る alias フィールドを settings JSON にまとめる
  const existing = body.settings ? (typeof body.settings === 'string' ? safeJson(body.settings) : body.settings) : {};
  const merged = { ...(existing || {}) };
  for (const k of SETTINGS_ALIAS_FIELDS) {
    if (k in body && body[k] !== undefined) merged[k] = body[k];
  }
  return Object.keys(merged).length > 0 ? JSON.stringify(merged) : null;
}
function safeJson(s) { try { return JSON.parse(s); } catch { return {}; } }

function expandSettings(row) {
  if (!row) return row;
  const s = safeJson(row.settings || '{}');
  return { ...row, ...SETTINGS_ALIAS_FIELDS.reduce((acc, k) => (s[k] !== undefined ? (acc[k] = s[k], acc) : acc), {}) };
}

function slugify(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'tenant';
}

export async function handleTenantsGet(request, env, corsHeaders) {
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM tenants ORDER BY created_at ASC'
    ).all();
    const tenants = (results || []).map(expandSettings);
    return ok({ success: true, tenants }, corsHeaders);
  } catch (e) {
    console.error('handleTenantsGet:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleTenantsPost(request, env, corsHeaders) {
  const parsed = await parseJson(request, corsHeaders);
  if (parsed.response) return parsed.response;
  const { name, domain = null, is_active = 1 } = parsed.body;
  if (!name) return err('name is required', 400, corsHeaders);
  // id が無ければ slug or name から自動生成
  const id = parsed.body.id || parsed.body.slug || `${slugify(name)}_${Math.random().toString(36).slice(2, 8)}`;
  const settings = packSettings(parsed.body);
  try {
    await env.DB.prepare(
      `INSERT INTO tenants (id, name, domain, settings, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(id, name, domain, settings, is_active ? 1 : 0).run();
    const row = await env.DB.prepare('SELECT * FROM tenants WHERE id = ?').bind(id).first();
    return json({ success: true, tenant: expandSettings(row) }, 201, corsHeaders);
  } catch (e) {
    console.error('handleTenantsPost:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleTenantsPut(request, env, corsHeaders, id) {
  const parsed = await parseJson(request, corsHeaders);
  if (parsed.response) return parsed.response;
  try {
    const existing = await env.DB.prepare('SELECT * FROM tenants WHERE id = ?').bind(id).first();
    if (!existing) return err('Tenant not found', 404, corsHeaders);
    const sets = [];
    const vals = [];
    for (const col of TENANT_COLS) {
      if (col in parsed.body && col !== 'settings') {
        sets.push(`${col} = ?`);
        vals.push(col === 'is_active' ? (parsed.body[col] ? 1 : 0) : parsed.body[col]);
      }
    }
    // settings を既存とマージして alias フィールドも反映
    const hasAlias = SETTINGS_ALIAS_FIELDS.some(k => k in parsed.body) || 'settings' in parsed.body;
    if (hasAlias) {
      const existingSettings = safeJson(existing.settings || '{}');
      const merged = { ...existingSettings };
      for (const k of SETTINGS_ALIAS_FIELDS) {
        if (k in parsed.body) merged[k] = parsed.body[k];
      }
      if (parsed.body.settings && typeof parsed.body.settings === 'object') Object.assign(merged, parsed.body.settings);
      sets.push('settings = ?');
      vals.push(JSON.stringify(merged));
    }
    if (sets.length === 0) return ok({ success: true, tenant: expandSettings(existing) }, corsHeaders);
    sets.push("updated_at = datetime('now')");
    vals.push(id);
    await env.DB.prepare(`UPDATE tenants SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    const row = await env.DB.prepare('SELECT * FROM tenants WHERE id = ?').bind(id).first();
    return ok({ success: true, tenant: expandSettings(row) }, corsHeaders);
  } catch (e) {
    console.error('handleTenantsPut:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleTenantsDelete(request, env, corsHeaders, id) {
  if (id === 'tenant_default') return err('Cannot delete default tenant', 400, corsHeaders);
  try {
    const existing = await env.DB.prepare('SELECT id FROM tenants WHERE id = ?').bind(id).first();
    if (!existing) return err('Tenant not found', 404, corsHeaders);
    await env.DB.prepare('DELETE FROM tenants WHERE id = ?').bind(id).run();
    return ok({ success: true, deleted: id }, corsHeaders);
  } catch (e) {
    console.error('handleTenantsDelete:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}
