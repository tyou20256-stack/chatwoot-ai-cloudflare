// ⚠️ 弊社側暫定実装 — tking510 納品版で置き換え予定

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

const CHAR_COLS = [
  'name',
  'tone',
  'first_person',
  'politeness_level',
  'emoji_level',
  'intro_message',
  'suffix',
  'avatar_url',
  'system_prompt_override',
  'is_preset',
  'is_active',
];

const INT_COLS = new Set(['politeness_level', 'is_preset', 'is_active']);

function coerce(col, v) {
  if (INT_COLS.has(col)) {
    if (col === 'is_preset' || col === 'is_active') return v ? 1 : 0;
    return v === null || v === undefined ? null : parseInt(v, 10);
  }
  return v;
}

export async function handleAiCharactersGet(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenant_id') || 'tenant_default';
    const { results } = await env.DB.prepare(
      'SELECT * FROM ai_characters WHERE tenant_id = ? ORDER BY created_at ASC'
    ).bind(tenantId).all();
    return ok({ success: true, characters: results || [] }, corsHeaders);
  } catch (e) {
    console.error('handleAiCharactersGet:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleAiCharactersGetOne(request, env, corsHeaders, id) {
  try {
    const row = await env.DB.prepare('SELECT * FROM ai_characters WHERE id = ?').bind(id).first();
    if (!row) return err('AI character not found', 404, corsHeaders);
    return ok({ success: true, character: row }, corsHeaders);
  } catch (e) {
    console.error('handleAiCharactersGetOne:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleAiCharactersPost(request, env, corsHeaders) {
  const parsed = await parseJson(request, corsHeaders);
  if (parsed.response) return parsed.response;
  const body = parsed.body || {};
  if (!body.name) return err('name is required', 400, corsHeaders);
  const tenantId = body.tenant_id || 'tenant_default';
  try {
    const cols = ['tenant_id'];
    const vals = [tenantId];
    for (const c of CHAR_COLS) {
      if (c in body) {
        cols.push(c);
        vals.push(coerce(c, body[c]));
      }
    }
    const placeholders = cols.map(() => '?').join(', ');
    const result = await env.DB.prepare(
      `INSERT INTO ai_characters (${cols.join(', ')}, created_at, updated_at)
       VALUES (${placeholders}, datetime('now'), datetime('now'))`
    ).bind(...vals).run();
    const newId = result.meta?.last_row_id;
    const row = await env.DB.prepare('SELECT * FROM ai_characters WHERE id = ?').bind(newId).first();
    return json({ success: true, character: row }, 201, corsHeaders);
  } catch (e) {
    console.error('handleAiCharactersPost:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleAiCharactersPut(request, env, corsHeaders, id) {
  const parsed = await parseJson(request, corsHeaders);
  if (parsed.response) return parsed.response;
  const body = parsed.body || {};
  try {
    const existing = await env.DB.prepare('SELECT id FROM ai_characters WHERE id = ?').bind(id).first();
    if (!existing) return err('AI character not found', 404, corsHeaders);
    const sets = [];
    const vals = [];
    for (const col of CHAR_COLS) {
      if (col in body) {
        sets.push(`${col} = ?`);
        vals.push(coerce(col, body[col]));
      }
    }
    if (sets.length === 0) {
      const row = await env.DB.prepare('SELECT * FROM ai_characters WHERE id = ?').bind(id).first();
      return ok({ success: true, character: row }, corsHeaders);
    }
    sets.push("updated_at = datetime('now')");
    vals.push(id);
    await env.DB.prepare(`UPDATE ai_characters SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    const row = await env.DB.prepare('SELECT * FROM ai_characters WHERE id = ?').bind(id).first();
    return ok({ success: true, character: row }, corsHeaders);
  } catch (e) {
    console.error('handleAiCharactersPut:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleAiCharactersDelete(request, env, corsHeaders, id) {
  try {
    const existing = await env.DB.prepare('SELECT id FROM ai_characters WHERE id = ?').bind(id).first();
    if (!existing) return err('AI character not found', 404, corsHeaders);
    await env.DB.prepare('DELETE FROM ai_characters WHERE id = ?').bind(id).run();
    return ok({ success: true, deleted: id }, corsHeaders);
  } catch (e) {
    console.error('handleAiCharactersDelete:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}
