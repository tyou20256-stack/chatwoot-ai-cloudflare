// 弊社側暫定実装 — tking510 納品版で置き換え予定

const json = (obj, status, corsHeaders) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
const ok = (obj, corsHeaders) => json(obj, 200, corsHeaders);
const err = (msg, status, corsHeaders) => json({ success: false, error: msg }, status, corsHeaders);

async function parseJson(request, corsHeaders) {
  try { return { body: await request.json() }; }
  catch { return { response: err('Invalid JSON', 400, corsHeaders) }; }
}

async function hmacSha256Hex(secret, body) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

const WEBHOOK_UPDATE_COLS = ['name', 'url', 'events', 'is_active'];

/**
 * SSRF guard: HTTPS-only; block localhost, private, link-local, CGNAT, metadata endpoints.
 */
function validateWebhookUrl(u) {
  if (!u || typeof u !== 'string') return { ok: false, error: 'URL required' };
  let parsed;
  try { parsed = new URL(u); } catch { return { ok: false, error: 'Invalid URL' }; }
  if (parsed.protocol !== 'https:') return { ok: false, error: 'HTTPS required' };
  const host = parsed.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '0.0.0.0') {
    return { ok: false, error: 'Loopback URL not allowed' };
  }
  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number);
    if (a === 10) return { ok: false, error: 'Private IP not allowed' };
    if (a === 172 && b >= 16 && b <= 31) return { ok: false, error: 'Private IP not allowed' };
    if (a === 192 && b === 168) return { ok: false, error: 'Private IP not allowed' };
    if (a === 169 && b === 254) return { ok: false, error: 'Link-local IP not allowed' };
    if (a === 100 && b >= 64 && b <= 127) return { ok: false, error: 'CGNAT IP not allowed' };
    if (a === 127) return { ok: false, error: 'Loopback IP not allowed' };
    if (a === 0) return { ok: false, error: 'Invalid IP not allowed' };
  }
  if (host === 'metadata.google.internal' || host.endsWith('.internal')) {
    return { ok: false, error: 'Internal hostname not allowed' };
  }
  return { ok: true };
}

function normalizeEvents(events) {
  if (events == null) return null;
  if (typeof events === 'string') return events;
  try { return JSON.stringify(events); } catch { return null; }
}

