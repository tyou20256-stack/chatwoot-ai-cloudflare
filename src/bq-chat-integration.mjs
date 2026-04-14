// ============================================
// Sloten AI CS — BigQuery チャット連携モジュール
// bq-chat-integration.mjs
// Generated: 2026-04-13
// ============================================
//
// handleAIChatV2() から呼び出される BQ データ取得機能
// 残高照会、入金ステータス、出金ステータスをBQから取得
//
// 依存: bigquery.mjs (getUserProfile, queryBigQuery)
// ============================================

import { getUserProfile, queryBigQuery } from './bigquery.mjs';

// ============================================
// 定数
// ============================================

const BQ_TIMEOUT_MS = 5000; // BQ呼び出しタイムアウト: 5秒
const BQ_DATASET = 'ethereal-mind-475206-r8.sloten_native';

// ============================================
// 1. インテント検知: BQ照会が必要なメッセージかどうか判定
// ============================================

// 残高照会パターン
const BALANCE_PATTERNS = /残高|バランス|balance|いくらある|所持金|持ち金|アカウント残|口座残/i;

// 入金ステータス照会パターン
const DEPOSIT_STATUS_PATTERNS = /入金.*(?:反映|確認|ステータス|状態|状況|いつ|まだ|どう)|(?:反映|確認|ステータス).*入金|振込.*(?:反映|確認|まだ|どう)|deposit.*(?:status|check|confirm)/i;

// 出金ステータス照会パターン
const WITHDRAWAL_STATUS_PATTERNS = /出金.*(?:いつ|届く|反映|確認|ステータス|状態|状況|まだ|どう)|(?:反映|確認|ステータス).*出金|引き出し.*(?:いつ|届く|確認|まだ|どう)|withdrawal.*(?:status|check|when)/i;

/**
 * BQ照会インテントを検知する
 * @param {string} message - ユーザーメッセージ
 * @returns {{ intent: string|null, type: 'balance'|'deposit_status'|'withdrawal_status'|null }}
 */
export function detectBQIntent(message) {
  if (BALANCE_PATTERNS.test(message)) {
    return { intent: 'bq_balance', type: 'balance' };
  }
  if (DEPOSIT_STATUS_PATTERNS.test(message)) {
    return { intent: 'bq_deposit_status', type: 'deposit_status' };
  }
  if (WITHDRAWAL_STATUS_PATTERNS.test(message)) {
    return { intent: 'bq_withdrawal_status', type: 'withdrawal_status' };
  }
  return { intent: null, type: null };
}


// ============================================
// 2. ユーザー特定ロジック
// ============================================

/**
 * conversation_id/user_id からBQユーザーを特定する
 *
 * 手順:
 *   1. D1からuser_idでユーザー情報を取得
 *   2. メタデータからチャネルIDを抽出
 *   3. D1の user_bq_mapping テーブルでBQユーザー名を取得（キャッシュ）
 *   4. マッピングがなければ getUserProfile() で検索
 *
 * @param {object} env - Workers環境変数
 * @param {number|string} userId - D1のユーザーID
 * @param {number|string} conversationId - D1の会話ID
 * @returns {Promise<{ authenticated: boolean, bqProfile: object|null, userName: string|null, error: string|null }>}
 */
