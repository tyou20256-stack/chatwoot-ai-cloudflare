// ⚠️ 弊社側暫定実装 — tking510 納品版で置き換え予定

import { withEtag } from '../etag-helper.mjs';
import { getPrincipal } from '../auth-helper.mjs';

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

function json(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...JSON_HEADERS },
  });
}

// 実スキーマ: tenant_id, user_id, status, priority, assignee_id, ai_handled,
//             satisfaction_rating, resolved_at, created_at, updated_at のみ
const CONV_UPDATABLE = [
  'status', 'priority', 'assignee_id', 'satisfaction_rating',
  'ai_handled', 'resolved_at',
];

export async function handleConversationsGet(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const assigneeId = url.searchParams.get('assignee_id');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 500);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10) || 0;

    const where = [];
    const binds = [];
    if (status) { where.push('status = ?'); binds.push(status); }
    if (assigneeId) { where.push('assignee_id = ?'); binds.push(assigneeId); }

    const sql = `SELECT * FROM conversations${where.length ? ' WHERE ' + where.join(' AND ') : ''}
      ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    binds.push(limit, offset);

    const { results } = await env.DB.prepare(sql).bind(...binds).all();
    const body = JSON.stringify({ success: true, conversations: results || [] });
    return await withEtag(request, body, 200, corsHeaders);
  } catch (e) {
    console.error('handleConversationsGet:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleConversationsGetOne(request, env, corsHeaders, id) {
  try {
    const conv = await env.DB.prepare('SELECT * FROM conversations WHERE id = ?').bind(id).first();
    if (!conv) {
      return json({ success: false, error: 'Not found' }, 404, corsHeaders);
    }
    const { results: messages } = await env.DB.prepare(
      'SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 50'
    ).bind(id).all();

    return json({ success: true, conversation: { ...conv, messages: messages || [] } }, 200, corsHeaders);
  } catch (e) {
    console.error('handleConversationsGetOne:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleConversationsPut(request, env, corsHeaders, id) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON' }, 400, corsHeaders);
  }

  try {
    const existing = await env.DB.prepare('SELECT id FROM conversations WHERE id = ?').bind(id).first();
    if (!existing) {
      return json({ success: false, error: 'Not found' }, 404, corsHeaders);
    }

    const sets = [];
    const binds = [];
    for (const col of CONV_UPDATABLE) {
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

    await env.DB.prepare(`UPDATE conversations SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();
    return json({ success: true, id: Number(id) }, 200, corsHeaders);
  } catch (e) {
    console.error('handleConversationsPut:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleConversationsDelete(request, env, corsHeaders, id) {
  try {
    const existing = await env.DB.prepare('SELECT id FROM conversations WHERE id = ?').bind(id).first();
    if (!existing) {
      return json({ success: false, error: 'Not found' }, 404, corsHeaders);
    }
    // Cascade: delete messages + files + conversation_tags + conversation atomically
    await env.DB.batch([
      env.DB.prepare('DELETE FROM messages WHERE conversation_id = ?').bind(id),
      env.DB.prepare('DELETE FROM files WHERE conversation_id = ?').bind(id),
      env.DB.prepare('DELETE FROM conversation_tags WHERE conversation_id = ?').bind(id),
      env.DB.prepare('DELETE FROM conversations WHERE id = ?').bind(id),
    ]);
    return json({ success: true, id: Number(id) }, 200, corsHeaders);
  } catch (e) {
    console.error('handleConversationsDelete:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleConversationsSearch(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').trim();
    if (!q) {
      return json({ success: true, conversations: [] }, 200, corsHeaders);
    }
    const like = `%${q}%`;
    // conversations に contact_name/contact_email 列なし → users.name/email と messages.content を検索
    const { results } = await env.DB.prepare(
      `SELECT DISTINCT c.* FROM conversations c
       LEFT JOIN messages m ON m.conversation_id = c.id
       LEFT JOIN users u ON u.id = c.user_id
       WHERE u.name LIKE ? OR u.email LIKE ? OR m.content LIKE ?
       ORDER BY c.created_at DESC LIMIT 50`
    ).bind(like, like, like).all();
    return json({ success: true, conversations: results || [] }, 200, corsHeaders);
  } catch (e) {
    console.error('handleConversationsSearch:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleConversationReply(request, env, corsHeaders, convId) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON' }, 400, corsHeaders);
  }

  const { content, auto_close } = body || {};
  if (!content) {
    return json({ success: false, error: 'content required' }, 400, corsHeaders);
  }
  const sender_type = body.sender_type || 'agent';
  // τ-Cτ1: derive from WeakMap-backed principal (Request is immutable in CF Workers)
  const principalId = getPrincipal(request)?.staff_id ?? null;
  const senderIdFromHeader = request.headers.get('X-Staff-User-Id');
  const sender_id = principalId
    ?? (senderIdFromHeader ? parseInt(senderIdFromHeader, 10) : (body.sender_id ? parseInt(body.sender_id, 10) : null));
  if (!Number.isFinite(sender_id)) {
    return json({ success: false, error: 'sender_id required' }, 400, corsHeaders);
  }
  // ρ-Hπ2: capture metadata so template_id, escalation_reason etc. are persisted
  let metadata = body.metadata ?? null;
  if (metadata && typeof metadata === 'object') metadata = JSON.stringify(metadata);

  try {
    const conv = await env.DB.prepare('SELECT id FROM conversations WHERE id = ?').bind(convId).first();
    if (!conv) {
      return json({ success: false, error: 'Conversation not found' }, 404, corsHeaders);
    }

    // Atomic: insert message (+ optional close) in a single D1 batch
    const stmts = [
      env.DB.prepare(
        `INSERT INTO messages (conversation_id, sender_id, sender_type, content, metadata)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(convId, sender_id, sender_type, content, metadata),
    ];
    if (auto_close === true) {
      stmts.push(env.DB.prepare(
        `UPDATE conversations SET status = 'resolved', resolved_at = datetime('now'), updated_at = datetime('now') WHERE id = ?`
      ).bind(convId));
    }
    const batchResults = await env.DB.batch(stmts);
    const insertedId = batchResults[0]?.meta?.last_row_id;

    const inserted = await env.DB.prepare(
      `SELECT id, conversation_id, sender_id, sender_type, content, metadata, created_at
       FROM messages WHERE id = ?`
    ).bind(insertedId).first();

    const updatedConv = await env.DB.prepare('SELECT * FROM conversations WHERE id = ?').bind(convId).first();

    return json({ success: true, message: inserted, conversation: updatedConv }, 200, corsHeaders);
  } catch (e) {
    console.error('handleConversationReply:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleConversationModeSet(request, env, corsHeaders) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ success: false, error: 'Invalid JSON' }, 400, corsHeaders);
  }

  const { conversation_id, mode } = body || {};
  if (!conversation_id || !mode) {
    return json({ success: false, error: 'conversation_id and mode required' }, 400, corsHeaders);
  }
  if (!['auto', 'copilot', 'human'].includes(mode)) {
    return json({ success: false, error: 'mode must be auto|copilot|human' }, 400, corsHeaders);
  }

  try {
    const conv = await env.DB.prepare('SELECT id FROM conversations WHERE id = ?').bind(conversation_id).first();
    if (!conv) {
      return json({ success: false, error: 'Conversation not found' }, 404, corsHeaders);
    }

    // Log mode change as a system message (conversations has no metadata column)
    await env.DB.prepare(
      `INSERT INTO messages (conversation_id, sender_id, sender_type, content, metadata)
       VALUES (?, ?, 'system', ?, ?)`
    ).bind(
      conversation_id,
      0,
      `mode changed to ${mode}`,
      JSON.stringify({ mode_change: mode })
    ).run();

    return json({ success: true, conversation_id: Number(conversation_id), mode }, 200, corsHeaders);
  } catch (e) {
    console.error('handleConversationModeSet:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleAIConversationGet(request, env, corsHeaders, convId) {
  try {
    const conv = await env.DB.prepare('SELECT id FROM conversations WHERE id = ?').bind(convId).first();
    if (!conv) {
      return json({ success: false, error: 'Conversation not found' }, 404, corsHeaders);
    }
    return json({
      success: true,
      conversation_id: Number(convId),
      ai_mode: 'auto',
      ai_summary: null,
      ai_draft: null,
    }, 200, corsHeaders);
  } catch (e) {
    console.error('handleAIConversationGet:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}
