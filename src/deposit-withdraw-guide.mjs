// TODO(kv-migration): Module-level state (sessionStates Map) is per-isolate.
// Consider migrating to KV (see kv-cache.mjs) once async caller propagation
// can be accommodated. Currently acceptable because session state is short-
// lived and per-user; worst case is a single guided flow reset.
// ============================================
// Sloten AI CS — 入金/出金インテリジェントガイド
// deposit-withdraw-guide.mjs
// ============================================
//
// 入金/出金の意図を検知し、3ステップの会話フローで案内する。
//   Step 1: 方法選択（入金7方式 / 出金）
//   Step 2: 金額選択
//   Step 3: 手順案内 + 入金ページリンク
//
// 使い方:
//   import { detectDepositWithdrawIntent, handleDepositWithdrawFlow } from './deposit-withdraw-guide.mjs';
//
//   // handleAIChatV2 の Step 2.5（サニタイズ後、エスカレーション前）で呼び出す
//   const dwResult = handleDepositWithdrawFlow(cleanMessage, sessionState);
//   if (dwResult) return dwResult; // ガイドフロー応答を返す
// ============================================


// ============================================
// 1. 入金/出金 意図検知
// ============================================

/**
 * 入金/出金の意図キーワードパターン
 */
const DEPOSIT_INTENT_PATTERNS = [
  /入金/,
  /deposit/i,
  /チャージ/,
  /お金.*入れ/,
  /振込.*したい/,
  /振り込み.*したい/,
  /入金したい/,
  /入金方法/,
  /入金の仕方/,
  /入金手順/,
];

const WITHDRAW_INTENT_PATTERNS = [
  /出金/,
  /withdraw/i,
  /引き出し/,
  /お金.*出し/,
  /お金.*引/,
  /出金したい/,
  /出金方法/,
  /出金の仕方/,
  /出金手順/,
  /換金/,
  /キャッシュアウト/,
  /cashout/i,
];

/**
 * 入金/出金の意図を検知
 * @param {string} message - サニタイズ済みユーザーメッセージ
 * @returns {{ type: 'deposit'|'withdraw'|null }}
 */
export function detectDepositWithdrawIntent(message) {
  const trimmed = message.trim();

  for (const pattern of DEPOSIT_INTENT_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { type: 'deposit' };
    }
  }

  for (const pattern of WITHDRAW_INTENT_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { type: 'withdraw' };
    }
  }

  return { type: null };
}


// ============================================
// 2. 入金方法の定義（7方式）
// ============================================

/**
 * @typedef {Object} DepositMethod
 * @property {string} id - 内部ID
 * @property {string} label - 表示ラベル（ボタンテキスト）
 * @property {string} description - 簡易説明
 * @property {string} steps - 手順テンプレート
 * @property {string} note - 補足事項
 * @property {boolean} requiresSupport - サポート確認が必要か
 */