export async function handleWebhooksGet(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenant_id') || 'tenant_default';
    const { results } = await env.DB.prepare(
      `SELECT *, NULL AS retry_count, NULL AS failure_count, NULL AS last_triggered_at
       FROM webhooks WHERE tenant_id = ? ORDER BY created_at DESC`
    ).bind(tenantId).all();
    return ok({ success: true, webhooks: results || [] }, corsHeaders);
  } catch (e) {
    console.error('handleWebhooksGet:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleWebhooksGetOne(request, env, corsHeaders, id) {
  try {
    const webhook = await env.DB.prepare('SELECT * FROM webhooks WHERE id = ?').bind(id).first();
    if (!webhook) return err('Webhook not found', 404, corsHeaders);
    return ok({ success: true, webhook }, corsHeaders);
  } catch (e) {
    console.error('handleWebhooksGetOne:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleWebhooksPost(request, env, corsHeaders) {
  const parsed = await parseJson(request, corsHeaders);
  if (parsed.response) return parsed.response;
  const {
    tenant_id = 'tenant_default',
    name = null,
    url,
    events = null,
    secret,
    is_active = 1,
  } = parsed.body;
  if (!url) return err('url is required', 400, corsHeaders);
  const urlValidation = validateWebhookUrl(url);
  if (!urlValidation.ok) return err(urlValidation.error, 400, corsHeaders);
  const finalSecret = secret || crypto.randomUUID();
  const eventsStr = normalizeEvents(events);
  try {
    const result = await env.DB.prepare(
      `INSERT INTO webhooks (tenant_id, name, url, events, secret, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(tenant_id, name, url, eventsStr, finalSecret, is_active ? 1 : 0).run();
    const newId = result.meta?.last_row_id;
    const webhook = await env.DB.prepare('SELECT * FROM webhooks WHERE id = ?').bind(newId).first();
    return json({ success: true, webhook }, 201, corsHeaders);
  } catch (e) {
    console.error('handleWebhooksPost:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleWebhooksPut(request, env, corsHeaders, id) {
  const parsed = await parseJson(request, corsHeaders);
  if (parsed.response) return parsed.response;
  try {
    const existing = await env.DB.prepare('SELECT * FROM webhooks WHERE id = ?').bind(id).first();
    if (!existing) return err('Webhook not found', 404, corsHeaders);
    const sets = [];
    const vals = [];
    if ('url' in parsed.body) {
      const urlValidation = validateWebhookUrl(parsed.body.url);
      if (!urlValidation.ok) return err(urlValidation.error, 400, corsHeaders);
    }
    for (const col of WEBHOOK_UPDATE_COLS) {
      if (col in parsed.body) {
        let v = parsed.body[col];
        if (col === 'events') v = normalizeEvents(v);
        if (col === 'is_active') v = v ? 1 : 0;
        sets.push(`${col} = ?`);
        vals.push(v);
      }
    }
    if (sets.length === 0) return ok({ success: true, webhook: existing }, corsHeaders);
    sets.push(`updated_at = datetime('now')`);
    vals.push(id);
    await env.DB.prepare(`UPDATE webhooks SET ${sets.join(', ')} WHERE id = ?`).bind(...vals).run();
    const webhook = await env.DB.prepare('SELECT * FROM webhooks WHERE id = ?').bind(id).first();
    return ok({ success: true, webhook }, corsHeaders);
  } catch (e) {
    console.error('handleWebhooksPut:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleWebhooksDelete(request, env, corsHeaders, id) {
  try {
    const existing = await env.DB.prepare('SELECT id FROM webhooks WHERE id = ?').bind(id).first();
    if (!existing) return err('Webhook not found', 404, corsHeaders);
    // App-level cascade (in case DB FK cascade is not enabled) — atomic via D1 batch
    await env.DB.batch([
      env.DB.prepare('DELETE FROM webhook_deliveries WHERE webhook_id = ?').bind(id),
      env.DB.prepare('DELETE FROM webhooks WHERE id = ?').bind(id),
    ]);
    return ok({ success: true, deleted: Number(id) }, corsHeaders);
  } catch (e) {
    console.error('handleWebhooksDelete:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleWebhooksDeliveries(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const webhookId = url.searchParams.get('webhook_id');
    let limit = parseInt(url.searchParams.get('limit') || '100', 10);
    if (!Number.isFinite(limit) || limit < 1) limit = 100;
    if (limit > 500) limit = 500;

    let query = 'SELECT *, delivered_at AS created_at, NULL AS attempt_count FROM webhook_deliveries';
    const binds = [];
    if (webhookId) {
      query += ' WHERE webhook_id = ?';
      binds.push(webhookId);
    }
    query += ' ORDER BY delivered_at DESC LIMIT ?';
    binds.push(limit);

    const { results } = await env.DB.prepare(query).bind(...binds).all();
    return ok({ success: true, deliveries: results || [] }, corsHeaders);
  } catch (e) {
    console.error('handleWebhooksDeliveries:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleWebhooksTest(request, env, corsHeaders, id) {
  let webhook;
  try {
    webhook = await env.DB.prepare('SELECT * FROM webhooks WHERE id = ?').bind(id).first();
    if (!webhook) return err('Webhook not found', 404, corsHeaders);
  } catch (e) {
    console.error('handleWebhooksTest(lookup):', e.message);
    return err('Internal error', 500, corsHeaders);
  }

  // SSRF re-validation before outbound fetch (defense against stored-URL tampering / DNS rebinding)
  const urlValidation = validateWebhookUrl(webhook.url);
  if (!urlValidation.ok) return err(`Stored webhook URL invalid: ${urlValidation.error}`, 400, corsHeaders);

  const payload = {
    event: 'test',
    timestamp: new Date().toISOString(),
    data: { message: 'test delivery' },
  };
  const body = JSON.stringify(payload);
  const secret = webhook.secret || '';

  let signature = '';
  try {
    signature = await hmacSha256Hex(secret, body);
  } catch (e) {
    console.error('handleWebhooksTest(sign):', e.message);
    return err('Internal error', 500, corsHeaders);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  let status = 0;
  let responseBody = '';
  let delivered = false;
  let errorMessage = null;

  try {
    const resp = await fetch(webhook.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Signature': signature,
        'X-Event': 'test',
      },
      body,
      signal: controller.signal,
    });
    status = resp.status;
    try {
      const text = await resp.text();
      responseBody = text.length > 500 ? text.slice(0, 500) : text;
    } catch {
      responseBody = '';
    }
    delivered = resp.ok;
  } catch (e) {
    errorMessage = e.name === 'AbortError' ? 'timeout' : (e.message || 'fetch failed');
    responseBody = errorMessage.slice(0, 500);
  } finally {
    clearTimeout(timer);
  }

  try {
    await env.DB.prepare(
      `INSERT INTO webhook_deliveries (webhook_id, event_type, payload, response_status, response_body, delivered_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'))`
    ).bind(webhook.id, 'test', body, status || 0, responseBody).run();
  } catch (e) {
    console.error('handleWebhooksTest(record):', e.message);
  }

  if (errorMessage) {
    return ok({ success: false, delivered: false, error: errorMessage }, corsHeaders);
  }
  return ok({ success: true, delivered, status, signature }, corsHeaders);
}
