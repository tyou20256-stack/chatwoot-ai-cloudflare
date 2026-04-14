// TODO(kv-migration): EmotionTracker class holds per-isolate state.
// Consider migrating to KV (see kv-cache.mjs) once async caller propagation
// can be accommodated. Currently acceptable because emotion tracking is
// per-user conversation and resets across isolates are benign (starts fresh).
// ============================================
// Sloten AI CS — 感情分析＋適応型トーンエンジン
// emotion-engine.mjs
// ============================================
//
// ユーザーメッセージからリアルタイムで感情を分析し、
// AIの応答トーンを自動調整する機能を提供。
//
// 使い方:
//   import { analyzeEmotion, adjustTone, buildEmotionPromptInjection, EmotionTracker } from './emotion-engine.mjs';
//
//   const emotion = analyzeEmotion(message);
//   const injectedPrompt = buildEmotionPromptInjection(emotion, baseSystemPrompt);
//   // ... Gemini呼び出し後 ...
//   const adjustedResponse = adjustTone(emotion, aiResponse);
//
// ============================================


// ============================================
// 1. 感情キーワード辞書
// ============================================

/**
 * 感情カテゴリごとのキーワード定義
 * weight: キーワードの強度重み（0.0〜1.0）
 * keywords: 正規表現パターン配列
 *
 * 優先度: angry > frustrated > sad > confused > happy > neutral
 */
const EMOTION_DICTIONARY = {
  angry: {
    priority: 1,  // 最優先
    keywords: [
      // 高強度（weight: 1.0） — 明確な怒りの表明
      { pattern: /ふざけるな|ふざけんな/, weight: 1.0 },
      { pattern: /最悪/, weight: 0.6 }, // context-sensitive; can appear in "最悪の場合" (hypothetical)
      { pattern: /詐欺/, weight: 1.0 },
      { pattern: /嘘つき|嘘だ|嘘ばっか/, weight: 0.9 },
      { pattern: /イライラ/, weight: 0.8 },
      { pattern: /ありえない|あり得ない/, weight: 0.8 },
      { pattern: /金返せ|返金しろ/, weight: 1.0 },
      { pattern: /訴える|消費者庁|弁護士/, weight: 1.0 },
      { pattern: /クソ|ゴミ|バカ|アホ/, weight: 0.9 },
      { pattern: /許さない|許せない/, weight: 0.9 },
      // 中強度（weight: 0.6〜0.7）
      { pattern: /遅い|遅すぎ/, weight: 0.6 },
      { pattern: /なんで[!！?？]|何で[!！?？]/, weight: 0.6 },
      { pattern: /いい加減にし/, weight: 0.8 },
      { pattern: /対応が悪|対応悪/, weight: 0.7 },
      { pattern: /何回言えば/, weight: 0.8 },
      { pattern: /怒り|激怒/, weight: 0.9 },
      { pattern: /ムカつく|腹立つ|腹が立つ/, weight: 0.8 },
      { pattern: /信じられない/, weight: 0.6 },
      { pattern: /話にならない/, weight: 0.8 },
      { pattern: /舐めてる|なめてんの/, weight: 0.9 },
    ],
  },
  frustrated: {
    priority: 2,
    keywords: [
      { pattern: /わからない|分からない/, weight: 0.7 },
      { pattern: /できない|出来ない/, weight: 0.7 },
      { pattern: /何回も|何度も/, weight: 0.8 },
      { pattern: /また[?？!！]|また同じ/, weight: 0.7 },
      { pattern: /いつまで/, weight: 0.8 },
      { pattern: /まだ[?？]|まだですか/, weight: 0.7 },
      { pattern: /全然/, weight: 0.2 }, // Common in 全然大丈夫 (it's totally fine), don't weight too high; needs co-occurrence
      { pattern: /うまくいかない/, weight: 0.7 },
      { pattern: /進まない/, weight: 0.6 },
      { pattern: /もう嫌|もういい/, weight: 0.8 },
      { pattern: /だめ[だな]|ダメ[だな]/, weight: 0.6 },
      { pattern: /さっきから/, weight: 0.6 },
      { pattern: /ずっと待って/, weight: 0.7 },
      { pattern: /解決しない|解決しません/, weight: 0.8 },
      { pattern: /反映されない|反映しない/, weight: 0.7 },
    ],
  },
  confused: {
    priority: 3,
    keywords: [
      { pattern: /え[?？]+/, weight: 0.6 },
      { pattern: /どういうこと/, weight: 0.7 },
      { pattern: /意味がわからない|意味が分からない|意味不明/, weight: 0.8 },
      { pattern: /どうすれば/, weight: 0.7 },
      { pattern: /どうしたらいい/, weight: 0.7 },
      { pattern: /よくわからない|よく分からない/, weight: 0.6 },
      { pattern: /何をすれば/, weight: 0.6 },
      { pattern: /どこ[?？]|どこに/, weight: 0.5 },
      { pattern: /やり方がわからない|やり方が分からない/, weight: 0.7 },
      { pattern: /手順[がを]教えて/, weight: 0.5 },
      { pattern: /複雑|ややこしい/, weight: 0.5 },
      { pattern: /混乱/, weight: 0.6 },
    ],
  },
  happy: {
    priority: 4,
    keywords: [
      { pattern: /ありがとう|有難う/, weight: 0.8 },
      { pattern: /助かった|助かります|助かりました/, weight: 0.9 },
      { pattern: /できた[!！]|出来た[!！]|できました/, weight: 0.8 },
      { pattern: /嬉しい|うれしい/, weight: 0.9 },
      { pattern: /最高[!！]/, weight: 0.9 },
      { pattern: /完璧|パーフェクト/, weight: 0.8 },
      { pattern: /解決しました|解決した/, weight: 0.8 },
      { pattern: /すごい[!！]|素晴らしい/, weight: 0.7 },
      { pattern: /やった[!！]/, weight: 0.7 },
      { pattern: /感謝/, weight: 0.8 },
      { pattern: /サンキュー|Thanks|thank you/i, weight: 0.7 },
      { pattern: /神対応/, weight: 0.9 },
      { pattern: /丁寧/, weight: 0.5 },
    ],
  },
  sad: {
    priority: 5,
    keywords: [
      { pattern: /残念/, weight: 0.7 },
      { pattern: /がっかり/, weight: 0.8 },
      // 辛い removed: collides with 食べ物の「辛い」(spicy). つらい (hiragana) kept but downgraded.
      { pattern: /つらい/, weight: 0.4 },
      { pattern: /悲しい/, weight: 0.8 },
      { pattern: /ショック/, weight: 0.7 },
      { pattern: /落ち込/, weight: 0.7 },
      { pattern: /困った|困って/, weight: 0.6 },
      { pattern: /不安/, weight: 0.6 },
      { pattern: /心配/, weight: 0.5 },
      { pattern: /泣き/, weight: 0.7 },
    ],
  },
};