/** @type {DepositMethod[]} */
export const DEPOSIT_METHODS = [
  {
    id: 'atm',
    label: 'ATM振込',
    description: 'ATMから直接お振込みいただく方法です。',
    steps: [
      '①入金ページで「ATM振込」を選択',
      '②金額を入力',
      '③「カスタマーサポートへ連絡」ボタンをクリック',
      '④チャットに「入金」とだけ入力して送信',
      '⑤スタッフの確認を待つ',
      '⑥確認後、案内された口座にATMから振込',
      '⑦振込完了後、アカウント残高に反映',
    ].join('\n'),
    note: '※振込名義はアカウント登録名と一致させてください。',
    requiresSupport: true,
  },
  {
    id: 'bank',
    label: '銀行振込',
    description: '銀行口座から振込でご入金いただく方法です。',
    steps: [
      '①入金ページで「銀行振込」を選択',
      '②金額を入力',
      '③「カスタマーサポートへ連絡」ボタンをクリック',
      '④チャットに「入金」とだけ入力して送信',
      '⑤スタッフが振込先口座をご案内',
      '⑥ご案内の口座に振込を実行',
      '⑦入金確認後、アカウント残高に反映',
    ].join('\n'),
    note: '※営業時間外のお振込みは翌営業日の反映になる場合がございます。',
    requiresSupport: true,
  },
  {
    id: 'bank_auto',
    label: '銀行振込(自動)',
    description: '自動反映される銀行振込です。',
    steps: [
      '①入金ページで「銀行振込(自動)」を選択',
      '②金額を入力',
      '③画面に表示される専用口座に振込',
      '④振込完了後、自動でアカウント残高に反映',
    ].join('\n'),
    note: '※自動反映のため、通常数分で残高に反映されます。振込名義にご注意ください。',
    requiresSupport: false,
  },
  {
    id: 'crypto',
    label: '仮想通貨',
    description: '仮想通貨でご入金いただく方法です。',
    steps: [
      '①入金ページで「仮想通貨」を選択',
      '②金額を入力',
      '③「カスタマーサポートへ連絡」ボタンをクリック',
      '④チャットに「入金」とだけ入力して送信',
      '⑤スタッフがウォレットアドレスをご案内',
      '⑥ご案内のアドレスに送金',
      '⑦ネットワーク承認後、アカウント残高に反映',
    ].join('\n'),
    note: '※ネットワーク承認に時間がかかる場合がございます。送金先アドレスを必ずご確認ください。',
    requiresSupport: true,
  },
  {
    id: 'convenience',
    label: 'コンビニ払い',
    description: 'お近くのコンビニでお支払いいただく方法です。',
    steps: [
      '①入金ページで「コンビニ払い」を選択',
      '②金額を入力',
      '③「カスタマーサポートへ連絡」ボタンをクリック',
      '④チャットに「入金」とだけ入力して送信',
      '⑤スタッフがお支払い番号をご案内',
      '⑥お近くのコンビニでお支払い',
      '⑦入金確認後、アカウント残高に反映',
    ].join('\n'),
    note: '※コンビニ払いの有効期限にご注意ください。',
    requiresSupport: true,
  },
  {
    id: 'paypay_money',
    label: 'PayPayマネー',
    description: 'PayPayマネー残高からご入金いただく方法です。',
    steps: [
      '①入金ページで「PayPayマネー」を選択',
      '②金額を入力',
      '③「カスタマーサポートへ連絡」ボタンをクリック',
      '④チャットに「入金」とだけ入力して送信',
      '⑤スタッフが送金先情報をご案内',
      '⑥PayPayアプリから送金を実行',
      '⑦入金確認後、アカウント残高に反映',
    ].join('\n'),
    note: '※PayPayマネー（本人確認済み残高）からの送金となります。',
    requiresSupport: true,
  },
  {
    id: 'paypay_lite',
    label: 'PayPayマネーライト',
    description: 'PayPayマネーライト残高からご入金いただく方法です。',
    steps: [
      '①入金ページで「PayPayマネーライト」を選択',
      '②金額を入力',
      '③「カスタマーサポートへ連絡」ボタンをクリック',
      '④チャットに「入金」とだけ入力して送信',
      '⑤スタッフが送金先情報をご案内',
      '⑥PayPayアプリから送金を実行',
      '⑦入金確認後、アカウント残高に反映',
    ].join('\n'),
    note: '※PayPayマネーライト（チャージ残高）からの送金となります。',
    requiresSupport: true,
  },
];

// 入金方法のラベルからIDへのマッピング（ユーザー入力マッチング用）
const METHOD_ALIASES = {
  'atm': 'atm',
  'atm振込': 'atm',
  'atm振り込み': 'atm',
  '銀行振込': 'bank',
  '銀行振り込み': 'bank',
  '銀行': 'bank',
  '銀行振込(自動)': 'bank_auto',
  '銀行振込（自動）': 'bank_auto',
  '銀行振込自動': 'bank_auto',
  '銀行自動': 'bank_auto',
  '仮想通貨': 'crypto',
  'crypto': 'crypto',
  'ビットコイン': 'crypto',
  'btc': 'crypto',
  'コンビニ': 'convenience',
  'コンビニ払い': 'convenience',
  'paypay': 'paypay_money',
  'paypayマネー': 'paypay_money',
  'ペイペイ': 'paypay_money',
  'ペイペイマネー': 'paypay_money',
  'paypayマネーライト': 'paypay_lite',
  'ペイペイマネーライト': 'paypay_lite',
  'paypayライト': 'paypay_lite',
  'ペイペイライト': 'paypay_lite',
};

