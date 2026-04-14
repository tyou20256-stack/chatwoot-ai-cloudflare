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

// 実スキーマに tenant_id 列が存在しない
const CH_COLS = ['type', 'name', 'webhook_url', 'config', 'is_active'];

export async function handleChannelsGet(request, env, corsHeaders) {
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM channels ORDER BY id ASC'
    ).all();
    return ok({ success: true, channels: results || [] }, corsHeaders);
  } catch (e) {
    console.error('handleChannelsGet:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleChannelsPost(request, env, corsHeaders) {
  const parsed = await parseJson(request, corsHeaders);
  if (parsed.response) return parsed.response;
  let {
    type, name,
    webhook_url = null, config = null, is_active = 1,
  } = parsed.body;
  if (!type || !name) return err('type and name are required', 400, corsHeaders);
  // Auto-generate webhook_url if missing so HTML doesn't have to supply it.
  if (webhook_url === null || webhook_url === undefined || webhook_url === '') {
    const baseUrl = env.PUBLIC_WORKER_URL || '';
    if (baseUrl) {
      webhook_url = `${baseUrl.replace(/\/$/, '')}/webhook/${encodeURIComponent(type)}`;
    } else {
      console.warn('[channels] PUBLIC_WORKER_URL not set — webhook_url left null');
      webhook_url = null;
    }
  }
  // Allow `config` as object — stringify for D1 TEXT column.
  if (config && typeof config === 'object') config = JSON.stringify(config);
  try {
    const result = await env.DB.prepare(
      `INSERT INTO channels (type, name, webhook_url, config, is_active, created_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).bind(type, name, webhook_url, config, is_active ? 1 : 0).run();
    const id = result.meta?.last_row_id;
    const channel = await env.DB.prepare('SELECT * FROM channels WHERE id = ?').bind(id).first();
    return json({ success: true, channel }, 201, corsHeaders);
  } catch (e) {
    console.error('handleChannelsPost:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleChannelsPut(request, env, corsHeaders, id) {
  const parsed = await parseJson(request, corsHeaders);
  if (parsed.response) return parsed.response;
  try {
    const existing = await env.DB.prepare('SELECT * FROM channels WHERE id = ?').bind(id).first();
    if (!existing) return err('Channel not found', 404, corsHeaders);
    const sets = [];
    const vals = [];
    for (const col of CH_COLS) {
      if (col in parsed.body) {
        let v = parsed.body[col];
        if (col === 'is_active') v = v ? 1 : 0;
        if (col === 'config' && v && typeof v === 'object') v = JSON.stringify(v);
        sets.push(`${col} = ?`);
        vals.push(v);
      }
    }
    if (sets.length === 0) return ok({ success: true, channel: existing }, corsHeaders);
    vals.push(id);
    await env.DB.prepare(`UPDATE channels SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    const channel = await env.DB.prepare('SELECT * FROM channels WHERE id = ?').bind(id).first();
    return ok({ success: true, channel }, corsHeaders);
  } catch (e) {
    console.error('handleChannelsPut:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleChannelsDelete(request, env, corsHeaders, id) {
  try {
    const existing = await env.DB.prepare('SELECT id FROM channels WHERE id = ?').bind(id).first();
    if (!existing) return err('Channel not found', 404, corsHeaders);
    await env.DB.prepare('DELETE FROM channels WHERE id = ?').bind(id).run();
    return ok({ success: true, deleted: Number(id) }, corsHeaders);
  } catch (e) {
    console.error('handleChannelsDelete:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}