export async function resolveUserFromChat(env, userId, conversationId) {
  try {
    if (!userId && !conversationId) {
      return { authenticated: false, bqProfile: null, userName: null, error: 'no_user_context' };
    }

    // Step 1: D1からユーザー情報を取得
    let d1User = null;
    if (userId) {
      d1User = await env.DB.prepare(
        'SELECT id, email, name, metadata FROM users WHERE id = ?'
      ).bind(userId).first();
    }

    // conversation_idからuser_idを取得（userIdがない場合）
    if (!d1User && conversationId) {
      const conv = await env.DB.prepare(
        'SELECT user_id FROM conversations WHERE id = ?'
      ).bind(conversationId).first();
      if (conv?.user_id) {
        d1User = await env.DB.prepare(
          'SELECT id, email, name, metadata FROM users WHERE id = ?'
        ).bind(conv.user_id).first();
      }
    }

    if (!d1User) {
      return { authenticated: false, bqProfile: null, userName: null, error: 'user_not_found' };
    }

    // Step 2: メタデータからチャネル情報を抽出
    let metadata = {};
    try {
      metadata = d1User.metadata ? JSON.parse(d1User.metadata) : {};
    } catch (e) { /* ignore parse errors */ }

    // Step 3: BQマッピングキャッシュを確認
    let bqUserName = null;
    try {
      const mapping = await env.DB.prepare(
        'SELECT bq_username FROM user_bq_mapping WHERE d1_user_id = ? AND expires_at > datetime(\'now\')'
      ).bind(d1User.id).first();
      if (mapping) {
        bqUserName = mapping.bq_username;
      }
    } catch (e) {
      // テーブルが存在しない場合は無視
      console.log('[BQ-Chat] user_bq_mapping テーブル未作成（スキップ）');
    }

    // Step 4: マッピングがなければ、BQでユーザー検索
    if (!bqUserName) {
      // チャネルIDからBQユーザー名を推測
      // email形式: telegram_{id}, line_{id}, {userId}@widget.local
      const identifier = extractBQIdentifier(d1User.email, d1User.name, metadata);

      if (!identifier) {
        return { authenticated: false, bqProfile: null, userName: null, error: 'no_bq_identifier' };
      }

      // BQプロファイル検索（タイムアウト付き）
      const profile = await withTimeout(
        getUserProfile(env, identifier),
        BQ_TIMEOUT_MS,
        'BQ getUserProfile timeout'
      );

      if (!profile) {
        return { authenticated: false, bqProfile: null, userName: identifier, error: 'bq_user_not_found' };
      }

      bqUserName = profile.username || profile.user_name || identifier;

      // キャッシュに保存（24時間TTL）
      try {
        await env.DB.prepare(
          `INSERT INTO user_bq_mapping (d1_user_id, bq_username, bq_user_id, expires_at)
           VALUES (?, ?, ?, datetime('now', '+24 hours'))
           ON CONFLICT(d1_user_id) DO UPDATE SET
             bq_username = excluded.bq_username,
             bq_user_id = excluded.bq_user_id,
             expires_at = excluded.expires_at`
        ).bind(d1User.id, bqUserName, profile.id || profile.user_id || null).run();
      } catch (e) {
        console.log('[BQ-Chat] マッピングキャッシュ保存スキップ:', e.message);
      }

      return { authenticated: true, bqProfile: profile, userName: bqUserName, error: null };
    }

    // キャッシュから取得した場合、プロファイルを再取得
    const profile = await withTimeout(
      getUserProfile(env, bqUserName),
      BQ_TIMEOUT_MS,
      'BQ getUserProfile timeout'
    );

    return {
      authenticated: true,
      bqProfile: profile || null,
      userName: bqUserName,
      error: profile ? null : 'bq_profile_fetch_failed',
    };

  } catch (e) {
    console.error('[BQ-Chat] resolveUserFromChat エラー:', e.message);
    return { authenticated: false, bqProfile: null, userName: null, error: null };
  }
}

/**
 * D1のemail/name/metadataからBQ検索用の識別子を抽出
 */
function extractBQIdentifier(email, name, metadata) {
  // 1. metadataにBQユーザー名が直接設定されている場合
  if (metadata?.bq_username) return metadata.bq_username;

  // 2. 電話番号がある場合
  if (metadata?.phone) return metadata.phone;

  // 3. LINE/Telegram等のチャネルIDから推測
  //    実際のBQテーブルにchannel_id列がある想定
  if (metadata?.telegram_id) return `tg:${metadata.telegram_id}`;
  if (metadata?.line_id) return `line:${metadata.line_id}`;

  // 4. ユーザー名（widget以外）
  if (name && name !== 'ウェブ訪問者' && name !== 'Guest') return name;

  // 5. email（widget.local除外）
  if (email && !email.endsWith('@widget.local')) {
    // telegram_123456 → tg:123456
    if (email.startsWith('telegram_')) return `tg:${email.replace('telegram_', '')}`;
    if (email.startsWith('line_')) return `line:${email.replace('line_', '')}`;
    return email;
  }

  return null;
}


// ============================================
// 3. 残高照会
// ============================================

/**
 * ユーザーの現在残高をBQから取得
 * @param {object} env
 * @param {string} userName - BQユーザー名
 * @returns {Promise<{ balance: number|null, currency: string, lastUpdated: string|null, error: string|null }>}
 */