/**
 * ユーザー入力から入金方法IDを解決
 * @param {string} input - ユーザーの入力テキスト
 * @returns {string|null} method ID or null
 */
export function resolveMethodId(input) {
  const normalized = input.trim().toLowerCase();

  // 完全一致（エイリアス）
  if (METHOD_ALIASES[normalized]) {
    return METHOD_ALIASES[normalized];
  }

  // 部分一致（ラベル名）
  for (const method of DEPOSIT_METHODS) {
    if (normalized.includes(method.label.toLowerCase()) || method.label.toLowerCase().includes(normalized)) {
      return method.id;
    }
  }

  // 部分一致（エイリアスキー）
  for (const [alias, id] of Object.entries(METHOD_ALIASES)) {
    if (normalized.includes(alias)) {
      return id;
    }
  }

  return null;
}

/**
 * 入金方法IDからメソッド定義を取得
 * @param {string} methodId
 * @returns {DepositMethod|undefined}
 */
export function getMethodById(methodId) {
  return DEPOSIT_METHODS.find(m => m.id === methodId);
}


// ============================================
// 3. 金額選択肢
// ============================================

export const DEPOSIT_AMOUNTS = [
  { value: 10000, label: '¥10,000' },
  { value: 20000, label: '¥20,000' },
  { value: 30000, label: '¥30,000' },
  { value: 50000, label: '¥50,000' },
  { value: 100000, label: '¥100,000' },
  { value: 200000, label: '¥200,000' },
];

/**
 * ユーザー入力から金額を解決
 * @param {string} input
 * @returns {number|null} 金額（数値）or null
 */
export function resolveAmount(input) {
  const normalized = input.trim()
    .replace(/[¥￥,、]/g, '')
    .replace(/円/g, '')
    .replace(/万/g, '0000');

  const num = parseInt(normalized, 10);
  if (isNaN(num)) return null;

  // 有効範囲チェック（¥10,000〜¥200,000）
  if (num >= 10000 && num <= 200000) {
    return num;
  }

  return null;
}

/**
 * 数値を日本円フォーマットに変換
 * @param {number} amount
 * @returns {string}
 */
export function formatAmount(amount) {
  return `¥${amount.toLocaleString()}`;
}


// ============================================
// 4. セッション状態管理
// ============================================

/**
 * 入金/出金ガイドのセッション状態
 *
 * @typedef {Object} DepositGuideState
 * @property {'idle'|'select_method'|'select_amount'|'completed'} step - 現在のステップ
 * @property {'deposit'|'withdraw'} flowType - フロータイプ
 * @property {string|null} selectedMethod - 選択された入金方法ID
 * @property {number|null} selectedAmount - 選択された金額
 * @property {number} createdAt - 状態作成時刻（TTL用）
 */

// セッション別の状態ストア（メモリ内・Workers isolate単位）
// 本番ではKVまたはDurable Objectsに移行推奨
const sessionStates = new Map();
const SESSION_TTL = 10 * 60 * 1000; // 10分でセッション失効

/**
 * セッション状態を取得（TTL切れは自動クリア）
 * @param {string} sessionId - conversation_id or user_id
 * @returns {DepositGuideState|null}
 */
export function getSessionState(sessionId) {
  const state = sessionStates.get(sessionId);
  if (!state) return null;

  // TTLチェック
  if (Date.now() - state.createdAt > SESSION_TTL) {
    sessionStates.delete(sessionId);
    return null;
  }

  return state;
}

/**
 * セッション状態を設定
 * @param {string} sessionId
 * @param {Partial<DepositGuideState>} update
 */
