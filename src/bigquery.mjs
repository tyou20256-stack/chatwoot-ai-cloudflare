/**
 * BigQuery integration module for Cloudflare Workers
 * Uses VPS proxy for BQ access
 */

const BQ_PROXY_URL = 'http://bq-proxy.slotenpromotion.com';
const BQ_PROXY_TOKEN = 'bq-proxy-2026-secure';

async function _proxyCall(path, body) {
  const resp = await fetch(`${BQ_PROXY_URL}${path}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BQ_PROXY_TOKEN}`,
      'Content-Type': 'application/json; charset=utf-8',
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`BQ proxy error ${resp.status}: ${text}`);
  }
  return resp.json();
}

async function queryBigQuery(env, sql, params = {}) {
  return _proxyCall('/query', { sql, params });
}

async function getUserProfile(env, identifier) {
  const data = await _proxyCall('/user-profile', { username: identifier });
  return data.profile;
}

async function streamToBigQuery(env, tableId, rows) {
  return _proxyCall('/stream', { table: tableId, rows });
}

async function checkGGRUsers(env, minGGR) {
  return _proxyCall('/ggr-check', { min_ggr: minGGR });
}

async function getBigQueryAccessToken(env) {
  return 'proxy-mode';
}

export { queryBigQuery, streamToBigQuery, getUserProfile, getBigQueryAccessToken, checkGGRUsers };
