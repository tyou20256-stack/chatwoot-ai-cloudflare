// ============================================
// Sloten AI CS — 画像分析モジュール
// image-analyzer.mjs
// ============================================
//
// Gemini 2.5 Flash Lite Vision API連携
// Base64画像受信 → リサイズ/バリデーション → 画像分析 → テキスト返却
//
// 使い方:
//   import { analyzeImage, validateImageInput } from './image-analyzer.mjs';
//   const validation = validateImageInput(imageBase64, mimeType);
//   if (!validation.valid) return errorResponse(validation.error);
//   const result = await analyzeImage(env, imageBase64, mimeType, userQuestion);
// ============================================

// ============================================
// 1. 定数
// ============================================

const GEMINI_VISION_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent';
const GEMINI_VISION_TIMEOUT_MS = 15000; // 画像分析は通常より長め: 15秒

// 画像制限
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_IMAGE_DIMENSION = 1024; // リサイズ上限px
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

// ============================================
// 2. バリデーション
// ============================================

/**
 * 画像入力のバリデーション
 * @param {string} imageBase64 - Base64エンコード画像データ（data:URL prefix除去済み）
 * @param {string} mimeType - MIMEタイプ
 * @returns {{ valid: boolean, error?: string, sizeBytes?: number }}
 */
export function validateImageInput(imageBase64, mimeType) {
  // MIMEタイプチェック
  if (!mimeType || !ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `対応していない画像形式です。JPEG, PNG, GIF, WebPのいずれかをお送りください。（受信: ${mimeType || '不明'}）`,
    };
  }

  // Base64データ存在チェック
  if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.length < 100) {
    return {
      valid: false,
      error: '画像データが空または不正です。もう一度お送りください。',
    };
  }

  // サイズチェック（Base64 → バイト概算: base64文字数 * 3/4）
  const estimatedBytes = Math.ceil(imageBase64.length * 3 / 4);
  if (estimatedBytes > MAX_IMAGE_SIZE_BYTES) {
    const sizeMB = (estimatedBytes / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `画像サイズが大きすぎます（${sizeMB}MB）。5MB以下の画像をお送りください。`,
    };
  }

  return { valid: true, sizeBytes: estimatedBytes };
}

/**
 * data:URL形式からBase64とMIMEタイプを抽出
 * @param {string} dataUrl - "data:image/jpeg;base64,/9j/4AAQ..." 形式
 * @returns {{ base64: string, mimeType: string } | null}
 */
export function parseDataUrl(dataUrl) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;

  // data:URL形式の場合
  const match = dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (match) {
    return { mimeType: match[1], base64: match[2] };
  }

  // プレーンBase64の場合（MIMEタイプ推定）
  if (/^\/9j\//.test(dataUrl)) return { mimeType: 'image/jpeg', base64: dataUrl };
  if (/^iVBOR/.test(dataUrl)) return { mimeType: 'image/png', base64: dataUrl };
  if (/^R0lGOD/.test(dataUrl)) return { mimeType: 'image/gif', base64: dataUrl };
  if (/^UklGR/.test(dataUrl)) return { mimeType: 'image/webp', base64: dataUrl };

  // 判別不能 → JPEGとして扱う
  return { mimeType: 'image/jpeg', base64: dataUrl };
}


// ============================================
// 3. Gemini Vision API呼び出し
// ============================================

/**
 * 画像分析用システムプロンプト
 * @param {string|null} brandName
 * @returns {string}
 */
function buildVisionSystemPrompt(brandName = null) {
  const name = brandName || 'スロット天国（Sloten）';
  return `あなたは${name}のカスタマーサポートAIです。ユーザーが送信した画像（主にスクリーンショット）を分析し、適切にサポートしてください。

■ 画像分析の方針
1. 画像内のテキスト・エラーメッセージ・UI要素を正確に読み取る
2. 問題が特定できた場合は、具体的な対処法をステップ形式で案内する
3. 入金画面・出金画面のスクショの場合は、次に操作すべきボタンや手順を案内する
4. エラー画面の場合は、エラー内容を説明し、解決策を提示する
5. ボーナス条件のスクショの場合は、条件内容をわかりやすく説明する
6. 画像内容が不明確な場合は、追加情報を求める

■ 回答ルール
- 200文字以内で簡潔に回答する（長くなる場合は箇条書き）
- 温かみのある敬語で対応する
- 推測で回答せず、画像から読み取れる情報のみで回答する
- 個人情報（名前・口座番号など）が画像に含まれる場合は言及しない

■ 禁止事項
- ギャンブルの推奨・煽り
- 他社サービスとの比較
- 法的助言
- 確認できていない情報の断定`;
}

