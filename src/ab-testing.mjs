// TODO(kv-migration): Module-level state (abTestCache) is per-isolate.
// Consider migrating to KV (see kv-cache.mjs) once async caller propagation
// can be accommodated. Currently acceptable because this cache is per-tenant
// and 5-min TTL limits staleness exposure.
// ============================================================
// Sloten AI CS — A/Bテスト自動最適化モジュール
// src/ab-testing.mjs
// Generated: 2026-04-13
// ============================================================

// 自動最適化の閾値
const MIN_FEEDBACK_COUNT = 50;  // 最低フィードバック数
const SIGNIFICANCE_THRESHOLD = 0.05;  // 統計的有意水準 (p < 0.05)

// メモリキャッシュ（TTL 5分）
let abTestCache = null;
let abTestCacheTime = 0;
const AB_CACHE_TTL = 5 * 60 * 1000;

/**
 * キャッシュクリア
 */
export function clearABTestCache() {
  abTestCache = null;
  abTestCacheTime = 0;
}

/**
 * アクティブなA/Bテスト一覧を取得（キャッシュ付き）
 */
async function getActiveTests(env) {
  const now = Date.now();
  if (abTestCache && (now - abTestCacheTime) < AB_CACHE_TTL) {
    return abTestCache;
  }
  const { results } = await env.DB.prepare(
    'SELECT * FROM ab_tests WHERE is_active = 1'
  ).all();
  abTestCache = results || [];
  abTestCacheTime = now;
  return abTestCache;
}

/**
 * sessionIdからハッシュ値を生成（決定論的振り分け用）
 * 同一ユーザーは常に同じバリアントを受け取る
 */
