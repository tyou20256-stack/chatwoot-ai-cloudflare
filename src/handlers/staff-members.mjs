// ⚠️ 弊社側暫定実装 — tking510 納品版で置き換え予定

import { hashPassword, authenticate } from '../auth-helper.mjs';

async function generateSaltAndHash(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  const hash = await hashPassword(password, saltHex);
  return { saltHex, hash };
}

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

// プロフィール拡張列 (migration 003): avatar_url, phone, department, hired_at, bio, language
const STAFF_COLS = ['name', 'email', 'role', 'channels', 'ai_character_id', 'shift_type', 'status',
  'avatar_url', 'phone', 'department', 'hired_at', 'bio', 'language'];

function normalizeChannels(v) {
  if (v === undefined || v === null) return undefined;
  if (Array.isArray(v)) return JSON.stringify(v);
  if (typeof v === 'string') {
    // Validate JSON parseable; if not, wrap as single-element array-ish fallback
    try {
      const parsed = JSON.parse(v);
      return JSON.stringify(parsed);
    } catch {
      return JSON.stringify([]);
    }
  }
  return JSON.stringify([]);
}

function parseChannelsField(raw) {
  if (raw === null || raw === undefined) return [];
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

function shapeStaffRow(row) {
  if (!row) return row;
  return {
    id: row.id,
    tenant_id: row.tenant_id,
    name: row.name,
    email: row.email,
    role: row.role,
    channels: parseChannelsField(row.channels),
    ai_character_id: row.ai_character_id,
    ai_character_name: row.ai_character_name ?? null,
    shift_type: row.shift_type,
    status: row.status,
    avatar_url: row.avatar_url ?? null,
    phone: row.phone ?? null,
    department: row.department ?? null,
    hired_at: row.hired_at ?? null,
    bio: row.bio ?? null,
    language: row.language ?? 'ja',
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const SELECT_WITH_JOIN = `
  SELECT s.id, s.tenant_id, s.name, s.email, s.role, s.channels,
         s.ai_character_id, c.name AS ai_character_name,
         s.shift_type, s.status,
         s.avatar_url, s.phone, s.department, s.hired_at, s.bio, s.language,
         s.created_at, s.updated_at
  FROM staff_members s
  LEFT JOIN ai_characters c ON c.id = s.ai_character_id
`;

export async function handleStaffMembersGet(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenant_id') || 'tenant_default';
    const { results } = await env.DB.prepare(
      `${SELECT_WITH_JOIN} WHERE s.tenant_id = ? ORDER BY s.created_at ASC`
    ).bind(tenantId).all();
    const staff = (results || []).map(shapeStaffRow);
    return ok({ success: true, staff }, corsHeaders);
  } catch (e) {
    console.error('handleStaffMembersGet:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleStaffMembersGetOne(request, env, corsHeaders, id) {
  try {
    const row = await env.DB.prepare(
      `${SELECT_WITH_JOIN} WHERE s.id = ?`
    ).bind(id).first();
    if (!row) return err('Staff member not found', 404, corsHeaders);
    return ok({ success: true, staff_member: shapeStaffRow(row) }, corsHeaders);
  } catch (e) {
    console.error('handleStaffMembersGetOne:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleStaffMembersPost(request, env, corsHeaders) {
  const parsed = await parseJson(request, corsHeaders);
  if (parsed.response) return parsed.response;
  const body = parsed.body || {};
  if (!body.name) return err('name is required', 400, corsHeaders);
  if (!body.password) return err('password is required for new staff members', 400, corsHeaders);
  if (body.password.length < 8) return err('Password must be at least 8 characters', 400, corsHeaders);
  const tenantId = body.tenant_id || 'tenant_default';
  try {
    const cols = ['tenant_id'];
    const vals = [tenantId];
    for (const c of STAFF_COLS) {
      if (c in body) {
        cols.push(c);
        if (c === 'channels') {
          vals.push(normalizeChannels(body[c]));
        } else if (c === 'ai_character_id') {
          vals.push(body[c] === null || body[c] === undefined ? null : parseInt(body[c], 10));
        } else {
          vals.push(body[c]);
        }
      }
    }
    // Password hash/salt
    const { saltHex, hash } = await generateSaltAndHash(body.password);
    cols.push('password_hash', 'password_salt');
    vals.push(hash, saltHex);
    const placeholders = cols.map(() => '?').join(', ');
    const result = await env.DB.prepare(
      `INSERT INTO staff_members (${cols.join(', ')}, created_at, updated_at)
       VALUES (${placeholders}, datetime('now'), datetime('now'))`
    ).bind(...vals).run();
    const newId = result.meta?.last_row_id;
    const row = await env.DB.prepare(`${SELECT_WITH_JOIN} WHERE s.id = ?`).bind(newId).first();
    return json({ success: true, staff_member: shapeStaffRow(row) }, 201, corsHeaders);
  } catch (e) {
    console.error('handleStaffMembersPost:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleStaffMembersPut(request, env, corsHeaders, id) {
  const parsed = await parseJson(request, corsHeaders);
  if (parsed.response) return parsed.response;
  const body = parsed.body || {};
  try {
    // Re-authenticate to enforce privilege-escalation guards at the field level
    const auth = await authenticate(request, env);
    if (!auth.ok) return err('Unauthorized', 401, corsHeaders);
    const principalRole = auth.principal?.role;
    const principalStaffId = auth.principal?.staff_id;
    if ('role' in body && principalRole !== 'admin') {
      return err('Cannot change role', 403, corsHeaders);
    }
    if ('password' in body && principalRole !== 'admin' && principalStaffId !== id) {
      return err('Cannot change password of other users', 403, corsHeaders);
    }
    const existing = await env.DB.prepare('SELECT id FROM staff_members WHERE id = ?').bind(id).first();
    if (!existing) return err('Staff member not found', 404, corsHeaders);
    const sets = [];
    const vals = [];
    for (const col of STAFF_COLS) {
      if (col in body) {
        sets.push(`${col} = ?`);
        if (col === 'channels') {
          vals.push(normalizeChannels(body[col]));
        } else if (col === 'ai_character_id') {
          vals.push(body[col] === null || body[col] === undefined ? null : parseInt(body[col], 10));
        } else {
          vals.push(body[col]);
        }
      }
    }
    // Optional password update
    if (body.password) {
      if (body.password.length < 8) return err('Password must be at least 8 characters', 400, corsHeaders);
      const { saltHex, hash } = await generateSaltAndHash(body.password);
      sets.push('password_hash = ?', 'password_salt = ?');
      vals.push(hash, saltHex);
    }
    if (sets.length === 0) {
      const row = await env.DB.prepare(`${SELECT_WITH_JOIN} WHERE s.id = ?`).bind(id).first();
      return ok({ success: true, staff_member: shapeStaffRow(row) }, corsHeaders);
    }
    sets.push("updated_at = datetime('now')");
    vals.push(id);
    await env.DB.prepare(`UPDATE staff_members SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    const row = await env.DB.prepare(`${SELECT_WITH_JOIN} WHERE s.id = ?`).bind(id).first();
    return ok({ success: true, staff_member: shapeStaffRow(row) }, corsHeaders);
  } catch (e) {
    console.error('handleStaffMembersPut:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleStaffMembersDelete(request, env, corsHeaders, id) {
  try {
    const existing = await env.DB.prepare('SELECT id FROM staff_members WHERE id = ?').bind(id).first();
    if (!existing) return err('Staff member not found', 404, corsHeaders);
    await env.DB.prepare('DELETE FROM staff_members WHERE id = ?').bind(id).run();
    return ok({ success: true, deleted: id }, corsHeaders);
  } catch (e) {
    console.error('handleStaffMembersDelete:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}
