/**
 * auth-helper.mjs
 * Critical修正 C1: /api/ai/toggle, /api/ai/stats の認証
 *
 * Bearer token 認証 + IP allowlist（任意）
 *
 * 必須 secret:
 *   wrangler secret put ADMIN_API_TOKEN
 *
 * 任意 secret:
 *   wrangler secret put ADMIN_IP_ALLOWLIST  # カンマ区切り "203.0.113.0/24,198.51.100.5"
 */

/**
 * 管理APIへのアクセスを検証
 * @param {Request} request
 * @param {object} env
 * @returns {{ok: true} | {ok: false, status: number, error: string}}
 */
export function verifyAdminAuth(request, env) {
  // 1. ADMIN_API_TOKEN が設定されていなければ拒否（本番で未設定のまま公開されるのを防ぐ）
  const token = env?.ADMIN_API_TOKEN;
  if (!token || token.length < 16) {
    console.error('[auth] ADMIN_API_TOKEN not configured or too short');
    return { ok: false, status: 503, error: 'Admin API not configured' };
  }

  // 2. Bearer token 検証（timing-safe compare）
  const authHeader = request.headers.get('Authorization') || '';
  const match = /^Bearer\s+(.+)$/.exec(authHeader);
  if (!match) {
    return { ok: false, status: 401, error: 'Missing Bearer token' };
  }
  if (!timingSafeEqual(match[1], token)) {
    return { ok: false, status: 401, error: 'Invalid token' };
  }

  // 3. IP allowlist（設定されている場合のみ）
  const allowlist = (env?.ADMIN_IP_ALLOWLIST || '').trim();
  if (allowlist) {
    const ip = request.headers.get('CF-Connecting-IP') || '';
    const allowed = allowlist.split(',').map((s) => s.trim()).filter(Boolean);
    if (!allowed.includes(ip)) {
      console.warn('[auth] IP not in allowlist:', ip);
      return { ok: false, status: 403, error: 'IP not allowed' };
    }
  }

  return { ok: true };
}

/**
 * 定数時間比較（長さの違いも含めてリーク防止）
 */
function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

/**
 * AgentBot -> AI Gateway 間の共有シークレット検証
 * env.AI_GATEWAY_SHARED_SECRET が設定されている場合のみ検証（未設定時は pass-through）
 */
export function verifyAgentBotSecret(request, env) {
  const expected = env?.AI_GATEWAY_SHARED_SECRET;
  if (!expected) {
    const requireSecret = env?.REQUIRE_AGENTBOT_SECRET === 'true' || env?.ENVIRONMENT === 'production';
    if (requireSecret) {
      console.error('[auth] AI_GATEWAY_SHARED_SECRET required but not set');
      return { ok: false, status: 503, error: 'Service misconfigured' };
    }
    if (!globalThis.__agentbotSecretWarned) {
      globalThis.__agentbotSecretWarned = true;
      console.warn('[auth] AI_GATEWAY_SHARED_SECRET not set — /api/ai/chat is unauthenticated. Set REQUIRE_AGENTBOT_SECRET=true to fail closed.');
    }
    return { ok: true, skipped: true };
  }
  const provided = request.headers.get('X-AgentBot-Secret') || '';
  if (!provided) {
    return { ok: false, status: 401, error: 'Missing X-AgentBot-Secret header' };
  }
  if (timingSafeEqual(provided, expected)) {
    return { ok: true };
  }
  // ι5: Support one previous secret (grace period) during rotation
  if (env?.AI_GATEWAY_SHARED_SECRET_PREV && timingSafeEqual(provided, env.AI_GATEWAY_SHARED_SECRET_PREV)) {
    console.warn('[auth] AgentBot secret via AI_GATEWAY_SHARED_SECRET_PREV (rotation in progress)');
    return { ok: true, rotated: true };
  }
  return { ok: false, status: 401, error: 'Invalid AgentBot secret' };
}

/**
 * 認証失敗時のレスポンスを生成するヘルパー
 */
