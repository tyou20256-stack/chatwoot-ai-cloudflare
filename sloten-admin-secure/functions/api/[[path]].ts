/**
 * /api/* を Worker API へプロキシ
 *
 * Bearer token をサーバー側で注入するため、ブラウザJSにトークンが露出しない。
 * 環境変数:
 *   AI_GATEWAY_URL   — 例: https://chatwoot-ai-gateway-staging-bk.rcc-aoki.workers.dev
 *   ADMIN_API_TOKEN  — Worker の ADMIN_API_TOKEN と同じ値
 */

interface Env {
  AI_GATEWAY_URL: string;
  ADMIN_API_TOKEN: string;
}

// Origin allowlist (H3 CSRF defense)
const ALLOWED_ORIGINS = new Set<string>([
  'https://sloten-admin-secure.pages.dev',
  'http://127.0.0.1:8788',
  'http://localhost:8788',
]);
const PREVIEW_ORIGIN_RE = /^https:\/\/[a-z0-9]+\.sloten-admin-secure\.pages\.dev$/;

function isOriginAllowed(origin: string): boolean {
  if (ALLOWED_ORIGINS.has(origin)) return true;
  if (PREVIEW_ORIGIN_RE.test(origin)) return true;
  return false;
}

function forbidden(reason: string): Response {
  return new Response(
    JSON.stringify({ error: 'Origin not allowed' }),
    { status: 403, headers: { 'Content-Type': 'application/json' } }
  );
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context;

  if (!env.AI_GATEWAY_URL || !env.ADMIN_API_TOKEN) {
    return new Response(
      JSON.stringify({ error: 'Admin proxy misconfigured (missing env vars)' }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Origin / Sec-Fetch-Site check for mutating requests (H3 CSRF defense)
  const method = request.method.toUpperCase();
  const isMutating = method !== 'GET' && method !== 'HEAD';
  if (isMutating) {
    // ο-CSRF: strict — reject when Sec-Fetch-Site is missing or not same-origin.
    // Modern browsers always send it; absence indicates curl/legacy/cross-origin.
    const secFetchSite = request.headers.get('Sec-Fetch-Site');
    if (secFetchSite !== 'same-origin') {
      console.warn('[api-proxy] rejected: Sec-Fetch-Site=' + (secFetchSite || 'missing'));
      return forbidden('sec-fetch-site');
    }
    const origin = request.headers.get('Origin');
    if (!origin) {
      console.warn('[api-proxy] rejected: missing Origin header on ' + method);
      return forbidden('missing-origin');
    }
    if (!isOriginAllowed(origin)) {
      console.warn('[api-proxy] rejected origin: ' + origin);
      return forbidden('origin-not-allowed');
    }
  }

  const pathSegments = Array.isArray(params.path) ? params.path : [params.path];
  const subPath = pathSegments.filter(Boolean).join('/');
  const targetUrl = new URL(request.url);
  const upstream = `${env.AI_GATEWAY_URL.replace(/\/$/, '')}/api/${subPath}${targetUrl.search}`;

  // リクエストヘッダーを構築: Bearer を上書き、Originを明示
  const headers = new Headers();
  for (const [k, v] of request.headers.entries()) {
    const lk = k.toLowerCase();
    if (lk === 'authorization' || lk === 'host' || lk === 'cf-connecting-ip' ||
        lk === 'x-forwarded-for' || lk === 'x-real-ip') continue;
    headers.set(k, v);
  }
  // Auth model: all /api/* requests MUST present a session cookie (issued by
  // /api/auth/login). Browser Bearer injection was removed (ξ-C1) because it
  // allowed anonymous GETs to bypass authentication as admin. The admin
  // Bearer token is reserved for ops/CI/external tools hitting the Worker
  // directly, never through this Pages proxy.
  const cookieHeader = request.headers.get('Cookie') || '';
  const hasSessionCookie = /sloten_session=/.test(cookieHeader);
  const isAuthEndpoint = subPath.startsWith('auth/');
  if (!hasSessionCookie && !isAuthEndpoint) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized (session cookie required)' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }
  // Worker側のCORS allowlist に通すため、Pagesの公開Originを明示
  const publicOrigin = new URL(request.url).origin;
  headers.set('Origin', publicOrigin);

  // Body はメソッドに応じて転送
  const init: RequestInit = {
    method: request.method,
    headers,
    redirect: 'manual',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.arrayBuffer();
  }

  try {
    const upstreamResponse = await fetch(upstream, init);
    // レスポンスヘッダーをクライアントへ（Set-Cookie はパススルー）
    const respHeaders = new Headers(upstreamResponse.headers);
    respHeaders.delete('access-control-allow-origin');
    respHeaders.delete('access-control-allow-methods');
    respHeaders.delete('access-control-allow-headers');
    respHeaders.delete('access-control-max-age');
    // Set-Cookie must pass through for /api/auth/* session cookies
    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: respHeaders,
    });
  } catch (e) {
    console.error('[api-proxy] upstream error:', (e as Error).message);
    return new Response(
      JSON.stringify({ error: 'Upstream fetch failed' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
