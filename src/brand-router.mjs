// ============================================
// brand-router.mjs — マルチブランドルーティング
// ============================================
//
// リクエストからブランドIDを特定し、brand_configを返す。
// 解決順序:
//   1. クエリパラメータ ?brand=sloten
//   2. X-Brand-ID ヘッダー
//   3. Origin / Referer ヘッダーのドメインマッチ
//   4. デフォルト: 'sloten'
//
// 使い方:
//   import { resolveBrand } from './brand-router.mjs';
//   const brand = await resolveBrand(request, env);
//   // brand.id, brand.tenant_id, brand.language, ...
// ============================================

// --- ブランドキャッシュ（isolate内、2分TTL） ---
let brandCache = { data: null, timestamp: 0 };
const BRAND_CACHE_TTL = 2 * 60 * 1000;

/**
 * D1からアクティブなブランド設定を全件取得（キャッシュ付き）
 */
async function loadBrands(env) {
  const now = Date.now();
  if (brandCache.data && (now - brandCache.timestamp) < BRAND_CACHE_TTL) {
    return brandCache.data;
  }

  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM brand_config WHERE is_active = 1'
    ).all();

    // id → config マップ + domain → config マップ
    const byId = {};
    const byDomain = {};
    for (const row of results) {
      byId[row.id] = row;
      if (row.domain) {
        byDomain[row.domain.toLowerCase()] = row;
      }
    }

    brandCache = { data: { byId, byDomain, all: results }, timestamp: now };
    return brandCache.data;
  } catch (e) {
    console.error('[loadBrands] D1エラー:', e.message);
    // キャッシュがあれば返す（stale-while-error）
    if (brandCache.data) return brandCache.data;
    return { byId: {}, byDomain: {}, all: [] };
  }
}

/**
 * ブランドキャッシュクリア
 */
export function clearBrandCache() {
  brandCache = { data: null, timestamp: 0 };
}

/**
 * デフォルトブランド設定（DB未登録時のフォールバック）
 */
const DEFAULT_BRAND = {
  id: 'sloten',
  name: 'スロット天国',
  domain: 'sloten.io',
  welcome_message: 'カスタマーサポートへようこそ！',
  tone: 'friendly',
  language: 'ja',
  primary_color: '#183440',
  accent_color: '#FFD700',
  ai_character_id: null,
  gemini_model: 'gemini-2.5-flash-lite',
  tenant_id: 'tenant_default',
  is_active: 1,
};

/**
 * リクエストからブランドを解決
 *
 * @param {Request} request
 * @param {object} env
 * @returns {Promise<object>} brand_config行 + tenant_id
 */
export async function resolveBrand(request, env) {
  const url = new URL(request.url);
  const brands = await loadBrands(env);

  // 1. クエリパラメータ ?brand=sloten
  const brandParam = url.searchParams.get('brand');
  if (brandParam && brands.byId[brandParam]) {
    return brands.byId[brandParam];
  }

  // 2. X-Brand-ID ヘッダー
  const brandHeader = request.headers.get('X-Brand-ID');
  if (brandHeader && brands.byId[brandHeader]) {
    return brands.byId[brandHeader];
  }

  // 3. Origin / Referer ドメインマッチ
  const origin = request.headers.get('Origin') || request.headers.get('Referer') || '';
  if (origin) {
    try {
      const hostname = new URL(origin).hostname.toLowerCase();
      if (brands.byDomain[hostname]) {
        return brands.byDomain[hostname];
      }
      // サブドメイン対応: cs.sloten.io → sloten.io
      const parts = hostname.split('.');
      if (parts.length > 2) {
        const baseDomain = parts.slice(-2).join('.');
        if (brands.byDomain[baseDomain]) {
          return brands.byDomain[baseDomain];
        }
      }
    } catch (_) { /* invalid URL, skip */ }
  }

  // 4. デフォルト
  return brands.byId['sloten'] || DEFAULT_BRAND;
}
