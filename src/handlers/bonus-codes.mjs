// ⚠️ 弊社側暫定実装 — tking510 納品版で置き換え予定

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

function json(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...JSON_HEADERS },
  });
}

// NOTE: HTML may POST/PUT `sheet_url`, `sheet_name`, `sheet_column` — schema has no
// matching columns, so they are silently ignored (not in allowlist, not in INSERT).
const BONUS_UPDATABLE = [
  'code', 'type', 'value', 'description', 'max_uses', 'current_uses',
  'valid_from', 'valid_until', 'is_active', 'response_message',
];

export async function handleBonusCodesGet(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const isActive = url.searchParams.get('is_active');
    const where = [];
    const binds = [];
    if (isActive !== null && isActive !== undefined && isActive !== '') {
      where.push('is_active = ?');
      binds.push(isActive === '1' || isActive === 'true' ? 1 : 0);
    }
    const sql = `SELECT * FROM bonus_codes${where.length ? ' WHERE ' + where.join(' AND ') : ''}
      ORDER BY created_at DESC`;
    const { results } = await env.DB.prepare(sql).bind(...binds).all();
    return json({ success: true, bonus_codes: results || [] }, 200, corsHeaders);
  } catch (e) {
    console.error('handleBonusCodesGet:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleBonusCodesGetOne(request, env, corsHeaders, id) {
  try {
    const row = await env.DB.prepare('SELECT * FROM bonus_codes WHERE id = ?').bind(id).first();
    if (!row) return json({ success: false, error: 'Not found' }, 404, corsHeaders);
    return json({ success: true, bonus_code: row }, 200, corsHeaders);
  } catch (e) {
    console.error('handleBonusCodesGetOne:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleBonusCodesPost(request, env, corsHeaders) {
  let body;
  try { body = await request.json(); } catch {
    return json({ success: false, error: 'Invalid JSON' }, 400, corsHeaders);
  }
  try {
    const {
      tenant_id = 'tenant_default',
      code, type = null, value = null, description = null,
      max_uses = null, current_uses = 0,
      valid_from = null, valid_until = null,
      is_active = 1, response_message = null,
    } = body || {};

    if (!code) {
      return json({ success: false, error: 'code is required' }, 400, corsHeaders);
    }

    const result = await env.DB.prepare(
      `INSERT INTO bonus_codes (tenant_id, code, type, value, description, max_uses, current_uses,
        valid_from, valid_until, is_active, response_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(tenant_id, code, type, value, description, max_uses, current_uses,
      valid_from, valid_until, is_active, response_message).run();

    return json({ success: true, id: result.meta?.last_row_id }, 201, corsHeaders);
  } catch (e) {
    console.error('handleBonusCodesPost:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleBonusCodesPut(request, env, corsHeaders, id) {
  let body;
  try { body = await request.json(); } catch {
    return json({ success: false, error: 'Invalid JSON' }, 400, corsHeaders);
  }
  try {
    const existing = await env.DB.prepare('SELECT id FROM bonus_codes WHERE id = ?').bind(id).first();
    if (!existing) return json({ success: false, error: 'Not found' }, 404, corsHeaders);

    const sets = [];
    const binds = [];
    for (const col of BONUS_UPDATABLE) {
      if (Object.prototype.hasOwnProperty.call(body, col)) {
        sets.push(`${col} = ?`);
        binds.push(body[col]);
      }
    }
    if (sets.length === 0) {
      return json({ success: false, error: 'No updatable fields provided' }, 400, corsHeaders);
    }
    binds.push(id);
    await env.DB.prepare(`UPDATE bonus_codes SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();
    return json({ success: true, id: Number(id) }, 200, corsHeaders);
  } catch (e) {
    console.error('handleBonusCodesPut:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleBonusCodesDelete(request, env, corsHeaders, id) {
  try {
    const existing = await env.DB.prepare('SELECT id FROM bonus_codes WHERE id = ?').bind(id).first();
    if (!existing) return json({ success: false, error: 'Not found' }, 404, corsHeaders);
    await env.DB.prepare('DELETE FROM bonus_codes WHERE id = ?').bind(id).run();
    return json({ success: true, id: Number(id) }, 200, corsHeaders);
  } catch (e) {
    console.error('handleBonusCodesDelete:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleBonusCodeUsageGet(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const bonusCodeId = url.searchParams.get('bonus_code_id');
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '100', 10) || 100, 1000);

    const where = [];
    const binds = [];
    if (bonusCodeId) { where.push('u.bonus_code_id = ?'); binds.push(bonusCodeId); }
    // JOIN to expose code/type/value alongside usage rows for the HTML view.
    const sql = `SELECT
        u.id, u.created_at AS used_at, u.used_by, u.bonus_code_id,
        bc.code, bc.type, bc.value,
        NULL AS user_name, NULL AS channel
      FROM bonus_code_usage u
      LEFT JOIN bonus_codes bc ON bc.id = u.bonus_code_id
      ${where.length ? ' WHERE ' + where.join(' AND ') : ''}
      ORDER BY u.created_at DESC LIMIT ?`;
    binds.push(limit);

    const { results } = await env.DB.prepare(sql).bind(...binds).all();
    return json({ success: true, usage: results || [] }, 200, corsHeaders);
  } catch (e) {
    console.error('handleBonusCodeUsageGet:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}