function hashSessionId(sessionId, testName) {
  const str = `${sessionId}:${testName}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

/**
 * A/Bバリアント振り分け
 * 
 * @param {object} env - Workers環境変数
 * @param {string} testName - テスト名
 * @param {string} sessionId - セッションID
 * @returns {Promise<{variant: 'a'|'b', instruction: string, testId: number}|null>}
 */
export async function getABVariant(env, testName, sessionId) {
  try {
    const tests = await getActiveTests(env);
    const test = tests.find(t => t.test_name === testName);
    
    if (!test) return null;
    
    // 勝者が決定済みならそちらを返す
    if (test.winner) {
      return {
        variant: test.winner,
        instruction: test.winner === 'a' ? test.variant_a : test.variant_b,
        testId: test.id,
        isWinner: true
      };
    }
    
    // 既存の割り当てを確認
    const existing = await env.DB.prepare(
      'SELECT variant FROM ab_test_assignments WHERE test_id = ? AND session_id = ?'
    ).bind(test.id, sessionId).first();
    
    if (existing) {
      return {
        variant: existing.variant,
        instruction: existing.variant === 'a' ? test.variant_a : test.variant_b,
        testId: test.id,
        isWinner: false
      };
    }
    
    // 新規割り当て: sessionIdのハッシュで決定論的に振り分け
    const hash = hashSessionId(sessionId, testName);
    const variant = hash % 2 === 0 ? 'a' : 'b';
    
    // 割り当て記録
    try {
      await env.DB.prepare(
        'INSERT INTO ab_test_assignments (test_id, session_id, variant) VALUES (?, ?, ?)'
      ).bind(test.id, sessionId, variant).run();
    } catch (e) {
      // UNIQUE制約違反は無視（競合時）
      if (!e.message.includes('UNIQUE')) throw e;
    }
    
    // カウント更新
    const countCol = variant === 'a' ? 'variant_a_count' : 'variant_b_count';
    await env.DB.prepare(
      `UPDATE ab_tests SET ${countCol} = ${countCol} + 1, updated_at = datetime('now') WHERE id = ?`
    ).bind(test.id).run();
    
    // キャッシュを無効化（カウント更新反映のため）
    clearABTestCache();
    
    return {
      variant,
      instruction: variant === 'a' ? test.variant_a : test.variant_b,
      testId: test.id,
      isWinner: false
    };
  } catch (e) {
    console.error('[AB Test] getABVariant error:', e.message);
    return null;
  }
}

/**
 * 全アクティブテストのバリアントを一括取得
 * チャット応答時にすべてのテストの指示を合成するために使用
 * 
 * @param {object} env
 * @param {string} sessionId
 * @returns {Promise<{instructions: string[], assignments: Array<{testId, variant, testName}>}>}
 */
export async function getAllABInstructions(env, sessionId) {
  try {
    const tests = await getActiveTests(env);
    if (!tests || tests.length === 0) {
      return { instructions: [], assignments: [] };
    }
    
    const instructions = [];
    const assignments = [];
    
    for (const test of tests) {
      const result = await getABVariant(env, test.test_name, sessionId);
      if (result) {
        instructions.push(result.instruction);
        assignments.push({
          testId: result.testId,
          variant: result.variant,
          testName: test.test_name
        });
      }
    }
    
    return { instructions, assignments };
  } catch (e) {
    console.error('[AB Test] getAllABInstructions error:', e.message);
    return { instructions: [], assignments: [] };
  }
}

/**
 * フィードバック記録 + A/Bテスト結果反映
 * 
 * @param {object} env
 * @param {string} sessionId
 * @param {string} rating - 'positive' or 'negative'
 * @param {number|null} feedbackId - feedbackテーブルのID
 */
export async function recordABFeedback(env, sessionId, rating, feedbackId = null) {
  try {
    // このセッションに割り当てられた全テストを取得
    const { results: assignments } = await env.DB.prepare(
      'SELECT a.test_id, a.variant, t.test_name FROM ab_test_assignments a JOIN ab_tests t ON a.test_id = t.id WHERE a.session_id = ? AND t.is_active = 1 AND t.winner IS NULL'
    ).bind(sessionId).all();
    
    if (!assignments || assignments.length === 0) return;
    
    for (const assignment of assignments) {
      // フィードバック記録
      await env.DB.prepare(
        'INSERT INTO ab_test_feedback (test_id, variant, session_id, feedback_id, rating) VALUES (?, ?, ?, ?, ?)'
      ).bind(assignment.test_id, assignment.variant, sessionId, feedbackId, rating).run();
      
      // ポジティブの場合、カウント更新
      if (rating === 'positive') {
        const positiveCol = assignment.variant === 'a' ? 'variant_a_positive' : 'variant_b_positive';
        await env.DB.prepare(
          `UPDATE ab_tests SET ${positiveCol} = ${positiveCol} + 1, updated_at = datetime('now') WHERE id = ?`
        ).bind(assignment.test_id).run();
      }
      
      // 自動最適化チェック
      await checkAndOptimize(env, assignment.test_id);
    }
    
    // キャッシュ無効化
    clearABTestCache();
  } catch (e) {
    console.error('[AB Test] recordABFeedback error:', e.message);
  }
}

/**
 * 自動最適化: 統計的有意差チェック → 勝者決定
 * 
 * 二項検定の近似（正規近似）を使用:
 *   Z = (p1 - p2) / sqrt(p*(1-p)*(1/n1 + 1/n2))
 *   p = (x1 + x2) / (n1 + n2) （プール推定量）
 */
async function checkAndOptimize(env, testId) {
  try {
    const test = await env.DB.prepare(
      'SELECT * FROM ab_tests WHERE id = ? AND is_active = 1 AND winner IS NULL'
    ).bind(testId).first();
    
    if (!test) return;
    
    // フィードバック数を集計
    const feedbackA = await env.DB.prepare(
      'SELECT COUNT(*) as total, SUM(CASE WHEN rating = \'positive\' THEN 1 ELSE 0 END) as positive FROM ab_test_feedback WHERE test_id = ? AND variant = \'a\''
    ).bind(testId).first();
    
    const feedbackB = await env.DB.prepare(
      'SELECT COUNT(*) as total, SUM(CASE WHEN rating = \'positive\' THEN 1 ELSE 0 END) as positive FROM ab_test_feedback WHERE test_id = ? AND variant = \'b\''
    ).bind(testId).first();
    
    const nA = feedbackA?.total || 0;
    const nB = feedbackB?.total || 0;
    
    // 最低フィードバック数チェック
    if (nA < MIN_FEEDBACK_COUNT || nB < MIN_FEEDBACK_COUNT) return;
    
    const xA = feedbackA?.positive || 0;
    const xB = feedbackB?.positive || 0;
    
    const pA = xA / nA;
    const pB = xB / nB;
    
    // プール推定量
    const pPool = (xA + xB) / (nA + nB);
    
    // ゼロ除算防止
    if (pPool === 0 || pPool === 1) return;
    
    // Z統計量
    const se = Math.sqrt(pPool * (1 - pPool) * (1/nA + 1/nB));
    if (se === 0) return;
    
    const z = Math.abs(pA - pB) / se;
    
    // p値近似（片側 × 2 = 両側検定）
    // Z > 1.96 → p < 0.05
    const zThreshold = 1.96; // 95%信頼水準
    
    if (z >= zThreshold) {
      const winner = pA > pB ? 'a' : 'b';
      
      await env.DB.prepare(
        `UPDATE ab_tests SET winner = ?, is_active = 0, updated_at = datetime('now') WHERE id = ?`
      ).bind(winner, testId).run();
      
      console.log(`[AB Test] 自動最適化完了: test=${test.test_name}, winner=${winner}, pA=${pA.toFixed(3)}, pB=${pB.toFixed(3)}, z=${z.toFixed(3)}`);
      
      // キャッシュ無効化
      clearABTestCache();
    }
  } catch (e) {
    console.error('[AB Test] checkAndOptimize error:', e.message);
  }
}

// ============================================================
// 管理API ハンドラ
// ============================================================

/**
 * GET /api/ab-tests — テスト一覧
 */
export async function handleABTestsList(request, env, corsHeaders) {
  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM ab_tests ORDER BY is_active DESC, created_at DESC'
    ).all();
    
    // 各テストのフィードバック統計を付与
    const enriched = [];
    for (const test of results) {
      const statsA = await env.DB.prepare(
        'SELECT COUNT(*) as total, SUM(CASE WHEN rating = \'positive\' THEN 1 ELSE 0 END) as positive FROM ab_test_feedback WHERE test_id = ? AND variant = \'a\''
      ).bind(test.id).first();
      
      const statsB = await env.DB.prepare(
        'SELECT COUNT(*) as total, SUM(CASE WHEN rating = \'positive\' THEN 1 ELSE 0 END) as positive FROM ab_test_feedback WHERE test_id = ? AND variant = \'b\''
      ).bind(test.id).first();
      
      enriched.push({
        ...test,
        feedback: {
          a: { total: statsA?.total || 0, positive: statsA?.positive || 0, rate: statsA?.total > 0 ? ((statsA?.positive || 0) / statsA.total * 100).toFixed(1) : '0.0' },
          b: { total: statsB?.total || 0, positive: statsB?.positive || 0, rate: statsB?.total > 0 ? ((statsB?.positive || 0) / statsB.total * 100).toFixed(1) : '0.0' }
        }
      });
    }
    
    return new Response(JSON.stringify({ success: true, ab_tests: enriched }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}

/**
 * POST /api/ab-tests — 新規テスト作成
 */
export async function handleABTestCreate(request, env, corsHeaders) {
  try {
    const { test_name, category, variant_a, variant_b } = await request.json();
    
    if (!test_name || !variant_a || !variant_b) {
      return new Response(JSON.stringify({ error: 'test_name, variant_a, variant_b は必須です' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
    
    const result = await env.DB.prepare(
      'INSERT INTO ab_tests (test_name, category, variant_a, variant_b) VALUES (?, ?, ?, ?)'
    ).bind(test_name, category || null, variant_a, variant_b).run();
    
    clearABTestCache();
    
    return new Response(JSON.stringify({ success: true, id: result.meta.last_row_id }), {
      status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch (e) {
    if (e.message.includes('UNIQUE')) {
      return new Response(JSON.stringify({ error: 'このテスト名は既に存在します' }), {
        status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
    return new Response(JSON.stringify({ success: false, error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}

/**
 * PUT /api/ab-tests/:id — テスト更新
 */
export async function handleABTestUpdate(request, env, corsHeaders, testId) {
  try {
    const body = await request.json();
    const fields = ['test_name', 'category', 'variant_a', 'variant_b', 'is_active', 'winner'];
    const updates = [];
    const params = [];
    
    for (const f of fields) {
      if (body[f] !== undefined) {
        updates.push(`${f} = ?`);
        params.push(body[f]);
      }
    }
    
    if (updates.length === 0) {
      return new Response(JSON.stringify({ error: '更新フィールドが指定されていません' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
    
    updates.push("updated_at = datetime('now')");
    params.push(testId);
    
    await env.DB.prepare(
      `UPDATE ab_tests SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...params).run();
    
    clearABTestCache();
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}