export async function fetchUserBalance(env, userName) {
  try {
    const sql = `
      SELECT
        u.user_name,
        u.balance,
        u.currency,
        u.updated_at
      FROM \`${BQ_DATASET}.bo_user_list\` u
      WHERE u.user_name = @userName
        OR u.phone = @userName
        OR u.email = @userName
      LIMIT 1
    `;

    const result = await withTimeout(
      queryBigQuery(env, sql, { userName }),
      BQ_TIMEOUT_MS,
      'BQ balance query timeout'
    );

    if (!result?.rows || result.rows.length === 0) {
      return { balance: null, currency: 'JPY', lastUpdated: null, error: 'no_data' };
    }

    const row = result.rows[0];
    return {
      balance: parseFloat(row.balance) || 0,
      currency: row.currency || 'JPY',
      lastUpdated: row.updated_at || null,
      error: null,
    };
  } catch (e) {
    console.error('[BQ-Chat] fetchUserBalance エラー:', e.message);
    return { balance: null, currency: 'JPY', lastUpdated: null, error: null };
  }
}


// ============================================
// 4. 入金ステータス照会
// ============================================

/**
 * ユーザーの直近入金履歴をBQから取得
 * @param {object} env
 * @param {string} userName - BQユーザー名
 * @param {number} limit - 取得件数（デフォルト: 3）
 * @returns {Promise<{ deposits: Array, error: string|null }>}
 */
export async function fetchDepositStatus(env, userName, limit = 3) {
  try {
    const sql = `
      SELECT
        t.transaction_id,
        t.amount,
        t.currency,
        t.status,
        t.payment_method,
        t.created_at,
        t.updated_at,
        t.completed_at
      FROM \`${BQ_DATASET}.transactions\` t
      WHERE (t.user_name = @userName OR t.user_id = (
        SELECT u.user_id FROM \`${BQ_DATASET}.bo_user_list\` u
        WHERE u.user_name = @userName OR u.phone = @userName OR u.email = @userName
        LIMIT 1
      ))
        AND t.type = 'deposit'
      ORDER BY t.created_at DESC
      LIMIT @limit
    `;

    const result = await withTimeout(
      queryBigQuery(env, sql, { userName, limit }),
      BQ_TIMEOUT_MS,
      'BQ deposit query timeout'
    );

    if (!result?.rows || result.rows.length === 0) {
      return { deposits: [], error: null };
    }

    return {
      deposits: result.rows.map(row => ({
        transactionId: maskTransactionId(row.transaction_id),
        amount: parseFloat(row.amount) || 0,
        currency: row.currency || 'JPY',
        status: normalizeStatus(row.status),
        paymentMethod: row.payment_method || '不明',
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        completedAt: row.completed_at,
      })),
      error: null,
    };
  } catch (e) {
    console.error('[BQ-Chat] fetchDepositStatus エラー:', e.message);
    return { deposits: [], error: null };
  }
}


// ============================================
// 5. 出金ステータス照会
// ============================================

/**
 * ユーザーの直近出金履歴をBQから取得
 * @param {object} env
 * @param {string} userName - BQユーザー名
 * @param {number} limit - 取得件数（デフォルト: 3）
 * @returns {Promise<{ withdrawals: Array, error: string|null }>}
 */
export async function fetchWithdrawalStatus(env, userName, limit = 3) {
  try {
    const sql = `
      SELECT
        t.transaction_id,
        t.amount,
        t.currency,
        t.status,
        t.payment_method,
        t.bank_name,
        t.created_at,
        t.updated_at,
        t.completed_at,
        t.estimated_completion
      FROM \`${BQ_DATASET}.transactions\` t
      WHERE (t.user_name = @userName OR t.user_id = (
        SELECT u.user_id FROM \`${BQ_DATASET}.bo_user_list\` u
        WHERE u.user_name = @userName OR u.phone = @userName OR u.email = @userName
        LIMIT 1
      ))
        AND t.type = 'withdrawal'
      ORDER BY t.created_at DESC
      LIMIT @limit
    `;

    const result = await withTimeout(
      queryBigQuery(env, sql, { userName, limit }),
      BQ_TIMEOUT_MS,
      'BQ withdrawal query timeout'
    );

    if (!result?.rows || result.rows.length === 0) {
      return { withdrawals: [], error: null };
    }

    return {
      withdrawals: result.rows.map(row => ({
        transactionId: maskTransactionId(row.transaction_id),
        amount: parseFloat(row.amount) || 0,
        currency: row.currency || 'JPY',
        status: normalizeStatus(row.status),
        paymentMethod: row.payment_method || '不明',
        bankName: maskBankInfo(row.bank_name),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        completedAt: row.completed_at,
        estimatedCompletion: row.estimated_completion,
      })),
      error: null,
    };
  } catch (e) {
    console.error('[BQ-Chat] fetchWithdrawalStatus エラー:', e.message);
    return { withdrawals: [], error: null };
  }
}