// ============================================
// 2. 感情分析関数
// ============================================

/**
 * ユーザーメッセージから感情をリアルタイム分析
 *
 * アルゴリズム:
 *   1. 各カテゴリのキーワードをメッセージに照合
 *   2. マッチしたキーワードのweight合計 + マッチ数ボーナスでスコア算出
 *   3. 最高スコアのカテゴリを選出（同点ならpriority優先）
 *   4. スコアを0-1に正規化
 *
 * @param {string} message - ユーザーメッセージ（サニタイズ済み推奨）
 * @returns {{ emotion: string, score: number, matches: string[], secondary: string|null }}
 *   emotion: 'neutral'|'happy'|'angry'|'confused'|'frustrated'|'sad'
 *   score: 0〜1（感情の強度。0.3未満はneutralに降格）
 *   matches: マッチしたキーワード一覧（デバッグ/ログ用）
 *   secondary: 2番目に強い感情（nullable。複合感情の検知用）
 */
/**
 * 否定文脈をスコア前に除去（誤検知防止）
 * 「辛くない」「悲しくない」「困ってない」などを取り除いてから感情辞書に通す
 * @param {string} text
 * @returns {string}
 */
function filterNegations(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/(\S+?)(くない)/g, '')            // 辛くない等のイ形容詞否定
    .replace(/(\S+?)(じゃない|ではない)/g, '') // ～ではない
    .replace(/(\S+?)(ない|ません|しない)/g, ''); // 一般否定（最後に処理）
}

