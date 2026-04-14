// ⚠️ 弊社側暫定実装 — ETag/304 support for polling endpoints

/**
 * Compute weak ETag from response body.
 * Weak ETag is fine for polling — byte-equality not required.
 */
export async function computeEtag(bodyString) {
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-1', enc.encode(bodyString));
  const hex = [...new Uint8Array(hash)].slice(0, 8).map(b => b.toString(16).padStart(2, '0')).join('');
  return `W/"${hex}"`;
}

/**
 * Wrapper — if request has If-None-Match matching computed etag, return 304.
 * Otherwise return Response with ETag header set.
 *
 * Usage:
 *   const body = JSON.stringify({ success: true, ... });
 *   return await withEtag(request, body, 200, corsHeaders);
 */
export async function withEtag(request, bodyString, status, corsHeaders) {
  const etag = await computeEtag(bodyString);
  const inm = request.headers.get('If-None-Match') || '';
  if (inm && inm === etag) {
    return new Response(null, {
      status: 304,
      headers: { ...corsHeaders, ETag: etag, 'Cache-Control': 'no-cache' },
    });
  }
  return new Response(bodyString, {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      ETag: etag,
      'Cache-Control': 'no-cache',
    },
  });
}
