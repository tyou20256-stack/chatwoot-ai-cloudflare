// ⚠️ 弊社側暫定実装 — tking510 納品版で置き換え予定

import { withEtag } from '../etag-helper.mjs';

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

function json(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...JSON_HEADERS },
  });
}

export async function handleConversationMessages(request, env, corsHeaders, conversationId) {
  try {
    const { results } = await env.DB.prepare(
      `SELECT id, conversation_id, sender_id, sender_type, content, metadata, created_at
       FROM messages WHERE conversation_id = ?
       ORDER BY created_at ASC LIMIT 200`
    ).bind(conversationId).all();
    const body = JSON.stringify({ success: true, messages: results || [] });
    return await withEtag(request, body, 200, corsHeaders);
  } catch (e) {
    console.error('handleConversationMessages:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleMessagesGet(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const conversationId = url.searchParams.get('conversation_id');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10) || 100, 500);

    const where = [];
    const binds = [];
    if (conversationId) {
      where.push('conversation_id = ?');
      binds.push(conversationId);
    }

    const sql = `SELECT id, conversation_id, sender_id, sender_type, content, metadata, created_at
                 FROM messages${where.length ? ' WHERE ' + where.join(' AND ') : ''}
                 ORDER BY created_at DESC LIMIT ?`;
    binds.push(limit);

    const { results } = await env.DB.prepare(sql).bind(...binds).all();
    const body = JSON.stringify({ success: true, messages: results || [] });
    return await withEtag(request, body, 200, corsHeaders);
  } catch (e) {
    console.error('handleMessagesGet:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleMessagesPost(request, env, corsHeaders) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON' }, 400, corsHeaders);
  }

  const { conversation_id, content } = body || {};
  if (!conversation_id || !content) {
    return json({ success: false, error: 'conversation_id and content required' }, 400, corsHeaders);
  }

  const sender_type = body.sender_type || 'agent';
  // TODO: sender_id should come from IdP auth
  const senderIdFromHeader = request.headers.get('X-Staff-User-Id');
  const sender_id = senderIdFromHeader ? parseInt(senderIdFromHeader, 10)
    : (body.sender_id ? parseInt(body.sender_id, 10) : (console.warn('[sender_id] defaulted to 1 — TODO IdP'), 1));
  let metadata = body.metadata ?? null;
  if (metadata && typeof metadata === 'object') {
    metadata = JSON.stringify(metadata);
  }

  try {
    const conv = await env.DB.prepare('SELECT id FROM conversations WHERE id = ?').bind(conversation_id).first();
    if (!conv) {
      return json({ success: false, error: 'Conversation not found' }, 404, corsHeaders);
    }

    const result = await env.DB.prepare(
      `INSERT INTO messages (conversation_id, sender_id, sender_type, content, metadata)
       VALUES (?, ?, ?, ?, ?)`
    ).bind(conversation_id, sender_id, sender_type, content, metadata).run();

    const inserted = await env.DB.prepare(
      `SELECT id, conversation_id, sender_id, sender_type, content, metadata, created_at
       FROM messages WHERE id = ?`
    ).bind(result.meta.last_row_id).first();

    return json({ success: true, message: inserted }, 201, corsHeaders);
  } catch (e) {
    console.error('handleMessagesPost:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleMessagesDelete(request, env, corsHeaders, id) {
  try {
    const existing = await env.DB.prepare('SELECT id FROM messages WHERE id = ?').bind(id).first();
    if (!existing) {
      return json({ success: false, error: 'Not found' }, 404, corsHeaders);
    }
    await env.DB.prepare('DELETE FROM messages WHERE id = ?').bind(id).run();
    return json({ success: true, deleted_id: Number(id) }, 200, corsHeaders);
  } catch (e) {
    console.error('handleMessagesDelete:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}
