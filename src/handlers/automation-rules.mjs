// 弊社側暫定実装 — tking510 納品版で置き換え予定
// TODO: ルール実行エンジン(execution engine)は本実装の範囲外。CRUDのみ提供。

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

// 実スキーマ: event_type (HTML互換で trigger_event も受け取る), execution_count 列なし
const RULE_UPDATE_COLS = ['name', 'event_type', 'conditions', 'actions', 'is_active'];

function normalizeJsonField(v) {
  if (v == null) return null;
  if (typeof v === 'string') return v;
  try { return JSON.stringify(v); } catch { return null; }
}

export async function handleAutomationRulesGet(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenant_id') || 'tenant_default';
    const { results } = await env.DB.prepare(
      `SELECT *, event_type AS trigger_event, 0 AS run_count, 0 AS execution_count
       FROM automation_rules WHERE tenant_id = ? ORDER BY created_at DESC`
    ).bind(tenantId).all();
    const rows = results || [];
    return ok({ success: true, rules: rows, automation_rules: rows }, corsHeaders);
  } catch (e) {
    console.error('handleAutomationRulesGet:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleAutomationRulesGetOne(request, env, corsHeaders, id) {
  try {
    const rule = await env.DB.prepare('SELECT * FROM automation_rules WHERE id = ?').bind(id).first();
    if (!rule) return err('Automation rule not found', 404, corsHeaders);
    return ok({ success: true, automation_rule: rule }, corsHeaders);
  } catch (e) {
    console.error('handleAutomationRulesGetOne:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleAutomationRulesPost(request, env, corsHeaders) {
  const parsed = await parseJson(request, corsHeaders);
  if (parsed.response) return parsed.response;
  const {
    tenant_id = 'tenant_default',
    name,
    conditions = null,
    actions = null,
    is_active = 1,
  } = parsed.body;
  // HTML は trigger_event を送るが、実スキーマは event_type
  const event_type = parsed.body.event_type ?? parsed.body.trigger_event ?? null;
  if (!name) return err('name is required', 400, corsHeaders);
  try {
    const result = await env.DB.prepare(
      `INSERT INTO automation_rules
       (tenant_id, name, event_type, conditions, actions, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`
    ).bind(
      tenant_id,
      name,
      event_type,
      normalizeJsonField(conditions),
      normalizeJsonField(actions),
      is_active ? 1 : 0,
    ).run();
    const newId = result.meta?.last_row_id;
    const rule = await env.DB.prepare('SELECT * FROM automation_rules WHERE id = ?').bind(newId).first();
    return json({ success: true, automation_rule: rule }, 201, corsHeaders);
  } catch (e) {
    console.error('handleAutomationRulesPost:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleAutomationRulesPut(request, env, corsHeaders, id) {
  const parsed = await parseJson(request, corsHeaders);
  if (parsed.response) return parsed.response;
  try {
    const existing = await env.DB.prepare('SELECT * FROM automation_rules WHERE id = ?').bind(id).first();
    if (!existing) return err('Automation rule not found', 404, corsHeaders);
    // HTML互換: trigger_event を event_type にマップ
    if ('trigger_event' in parsed.body && !('event_type' in parsed.body)) {
      parsed.body.event_type = parsed.body.trigger_event;
    }
    const sets = [];
    const vals = [];
    for (const col of RULE_UPDATE_COLS) {
      if (col in parsed.body) {
        let v = parsed.body[col];
        if (col === 'conditions' || col === 'actions') v = normalizeJsonField(v);
        if (col === 'is_active') v = v ? 1 : 0;
        sets.push(`${col} = ?`);
        vals.push(v);
      }
    }
    if (sets.length === 0) return ok({ success: true, automation_rule: existing }, corsHeaders);
    sets.push(`updated_at = datetime('now')`);
    vals.push(id);
    await env.DB.prepare(
      `UPDATE automation_rules SET ${sets.join(', ')} WHERE id = ?`
    ).bind(...vals).run();
    const rule = await env.DB.prepare('SELECT * FROM automation_rules WHERE id = ?').bind(id).first();
    return ok({ success: true, automation_rule: rule }, corsHeaders);
  } catch (e) {
    console.error('handleAutomationRulesPut:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleAutomationRulesDelete(request, env, corsHeaders, id) {
  try {
    const existing = await env.DB.prepare('SELECT id FROM automation_rules WHERE id = ?').bind(id).first();
    if (!existing) return err('Automation rule not found', 404, corsHeaders);
    await env.DB.prepare('DELETE FROM automation_rules WHERE id = ?').bind(id).run();
    return ok({ success: true, deleted: Number(id) }, corsHeaders);
  } catch (e) {
    console.error('handleAutomationRulesDelete:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}