export function analyzeEmotion(message) {
  if (!message || typeof message !== 'string') {
    return { emotion: 'neutral', score: 0, matches: [], secondary: null };
  }

  // 否定表現を除去してから感情検知（False positive防止）
  message = filterNegations(message);

  const scores = {};
  const matchDetails = {};

  for (const [emotionName, config] of Object.entries(EMOTION_DICTIONARY)) {
    let totalWeight = 0;
    let matchCount = 0;
    const matched = [];

    for (const { pattern, weight } of config.keywords) {
      if (pattern.test(message)) {
        totalWeight += weight;
        matchCount++;
        // マッチしたパターンのソース文字列を記録
        const matchResult = message.match(pattern);
        if (matchResult) {
          matched.push(matchResult[0]);
        }
      }
    }

    // スコア計算: 最大マッチweight + 追加マッチボーナス
    // キーワード辞書サイズに依存しない方式（辞書が大きいカテゴリが不利にならない）
    const maxMatchedWeight = matched.length > 0
      ? Math.max(...config.keywords.filter(k => k.pattern.test(message)).map(k => k.weight))
      : 0;
    const rawScore = maxMatchedWeight + (Math.max(0, matchCount - 1) * 0.1);

    // 0-1にクランプ
    scores[emotionName] = Math.min(1.0, rawScore);
    matchDetails[emotionName] = matched;
  }

  // --- 最高スコアの感情を選出 ---
  let bestEmotion = 'neutral';
  let bestScore = 0;
  let secondBest = null;
  let secondScore = 0;

  // priority順でソート（同スコアならpriority低い=より重要な感情を優先）
  const sorted = Object.entries(scores)
    .filter(([, s]) => s > 0)
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1]; // スコア降順
      return EMOTION_DICTIONARY[a[0]].priority - EMOTION_DICTIONARY[b[0]].priority; // priority昇順
    });

  if (sorted.length > 0) {
    [bestEmotion, bestScore] = sorted[0];
  }
  if (sorted.length > 1) {
    [secondBest, secondScore] = sorted[1];
  }

  // --- 閾値チェック: スコア0.03未満はneutralに降格 ---
  // (0.03 = 1つのweight 0.5キーワードが20個中1つマッチした程度)
  if (bestScore < 0.03) {
    return { emotion: 'neutral', score: 0, matches: [], secondary: null };
  }

  // --- 感嘆符・疑問符による感情増幅 ---
  const exclamationCount = (message.match(/[!！]/g) || []).length;
  const questionCount = (message.match(/[?？]/g) || []).length;

  let amplifiedScore = bestScore;
  if (exclamationCount >= 2) amplifiedScore = Math.min(1.0, amplifiedScore + 0.1);
  if (exclamationCount >= 4) amplifiedScore = Math.min(1.0, amplifiedScore + 0.1);
  if (questionCount >= 3 && bestEmotion === 'confused') {
    amplifiedScore = Math.min(1.0, amplifiedScore + 0.1);
  }

  // --- メッセージ長による補正 ---
  // 短いメッセージで感情語がマッチ → スコアを少し上げる（感情が凝縮されている）
  if (message.length < 20 && matchDetails[bestEmotion]?.length > 0) {
    amplifiedScore = Math.min(1.0, amplifiedScore + 0.1);
  }

  return {
    emotion: bestEmotion,
    score: Math.round(amplifiedScore * 100) / 100, // 小数点2桁
    matches: matchDetails[bestEmotion] || [],
    secondary: secondScore >= 0.03 ? secondBest : null,
  };
}


// ============================================
// 3. トーン調整関数
// ============================================

/**
 * 感情分析結果に基づいてAIの応答トーンを調整
 *
 * 各感情に対応する調整ロジック:
 *   angry      → 「ご不便をおかけし大変申し訳ございません。」を先頭に追加
 *   frustrated → 回答を短く簡潔に + 「お手数おかけしております」を先頭に追加
 *   confused   → ステップバイステップフォーマットへの変換示唆（プロンプト側で制御）
 *   happy      → 「お役に立てて嬉しいです！」を末尾に追加
 *   sad        → 共感を先頭に追加
 *   neutral    → そのまま
 *
 * @param {{ emotion: string, score: number }} emotionResult - analyzeEmotion()の戻り値
 * @param {string} baseResponse - Geminiからの生応答テキスト
 * @returns {{ response: string, toneAdjusted: boolean, adjustment: string|null }}
 */