export function unauthorizedResponse(check, corsHeaders) {
  return new Response(JSON.stringify({ error: check.error }), {
    status: check.status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

// ============================================================================
// Staff Authentication (PBKDF2 + HMAC session tokens via Web Crypto)
// ⚠️ 弊社側暫定実装 — tking510 納品版で置き換え予定（または Cloudflare Access 移行）
// ============================================================================

// ρ-Hπ3: in-isolate request coalescing for D1 session lookups (cache stampede mitigation)
const _sessionLookupInflight = new Map();

// τ-Cτ1: WeakMap-based principal storage. Cloudflare Workers Request is immutable
// (assignment to instance properties silently fails or throws). withAuth() stores
// the authenticated principal here; handlers read it via getPrincipal(request).
const _principalByRequest = new WeakMap();
export function setPrincipal(request, principal) {
  _principalByRequest.set(request, principal);
}
export function getPrincipal(request) {
  return _principalByRequest.get(request) || null;
}

function hexToBytes(hex) {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) out[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  return out;
}

function bytesToHex(bytes) {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * PBKDF2-SHA256 password hashing.
 *
 * ⚠️ Cloudflare Workers の Web Crypto API は PBKDF2 iterations を 100,000 でキャップしている。
 * OWASP 2024 推奨は ≥600,000 だが、本環境ではプラットフォーム制約により 100k が上限。
 * 補償策:
 *   - セッション TTL 8時間（短め）
 *   - アカウントロック（5回失敗で15分）
 *   - /api/auth/login のレートリミット (10/10min/IP)
 *   - HttpOnly + Secure + SameSite=Strict cookie
 *   - 中長期的には Cloudflare Access (Zero Trust) 移行で KDF を外部委譲する
 *     → CLOUDFLARE-ACCESS-MIGRATION.md 参照
 */
const PBKDF2_ITERATIONS = 100000; // Cloudflare Workers の上限

export async function hashPassword(password, saltHex, iterations = PBKDF2_ITERATIONS) {
  const enc = new TextEncoder();
  const salt = hexToBytes(saltHex);
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return bytesToHex(new Uint8Array(bits));
}

export async function verifyPassword(password, hashHex, saltHex) {
  const actual = await hashPassword(password, saltHex, PBKDF2_ITERATIONS);
  return { ok: timingSafeEqual(actual, hashHex), needsRehash: false };
}

async function hmacSha256Hex(secret, data) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return bytesToHex(new Uint8Array(sig));
}

async function sha256Hex(data) {
  const enc = new TextEncoder();
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(data));
  return bytesToHex(new Uint8Array(digest));
}

// Exported so other handlers (e.g. logout) can invalidate the cache.
export async function sessionHashHex(token) {
  return sha256Hex(token);
}

/**
 * Session token: HMAC-signed { staff_id, role, exp }.
 * Stored in HttpOnly cookie; server-side sha256(token) stored in staff_members for revocation.
 */
export async function issueSessionToken(staff, env) {
  const secret = env.SESSION_SIGNING_KEY;
  if (!secret) throw new Error('SESSION_SIGNING_KEY not configured');
  const exp = Math.floor(Date.now() / 1000) + 8 * 60 * 60; // 8h
  const payload = JSON.stringify({
    staff_id: staff.id,
    role: staff.role,
    email: staff.email,
    exp,
  });
  const b64 = btoa(payload);
  const sig = await hmacSha256Hex(secret, b64);
  const token = `${b64}.${sig}`;
  const tokenHash = await sha256Hex(token);
  return { token, tokenHash, expiresAt: new Date(exp * 1000).toISOString() };
}

export async function verifySessionToken(token, env) {
  if (!token) return null;
  const secret = env.SESSION_SIGNING_KEY;
  if (!secret) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [b64, sig] = parts;
  const expectedSig = await hmacSha256Hex(secret, b64);
  if (!timingSafeEqual(sig, expectedSig)) return null;
  try {
    const payload = JSON.parse(atob(b64));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

const ROLE_ORDER = { viewer: 0, agent: 1, admin: 2 };
function roleGte(role, minRole) {
  return (ROLE_ORDER[role] ?? -1) >= (ROLE_ORDER[minRole] ?? 99);
}

/**
 * Unified authentication: accepts Bearer ADMIN_API_TOKEN OR sloten_session cookie.
 * options.minRole: 'viewer' | 'agent' | 'admin' (role gate, applied only to session path)
 */
export async function authenticate(request, env, options = {}) {
  const { minRole = null } = options;

  // Path 1: Bearer admin token (for ops/CI/external tools — always admin-equivalent)
  const authHeader = request.headers.get('Authorization') || '';
  const bearerMatch = /^Bearer\s+(.+)$/.exec(authHeader);
  if (bearerMatch) {
    const token = bearerMatch[1];
    if (env.ADMIN_API_TOKEN && timingSafeEqual(token, env.ADMIN_API_TOKEN)) {
      return { ok: true, principal: { type: 'admin_token', role: 'admin' } };
    }
    // ι5: Support one previous token (grace period) during rotation
    if (env.ADMIN_API_TOKEN_PREV && timingSafeEqual(token, env.ADMIN_API_TOKEN_PREV)) {
      console.warn('[auth] Admin token via ADMIN_API_TOKEN_PREV (rotation in progress)');
      return { ok: true, principal: { type: 'admin_token_prev', role: 'admin' } };
    }
  }

  // Path 2: Session cookie
  const cookieHeader = request.headers.get('Cookie') || '';
  const sessionMatch = /sloten_session=([^;]+)/.exec(cookieHeader);
  if (sessionMatch) {
    const rawToken = decodeURIComponent(sessionMatch[1]);
    const payload = await verifySessionToken(rawToken, env);
    if (payload) {
      // DB revocation check (defense in depth vs. HMAC-only validation)
      // KV cache (30s TTL) to avoid D1 read per admin request during dashboard polling.
      const tokenHash = await sha256Hex(rawToken);
      const cacheKey = `session:${tokenHash.slice(0, 16)}`;
      let row = null;

      if (env.STATE_KV) {
        try {
          const cached = await env.STATE_KV.get(cacheKey, 'json');
          if (cached
            && timingSafeEqual(cached.session_token_hash || '', tokenHash)
            && cached.is_active
            && (!cached.session_expires_at || new Date(cached.session_expires_at) > new Date())) {
            row = cached;
          }
        } catch (_) { /* ignore cache errors, fall through to D1 */ }
      }

      if (!row) {
        // ρ-Hπ3: coalesce concurrent lookups by staff_id within this isolate
        const inflightKey = `staff:${payload.staff_id}`;
        let pending = _sessionLookupInflight.get(inflightKey);
        if (!pending) {
          pending = env.DB.prepare(
            `SELECT session_token_hash, session_expires_at, is_active
             FROM staff_members WHERE id = ?`
          ).bind(payload.staff_id).first();
          _sessionLookupInflight.set(inflightKey, pending);
          // Auto-cleanup once resolved (success or failure)
          pending.finally(() => _sessionLookupInflight.delete(inflightKey)).catch(() => {});
        }
        try {
          row = await pending;
        } catch (e) {
          console.error('[authenticate] DB revocation check failed:', e.message);
          return { ok: false, status: 503, error: 'Authentication service unavailable' };
        }

        // Best-effort write-through cache (only when record looks valid)
        if (row && row.is_active && timingSafeEqual(row.session_token_hash || '', tokenHash) && env.STATE_KV) {
          env.STATE_KV.put(cacheKey, JSON.stringify({
            session_token_hash: row.session_token_hash,
            session_expires_at: row.session_expires_at,
            is_active: row.is_active,
          }), { expirationTtl: 30 }).catch(() => {});
        }
      }

      if (!row || !row.is_active) {
        return { ok: false, status: 401, error: 'Session invalid (account inactive)' };
      }
      if (!row.session_token_hash || !timingSafeEqual(row.session_token_hash, tokenHash)) {
        return { ok: false, status: 401, error: 'Session revoked' };
      }
      if (row.session_expires_at && new Date(row.session_expires_at) < new Date()) {
        return { ok: false, status: 401, error: 'Session expired' };
      }

      if (minRole && !roleGte(payload.role, minRole)) {
        return { ok: false, status: 403, error: 'Forbidden: insufficient role' };
      }
      return {
        ok: true,
        principal: {
          type: 'session',
          role: payload.role,
          staff_id: payload.staff_id,
          email: payload.email,
        },
      };
    }
  }

  return { ok: false, status: 401, error: 'Unauthorized' };
}
