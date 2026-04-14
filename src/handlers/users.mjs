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

const USER_COLS = ['tenant_id', 'email', 'name', 'role', 'avatar_url', 'metadata', 'is_active'];
// HTML expects a `language` field; table has no such column — expose NULL alias.
const USER_SELECT = 'id, tenant_id, email, name, role, avatar_url, metadata, is_active, created_at, last_seen_at, NULL AS language';

// If body.language is present, stuff it into metadata JSON instead of a real column.
function foldLanguageIntoMetadata(body) {
  if (!body || body.language === undefined) return body;
  const out = { ...body };
  let meta = out.metadata;
  if (typeof meta === 'string') {
    try { meta = JSON.parse(meta); } catch { meta = {}; }
  }
  if (!meta || typeof meta !== 'object') meta = {};
  meta.language = out.language;
  out.metadata = JSON.stringify(meta);
  delete out.language;
  return out;
}

export async function handleUsersGet(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenant_id') || 'tenant_default';
    const { results } = await env.DB.prepare(
      `SELECT ${USER_SELECT} FROM users WHERE tenant_id = ? ORDER BY id ASC`
    ).bind(tenantId).all();
    return ok({ success: true, users: results || [] }, corsHeaders);
  } catch (e) {
    console.error('handleUsersGet:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleUsersPost(request, env, corsHeaders) {
  const parsed = await parseJson(request, corsHeaders);
  if (parsed.response) return parsed.response;
  const body = foldLanguageIntoMetadata(parsed.body);
  const {
    tenant_id = 'tenant_default', email = null, name,
    role = 'user', avatar_url = null, metadata = null, is_active = 1,
  } = body;
  if (!name) return err('name is required', 400, corsHeaders);
  try {
    const result = await env.DB.prepare(
      `INSERT INTO users (tenant_id, email, name, role, avatar_url, metadata, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(tenant_id, email, name, role, avatar_url, metadata, is_active ? 1 : 0).run();
    const id = result.meta?.last_row_id;
    const user = await env.DB.prepare(`SELECT ${USER_SELECT} FROM users WHERE id = ?`).bind(id).first();
    return json({ success: true, user }, 201, corsHeaders);
  } catch (e) {
    console.error('handleUsersPost:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleUsersPut(request, env, corsHeaders, id) {
  const parsed = await parseJson(request, corsHeaders);
  if (parsed.response) return parsed.response;
  try {
    const existing = await env.DB.prepare(`SELECT ${USER_SELECT} FROM users WHERE id = ?`).bind(id).first();
    if (!existing) return err('User not found', 404, corsHeaders);
    const body = foldLanguageIntoMetadata(parsed.body);
    const sets = [];
    const vals = [];
    for (const col of USER_COLS) {
      if (col in body) {
        sets.push(`${col} = ?`);
        vals.push(col === 'is_active' ? (body[col] ? 1 : 0) : body[col]);
      }
    }
    if (sets.length === 0) return ok({ success: true, user: existing }, corsHeaders);
    vals.push(id);
    await env.DB.prepare(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    const user = await env.DB.prepare(`SELECT ${USER_SELECT} FROM users WHERE id = ?`).bind(id).first();
    return ok({ success: true, user }, corsHeaders);
  } catch (e) {
    console.error('handleUsersPut:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleUsersDelete(request, env, corsHeaders, id) {
  try {
    const existing = await env.DB.prepare('SELECT id FROM users WHERE id = ?').bind(id).first();
    if (!existing) return err('User not found', 404, corsHeaders);
    await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run();
    return ok({ success: true, deleted: Number(id) }, corsHeaders);
  } catch (e) {
    console.error('handleUsersDelete:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}