export function adjustTone(emotionResult, baseResponse) {
  if (!baseResponse || !emotionResult) {
    return { response: baseResponse || '', toneAdjusted: false, adjustment: null };
  }

  const { emotion, score } = emotionResult;

  // スコアが低い場合はトーン調整をスキップ（誤検知防止）
  if (score < 0.05) {
    return { response: baseResponse, toneAdjusted: false, adjustment: null };
  }

  switch (emotion) {
    case 'angry': {
      // 強い怒り（score >= 0.3）→ フル謝罪プレフィックス
      // 中程度（score < 0.3）→ 軽めの謝罪
      const prefix = score >= 0.3
        ? 'ご不便をおかけし大変申し訳ございません。お客様のお気持ちは十分に理解しております。\n\n'
        : 'ご不便をおかけし申し訳ございません。\n\n';

      // 既に謝罪で始まっている場合は二重追加しない
      if (/^(ご不便|申し訳|大変申し訳|お詫び)/.test(baseResponse)) {
        return { response: baseResponse, toneAdjusted: false, adjustment: 'already_apologetic' };
      }

      return {
        response: prefix + baseResponse,
        toneAdjusted: true,
        adjustment: 'angry_apology',
      };
    }

    case 'frustrated': {
      const prefix = 'お手数おかけしております。\n\n';

      // 既にクッション言葉がある場合はスキップ
      if (/^(お手数|ご迷惑|お待たせ)/.test(baseResponse)) {
        return { response: baseResponse, toneAdjusted: false, adjustment: 'already_cushioned' };
      }

      // 長い応答を短縮（200文字超の場合、最初の段落+箇条書きに絞る）
      let shortened = baseResponse;
      if (baseResponse.length > 250) {
        // 箇条書き部分を保持しつつ冗長な文を省略
        const lines = baseResponse.split('\n').filter(l => l.trim());
        const concise = lines.slice(0, 6).join('\n'); // 最大6行
        if (concise.length < baseResponse.length) {
          shortened = concise;
        }
      }

      return {
        response: prefix + shortened,
        toneAdjusted: true,
        adjustment: 'frustrated_concise',
      };
    }

    case 'confused': {
      // confused の場合、プロンプト側でステップバイステップ指示を注入済み
      // ポストプロセスとしては追加の案内文を末尾に
      const suffix = '\n\nご不明な点がございましたら、お気軽にお尋ねください。一つずつご案内いたします。';

      // 既に同様の文言がある場合はスキップ
      if (/お気軽に|お尋ね|一つずつ/.test(baseResponse)) {
        return { response: baseResponse, toneAdjusted: false, adjustment: 'already_helpful' };
      }

      return {
        response: baseResponse + suffix,
        toneAdjusted: true,
        adjustment: 'confused_stepbystep',
      };
    }

    case 'happy': {
      const suffix = '\n\nお役に立てて嬉しいです！他にご不明な点がございましたら何でもお気軽にどうぞ 😊';

      // 既にポジティブな締めがある場合はスキップ
      if (/嬉しい|お役に立て|お気軽に/.test(baseResponse)) {
        return { response: baseResponse, toneAdjusted: false, adjustment: 'already_positive' };
      }

      return {
        response: baseResponse + suffix,
        toneAdjusted: true,
        adjustment: 'happy_positive',
      };
    }

    case 'sad': {
      const prefix = 'ご心配をおかけし申し訳ございません。お気持ちお察しいたします。\n\n';

      if (/^(ご心配|お気持ち|お察し)/.test(baseResponse)) {
        return { response: baseResponse, toneAdjusted: false, adjustment: 'already_empathetic' };
      }

      return {
        response: prefix + baseResponse,
        toneAdjusted: true,
        adjustment: 'sad_empathy',
      };
    }

    default:
      // neutral → そのまま
      return { response: baseResponse, toneAdjusted: false, adjustment: null };
  }
}


// ============================================
// 4. Geminiプロンプトへの感情注入
// ============================================

/**
 * 感情分析結果に基づく追加指示をシステムプロンプトに注入
 *
 * @param {{ emotion: string, score: number, secondary: string|null }} emotionResult
 * @param {string} baseSystemPrompt - 既存のシステムプロンプト
 * @returns {string} 感情指示が注入されたシステムプロンプト
 */
