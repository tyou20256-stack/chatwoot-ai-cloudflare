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

export async function handleBusinessHoursGet(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenant_id') || 'tenant_default';
    const { results } = await env.DB.prepare(
      'SELECT * FROM business_hours WHERE tenant_id = ? ORDER BY day_of_week ASC'
    ).bind(tenantId).all();
    const rows = results || [];
    // Aggregate tenant-level ooo fields from the per-day rows.
    const oooMessage = rows.find((r) => r.ooo_message)?.ooo_message || '';
    const anyOpen = rows.some((r) => r.is_open);
    // No dedicated ooo_enabled column — infer: enabled when no day is open.
    const oooEnabled = rows.length > 0 && !anyOpen;
    const jst = jstNow();
    const currentDay = jst.getUTCDay();
    const hhmm = `${String(jst.getUTCHours()).padStart(2, '0')}:${String(jst.getUTCMinutes()).padStart(2, '0')}`;
    const today = rows.find((r) => r.day_of_week === currentDay);
    let isOpen = false;
    if (today && today.is_open) {
      isOpen = today.open_time && today.close_time
        ? (hhmm >= today.open_time && hhmm <= today.close_time)
        : true;
    }
    return ok({
      success: true,
      hours: rows,
      business_hours: rows,
      ooo_message: oooMessage,
      ooo_enabled: oooEnabled,
      is_open: isOpen,
      current_day: currentDay,
    }, corsHeaders);
  } catch (e) {
    console.error('handleBusinessHoursGet:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

export async function handleBusinessHoursPut(request, env, corsHeaders) {
  const parsed = await parseJson(request, corsHeaders);
  if (parsed.response) return parsed.response;
  const body = parsed.body || {};
  const url = new URL(request.url);
  const tenantId = body.tenant_id || url.searchParams.get('tenant_id') || 'tenant_default';
  try {
    if (Array.isArray(body.hours)) {
      await env.DB.prepare('DELETE FROM business_hours WHERE tenant_id = ?').bind(tenantId).run();
      for (const h of body.hours) {
        const dow = Number(h.day_of_week);
        if (!Number.isInteger(dow) || dow < 0 || dow > 6) continue;
        await env.DB.prepare(
          `INSERT INTO business_hours (tenant_id, day_of_week, open_time, close_time, is_open, ooo_message)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(
          tenantId, dow,
          h.open_time ?? null, h.close_time ?? null,
          h.is_open ? 1 : 0, h.ooo_message ?? null,
        ).run();
      }
    } else if (typeof body.ooo_message === 'string') {
      const existing = await env.DB.prepare(
        'SELECT COUNT(*) AS c FROM business_hours WHERE tenant_id = ?'
      ).bind(tenantId).first();
      if ((existing?.c || 0) === 0) {
        for (let d = 0; d < 7; d++) {
          await env.DB.prepare(
            `INSERT INTO business_hours (tenant_id, day_of_week, is_open, ooo_message)
             VALUES (?, ?, 1, ?)`
          ).bind(tenantId, d, body.ooo_message).run();
        }
      } else {
        await env.DB.prepare(
          'UPDATE business_hours SET ooo_message = ? WHERE tenant_id = ?'
        ).bind(body.ooo_message, tenantId).run();
      }
    } else if (body.ooo_enabled !== undefined) {
      // No dedicated column — silently accept (no-op). Logical state can be inferred
      // from is_open rows on GET.
    } else {
      return err('Provide hours[] or ooo_message', 400, corsHeaders);
    }

    const { results } = await env.DB.prepare(
      'SELECT * FROM business_hours WHERE tenant_id = ? ORDER BY day_of_week ASC'
    ).bind(tenantId).all();
    return ok({ success: true, business_hours: results || [] }, corsHeaders);
  } catch (e) {
    console.error('handleBusinessHoursPut:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}

function jstNow() {
  const now = new Date();
  const jstMs = now.getTime() + (9 * 60 - now.getTimezoneOffset()) * 60 * 1000;
  return new Date(jstMs);
}

export async function handleBusinessHoursStatus(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenant_id') || 'tenant_default';
    const jst = jstNow();
    const currentDay = jst.getUTCDay();
    const hhmm = `${String(jst.getUTCHours()).padStart(2, '0')}:${String(jst.getUTCMinutes()).padStart(2, '0')}`;

    const row = await env.DB.prepare(
      'SELECT * FROM business_hours WHERE tenant_id = ? AND day_of_week = ?'
    ).bind(tenantId, currentDay).first();

    let isOpen = false;
    if (row && row.is_open) {
      if (row.open_time && row.close_time) {
        isOpen = hhmm >= row.open_time && hhmm <= row.close_time;
      } else {
        isOpen = true;
      }
    }

    return ok({ success: true, is_open: isOpen, current_day: currentDay }, corsHeaders);
  } catch (e) {
    console.error('handleBusinessHoursStatus:', e.message);
    return err('Internal error', 500, corsHeaders);
  }
}