/**
 * GET /api/ab-tests/:id/results — 詳細結果
 */
export async function handleABTestResults(request, env, corsHeaders, testId) {
  try {
    const test = await env.DB.prepare('SELECT * FROM ab_tests WHERE id = ?').bind(testId).first();
    if (!test) {
      return new Response(JSON.stringify({ error: 'テストが見つかりません' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
    
    // バリアント別フィードバック統計
    const statsA = await env.DB.prepare(
      'SELECT COUNT(*) as total, SUM(CASE WHEN rating = \'positive\' THEN 1 ELSE 0 END) as positive FROM ab_test_feedback WHERE test_id = ? AND variant = \'a\''
    ).bind(testId).first();
    
    const statsB = await env.DB.prepare(
      'SELECT COUNT(*) as total, SUM(CASE WHEN rating = \'positive\' THEN 1 ELSE 0 END) as positive FROM ab_test_feedback WHERE test_id = ? AND variant = \'b\''
    ).bind(testId).first();
    
    const nA = statsA?.total || 0;
    const nB = statsB?.total || 0;
    const xA = statsA?.positive || 0;
    const xB = statsB?.positive || 0;
    
    // 統計量計算
    let zScore = null;
    let pValue = null;
    let significanceReached = false;
    
    if (nA > 0 && nB > 0) {
      const pA = xA / nA;
      const pB = xB / nB;
      const pPool = (xA + xB) / (nA + nB);
      
      if (pPool > 0 && pPool < 1) {
        const se = Math.sqrt(pPool * (1 - pPool) * (1/nA + 1/nB));
        if (se > 0) {
          zScore = Math.abs(pA - pB) / se;
          // 近似p値
          pValue = 2 * (1 - normalCDF(zScore));
          significanceReached = zScore >= 1.96;
        }
      }
    }
    
    // 日別トレンド
    const { results: dailyTrend } = await env.DB.prepare(
      `SELECT DATE(created_at) as date, variant, 
       COUNT(*) as total, 
       SUM(CASE WHEN rating = 'positive' THEN 1 ELSE 0 END) as positive
       FROM ab_test_feedback WHERE test_id = ? 
       GROUP BY DATE(created_at), variant 
       ORDER BY date`
    ).bind(testId).all();
    
    // 割り当て数
    const assignmentCount = await env.DB.prepare(
      'SELECT variant, COUNT(*) as count FROM ab_test_assignments WHERE test_id = ? GROUP BY variant'
    ).bind(testId).all();
    
    return new Response(JSON.stringify({
      success: true,
      test,
      results: {
        variant_a: {
          instruction: test.variant_a,
          assignments: test.variant_a_count,
          feedback_total: nA,
          feedback_positive: xA,
          positive_rate: nA > 0 ? (xA / nA * 100).toFixed(1) : '0.0',
          progress: Math.min(100, (nA / MIN_FEEDBACK_COUNT * 100)).toFixed(0)
        },
        variant_b: {
          instruction: test.variant_b,
          assignments: test.variant_b_count,
          feedback_total: nB,
          feedback_positive: xB,
          positive_rate: nB > 0 ? (xB / nB * 100).toFixed(1) : '0.0',
          progress: Math.min(100, (nB / MIN_FEEDBACK_COUNT * 100)).toFixed(0)
        },
        statistics: {
          z_score: zScore ? zScore.toFixed(4) : null,
          p_value: pValue ? pValue.toFixed(6) : null,
          significance_reached: significanceReached,
          min_feedback_required: MIN_FEEDBACK_COUNT,
          significance_threshold: SIGNIFICANCE_THRESHOLD
        },
        winner: test.winner,
        daily_trend: dailyTrend,
        assignments: assignmentCount?.results || []
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ success: false, error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
}

/**
 * 正規分布の累積分布関数 (CDF) 近似
 * Abramowitz and Stegun approximation
 */
function normalCDF(x) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.SQRT2;
  
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  
  return 0.5 * (1.0 + sign * y);
}
