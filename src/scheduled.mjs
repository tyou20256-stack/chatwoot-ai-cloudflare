// Scheduled Cron handler — 90-day audit log + old ai_stats retention
// Invoked by Cloudflare Cron Trigger (see wrangler.toml [triggers])
//
// Cron schedules:
//   "0 3 * * *"  — Daily retention purge at 03:00 UTC
//   "0 * * * *"  — Hourly heartbeat checker (alerts if daily run missed)

/**
 * Paginated DELETE for large backlog resilience (ι3).
 * If cron missed for days, single massive DELETE could exceed CPU budget.
 * NOTE: tableName is interpolated but always a hardcoded literal — no SQL injection risk.
 */
async function paginatedDelete(env, tableName, cutoffDays, batchSize = 1000, maxBatches = 20) {
  let totalDeleted = 0;
  for (let i = 0; i < maxBatches; i++) {
    try {
      const res = await env.DB.prepare(
        `DELETE FROM ${tableName} WHERE id IN (
          SELECT id FROM ${tableName} WHERE created_at < datetime('now', '-${cutoffDays} days') LIMIT ?
        )`
      ).bind(batchSize).run();
      const changes = res.meta?.changes || 0;
      totalDeleted += changes;
      if (changes < batchSize) break;
    } catch (e) {
      console.error(`[scheduled] ${tableName} batch ${i} failed:`, e.message);
      break;
    }
  }
  return totalDeleted;
}

/**
 * Entry point — dispatches by cron schedule + UTC hour.
 * - Daily purge runs only on the "0 3 * * *" trigger (or when UTC hour is 3).
 * - Heartbeat check runs every invocation (cheap; one SELECT).
 */
export async function handleScheduled(event, env, ctx) {
  const cron = event?.cron || '';
  const hourUtc = new Date().getUTCHours();

  // Daily retention purge — runs at 03:00 UTC
  if (cron === '0 3 * * *' || hourUtc === 3) {
    await runDailyPurge(env, ctx);
  }
  // Hourly heartbeat checker — runs every invocation
  await checkCronHeartbeat(env, ctx);
}

/**
 * Heartbeat checker (ι4): alerts via Telegram if last successful daily run
 * was more than 26 hours ago (daily cadence missed at least once).
 */
async function checkCronHeartbeat(env, ctx) {
  try {
    const lastSuccess = await env.DB.prepare(
      `SELECT value FROM feature_flags WHERE key = 'last_cron_success'`
    ).first();
    if (!lastSuccess?.value) return;
    const lastTime = new Date(lastSuccess.value).getTime();
    const hoursAgo = (Date.now() - lastTime) / (1000 * 3600);

    if (hoursAgo > 26) {
      if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_ALERT_CHAT_ID) {
        await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json; charset=utf-8' },
          body: JSON.stringify({
            chat_id: env.TELEGRAM_ALERT_CHAT_ID,
            text: `⚠️ Sloten cron heartbeat: last daily retention run was ${hoursAgo.toFixed(1)}h ago.\nExpected: <26h. Investigate immediately.`,
          }),
        }).catch(() => {});
      }
    }
  } catch (e) {
    console.error('[heartbeat] check failed:', e.message);
  }
}

/**
 * Daily retention purge: audit_logs, ai_stats, resolved conversations + cascade.
 */
async function runDailyPurge(env, ctx) {
  const cutoffDays = 90;
  const started = Date.now();

  try {
    // Purge audit_logs older than cutoff (paginated — ι3)
    const auditDeleted = await paginatedDelete(env, 'audit_logs', cutoffDays);
    const auditResult = { meta: { changes: auditDeleted } };
    // Purge ai_stats older than cutoff (paginated — ι3)
    const aiStatsDeleted = await paginatedDelete(env, 'ai_stats', cutoffDays);
    const aiStatsResult = { meta: { changes: aiStatsDeleted } };
    // ξ-H3: Extend retention to fast-growth tables (schema-tolerant via CREATE-on-absent check)
    // webhook_deliveries uses `delivered_at`, not `created_at` — handled inline.
    const extendedTables = [
      { name: 'proactive_trigger_log', col: 'created_at' },
      { name: 'vip_interaction_log', col: 'created_at' },
      { name: 'escalation_queue', col: 'created_at' },
      { name: 'chat_sessions', col: 'created_at' },
      { name: 'response_cache', col: 'created_at' },
    ];
    for (const t of extendedTables) {
      try {
        await paginatedDelete(env, t.name, cutoffDays);
      } catch (e) {
        console.warn(`[scheduled] skip ${t.name}:`, e.message);
      }
    }
    // webhook_deliveries: delivered_at column
    try {
      for (let i = 0; i < 20; i++) {
        const res = await env.DB.prepare(
          `DELETE FROM webhook_deliveries WHERE id IN (
             SELECT id FROM webhook_deliveries WHERE delivered_at < datetime('now', '-${cutoffDays} days') LIMIT 1000
           )`
        ).run();
        if ((res.meta?.changes || 0) < 1000) break;
      }
    } catch (e) {
      console.warn('[scheduled] webhook_deliveries purge:', e.message);
    }
    // Purge resolved conversations + messages older than cutoff
    const oldConvs = await env.DB.prepare(
      `SELECT id FROM conversations WHERE status = 'resolved' AND resolved_at < datetime('now', '-${cutoffDays} days')`
    ).all();
    const convIds = (oldConvs.results || []).map(r => r.id);
    let msgResult = { meta: { changes: 0 } };
    let convResult = { meta: { changes: 0 } };
    if (convIds.length > 0) {
      // Cascade: delete messages then conversations in batches
      const batchSize = 50;
      for (let i = 0; i < convIds.length; i += batchSize) {
        const batch = convIds.slice(i, i + batchSize);
        const placeholders = batch.map(() => '?').join(',');
        // Atomic cascade via D1 batch — messages, files, tags, conversation together
        await env.DB.batch([
          env.DB.prepare(`DELETE FROM messages WHERE conversation_id IN (${placeholders})`).bind(...batch),
          env.DB.prepare(`DELETE FROM files WHERE conversation_id IN (${placeholders})`).bind(...batch),
          env.DB.prepare(`DELETE FROM conversation_tags WHERE conversation_id IN (${placeholders})`).bind(...batch),
          env.DB.prepare(`DELETE FROM conversations WHERE id IN (${placeholders})`).bind(...batch),
        ]);
      }
      msgResult.meta.changes = convIds.length;
      convResult.meta.changes = convIds.length;
    }
    const elapsed = Date.now() - started;
    console.log('[scheduled] purge done:', {
      audit_logs_deleted: auditResult.meta?.changes || 0,
      ai_stats_deleted: aiStatsResult.meta?.changes || 0,
      conversations_purged: convIds.length,
      elapsed_ms: elapsed,
    });
    // Heartbeat: record last successful run in feature_flags
    try {
      await env.DB.prepare(
        `INSERT OR REPLACE INTO feature_flags (key, value, updated_at)
         VALUES ('last_cron_success', ?, datetime('now'))`
      ).bind(new Date().toISOString()).run();
    } catch (_) { /* best effort */ }
  } catch (e) {
    console.error('[scheduled] purge failed:', e.message);
    // Send Telegram alert on failure
    if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_ALERT_CHAT_ID) {
      await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({
          chat_id: env.TELEGRAM_ALERT_CHAT_ID,
          text: `🚨 Sloten cron failure\n${e.message}\nTime: ${new Date().toISOString()}`,
        }),
      }).catch(() => {});
    }
  }
}