export function setSessionState(sessionId, update) {
  const existing = sessionStates.get(sessionId) || {
    step: 'idle',
    flowType: 'deposit',
    selectedMethod: null,
    selectedAmount: null,
    createdAt: Date.now(),
  };

  sessionStates.set(sessionId, { ...existing, ...update });
}

/**
 * セッション状態をクリア
 * @param {string} sessionId
 */
export function clearSessionState(sessionId) {
  sessionStates.delete(sessionId);
}


// ============================================
// 5. メインフローハンドラ
// ============================================

/**
 * 入金/出金ガイドフローを処理
 *
 * このフローは handleAIChatV2 の中で呼ばれ、
 * ガイドフローに該当する場合はレスポンスオブジェクトを返す。
 * 該当しない場合は null を返す（通常のAI応答へフォールスルー）。
 *
 * @param {string} userMessage - サニタイズ済みユーザーメッセージ
 * @param {string} sessionId - セッション識別子（conversation_id or user_id）
 * @param {object} [options] - オプション
 * @param {string} [options.depositPageUrl] - 入金ページURL
 * @returns {{ reply: string, quickReplies: Array<{label: string, value: string}>, type: string, guideStep: string }|null}
 */
export function handleDepositWithdrawFlow(userMessage, sessionId, options = {}) {
  // GASフロー干渉防止: conversation.status='open' のときはAI応答を抑止
  if (options.conversationStatus === 'open') {
    console.log('[deposit-withdraw] skipped: conversation is open (GAS/human in progress)');
    return null;
  }

  const depositPageUrl = options.depositPageUrl || 'https://sloten.io/deposit';
  const currentState = getSessionState(sessionId);

  // --- キャンセル検知 ---
  if (/キャンセル|やめ|cancel|戻る|中止/i.test(userMessage) && currentState) {
    clearSessionState(sessionId);
    return {
      reply: 'ガイドをキャンセルしました。他にご質問がございましたらお気軽にどうぞ。',
      quickReplies: [],
      type: 'deposit_guide',
      guideStep: 'cancelled',
    };
  }

  // === ケース A: 既存セッション中のフロー継続 ===
  if (currentState && currentState.step !== 'idle' && currentState.step !== 'completed') {

    // --- Step: 方法選択待ち ---
    if (currentState.step === 'select_method' && currentState.flowType === 'deposit') {
      const methodId = resolveMethodId(userMessage);

      if (!methodId) {
        // 方法が特定できない → 再度選択肢を提示
        return {
          reply: '申し訳ございません、入金方法を特定できませんでした。以下からお選びください。',
          quickReplies: DEPOSIT_METHODS.map(m => ({ label: m.label, value: m.label })),
          type: 'deposit_guide',
          guideStep: 'select_method_retry',
        };
      }

      // 方法確定 → 金額選択へ
      setSessionState(sessionId, {
        step: 'select_amount',
        selectedMethod: methodId,
      });

      const method = getMethodById(methodId);
      return {
        reply: `${method.label}でのご入金ですね。✅\n\n金額をお選びください。\n（¥10,000〜¥200,000）`,
        quickReplies: DEPOSIT_AMOUNTS.map(a => ({ label: a.label, value: a.label })),
        type: 'deposit_guide',
        guideStep: 'select_amount',
      };
    }

    // --- Step: 金額選択待ち ---
    if (currentState.step === 'select_amount') {
      const amount = resolveAmount(userMessage);

      if (!amount) {
        // 金額が特定できない → 再度選択肢を提示
        return {
          reply: '金額を正しく認識できませんでした。以下からお選びいただくか、¥10,000〜¥200,000の範囲で金額をご入力ください。',
          quickReplies: DEPOSIT_AMOUNTS.map(a => ({ label: a.label, value: a.label })),
          type: 'deposit_guide',
          guideStep: 'select_amount_retry',
        };
      }

      // 金額確定 → 手順案内
      const method = getMethodById(currentState.selectedMethod);
      setSessionState(sessionId, {
        step: 'completed',
        selectedAmount: amount,
      });

      const formattedAmount = formatAmount(amount);
      const stepsText = method.steps;
      const noteText = method.note ? `\n\n${method.note}` : '';
      const supportNotice = method.requiresSupport
        ? '\n\n⚠️ 「入金」以外の文字を入力しないようご注意ください。'
        : '';

      const reply = [
        `${formattedAmount}の${method.label}入金ですね。✅`,
        '',
        '📋 手順:',
        stepsText,
        noteText,
        supportNotice,
        '',
        `📌 入金ページはこちら: ${depositPageUrl}`,
        '',
        'ご不明な点がございましたら、お気軽にお問い合わせください。',
      ].join('\n').replace(/\n{3,}/g, '\n\n');

      // フロー完了後にセッションをクリア
      clearSessionState(sessionId);

      return {
        reply,
        quickReplies: [
          { label: '入金ページを開く', value: `__URI__${depositPageUrl}` },
          { label: '他の方法で入金', value: '入金したい' },
          { label: '質問がある', value: '質問がある' },
        ],
        type: 'deposit_guide',
        guideStep: 'instructions',
      };
    }
  }

  // === ケース B: 新規意図検知 ===
  const intent = detectDepositWithdrawIntent(userMessage);

  if (!intent.type) {
    return null; // ガイドフロー対象外 → 通常AI応答へ
  }

  // --- 出金フロー ---
  if (intent.type === 'withdraw') {
    return handleWithdrawFlow(sessionId);
  }

  // --- 入金フロー: Step 1 方法選択 ---
  setSessionState(sessionId, {
    step: 'select_method',
    flowType: 'deposit',
    selectedMethod: null,
    selectedAmount: null,
    createdAt: Date.now(),
  });

  return {
    reply: 'ご入金をご希望ですね。💰\nどの方法でご入金されますか？',
    quickReplies: DEPOSIT_METHODS.map(m => ({ label: m.label, value: m.label })),
    type: 'deposit_guide',
    guideStep: 'select_method',
  };
}