export function buildEmotionPromptInjection(emotionResult, baseSystemPrompt) {
  if (!emotionResult || emotionResult.emotion === 'neutral') {
    return baseSystemPrompt;
  }

  const { emotion, score, secondary } = emotionResult;

  // 感情別のプロンプト追加指示
  const emotionInstructions = {
    angry: `[ユーザーの感情: angry（怒り） / 強度: ${score}]
ユーザーは強い不満・怒りを感じています。以下を厳守してください：
- まず最初に真摯な謝罪を述べる（「ご不便をおかけし大変申し訳ございません」）
- ユーザーの怒りを否定せず、共感を示す
- 具体的な解決策を簡潔に提示する
- 解決が難しい場合、オペレーターへの引き継ぎを提案する
- 言い訳や正当化は絶対にしない
- トーンはより丁重に、敬語を強化する`,

    frustrated: `[ユーザーの感情: frustrated（フラストレーション） / 強度: ${score}]
ユーザーはフラストレーションを感じています。以下を厳守してください：
- 回答は短く簡潔に（150文字以内を目安）
- 「お手数おかけしております」等のクッション言葉で始める
- ステップを明確な番号付きリストで示す（最大3ステップ）
- 冗長な説明は避け、要点のみ伝える
- 「〜していただけますか？」など柔らかい依頼形を使う`,

    confused: `[ユーザーの感情: confused（困惑） / 強度: ${score}]
ユーザーは困惑・混乱しています。以下を厳守してください：
- ステップバイステップで丁寧に説明する
- 各ステップを①②③の番号付きで分かりやすく示す
- 専門用語は避け、平易な言葉で説明する
- 「まず〜してください」「次に〜」と順序を明確に
- 1回の回答で1つの手順に絞り、情報過多を避ける
- 最後に「ご不明な点はお気軽にお尋ねください」と添える`,

    happy: `[ユーザーの感情: happy（満足） / 強度: ${score}]
ユーザーは満足・感謝の気持ちを示しています：
- 温かみのあるトーンで応答する
- 「お役に立てて嬉しいです」等のポジティブな表現を使う
- 追加で役立つ情報があれば軽く提案する
- 敬語は維持しつつ、少しフレンドリーな雰囲気でOK`,

    sad: `[ユーザーの感情: sad（悲しみ） / 強度: ${score}]
ユーザーは落胆・悲しみを感じています：
- まず共感を示す（「お気持ちお察しいたします」）
- 解決策がある場合は希望を持てるように提示する
- 寄り添うトーンを心がける
- 機械的な回答は避け、人間味のある表現を使う`,
  };

  const instruction = emotionInstructions[emotion];
  if (!instruction) {
    return baseSystemPrompt;
  }

  // 複合感情の補足（secondary がある場合）
  let secondaryNote = '';
  if (secondary) {
    const secondaryLabels = {
      angry: '怒りも含む',
      frustrated: 'フラストレーションも含む',
      confused: '困惑も含む',
      happy: '感謝の気持ちも含む',
      sad: '悲しみも含む',
    };
    secondaryNote = `\n※ 副次感情: ${secondaryLabels[secondary] || secondary}`;
  }

  return `${baseSystemPrompt}

■ 感情適応指示（自動検知）
${instruction}${secondaryNote}`;
}


// ============================================
// 5. セッション感情トラッカー（連続怒り検知→自動エスカレーション）
// ============================================

/**
 * セッション単位の感情履歴を追跡し、
 * 連続怒り検知時に自動エスカレーションを提案するクラス。
 *
 * Workers環境ではリクエスト間で状態が消える可能性があるため、
 * 呼び出し側でconversation_historyから再構築するか、
 * KV/D1に永続化する設計を推奨。
 *
 * 使用パターン:
 *   // リクエストごとに履歴からトラッカーを再構築
 *   const tracker = new EmotionTracker();
 *   tracker.restoreFromHistory(conversationHistory);
 *   const result = tracker.track(currentEmotion);
 *   if (result.shouldEscalate) { ... }
 */
export class EmotionTracker {
  /**
   * @param {object} options
   * @param {number} options.angryThreshold - 自動エスカレーションの連続angry閾値（デフォルト: 2）
   * @param {number} options.maxHistory - 保持する感情履歴の最大数（デフォルト: 20）
   * @param {number} options.frustrationThreshold - frustrated連続閾値（デフォルト: 3）
   */
  constructor(options = {}) {
    this.angryThreshold = options.angryThreshold || 2;
    this.frustrationThreshold = options.frustrationThreshold || 3;
    this.maxHistory = options.maxHistory || 20;
    this.history = []; // [{ emotion, score, timestamp }]
    this.consecutiveAngryCount = 0;
    this.consecutiveFrustratedCount = 0;
    this.escalationSuggested = false; // 既にエスカレーション提案済みか
  }