/**
 * Gemini Vision APIで画像を分析
 *
 * @param {object} env - Workers環境変数（env.GEMINI_API_KEY必須）
 * @param {string} imageBase64 - Base64エンコード画像データ
 * @param {string} mimeType - MIMEタイプ（image/jpeg等）
 * @param {string|null} userQuestion - ユーザーの質問テキスト（nullの場合はデフォルト質問）
 * @param {object} options - オプション { brandName, conversationHistory }
 * @returns {Promise<{ text: string, model: string, imageAnalyzed: true }>}
 * @throws {Error} API呼び出し失敗時
 */
export async function analyzeImage(env, imageBase64, mimeType, userQuestion = null, options = {}) {
  const { brandName = null, conversationHistory = [] } = options;

  if (!env.GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY未設定: 画像分析にはGemini APIキーが必要です');
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GEMINI_VISION_TIMEOUT_MS);

  try {
    // ユーザー質問テキスト（デフォルト or ユーザー指定）
    const questionText = userQuestion && userQuestion.trim().length > 0
      ? userQuestion.trim()
      : 'この画像の内容を確認して、何か問題やエラーがあれば対処法を教えてください。';

    // Gemini API リクエスト構築
    const contents = [];

    // 会話履歴（テキストのみ、直近4往復）
    const recentHistory = conversationHistory.slice(-8);
    for (const msg of recentHistory) {
      contents.push({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      });
    }

    // 現在のメッセージ（テキスト + 画像）
    contents.push({
      role: 'user',
      parts: [
        { text: questionText },
        {
          inline_data: {
            mime_type: mimeType,
            data: imageBase64,
          },
        },
      ],
    });

    const requestBody = {
      system_instruction: {
        parts: [{ text: buildVisionSystemPrompt(brandName) }],
      },
      contents,
      generationConfig: {
        temperature: 0.3,
        topP: 0.8,
        topK: 40,
        maxOutputTokens: 512,
      },
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      ],
    };

    const response = await fetch(
      `${GEMINI_VISION_URL}?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown');
      throw new Error(`Gemini Vision API HTTP ${response.status}: ${errText.slice(0, 300)}`);
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      // Safety blockの可能性
      const blockReason = data?.candidates?.[0]?.finishReason;
      if (blockReason === 'SAFETY') {
        return {
          text: '申し訳ございません。この画像の内容を分析できませんでした。別のスクリーンショットをお試しいただくか、テキストでお問い合わせください。',
          model: 'gemini-2.5-flash-lite-vision',
          imageAnalyzed: true,
          safetyBlocked: true,
        };
      }
      throw new Error('Gemini Vision API: 空のレスポンス');
    }

    return {
      text,
      model: 'gemini-2.5-flash-lite-vision',
      imageAnalyzed: true,
    };

  } catch (e) {
    clearTimeout(timeoutId);
    if (e.name === 'AbortError') {
      throw new Error(`Gemini Vision API: ${GEMINI_VISION_TIMEOUT_MS}msタイムアウト`);
    }
    throw e;
  }
}


// ============================================
// 4. 画像分析フォールバック
// ============================================

/**
 * 画像分析が失敗した場合のフォールバック応答
 * @param {string} errorMessage - エラーメッセージ
 * @returns {{ text: string, model: string, imageAnalyzed: boolean }}
 */
export function imageAnalysisFallback(errorMessage) {
  console.error('[imageAnalysisFallback]', errorMessage);
  return {
    text: '申し訳ございません。現在画像の分析ができない状態です。お手数ですが、画像の内容をテキストでお伝えいただくか、しばらくしてから再度お試しください。',
    model: 'image-fallback',
    imageAnalyzed: false,
    error: errorMessage,
  };
}


// ============================================
// エクスポートまとめ
// ============================================
// validateImageInput - 画像バリデーション
// parseDataUrl      - data:URL解析
// analyzeImage      - Gemini Vision分析
// imageAnalysisFallback - フォールバック応答
