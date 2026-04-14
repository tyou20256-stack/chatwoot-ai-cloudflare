// ============================================
// kv-cache.mjs — Cloudflare KV helpers with graceful fallback
// ============================================
//
// Wraps env.STATE_KV for distributed state shared across isolates.
// If STATE_KV binding is missing (local dev, misconfigured env),
// all functions degrade gracefully (no-op for set/del, null for get)
// so callers never throw.
//
// Usage:
//   import { kvGet, kvSet, kvDel } from './kv-cache.mjs';
//   await kvSet(env, 'key', { foo: 1 }, { ttl: 300 });
//   const v = await kvGet(env, 'key'); // parsed JSON or null
//   await kvDel(env, 'key');
// ============================================

function hasKV(env) {
  return env && env.STATE_KV && typeof env.STATE_KV.get === 'function';
}

/**
 * Fetch value from STATE_KV. Returns parsed JSON or null.
 * Never throws — KV errors are logged and resolved as null.
 */
export async function kvGet(env, key) {
  if (!hasKV(env)) return null;
  try {
    const raw = await env.STATE_KV.get(key, 'text');
    if (raw == null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  } catch (e) {
    console.warn(`[kv-cache] get(${key}) error:`, e.message);
    return null;
  }
}

/**
 * Write value to STATE_KV. Value is JSON-stringified.
 * opts: { ttl?: number (seconds) }
 */
export async function kvSet(env, key, value, opts = {}) {
  if (!hasKV(env)) return false;
  try {
    const body = typeof value === 'string' ? value : JSON.stringify(value);
    const kvOpts = {};
    if (opts.ttl && Number.isFinite(opts.ttl) && opts.ttl >= 60) {
      kvOpts.expirationTtl = opts.ttl;
    }
    await env.STATE_KV.put(key, body, kvOpts);
    return true;
  } catch (e) {
    console.warn(`[kv-cache] set(${key}) error:`, e.message);
    return false;
  }
}

/**
 * Delete a key from STATE_KV. Best-effort.
 */
export async function kvDel(env, key) {
  if (!hasKV(env)) return false;
  try {
    await env.STATE_KV.delete(key);
    return true;
  } catch (e) {
    console.warn(`[kv-cache] del(${key}) error:`, e.message);
    return false;
  }
}

export function kvAvailable(env) {
  return hasKV(env);
}