  /**
   * 新しい感情を記録し、エスカレーション判定を行う
   *
   * @param {{ emotion: string, score: number }} emotionResult
   * @returns {{
   *   shouldEscalate: boolean,
   *   reason: string|null,
   *   consecutiveAngry: number,
   *   consecutiveFrustrated: number,
   *   emotionTrend: string
   * }}
   */
  track(emotionResult) {
    const entry = {
      emotion: emotionResult.emotion,
      score: emotionResult.score,
      timestamp: Date.now(),
    };

    this.history.push(entry);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // --- 連続怒りカウント ---
    if (emotionResult.emotion === 'angry') {
      this.consecutiveAngryCount++;
    } else {
      this.consecutiveAngryCount = 0;
    }

    // --- 連続フラストレーションカウント ---
    if (emotionResult.emotion === 'frustrated') {
      this.consecutiveFrustratedCount++;
    } else {
      this.consecutiveFrustratedCount = 0;
    }

    // --- エスカレーション判定 ---
    let shouldEscalate = false;
    let reason = null;

    // 条件1: 連続angry >= 閾値（デフォルト2回）
    if (this.consecutiveAngryCount >= this.angryThreshold && !this.escalationSuggested) {
      shouldEscalate = true;
      reason = 'consecutive_angry';
      this.escalationSuggested = true;
    }

    // 条件2: 連続frustrated >= 閾値（デフォルト3回）
    if (this.consecutiveFrustratedCount >= this.frustrationThreshold && !this.escalationSuggested) {
      shouldEscalate = true;
      reason = 'consecutive_frustrated';
      this.escalationSuggested = true;
    }

    // 条件3: 感情悪化トレンド（直近3メッセージで neutral→frustrated→angry のような悪化）
    if (this.history.length >= 3 && !this.escalationSuggested) {
      const recent3 = this.history.slice(-3);
      const escalating = this._isEscalatingTrend(recent3);
      if (escalating) {
        shouldEscalate = true;
        reason = 'escalating_trend';
        this.escalationSuggested = true;
      }
    }

    return {
      shouldEscalate,
      reason,
      consecutiveAngry: this.consecutiveAngryCount,
      consecutiveFrustrated: this.consecutiveFrustratedCount,
      emotionTrend: this._calculateTrend(),
    };
  }

  /**
   * 会話履歴から感情履歴を復元（conversation_historyのメタデータから）
   *
   * conversation_historyの各エントリに emotion フィールドがある前提:
   * [{ role: 'user', content: '...', emotion: { emotion: 'angry', score: 0.8 } }, ...]
   *
   * @param {Array} conversationHistory
   */
  restoreFromHistory(conversationHistory) {
    if (!Array.isArray(conversationHistory)) return;

    for (const msg of conversationHistory) {
      if (msg.role === 'user' && msg.emotion) {
        this.track(msg.emotion);
      }
    }
    // 復元時のエスカレーションフラグはリセット（新規メッセージで再判定するため）
    this.escalationSuggested = false;
  }

  /**
   * 感情悪化トレンドを検知
   * @private
   */
  _isEscalatingTrend(recent) {
    const severityMap = { neutral: 0, happy: 0, confused: 1, sad: 2, frustrated: 3, angry: 4 };
    const severities = recent.map(e => severityMap[e.emotion] ?? 0);

    // 3連続で悪化方向に進んでいるか（各ステップで1以上増加）
    return severities.length >= 3 &&
      severities[1] > severities[0] &&
      severities[2] > severities[1] &&
      severities[2] >= 3; // frustrated以上に達している
  }

  /**
   * 直近の感情トレンドを文字列で返す
   * @private
   */
  _calculateTrend() {
    if (this.history.length < 2) return 'insufficient_data';

    const recent = this.history.slice(-3);
    const severityMap = { neutral: 0, happy: -1, confused: 1, sad: 2, frustrated: 3, angry: 4 };
    const severities = recent.map(e => severityMap[e.emotion] ?? 0);

    const avg = severities.reduce((a, b) => a + b, 0) / severities.length;
    const lastSev = severities[severities.length - 1];

    if (lastSev > avg + 0.5) return 'worsening';
    if (lastSev < avg - 0.5) return 'improving';
    return 'stable';
  }

