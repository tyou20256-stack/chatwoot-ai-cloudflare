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

const TAG_COLS = ['tenant_id', 'name', 'color', 'description'];

export async function handleTagsGet(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenant_id') || 'tenant_default';
    const { results } = await env.DB.prepare(
      'SELECT * FROM tags WHERE tenant_id = ? ORDER BY name ASC'
    ).bind(tenantId).all();
    return ok({ success: true, tags: results || [] }, corsHeaders);
  } catch (e) {
    console.error('handleTagsGet:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleTagsPost(request, env, corsHeaders) {
  const parsed = await parseJson(request, corsHeaders);
  if (parsed.response) return parsed.response;
  const { tenant_id = 'tenant_default', name, color = '#6366f1', description = null } = parsed.body;
  if (!name) return err('name is required', 400, corsHeaders);
  try {
    const result = await env.DB.prepare(
      `INSERT INTO tags (tenant_id, name, color, description, created_at)
       VALUES (?, ?, ?, ?, datetime('now'))`
    ).bind(tenant_id, name, color, description).run();
    const id = result.meta?.last_row_id;
    const tag = await env.DB.prepare('SELECT * FROM tags WHERE id = ?').bind(id).first();
    return json({ success: true, tag }, 201, corsHeaders);
  } catch (e) {
    console.error('handleTagsPost:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleTagsPut(request, env, corsHeaders, id) {
  const parsed = await parseJson(request, corsHeaders);
  if (parsed.response) return parsed.response;
  try {
    const existing = await env.DB.prepare('SELECT * FROM tags WHERE id = ?').bind(id).first();
    if (!existing) return err('Tag not found', 404, corsHeaders);
    const sets = [];
    const vals = [];
    for (const col of TAG_COLS) {
      if (col in parsed.body) { sets.push(`${col} = ?`); vals.push(parsed.body[col]); }
    }
    if (sets.length === 0) return ok({ success: true, tag: existing }, corsHeaders);
    vals.push(id);
    await env.DB.prepare(`UPDATE tags SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    const tag = await env.DB.prepare('SELECT * FROM tags WHERE id = ?').bind(id).first();
    return ok({ success: true, tag }, corsHeaders);
  } catch (e) {
    console.error('handleTagsPut:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleTagsDelete(request, env, corsHeaders, id) {
  try {
    const existing = await env.DB.prepare('SELECT id FROM tags WHERE id = ?').bind(id).first();
    if (!existing) return err('Tag not found', 404, corsHeaders);
    await env.DB.prepare('DELETE FROM tags WHERE id = ?').bind(id).run();
    return ok({ success: true, deleted: Number(id) }, corsHeaders);
  } catch (e) {
    console.error('handleTagsDelete:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}
