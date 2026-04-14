// ⚠️ 弊社側暫定実装 — tking510 納品版で置き換え予定（または Cloudflare Access 移行）
import {
  verifyPassword,
  hashPassword,
  issueSessionToken,
  verifySessionToken,
  authenticate,
  sessionHashHex,
} from '../auth-helper.mjs';

const json = (obj, status, cors, extraHeaders = {}) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8', ...extraHeaders },
  });

export async function handleStaffLogin(request, env, corsHeaders) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400, corsHeaders);
  }
  const { email, password } = body || {};
  if (!email || !password) {
    return json({ error: 'email and password required' }, 400, corsHeaders);
  }

  try {
    const staff = await env.DB.prepare(
      `SELECT id, tenant_id, name, email, role, password_hash, password_salt,
              failed_attempts, locked_until, is_active
       FROM staff_members WHERE email = ?`
    ).bind(email).first();

    if (!staff || !staff.is_active) {
      return json({ error: 'Invalid credentials' }, 401, corsHeaders);
    }
    if (staff.locked_until && new Date(staff.locked_until) > new Date()) {
      return json({ error: 'Account temporarily locked. Try again later.' }, 423, corsHeaders);
    }
    if (!staff.password_hash || !staff.password_salt) {
      return json({ error: 'Password not set. Contact administrator.' }, 403, corsHeaders);
    }

    const verifyResult = await verifyPassword(password, staff.password_hash, staff.password_salt);
    if (!verifyResult.ok) {
      const attempts = (staff.failed_attempts || 0) + 1;
      const lockUntil = attempts >= 5
        ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
        : null;
      await env.DB.prepare(
        `UPDATE staff_members
         SET failed_attempts = ?, locked_until = ?, updated_at = datetime('now')
         WHERE id = ?`
      ).bind(attempts, lockUntil, staff.id).run();
      return json({ error: 'Invalid credentials' }, 401, corsHeaders);
    }

    // Opportunistic rehash for legacy (100k iter) hashes
    if (verifyResult.needsRehash) {
      try {
        const newHash = await hashPassword(password, staff.password_salt, 600000);
        await env.DB.prepare('UPDATE staff_members SET password_hash = ? WHERE id = ?')
          .bind(newHash, staff.id).run();
      } catch (e) { console.warn('[staff-login] rehash failed:', e.message); }
    }

    // Success — issue session, reset failed_attempts
    const { token, tokenHash, expiresAt } = await issueSessionToken(staff, env);
    await env.DB.prepare(
      `UPDATE staff_members
       SET session_token_hash = ?, session_expires_at = ?, failed_attempts = 0, locked_until = NULL,
           last_login_at = datetime('now'), updated_at = datetime('now')
       WHERE id = ?`
    ).bind(tokenHash, expiresAt, staff.id).run();

    return json(
      {
        success: true,
        staff: {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          tenant_id: staff.tenant_id,
        },
      },
      200,
      corsHeaders,
      {
        'Set-Cookie': `sloten_session=${encodeURIComponent(token)}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${8 * 3600}`,
      }
    );
  } catch (e) {
    console.error('handleStaffLogin:', e.message);
    return json({ error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleStaffLogout(request, env, corsHeaders) {
  const cookieHeader = request.headers.get('Cookie') || '';
  const m = /sloten_session=([^;]+)/.exec(cookieHeader);
  if (m) {
    try {
      const rawToken = decodeURIComponent(m[1]);
      const payload = await verifySessionToken(rawToken, env);
      if (payload?.staff_id) {
        await env.DB.prepare(
          `UPDATE staff_members
           SET session_token_hash = NULL, session_expires_at = NULL
           WHERE id = ?`
        ).bind(payload.staff_id).run();

        // Invalidate cached session so subsequent requests re-check D1.
        if (env.STATE_KV) {
          const tokenHash = await sessionHashHex(rawToken);
          await env.STATE_KV.delete(`session:${tokenHash.slice(0, 16)}`).catch(() => {});
        }
      }
    } catch (_) {
      /* ignore */
    }
  }
  return json({ success: true }, 200, corsHeaders, {
    'Set-Cookie': `sloten_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`,
  });
}

export async function handleStaffMe(request, env, corsHeaders) {
  const auth = await authenticate(request, env);
  if (!auth.ok) return json({ error: auth.error }, auth.status, corsHeaders);
  return json({ success: true, staff: auth.principal }, 200, corsHeaders);
}