  /**
   * エスカレーション提案メッセージを生成
   *
   * @param {string} reason - エスカレーション理由
   * @returns {string} エスカレーション応答メッセージ
   */
  static getEscalationMessage(reason) {
    switch (reason) {
      case 'consecutive_angry':
        return 'ご不快な思いが続いてしまい、大変申し訳ございません。より迅速に問題を解決するため、専門の担当オペレーターにお繋ぎすることをお勧めいたします。\n\n「オペレーター」とお送りいただければ、すぐにお繋ぎいたします。';

      case 'consecutive_frustrated':
        return 'お手数が続いてしまい、誠に申し訳ございません。この問題をスムーズに解決するため、担当スタッフが直接対応させていただくことも可能です。\n\n「オペレーター」とお送りいただければ、お繋ぎいたします。';

      case 'escalating_trend':
        return 'ご不便が続いているようで、大変心苦しく存じます。お客様のお悩みをより確実に解決するため、専門スタッフへの引き継ぎをご提案いたします。\n\n「オペレーター」とお送りいただければ、すぐにお繋ぎいたします。';

      default:
        return '担当オペレーターにお繋ぎすることも可能です。ご希望の場合は「オペレーター」とお送りください。';
    }
  }

  /**
   * 現在の感情状態サマリーを返す（デバッグ/ログ用）
   */
  getSummary() {
    return {
      historyLength: this.history.length,
      consecutiveAngry: this.consecutiveAngryCount,
      consecutiveFrustrated: this.consecutiveFrustratedCount,
      escalationSuggested: this.escalationSuggested,
      trend: this._calculateTrend(),
      recentEmotions: this.history.slice(-5).map(e => `${e.emotion}(${e.score})`),
    };
  }
}


// ============================================
// 6. handleAIChatV2 統合用ヘルパー
// ============================================

/**
 * handleAIChatV2のStep 4（Gemini呼び出し）前後に挟む統合関数
 *
 * 使い方:
 *   // Step 3.5: 感情分析
 *   const emotionContext = processEmotion(cleanMessage, conversationHistory);
 *
 *   // Step 4: Gemini呼び出し（感情注入済みプロンプトを使用）
 *   const systemPromptWithEmotion = emotionContext.injectedPrompt;
 *   const aiResult = await callAIWithFallback(env, systemPromptWithEmotion, cleanMessage, conversationHistory);
 *
 *   // Step 4.5: エスカレーション判定
 *   if (emotionContext.shouldEscalate) {
 *     // エスカレーション応答を返す
 *   }
 *
 *   // Step 5: トーン調整 + 出力フィルタ
 *   const toneResult = adjustTone(emotionContext.emotion, aiResult.text);
 *   const finalResponse = filterOutput(toneResult.response);
 *
 * @param {string} message - サニタイズ済みユーザーメッセージ
 * @param {string} baseSystemPrompt - 既存のシステムプロンプト
 * @param {Array} conversationHistory - 会話履歴（emotion付きなら復元に使用）
 * @returns {{
 *   emotion: { emotion: string, score: number, matches: string[], secondary: string|null },
 *   injectedPrompt: string,
 *   shouldEscalate: boolean,
 *   escalationReason: string|null,
 *   escalationMessage: string|null,
 *   trackerSummary: object
 * }}
 */
export function processEmotion(message, baseSystemPrompt, conversationHistory = []) {
  // 1. 感情分析
  const emotion = analyzeEmotion(message);

  // 2. プロンプト注入
  const injectedPrompt = buildEmotionPromptInjection(emotion, baseSystemPrompt);

  // 3. セッション感情トラッキング
  const tracker = new EmotionTracker();
  tracker.restoreFromHistory(conversationHistory);
  const trackResult = tracker.track(emotion);

  // 4. エスカレーション判定
  const escalationMessage = trackResult.shouldEscalate
    ? EmotionTracker.getEscalationMessage(trackResult.reason)
    : null;

  return {
    emotion,
    injectedPrompt,
    shouldEscalate: trackResult.shouldEscalate,
    escalationReason: trackResult.reason,
    escalationMessage,
    trackerSummary: tracker.getSummary(),
  };
}


// ============================================
// エクスポート一覧
// ============================================
export {
  EMOTION_DICTIONARY,
};