// ============================================
// 6. BQデータをAIコンテキストに変換
// ============================================

/**
 * BQデータをシステムプロンプト追加テキストに変換
 * AIがBQデータを使って自然な回答を生成するためのコンテキスト
 *
 * @param {string} intentType - 'balance' | 'deposit_status' | 'withdrawal_status'
 * @param {object} data - BQから取得したデータ
 * @param {boolean} authenticated - ユーザーが特定されているか
 * @returns {string} AIに渡すコンテキストテキスト
 */
export function buildBQContext(intentType, data, authenticated) {
  if (!authenticated) {
    return `\n\n■ ユーザーデータ照会
お客様のアカウントを特定できませんでした。
具体的な金額やステータスは表示せず、「お客様のアカウント情報を確認するため、ユーザー名またはご登録の電話番号をお知らせいただけますか？」と案内してください。`;
  }

  switch (intentType) {
    case 'balance':
      return buildBalanceContext(data);
    case 'deposit_status':
      return buildDepositContext(data);
    case 'withdrawal_status':
      return buildWithdrawalContext(data);
    default:
      return '';
  }
}

function buildBalanceContext(data) {
  if (data.error || data.balance === null) {
    return `\n\n■ ユーザーデータ照会（残高）
残高データの取得に失敗しました。
「現在残高情報を確認中です。しばらくお待ちいただくか、改めてお問い合わせください。」と案内してください。`;
  }

  const formattedBalance = formatCurrency(data.balance, data.currency);
  return `\n\n■ ユーザーデータ照会（残高）※このデータをもとに回答してください
お客様の現在の残高: ${formattedBalance}
最終更新: ${data.lastUpdated ? formatDateTime(data.lastUpdated) : '不明'}
この情報をお客様にお伝えしてください。「お客様の現在の残高は${formattedBalance}でございます。」のように回答してください。`;
}

function buildDepositContext(data) {
  if (data.error) {
    return `\n\n■ ユーザーデータ照会（入金ステータス）
入金データの取得に失敗しました。
FAQ ID:7の回答で対応してください。`;
  }

  if (!data.deposits || data.deposits.length === 0) {
    return `\n\n■ ユーザーデータ照会（入金ステータス）
直近の入金履歴はありません。
「直近の入金履歴が確認できませんでした。入金をご希望の場合は、チャットにて「入金」とメッセージをお送りください。」と案内してください。`;
  }

  const depositLines = data.deposits.map((d, i) => {
    const amount = formatCurrency(d.amount, d.currency);
    const status = translateStatus(d.status);
    const date = d.createdAt ? formatDateTime(d.createdAt) : '不明';
    return `  ${i + 1}. ${date} - ${amount} (${d.paymentMethod}) → ${status}`;
  }).join('\n');

  return `\n\n■ ユーザーデータ照会（入金ステータス）※このデータをもとに回答してください
直近の入金履歴:
${depositLines}
この情報をお客様にお伝えしてください。金額、日時、ステータスを含めて回答してください。`;
}

