// ⚠️ 弊社側暫定実装 — tking510 納品版で置き換え予定

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

function json(body, status, corsHeaders) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, ...JSON_HEADERS },
  });
}

const SI_UPDATABLE = ['name', 'sheet_url', 'webhook_url', 'sheet_type', 'config', 'is_active'];

// HTML posts `{type, spreadsheet_id, sheet_name, service_account_json}`.
// Our schema has `sheet_type` + free-form `config` JSON — map accordingly.
function applyHtmlAliases(body) {
  if (!body || typeof body !== 'object') return body;
  const out = { ...body };
  // type -> sheet_type
  if (out.type !== undefined && out.sheet_type === undefined) out.sheet_type = out.type;
  // Merge spreadsheet_id/sheet_name/service_account_json into config JSON.
  const cfg = (typeof out.config === 'object' && out.config !== null) ? { ...out.config } : {};
  let cfgTouched = false;
  for (const k of ['spreadsheet_id', 'sheet_name', 'service_account_json']) {
    if (out[k] !== undefined) { cfg[k] = out[k]; cfgTouched = true; }
  }
  if (cfgTouched) out.config = cfg;
  return out;
}

function decorateIntegration(row) {
  if (!row) return row;
  let cfg = {};
  if (row.config) {
    try { cfg = typeof row.config === 'string' ? JSON.parse(row.config) : row.config; }
    catch { cfg = {}; }
  }
  return {
    ...row,
    type: row.sheet_type ?? null,
    spreadsheet_id: cfg.spreadsheet_id ?? null,
    sheet_name: cfg.sheet_name ?? null,
  };
}

export async function handleSheetIntegrationsGet(request, env, corsHeaders) {
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM sheet_integrations ORDER BY created_at DESC'
    ).all();
    const rows = (results || []).map(decorateIntegration);
    return json({ success: true, integrations: rows }, 200, corsHeaders);
  } catch (e) {
    console.error('handleSheetIntegrationsGet:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleSheetIntegrationsPost(request, env, corsHeaders) {
  let body;
  try { body = await request.json(); } catch {
    return json({ success: false, error: 'Invalid JSON' }, 400, corsHeaders);
  }
  try {
    body = applyHtmlAliases(body);
    const {
      tenant_id = 'tenant_default',
      name = null, sheet_url = null, webhook_url = null,
      sheet_type = null, config = null, is_active = 1,
    } = body || {};

    const configStr = typeof config === 'string' ? config : (config ? JSON.stringify(config) : null);

    const result = await env.DB.prepare(
      `INSERT INTO sheet_integrations (tenant_id, name, sheet_url, webhook_url, sheet_type, config, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(tenant_id, name, sheet_url, webhook_url, sheet_type, configStr, is_active).run();

    return json({ success: true, id: result.meta?.last_row_id }, 201, corsHeaders);
  } catch (e) {
    console.error('handleSheetIntegrationsPost:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleSheetIntegrationsPut(request, env, corsHeaders, id) {
  let body;
  try { body = await request.json(); } catch {
    return json({ success: false, error: 'Invalid JSON' }, 400, corsHeaders);
  }
  try {
    const existing = await env.DB.prepare('SELECT id FROM sheet_integrations WHERE id = ?').bind(id).first();
    if (!existing) return json({ success: false, error: 'Not found' }, 404, corsHeaders);

    body = applyHtmlAliases(body);
    const sets = [];
    const binds = [];
    for (const col of SI_UPDATABLE) {
      if (Object.prototype.hasOwnProperty.call(body, col)) {
        sets.push(`${col} = ?`);
        let val = body[col];
        if (col === 'config' && val && typeof val !== 'string') val = JSON.stringify(val);
        binds.push(val);
      }
    }
    if (sets.length === 0) {
      return json({ success: false, error: 'No updatable fields provided' }, 400, corsHeaders);
    }
    binds.push(id);
    await env.DB.prepare(`UPDATE sheet_integrations SET ${sets.join(', ')} WHERE id = ?`).bind(...binds).run();
    return json({ success: true, id: Number(id) }, 200, corsHeaders);
  } catch (e) {
    console.error('handleSheetIntegrationsPut:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}

export async function handleSheetIntegrationsDelete(request, env, corsHeaders, id) {
  try {
    const existing = await env.DB.prepare('SELECT id FROM sheet_integrations WHERE id = ?').bind(id).first();
    if (!existing) return json({ success: false, error: 'Not found' }, 404, corsHeaders);
    await env.DB.prepare('DELETE FROM sheet_integrations WHERE id = ?').bind(id).run();
    return json({ success: true, id: Number(id) }, 200, corsHeaders);
  } catch (e) {
    console.error('handleSheetIntegrationsDelete:', e.message);
    return json({ success: false, error: 'Internal error' }, 500, corsHeaders);
  }
}
