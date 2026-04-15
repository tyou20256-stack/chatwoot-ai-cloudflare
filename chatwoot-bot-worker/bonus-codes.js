// ============================================================================
// ボーナスコード定義 + 検証ロジック（Standard8 v8.21 完全移植 + 動的KV対応）
// ============================================================================

// 有効なボーナスコードのリスト（金額付き完全一致）
export const VALID_BONUS_CODES = {
  // 現在有効なボーナスコードはありません
}

// 各種ボーナスコード定義
export const STEPUP_BONUS_CODES = ['スペシャルステップ']
export const VAMOS_BONUS_CODES = ['バモスイボナ', 'ばもすいぼな']
export const AKEOME_BONUS_CODES = ['あけおめ', 'アケオメ']
export const SPECIAL_CHANCE_CODES = ['スペシャルチャンス', 'すぺしゃるちゃんす']
export const TOKUBETSU_STEP_CODES = ['特別ステップ', 'とくべつすてっぷ']
export const TOKUBETSU_HEAVENS_CODES = ['特別ヘブンズ', 'とくべつへぶんず']
export const CUSTOM_HEAVENS_CODES = ['カスタムヘブンズショット', 'カスタムヘブンズ', 'かすたむへぶんずしょっと']
export const TRIATHLON_CODES = ['トライアスロン', 'とらいあすろん']
export const HINAMATSURI_CODES = ['ひな祭り', 'ひなまつり', 'ヒナマツリ']
export const HEAVENS_MISSION_CODES = ['ヘブンズミッション', 'へぶんずみっしょん']
export const HEAVENS_WIN_CODES = ['ヘブンズウィン', 'へぶんずうぃん']
export const ELITE_CHALLENGE_CODES = ['ELITE参加', 'elite参加', 'Elite参加']
export const WHITE_DAY_CODES = ['ホワイトデー', 'ほわいとでー']
export const ZOROME_CODES = ['ゾロ目チャレンジ', 'ぞろめちゃれんじ']

// BC_入学 イベントコード
export const GATORIAN_CODES = ['ゲートリアン', 'げーとりあん']
export const RIRICIA_CODES = ['リリシア', 'りりしあ']
export const LUCIFIRE_CODES = ['ルシフィーレ', 'るしふぃーれ']
export const LUCIFIRE_PLAN_CODES = ['入学10000', '入学20000']
export const HARPINA_CODES = ['ハルピナ', 'はるぴな']
export const ARQUEL_CODES = ['アークエル', 'あーくえる']
export const RAFIEL_CODES = ['ラフィエル', 'らふぃえる']
export const SERAPHIM_CODES = ['セレフィム', 'せれふぃむ']

// BC_ギルド イベントコード
export const SUROTEN_DREAM_CODES = ['スロ天ドリーム', 'すろてんどりーむ']

// スペース除去関数（全角スペース・半角スペースを除去）
export function removeSpaces(str) {
  return str.replace(/[\s\u3000]/g, '')
}

// 機種選択マップ（6種 × 10機種）
const GAME_LIST = {
  'gates_olympus_og': 'Gates of Olympus',
  'starlight': 'Starlight Princess',
  'starlight_xmas': 'Starlight Princess Christmas',
  'wisdom': 'Wisdom of Athena',
  'gates_olympus': 'Gates of Olympus 1000',
  'gatokaca': 'Gates of Gatokaca 1000',
  'sugar_rush_1000': 'Sugar Rush 1000',
  'sweet_bonanza': 'Sweet Bonanza 1000',
  'sugar_rush': 'Sugar Rush',
  'fruit_party': 'Fruit Party'
}

const GAME_PREFIXES = [
  'stepup_game_',
  'vamos_game_',
  'akeome_game_',
  'special_chance_game_',
  'tokubetsu_step_game_',
  'tokubetsu_heavens_game_',
  'arquel_game_',
  'seraphim_game_'
]

// 機種選択valueからゲーム名とプレフィックスを取得
export function matchGameSelection(messageText) {
  for (const prefix of GAME_PREFIXES) {
    if (messageText.startsWith(prefix)) {
      const gameSuffix = messageText.substring(prefix.length)
      const gameName = GAME_LIST[gameSuffix]
      if (gameName) {
        // プレフィックスから種別を取得（例: stepup_game_ → stepup）
        const type = prefix.replace('_game_', '')
        return { type, gameName }
      }
    }
  }
  return null
}

