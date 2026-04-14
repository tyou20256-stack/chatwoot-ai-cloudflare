// ⚠️ 弊社側暫定実装 — tking510 納品版で置き換え予定

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

function json(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...JSON_HEADERS },
  });
}

export async function handleConversationTagsGet(request, env, corsHeaders, convId) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT t.id, t.name, t.color, t.description, ct.created_at
       FROM conversation_tags ct
       JOIN tags t ON t.id = ct.tag_id
       WHERE ct.conversation_id = ?
       ORDER BY ct.created_at DESC`
    ).bind(convId).all();
    return json({ success: true, tags: results || [] }, 200, corsHeaders);
  } catch (e) {
    console.error('handleConversationTagsGet:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleConversationTagAdd(request, env, corsHeaders, convId) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON' }, 400, corsHeaders);
  }

  const { tag_id, tag_name } = body || {};
  if (!tag_id && !tag_name) {
    return json({ success: false, error: 'tag_id or tag_name required' }, 400, corsHeaders);
  }

  try {
    let resolvedTagId = tag_id;

    if (!resolvedTagId && tag_name) {
      // INSERT OR IGNORE to create tag if missing
      await env.DB.prepare(
        `INSERT OR IGNORE INTO tags (name) VALUES (?)`
      ).bind(tag_name).run();
      const found = await env.DB.prepare(
        `SELECT id FROM tags WHERE name = ? LIMIT 1`
      ).bind(tag_name).first();
      if (!found) {
        return json({ success: false, error: 'Failed to resolve tag' }, 500, corsHeaders);
      }
      resolvedTagId = found.id;
    }

    await env.DB.prepare(
      `INSERT OR IGNORE INTO conversation_tags (conversation_id, tag_id) VALUES (?, ?)`
    ).bind(convId, resolvedTagId).run();

    const tag = await env.DB.prepare(
      `SELECT id, name, color, description, created_at FROM tags WHERE id = ?`
    ).bind(resolvedTagId).first();

    return json({ success: true, tag }, 200, corsHeaders);
  } catch (e) {
    console.error('handleConversationTagAdd:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleConversationTagRemove(request, env, corsHeaders, convId, tagId) {
  try {
    const existing = await env.DB.prepare(
      `SELECT conversation_id FROM conversation_tags WHERE conversation_id = ? AND tag_id = ?`
    ).bind(convId, tagId).first();
    if (!existing) {
      return json({ success: false, error: 'Not found' }, 404, corsHeaders);
    }
    await env.DB.prepare(
      `DELETE FROM conversation_tags WHERE conversation_id = ? AND tag_id = ?`
    ).bind(convId, tagId).run();
    return json({ success: true, deleted: true }, 200, corsHeaders);
  } catch (e) {
    console.error('handleConversationTagRemove:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}
