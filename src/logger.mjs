// ⚠️ 弊社側暫定実装 — 構造化ログヘルパー
// Cloudflare Logpush や外部ログアグリゲーターで JSON パース可能な形で出力

const LEVELS = ['debug', 'info', 'warn', 'error'];

export function logEvent(event, level = 'info', data = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...data,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export function logInfo(event, data) { logEvent(event, 'info', data); }
export function logWarn(event, data) { logEvent(event, 'warn', data); }
export function logError(event, data) { logEvent(event, 'error', data); }