// カスタムヘブンズショットの条件テキスト検出
export function isCustomHeavensCondition(messageText) {
  const conditionPattern = /(カスタムヘブンズショット|Custom\s*Heaven'?s?\s*Shot)/i
  const hasBuyAmount = /(BUY額|BUY金額|￥\d|\d+,?\d*円)/i
  const hasCondition = /(勝利条件|倍以上|受け取り|機種)/i
  return conditionPattern.test(messageText) && (hasBuyAmount.test(messageText) || hasCondition.test(messageText))
}

// ============================================================================
// 動的ボーナスコード（KVキャッシュ）
// ============================================================================

let cachedConfig = null
let cachedVersion = null
let cacheTimestamp = 0
const CACHE_TTL_MS = 30_000 // 30秒

// KVから動的ボーナスコード設定を取得（キャッシュ付き）
async function getDynamicConfig(env) {
  if (!env?.CHATWOOT_KV) return null

  const now = Date.now()

  // TTL以内ならキャッシュを返す
  if (cachedConfig && (now - cacheTimestamp) < CACHE_TTL_MS) {
    return cachedConfig
  }

  try {
    const raw = await env.CHATWOOT_KV.get('bonus-codes-config')
    if (!raw) {
      cachedConfig = null
      cacheTimestamp = now
      return null
    }

    const config = JSON.parse(raw)

    // バージョンが同じならキャッシュ更新のみ
    if (config.version === cachedVersion && cachedConfig) {
      cacheTimestamp = now
      return cachedConfig
    }

    cachedConfig = config
    cachedVersion = config.version
    cacheTimestamp = now
    return config
  } catch (e) {
    console.error('Dynamic bonus codes load failed:', e.message)
    return cachedConfig // エラー時は古いキャッシュを返す（なければnull）
  }
}

// テスト用: キャッシュクリア
export function clearBonusCodeCache() {
  cachedConfig = null
  cachedVersion = null
  cacheTimestamp = 0
}

// ハードコード種別定義マップ（overrideチェック用）
const HARDCODED_MAP = {
  valid_bonus: { codes: () => Object.keys(VALID_BONUS_CODES), matchMode: 'exact', successKey: null },
  vamos: { codes: () => VAMOS_BONUS_CODES, matchMode: 'exact', successKey: 'vamos_bonus_success' },
  akeome: { codes: () => AKEOME_BONUS_CODES, matchMode: 'exact', successKey: 'akeome_bonus_success' },
  special_chance: { codes: () => SPECIAL_CHANCE_CODES, matchMode: 'exact', successKey: 'special_chance_success' },
  tokubetsu_step: { codes: () => TOKUBETSU_STEP_CODES, matchMode: 'exact', successKey: 'tokubetsu_step_success' },
  tokubetsu_heavens: { codes: () => TOKUBETSU_HEAVENS_CODES, matchMode: 'exact', successKey: 'tokubetsu_heavens_success' },
  custom_heavens: { codes: () => CUSTOM_HEAVENS_CODES, matchMode: 'exact', successKey: 'custom_heavens_success' },
  triathlon: { codes: () => TRIATHLON_CODES, matchMode: 'case_insensitive', successKey: 'triathlon_success' },
  hinamatsuri: { codes: () => HINAMATSURI_CODES, matchMode: 'case_insensitive', successKey: 'hinamatsuri_success' },
  heavens_mission: { codes: () => HEAVENS_MISSION_CODES, matchMode: 'case_insensitive', successKey: 'heavens_mission_success' },
  heavens_win: { codes: () => HEAVENS_WIN_CODES, matchMode: 'case_insensitive', successKey: 'heavens_win_success' },
  elite_challenge: { codes: () => ELITE_CHALLENGE_CODES, matchMode: 'case_insensitive', successKey: 'elite_challenge_success' },
  white_day: { codes: () => WHITE_DAY_CODES, matchMode: 'case_insensitive', successKey: 'white_day_success' },
  stepup: { codes: () => STEPUP_BONUS_CODES, matchMode: 'exact', successKey: 'stepup_success' },
  // BC_入学 イベント
  gatorian: { codes: () => GATORIAN_CODES, matchMode: 'case_insensitive', successKey: 'gatorian_success', gasType: 'BC_入学' },
  riricia: { codes: () => RIRICIA_CODES, matchMode: 'case_insensitive', successKey: 'riricia_success', gasType: 'BC_入学' },
  lucifire: { codes: () => LUCIFIRE_CODES, matchMode: 'case_insensitive', successKey: 'lucifire_success', gasType: 'BC_入学' },
  lucifire_plan: { codes: () => LUCIFIRE_PLAN_CODES, matchMode: 'exact', successKey: 'lucifire_plan_success', gasType: 'BC_入学', transferAfter: true },
  harpina: { codes: () => HARPINA_CODES, matchMode: 'case_insensitive', successKey: 'harpina_success', gasType: 'BC_入学' },
  arquel: { codes: () => ARQUEL_CODES, matchMode: 'case_insensitive', successKey: 'arquel_success', gasType: 'BC_入学' },
  rafiel: { codes: () => RAFIEL_CODES, matchMode: 'case_insensitive', successKey: 'rafiel_success', gasType: 'BC_入学' },
  seraphim: { codes: () => SERAPHIM_CODES, matchMode: 'case_insensitive', successKey: 'seraphim_success', gasType: 'BC_入学' },
  zorome: { codes: () => ZOROME_CODES, matchMode: 'case_insensitive', successKey: 'zorome_success' },
  // BC_ギルド イベント
  suroten_dream: { codes: () => SUROTEN_DREAM_CODES, matchMode: 'case_insensitive', successKey: 'suroten_dream_success', gasType: 'BC_ギルド' },
}

// コード照合ヘルパー
function matchCode(codes, normalizedInput, matchMode) {
  if (matchMode === 'case_insensitive') {
    return codes.find(c => removeSpaces(c.toLowerCase()) === normalizedInput.toLowerCase())
  }
  return codes.find(c => removeSpaces(c) === normalizedInput)
}

// ボーナスコード検証（ハードコード + 動的KV統合）
// 戻り値: { matched: true, type, code, successKey?, successMessage?, source } | { matched: false }
export async function matchBonusCode(messageText, env) {
  const normalizedInput = removeSpaces(messageText)

  // KV設定を取得（エラー時はnull → ハードコードのみで動作）
  let config = null
  try {
    config = await getDynamicConfig(env)
  } catch (e) {
    console.error('getDynamicConfig error:', e.message)
  }

  // --- 動的コード（customTypes）を先にチェック ---
  if (config?.customTypes) {
    for (const ct of config.customTypes) {
      if (ct.enabled === false) continue
      const matched = matchCode(ct.codes, normalizedInput, ct.matchMode || 'case_insensitive')
      if (matched) {
        return {
          matched: true,
          type: ct.id,
          code: matched,
          successKey: null,
          successMessage: ct.successMessage || null,
          source: 'dynamic'
        }
      }
    }
  }

  // --- ハードコードチェック（KVオーバーライド適用） ---
  // 各ハードコード種別を順番にチェック（オリジナルの順序を維持）
  const hardcodedOrder = [
    'valid_bonus', 'vamos', 'akeome', 'special_chance',
    'tokubetsu_step', 'tokubetsu_heavens', 'custom_heavens',
    'triathlon', 'hinamatsuri', 'heavens_mission',
    'heavens_win', 'elite_challenge', 'white_day', 'stepup',
    'zorome', 'suroten_dream',
    'gatorian', 'riricia', 'lucifire', 'lucifire_plan',
    'harpina', 'arquel', 'rafiel', 'seraphim'
  ]

  for (const type of hardcodedOrder) {
    const def = HARDCODED_MAP[type]

    // KVでdisabledならスキップ
    if (config?.overrides?.[type]?.enabled === false) continue

    // ハードコードのコード配列
    const baseCodes = def.codes()

    // valid_bonus は特殊処理（金額付き）
    if (type === 'valid_bonus') {
      for (const [code, amount] of Object.entries(VALID_BONUS_CODES)) {
        if (removeSpaces(code) === normalizedInput) {
          return { matched: true, type: 'valid_bonus', code, amount, source: 'hardcoded' }
        }
      }
      continue
    }

    // ハードコードコードでマッチ
    const matched = matchCode(baseCodes, normalizedInput, def.matchMode)
    if (matched) {
      return { matched: true, type, code: matched, successKey: def.successKey, gasType: def.gasType || null, transferAfter: def.transferAfter || false, source: 'hardcoded' }
    }

    // KV追加バリアントでマッチ
    const additionalVariants = config?.overrides?.[type]?.additionalVariants
    if (additionalVariants?.length > 0) {
      const matchedVariant = matchCode(additionalVariants, normalizedInput, def.matchMode)
      if (matchedVariant) {
        return { matched: true, type, code: matchedVariant, successKey: def.successKey, gasType: def.gasType || null, transferAfter: def.transferAfter || false, source: 'hardcoded' }
      }
    }
  }

  return { matched: false }
}