function buildWithdrawalContext(data) {
  if (data.error) {
    return `\n\n■ ユーザーデータ照会（出金ステータス）
出金データの取得に失敗しました。
FAQ ID:9の回答で対応してください。`;
  }

  if (!data.withdrawals || data.withdrawals.length === 0) {
    return `\n\n■ ユーザーデータ照会（出金ステータス）
直近の出金履歴はありません。
「直近の出金申請が確認できませんでした。出金をご希望の場合は、チャットにてスタッフへお伝えください。」と案内してください。`;
  }

  const withdrawalLines = data.withdrawals.map((w, i) => {
    const amount = formatCurrency(w.amount, w.currency);
    const status = translateStatus(w.status);
    const date = w.createdAt ? formatDateTime(w.createdAt) : '不明';
    const eta = w.estimatedCompletion ? `（完了予定: ${formatDateTime(w.estimatedCompletion)}）` : '';
    return `  ${i + 1}. ${date} - ${amount} → ${status}${eta}`;
  }).join('\n');

  return `\n\n■ ユーザーデータ照会（出金ステータス）※このデータをもとに回答してください
直近の出金履歴:
${withdrawalLines}
この情報をお客様にお伝えしてください。金額、日時、ステータスを含めて回答してください。`;
}


// ============================================
// 7. メインエントリポイント: handleAIChatV2から呼び出し
// ============================================

/**
 * BQデータ取得のメインエントリポイント
 * handleAIChatV2 の Step 4（AI呼び出し）の前に呼び出す
 *
 * @param {object} env - Workers環境変数
 * @param {string} message - サニタイズ済みユーザーメッセージ
 * @param {number|string} userId - D1ユーザーID
 * @param {number|string} conversationId - D1会話ID
 * @returns {Promise<{ hasBQData: boolean, contextText: string, intentType: string|null, stats: object }>}
 */
export async function enrichWithBQData(env, message, userId, conversationId) {
  const startTime = Date.now();
  const stats = { intentDetected: false, userResolved: false, dataFetched: false, timeMs: 0 };

  // Step 1: インテント検知
  const { intent, type: intentType } = detectBQIntent(message);
  if (!intent) {
    stats.timeMs = Date.now() - startTime;
    return { hasBQData: false, contextText: '', intentType: null, stats };
  }
  stats.intentDetected = true;

  // Step 2: ユーザー特定
  const userResult = await resolveUserFromChat(env, userId, conversationId);
  stats.userResolved = userResult.authenticated;

  if (!userResult.authenticated) {
    // 未認証 → 認証を促すコンテキストを返す
    const contextText = buildBQContext(intentType, null, false);
    stats.timeMs = Date.now() - startTime;
    return { hasBQData: true, contextText, intentType, stats };
  }

  // Step 3: BQデータ取得
  let data;
  try {
    switch (intentType) {
      case 'balance':
        data = await fetchUserBalance(env, userResult.userName);
        break;
      case 'deposit_status':
        data = await fetchDepositStatus(env, userResult.userName);
        break;
      case 'withdrawal_status':
        data = await fetchWithdrawalStatus(env, userResult.userName);
        break;
      default:
        data = null;
    }
    stats.dataFetched = true;
  } catch (e) {
    console.error('[BQ-Chat] データ取得失敗:', e.message);
    data = { error: null };
  }

  // Step 4: コンテキスト生成
  const contextText = buildBQContext(intentType, data, true);
  stats.timeMs = Date.now() - startTime;

  return { hasBQData: true, contextText, intentType, stats };
}


// ============================================
// 8. ユーティリティ関数
// ============================================

/**
 * タイムアウト付きPromise実行
 */
function withTimeout(promise, ms, errorMessage = 'Timeout') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms)
    ),
  ]);
}

/**
 * 金額フォーマット
 */
function formatCurrency(amount, currency = 'JPY') {
  if (amount === null || amount === undefined) return '不明';
  if (currency === 'JPY') {
    return `¥${Math.floor(amount).toLocaleString('ja-JP')}`;
  }
  return `${amount.toLocaleString()} ${currency}`;
}

/**
 * 日時フォーマット（JST表示）
 */
