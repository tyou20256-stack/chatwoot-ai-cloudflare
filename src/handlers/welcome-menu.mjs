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

const ITEM_COLS = ['emoji', 'label', 'position', 'is_active'];

async function ensureSettings(env, tenantId) {
  const row = await env.DB.prepare(
    'SELECT * FROM welcome_menu_settings WHERE tenant_id = ? ORDER BY id ASC LIMIT 1'
  ).bind(tenantId).first();
  if (row) return row;
  await env.DB.prepare(
    `INSERT INTO welcome_menu_settings (tenant_id, welcome_message, subtitle, is_active)
     VALUES (?, 'スロット天国カスタマーサポートへようこそ！', 'ご希望の項目をお選びください。', 1)`
  ).bind(tenantId).run();
  return await env.DB.prepare(
    'SELECT * FROM welcome_menu_settings WHERE tenant_id = ? ORDER BY id ASC LIMIT 1'
  ).bind(tenantId).first();
}

export async function handleWelcomeMenuGet(request, env, corsHeaders) {
  try {
    const tenantId = getTenantId(request, null);
    const settings = await ensureSettings(env, tenantId);
    const { results } = await env.DB.prepare(
      'SELECT * FROM welcome_menu_items WHERE tenant_id = ? ORDER BY position ASC, id ASC'
    ).bind(tenantId).all();
    return ok({
      success: true,
      welcome_message: settings.welcome_message,
      subtitle: settings.subtitle,
      is_active: settings.is_active,
      items: results || [],
    }, corsHeaders);
  } catch (e) {
    console.error('handleWelcomeMenuGet:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleWelcomeMenuPut(request, env, corsHeaders) {
  const parsed = await parseJson(request, corsHeaders);
  if (parsed.response) return parsed.response;
  const body = parsed.body || {};
  const tenantId = getTenantId(request, body);
  try {
    const existing = await env.DB.prepare(
      'SELECT * FROM welcome_menu_settings WHERE tenant_id = ? ORDER BY id ASC LIMIT 1'
    ).bind(tenantId).first();

    if (!existing) {
      await env.DB.prepare(
        `INSERT INTO welcome_menu_settings (tenant_id, welcome_message, subtitle, is_active)
         VALUES (?, ?, ?, ?)`
      ).bind(
        tenantId,
        body.welcome_message ?? 'スロット天国カスタマーサポートへようこそ！',
        body.subtitle ?? 'ご希望の項目をお選びください。',
        body.is_active === undefined ? 1 : (body.is_active ? 1 : 0),
      ).run();
    } else {
      const sets = [];
      const vals = [];
      if ('welcome_message' in body) { sets.push('welcome_message = ?'); vals.push(body.welcome_message); }
      if ('subtitle' in body) { sets.push('subtitle = ?'); vals.push(body.subtitle); }
      if ('is_active' in body) { sets.push('is_active = ?'); vals.push(body.is_active ? 1 : 0); }
      if (sets.length > 0) {
        sets.push("updated_at = datetime('now')");
        vals.push(existing.id);
        await env.DB.prepare(
          `UPDATE welcome_menu_settings SET ${sets.join(', ')} WHERE id = ?`
        ).bind(...vals).run();
      }
    }

    const settings = await env.DB.prepare(
      'SELECT * FROM welcome_menu_settings WHERE tenant_id = ? ORDER BY id ASC LIMIT 1'
    ).bind(tenantId).first();
    return ok({ success: true, settings }, corsHeaders);
  } catch (e) {
    console.error('handleWelcomeMenuPut:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleWelcomeMenuItemsGet(request, env, corsHeaders) {
  try {
    const tenantId = getTenantId(request, null);
    const { results } = await env.DB.prepare(
      'SELECT * FROM welcome_menu_items WHERE tenant_id = ? ORDER BY position ASC, id ASC'
    ).bind(tenantId).all();
    return ok({ success: true, items: results || [] }, corsHeaders);
  } catch (e) {
    console.error('handleWelcomeMenuItemsGet:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleWelcomeMenuItemsPost(request, env, corsHeaders) {
  const parsed = await parseJson(request, corsHeaders);
  if (parsed.response) return parsed.response;
  const body = parsed.body || {};
  const tenantId = getTenantId(request, body);
  if (!body.label) return err('label is required', 400, corsHeaders);
  try {
    const result = await env.DB.prepare(
      `INSERT INTO welcome_menu_items (tenant_id, emoji, label, position, is_active)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(
      tenantId,
      body.emoji ?? null,
      body.label,
      Number.isFinite(Number(body.position)) ? Number(body.position) : 0,
      body.is_active === undefined ? 1 : (body.is_active ? 1 : 0),
    ).run();
    const id = result.meta.last_row_id;
    const item = await env.DB.prepare('SELECT * FROM welcome_menu_items WHERE id = ?').bind(id).first();
    return json({ success: true, item }, 201, corsHeaders);
  } catch (e) {
    console.error('handleWelcomeMenuItemsPost:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleWelcomeMenuItemsPut(request, env, corsHeaders, id) {
  const parsed = await parseJson(request, corsHeaders);
  if (parsed.response) return parsed.response;
  const body = parsed.body || {};
  try {
    const existing = await env.DB.prepare('SELECT * FROM welcome_menu_items WHERE id = ?').bind(id).first();
    if (!existing) return err('Item not found', 404, corsHeaders);
    const sets = [];
    const vals = [];
    for (const col of ITEM_COLS) {
      if (col in body) {
        sets.push(`${col} = ?`);
        if (col === 'is_active') vals.push(body[col] ? 1 : 0);
        else if (col === 'position') vals.push(Number.isFinite(Number(body[col])) ? Number(body[col]) : 0);
        else vals.push(body[col]);
      }
    }
    if (sets.length === 0) return ok({ success: true, item: existing }, corsHeaders);
    sets.push("updated_at = datetime('now')");
    vals.push(id);
    await env.DB.prepare(
      `UPDATE welcome_menu_items SET ${sets.join(', ')} WHERE id = ?`
    ).bind(...vals).run();
    const item = await env.DB.prepare('SELECT * FROM welcome_menu_items WHERE id = ?').bind(id).first();
    return ok({ success: true, item }, corsHeaders);
  } catch (e) {
    console.error('handleWelcomeMenuItemsPut:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleWelcomeMenuItemsDelete(request, env, corsHeaders, id) {
  try {
    const existing = await env.DB.prepare('SELECT id FROM welcome_menu_items WHERE id = ?').bind(id).first();
    if (!existing) return err('Item not found', 404, corsHeaders);
    await env.DB.prepare('DELETE FROM welcome_menu_items WHERE id = ?').bind(id).run();
    return ok({ success: true, deleted: id }, corsHeaders);
  } catch (e) {
    console.error('handleWelcomeMenuItemsDelete:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}
