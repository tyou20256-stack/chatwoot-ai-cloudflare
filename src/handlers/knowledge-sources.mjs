// ⚠️ 弊社側暫定実装 — tking510 納品版で置き換え予定
// NOTE: GET endpoints return {data: ...} (no success wrapper) to match tking510 live API.

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

function json(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...JSON_HEADERS },
  });
}

const KS_UPDATABLE = [
  'url', 'title', 'source_type', 'priority', 'category',
  'auto_refresh', 'content_hash', 'last_refreshed_at', 'is_active',
];

export async function handleKnowledgeSourcesGet(request, env, corsHeaders) {
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM knowledge_sources ORDER BY priority ASC, id DESC'
    ).all();
    return json({ data: results || [] }, 200, corsHeaders);
  } catch (e) {
    console.error('handleKnowledgeSourcesGet:', e.message);
    return json({ error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleKnowledgeSourcesGetOne(request, env, corsHeaders, id) {
  try {
    const row = await env.DB.prepare('SELECT * FROM knowledge_sources WHERE id = ?').bind(id).first();
    if (!row) return json({ error: 'Not found' }, 404, corsHeaders);
    return json({ data: row }, 200, corsHeaders);
  } catch (e) {
    console.error('handleKnowledgeSourcesGetOne:', e.message);
    return json({ error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleKnowledgeSourcesPost(request, env, corsHeaders) {
  let body;
  try { body = await request.json(); } catch {
    return json({ success: false, error: 'Invalid JSON' }, 400, corsHeaders);
  }
  try {
    const {
      tenant_id = 'tenant_default',
      url = null, title = null, source_type = null,
      priority = 5, category = null, auto_refresh = 0,
      content_hash = null, last_refreshed_at = null, is_active = 1,
    } = body || {};

    const result = await env.DB.prepare(
      `INSERT INTO knowledge_sources (tenant_id, url, title, source_type, priority, category,
        auto_refresh, content_hash, last_refreshed_at, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(tenant_id, url, title, source_type, priority, category,
      auto_refresh, content_hash, last_refreshed_at, is_active).run();

    // NOTE: `content` field from HTML is accepted but silently ignored — schema has no column for it.
    // `chunks` is a stub (no real chunking) so the HTML success alert displays a number.
    return json({ success: true, id: result.meta?.last_row_id, chunks: 1 }, 201, corsHeaders);
  } catch (e) {
    console.error('handleKnowledgeSourcesPost:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleKnowledgeSourcesPut(request, env, corsHeaders, id) {
  let body;
  try { body = await request.json(); } catch {
    return json({ success: false, error: 'Invalid JSON' }, 400, corsHeaders);
  }
  try {
    const existing = await env.DB.prepare('SELECT id FROM knowledge_sources WHERE id = ?').bind(id).first();
    if (!existing) return json({ success: false, error: 'Not found' }, 404, corsHeaders);

    // Refresh action: body has refresh:true and nothing else to update — just bump timestamp.
    const bodyKeys = Object.keys(body || {});
    const onlyRefresh = body && body.refresh === true
      && bodyKeys.every((k) => k === 'refresh' || !KS_UPDATABLE.includes(k));
    if (onlyRefresh) {
      await env.DB.prepare(
        "UPDATE knowledge_sources SET last_refreshed_at = datetime('now'), updated_at = datetime('now') WHERE id = ?"
      ).bind(id).run();
      return json({ success: true, id: Number(id), refreshed: true }, 200, corsHeaders);
    }

    const sets = [];
    const binds = [];
    for (const col of KS_UPDATABLE) {
      if (Object.prototype.hasOwnProperty.call(body, col)) {
        sets.push(`${col} = ?`);
        binds.push(body[col]);
      }
    }
    if (sets.length === 0) {
      return json({ success: false, error: 'No updatable fields provided' }, 400, corsHeaders);
    }
    sets.push("updated_at = datetime('now')");
    binds.push(id);
    await env.DB.prepare(`UPDATE knowledge_sources SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();
    return json({ success: true, id: Number(id) }, 200, corsHeaders);
  } catch (e) {
    console.error('handleKnowledgeSourcesPut:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleKnowledgeSourcesDelete(request, env, corsHeaders, id) {
  try {
    const existing = await env.DB.prepare('SELECT id FROM knowledge_sources WHERE id = ?').bind(id).first();
    if (!existing) return json({ success: false, error: 'Not found' }, 404, corsHeaders);
    await env.DB.prepare('DELETE FROM knowledge_sources WHERE id = ?').bind(id).run();
    return json({ success: true, id: Number(id) }, 200, corsHeaders);
  } catch (e) {
    console.error('handleKnowledgeSourcesDelete:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}