// ============================================
// 6. 出金フロー
// ============================================

/**
 * 出金案内（シンプル1ステップ）
 * 出金は入金ほど複雑でないため、直接手順を案内する
 */
function handleWithdrawFlow(sessionId) {
  clearSessionState(sessionId); // 出金はステップなし

  return {
    reply: [
      '出金をご希望ですね。💴',
      '',
      '📋 出金手順:',
      '①チャットサポートにて「出金」とメッセージを送信',
      '②スタッフがご登録の口座情報を確認',
      '③出金額をお伝えください',
      '④スタッフが出金手続きを実行',
      '⑤通常24時間以内にお振込み完了',
      '',
      '⚠️ 注意事項:',
      '・ボーナスの賭け条件が未達成の場合、出金できない場合があります',
      '・土日祝日・銀行営業時間外は翌営業日の対応となります',
      '',
      'ご不明な点がございましたら、お気軽にお問い合わせください。',
    ].join('\n'),
    quickReplies: [
      { label: '出金を申請する', value: '出金' },
      { label: '入金したい', value: '入金したい' },
      { label: '質問がある', value: '質問がある' },
    ],
    type: 'withdraw_guide',
    guideStep: 'instructions',
  };
}


// ============================================
// 7. API応答ヘルパー（handleAIChatV2に統合用）
// ============================================

/**
 * ガイドフロー結果をHTTP Responseに変換
 * @param {object} guideResult - handleDepositWithdrawFlow()の戻り値
 * @param {object} corsHeaders - CORSヘッダー
 * @param {number} startTime - リクエスト開始時刻
 * @returns {Response}
 */
export function buildGuideResponse(guideResult, corsHeaders, startTime) {
  return new Response(JSON.stringify({
    reply: guideResult.reply,
    quick_replies: guideResult.quickReplies,
    type: guideResult.type,
    guide_step: guideResult.guideStep,
    model: 'deposit-withdraw-guide',
    responseTimeMs: Date.now() - startTime,
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}