function formatDateTime(isoString) {
  if (!isoString) return '不明';
  try {
    const date = new Date(isoString);
    return date.toLocaleString('ja-JP', {
      timeZone: 'Asia/Tokyo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

/**
 * ステータス正規化
 */
function normalizeStatus(status) {
  if (!status) return 'unknown';
  const s = status.toLowerCase().trim();
  const statusMap = {
    'pending': 'pending',
    'processing': 'processing',
    'completed': 'completed',
    'success': 'completed',
    'approved': 'completed',
    'failed': 'failed',
    'rejected': 'rejected',
    'cancelled': 'cancelled',
    'canceled': 'cancelled',
    // 日本語
    '処理中': 'processing',
    '完了': 'completed',
    '成功': 'completed',
    '承認': 'completed',
    '保留': 'pending',
    '失敗': 'failed',
    '却下': 'rejected',
    'キャンセル': 'cancelled',
  };
  return statusMap[s] || s;
}

/**
 * ステータスを日本語に翻訳
 */
function translateStatus(status) {
  const translations = {
    'pending': '⏳ 保留中',
    'processing': '⏳ 処理中',
    'completed': '✅ 完了',
    'failed': '❌ 失敗',
    'rejected': '❌ 却下',
    'cancelled': '🚫 キャンセル',
    'unknown': '❓ 不明',
  };
  return translations[status] || status;
}

/**
 * トランザクションIDマスキング（PII保護）
 * 例: TXN-12345678 → TXN-****5678
 */
function maskTransactionId(txnId) {
  if (!txnId) return '***';
  const str = String(txnId);
  if (str.length <= 4) return '****';
  return str.slice(0, -4).replace(/./g, '*') + str.slice(-4);
}

/**
 * 銀行名マスキング（PII保護）
 * 銀行名はそのまま表示（口座番号は含めない）
 */
function maskBankInfo(bankName) {
  if (!bankName) return null;
  // 口座番号パターンを除去
  return bankName.replace(/\d{4,}/g, '****');
}


// ============================================
// 9. テーブル確認・作成用SQLクエリ
// ============================================

/**
 * BQテーブル構造確認用クエリを生成
 * 実テーブル名を確認するために使用
 */
export function getTableDiscoveryQueries() {
  return {
    // データセット内の全テーブルを一覧
    listTables: `
      SELECT table_name, table_type, creation_time, row_count, size_bytes
      FROM \`${BQ_DATASET}.INFORMATION_SCHEMA.TABLES\`
      ORDER BY table_name
    `,

    // bo_user_list テーブルのカラム一覧
    userTableSchema: `
      SELECT column_name, data_type, is_nullable
      FROM \`${BQ_DATASET}.INFORMATION_SCHEMA.COLUMNS\`
      WHERE table_name = 'bo_user_list'
      ORDER BY ordinal_position
    `,

    // トランザクションテーブルを探す
    findTransactionTables: `
      SELECT table_name
      FROM \`${BQ_DATASET}.INFORMATION_SCHEMA.TABLES\`
      WHERE table_name LIKE '%transaction%'
        OR table_name LIKE '%deposit%'
        OR table_name LIKE '%withdraw%'
        OR table_name LIKE '%payment%'
        OR table_name LIKE '%transfer%'
      ORDER BY table_name
    `,

    // bo_user_list のサンプルデータ（カラム名確認用）
    sampleUserData: `
      SELECT *
      FROM \`${BQ_DATASET}.bo_user_list\`
      LIMIT 3
    `,

    // 残高カラムの候補を探す
    findBalanceColumns: `
      SELECT column_name, data_type
      FROM \`${BQ_DATASET}.INFORMATION_SCHEMA.COLUMNS\`
      WHERE table_name = 'bo_user_list'
        AND (column_name LIKE '%balance%'
          OR column_name LIKE '%amount%'
          OR column_name LIKE '%credit%'
          OR column_name LIKE '%wallet%')
    `,
  };
}


// ============================================
// 10. D1マイグレーション（BQマッピングキャッシュ用）
// ============================================

/**
 * D1マイグレーションSQL
 * handleAIChatV2のBQ連携で使うテーブル
 */
export const BQ_MIGRATION_SQL = `
-- BQユーザーマッピングキャッシュ（D1→BQの紐付け）
CREATE TABLE IF NOT EXISTS user_bq_mapping (
  d1_user_id INTEGER PRIMARY KEY,
  bq_username TEXT NOT NULL,
  bq_user_id TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_user_bq_mapping_expires
  ON user_bq_mapping(expires_at);

-- BQ照会ログ（統計・デバッグ用）
CREATE TABLE IF NOT EXISTS bq_query_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER,
  user_id INTEGER,
  intent_type TEXT NOT NULL,
  bq_username TEXT,
  success INTEGER DEFAULT 0,
  response_time_ms INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_bq_query_log_date
  ON bq_query_log(created_at);
`;
