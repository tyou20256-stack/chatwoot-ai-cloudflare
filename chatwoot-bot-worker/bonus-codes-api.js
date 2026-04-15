// ============================================================================
// ボーナスコード CRUD API（管理画面から動的管理）
// ============================================================================

import {
  STEPUP_BONUS_CODES, VAMOS_BONUS_CODES, AKEOME_BONUS_CODES,
  SPECIAL_CHANCE_CODES, TOKUBETSU_STEP_CODES, TOKUBETSU_HEAVENS_CODES,
  CUSTOM_HEAVENS_CODES, TRIATHLON_CODES, HINAMATSURI_CODES,
  HEAVENS_MISSION_CODES, HEAVENS_WIN_CODES, ELITE_CHALLENGE_CODES,
  WHITE_DAY_CODES, ZOROME_CODES,
  GATORIAN_CODES, RIRICIA_CODES, LUCIFIRE_CODES, LUCIFIRE_PLAN_CODES,
  HARPINA_CODES, ARQUEL_CODES, RAFIEL_CODES, SERAPHIM_CODES,
  SUROTEN_DREAM_CODES,
  VALID_BONUS_CODES, removeSpaces
} from './bonus-codes.js'
import { messages } from './messages.js'

// ハードコードされたボーナスコード定義
const HARDCODED_TYPES = [
  { type: 'valid_bonus', displayName: '金額付きボーナス', codes: Object.keys(VALID_BONUS_CODES), successKey: null, matchMode: 'exact', hasGameSelection: false },
  { type: 'vamos', displayName: 'バモスイボナ', codes: VAMOS_BONUS_CODES, successKey: 'vamos_bonus_success', matchMode: 'exact', hasGameSelection: true },
  { type: 'akeome', displayName: 'あけおめ', codes: AKEOME_BONUS_CODES, successKey: 'akeome_bonus_success', matchMode: 'exact', hasGameSelection: true },
  { type: 'special_chance', displayName: 'スペシャルチャンス', codes: SPECIAL_CHANCE_CODES, successKey: 'special_chance_success', matchMode: 'exact', hasGameSelection: true },
  { type: 'tokubetsu_step', displayName: '特別ステップ', codes: TOKUBETSU_STEP_CODES, successKey: 'tokubetsu_step_success', matchMode: 'exact', hasGameSelection: true },
  { type: 'tokubetsu_heavens', displayName: '特別ヘブンズ', codes: TOKUBETSU_HEAVENS_CODES, successKey: 'tokubetsu_heavens_success', matchMode: 'exact', hasGameSelection: true },
  { type: 'custom_heavens', displayName: 'カスタムヘブンズショット', codes: CUSTOM_HEAVENS_CODES, successKey: 'custom_heavens_success', matchMode: 'exact', hasGameSelection: false },
  { type: 'triathlon', displayName: 'トライアスロン', codes: TRIATHLON_CODES, successKey: 'triathlon_success', matchMode: 'case_insensitive', hasGameSelection: false },
  { type: 'hinamatsuri', displayName: 'ひな祭り', codes: HINAMATSURI_CODES, successKey: 'hinamatsuri_success', matchMode: 'case_insensitive', hasGameSelection: false },
  { type: 'heavens_mission', displayName: 'ヘブンズミッション', codes: HEAVENS_MISSION_CODES, successKey: 'heavens_mission_success', matchMode: 'case_insensitive', hasGameSelection: false },
  { type: 'heavens_win', displayName: 'ヘブンズウィン', codes: HEAVENS_WIN_CODES, successKey: 'heavens_win_success', matchMode: 'case_insensitive', hasGameSelection: false },
  { type: 'elite_challenge', displayName: 'ELITE参加', codes: ELITE_CHALLENGE_CODES, successKey: 'elite_challenge_success', matchMode: 'case_insensitive', hasGameSelection: false },
  { type: 'white_day', displayName: 'ホワイトデー', codes: WHITE_DAY_CODES, successKey: 'white_day_success', matchMode: 'case_insensitive', hasGameSelection: false },
  { type: 'stepup', displayName: 'スペシャルステップ', codes: STEPUP_BONUS_CODES, successKey: 'stepup_success', matchMode: 'exact', hasGameSelection: true },
  { type: 'zorome', displayName: 'ゾロ目チャレンジ', codes: ZOROME_CODES, successKey: 'zorome_success', matchMode: 'case_insensitive', hasGameSelection: false },
  // BC_入学 イベント
  { type: 'gatorian', displayName: 'ゲートリアン (BC_入学)', codes: GATORIAN_CODES, successKey: 'gatorian_success', matchMode: 'case_insensitive', hasGameSelection: false },
  { type: 'riricia', displayName: 'リリシア (BC_入学)', codes: RIRICIA_CODES, successKey: 'riricia_success', matchMode: 'case_insensitive', hasGameSelection: false },
  { type: 'lucifire', displayName: 'ルシフィーレ (BC_入学)', codes: LUCIFIRE_CODES, successKey: 'lucifire_success', matchMode: 'case_insensitive', hasGameSelection: false },
  { type: 'lucifire_plan', displayName: '入学プラン (BC_入学)', codes: LUCIFIRE_PLAN_CODES, successKey: 'lucifire_plan_success', matchMode: 'exact', hasGameSelection: false },
  { type: 'harpina', displayName: 'ハルピナ (BC_入学)', codes: HARPINA_CODES, successKey: 'harpina_success', matchMode: 'case_insensitive', hasGameSelection: false },
  { type: 'arquel', displayName: 'アークエル (BC_入学)', codes: ARQUEL_CODES, successKey: 'arquel_success', matchMode: 'case_insensitive', hasGameSelection: true },
  { type: 'rafiel', displayName: 'ラフィエル (BC_入学)', codes: RAFIEL_CODES, successKey: 'rafiel_success', matchMode: 'case_insensitive', hasGameSelection: false },
  { type: 'seraphim', displayName: 'セレフィム (BC_入学)', codes: SERAPHIM_CODES, successKey: 'seraphim_success', matchMode: 'case_insensitive', hasGameSelection: true },
  // BC_ギルド イベント
  { type: 'suroten_dream', displayName: 'スロ天ドリーム (BC_ギルド)', codes: SUROTEN_DREAM_CODES, successKey: 'suroten_dream_success', matchMode: 'case_insensitive', hasGameSelection: false },
]

export { HARDCODED_TYPES }

// KV設定取得
export async function getConfig(env) {
  try {
    const raw = await env.CHATWOOT_KV.get('bonus-codes-config')
    if (!raw) return { version: 0, overrides: {}, customTypes: [] }
    return JSON.parse(raw)
  } catch (e) {
    console.error('Failed to read bonus-codes-config:', e.message)
    return { version: 0, overrides: {}, customTypes: [] }
  }
}

// KV設定保存（エラーハンドリング付き）
async function saveConfig(env, config) {
  config.version = (config.version || 0) + 1
  config.lastUpdated = new Date().toISOString()
  try {
    await env.CHATWOOT_KV.put('bonus-codes-config', JSON.stringify(config))
  } catch (e) {
    console.error('KV write failed:', e.message)
    throw new Error('設定の保存に失敗しました')
  }
  return config
}

// 監査ログ（CRUD操作を記録）
async function auditLog(env, action, details) {
  try {
    const raw = await env.CHATWOOT_KV.get('audit-log')
    const logs = raw ? JSON.parse(raw) : []
    logs.unshift({ ts: new Date().toISOString(), action, ...details })
    if (logs.length > 200) logs.length = 200
    await env.CHATWOOT_KV.put('audit-log', JSON.stringify(logs))
  } catch (e) { console.error('Audit log failed:', e.message) }
}

// バリデーション: ID形式
function isValidId(id) {
  return typeof id === 'string' && /^[a-z0-9_]+$/.test(id) && id.length >= 1 && id.length <= 50
}

// バリデーション: コード文字列
function isValidCode(code) {
  return typeof code === 'string' && code.length >= 1 && code.length <= 50
}

// バリデーション: matchMode
const VALID_MATCH_MODES = ['exact', 'case_insensitive']
function isValidMatchMode(mode) {
  return VALID_MATCH_MODES.includes(mode)
}

// コード衝突チェック
function checkCodeConflicts(newCodes, matchMode, config, excludeTypeId) {
  const conflicts = []
  const normalize = (str, mode) => {
    const s = removeSpaces(str)
    return mode === 'case_insensitive' ? s.toLowerCase() : s
  }

  for (const code of newCodes) {
    const normalizedNew = normalize(code, matchMode)

    // ハードコードとの衝突
    for (const hc of HARDCODED_TYPES) {
      const allCodes = [...hc.codes]
      const override = config.overrides?.[hc.type]
      if (override?.additionalVariants) allCodes.push(...override.additionalVariants)

      for (const hcCode of allCodes) {
        const normalizedHc = normalize(hcCode, hc.matchMode)
        if (normalizedNew === normalizedHc) {
          conflicts.push({ code, conflictsWith: hc.type, conflictCode: hcCode, source: 'hardcoded' })
        }
      }
    }

    // 他の動的コードとの衝突
    for (const ct of config.customTypes || []) {
      if (ct.id === excludeTypeId) continue
      for (const ctCode of ct.codes) {
        const normalizedCt = normalize(ctCode, ct.matchMode || 'case_insensitive')
        if (normalizedNew === normalizedCt) {
          conflicts.push({ code, conflictsWith: ct.id, conflictCode: ctCode, source: 'dynamic' })
        }
      }
    }
  }

  return conflicts
}

// メニューツリー構築（会話フローの階層構造を生成）
export function buildMenuTree() {
  const visited = new Set()

  function makeNode(key, label) {
    if (!messages[key]) return null
    // 既に展開済みのノードは参照リンクとして表示（ツリー欠落防止）
    if (visited.has(key)) {
      return { key, label, isRef: true, children: [] }
    }
    visited.add(key)

    const msg = messages[key]
    const children = []

    if (Array.isArray(msg.items)) {
      for (const item of msg.items) {
        // グローバルバックリンクをスキップ
        if (item.value === 'welcome_message' || item.value === 'transfer_to_agent') continue
        // 戻るボタンをスキップ（↩️ ⇔️ ↔️）
        if (/[↩⇔↔]/.test(item.title || '')) continue
        if (!messages[item.value]) continue
        const child = makeNode(item.value, item.title)
        if (child) children.push(child)
      }
    }

    return {
      key,
      label,
      contentPreview: (msg.content || '').substring(0, 80),
      content: msg.content,
      itemCount: Array.isArray(msg.items) ? msg.items.length : 0,
      items: msg.items || [],
      flags: {
        handoff_to_gasbot: msg.handoff_to_gasbot || false,
        handoff_to_bank_bot: msg.handoff_to_bank_bot || false,
        handoff_to_ec_bot: msg.handoff_to_ec_bot || false,
        transfer_to_agent: msg.transfer_to_agent || false,
      },
      children,
    }
  }

  // 1. メインメニューツリー（welcome_messageから辿る）
  const mainMenu = makeNode('welcome_message', 'メインメニュー')

  // 2. ボーナスコード応答フロー（*_successキーをルートとして構築）
  const bonusFlows = []
  const allKeys = Object.keys(messages)
  const successKeys = allKeys.filter(k => k.endsWith('_success') && !visited.has(k))
  for (const key of successKeys) {
    if (visited.has(key)) continue
    const msg = messages[key]
    const label = (msg.content || '').split('\n')[0].substring(0, 50) || key
    const node = makeNode(key, label)
    if (node) bonusFlows.push(node)
  }

  // 3. 残りの未訪問キー（テンプレート・その他）
  const other = []
  for (const key of allKeys) {
    if (visited.has(key)) continue
    const msg = messages[key]
    other.push({
      key,
      label: key,
      contentPreview: (msg.content || '').substring(0, 80),
      content: msg.content,
      itemCount: Array.isArray(msg.items) ? msg.items.length : 0,
      items: msg.items || [],
      flags: {
        handoff_to_gasbot: msg.handoff_to_gasbot || false,
        handoff_to_bank_bot: msg.handoff_to_bank_bot || false,
        handoff_to_ec_bot: msg.handoff_to_ec_bot || false,
        transfer_to_agent: msg.transfer_to_agent || false,
      },
      children: [],
    })
  }

  return { mainMenu, bonusFlows, other }
}

// CRUD APIハンドラ
export async function handleBonusCodesAPI(request, url, env, corsHeaders) {
  const method = request.method
  const pathParts = url.pathname.replace('/api/bonus-codes', '').split('/').filter(Boolean)
  const typeId = pathParts[0] || null

  const jsonHeaders = { 'Content-Type': 'application/json', ...corsHeaders }

  // GET /api/bonus-codes — 全コード一覧
  if (method === 'GET' && !typeId) {
    const config = await getConfig(env)

    const merged = HARDCODED_TYPES.map(hc => {
      const override = config.overrides?.[hc.type]
      const additionalVariants = override?.additionalVariants || []
      const enabled = override?.enabled !== undefined ? override.enabled : true
      return {
        type: hc.type,
        displayName: hc.displayName,
        hardcodedCodes: [...hc.codes],
        dynamicCodes: additionalVariants,
        allCodes: [...hc.codes, ...additionalVariants],
        enabled,
        source: 'hardcoded',
        successKey: hc.successKey,
        matchMode: hc.matchMode,
        hasGameSelection: hc.hasGameSelection,
      }
    })

    const custom = (config.customTypes || []).map(ct => ({
      type: ct.id,
      displayName: ct.displayName,
      hardcodedCodes: [],
      dynamicCodes: [...ct.codes],
      allCodes: [...ct.codes],
      enabled: ct.enabled !== false,
      source: 'dynamic',
      matchMode: ct.matchMode || 'case_insensitive',
      hasGameSelection: ct.gameSelection || false,
      successMessage: ct.successMessage,
    }))

    return new Response(JSON.stringify({
      success: true,
      data: [...merged, ...custom],
      version: config.version,
    }), { headers: jsonHeaders })
  }

  // GET /api/bonus-codes/:typeId — 個別取得
  if (method === 'GET' && typeId) {
    const config = await getConfig(env)

    // ハードコードから探す
    const hc = HARDCODED_TYPES.find(h => h.type === typeId)
    if (hc) {
      const override = config.overrides?.[hc.type]
      return new Response(JSON.stringify({
        success: true,
        data: {
          type: hc.type,
          displayName: hc.displayName,
          hardcodedCodes: [...hc.codes],
          dynamicCodes: override?.additionalVariants || [],
          enabled: override?.enabled !== undefined ? override.enabled : true,
          source: 'hardcoded',
          successKey: hc.successKey,
          matchMode: hc.matchMode,
          hasGameSelection: hc.hasGameSelection,
        }
      }), { headers: jsonHeaders })
    }

    // カスタムから探す
    const ct = (config.customTypes || []).find(c => c.id === typeId)
    if (ct) {
      return new Response(JSON.stringify({
        success: true,
        data: {
          type: ct.id,
          displayName: ct.displayName,
          hardcodedCodes: [],
          dynamicCodes: [...ct.codes],
          enabled: ct.enabled !== false,
          source: 'dynamic',
          matchMode: ct.matchMode || 'case_insensitive',
          hasGameSelection: ct.gameSelection || false,
          successMessage: ct.successMessage,
        }
      }), { headers: jsonHeaders })
    }

    return new Response(JSON.stringify({ success: false, error: 'not_found' }), {
      status: 404, headers: jsonHeaders
    })
  }

  // POST /api/bonus-codes — 新規カスタム種別作成
  if (method === 'POST') {
    let body
    try { body = await request.json() } catch (e) {
      return new Response(JSON.stringify({ success: false, error: 'invalid_json' }), {
        status: 400, headers: jsonHeaders
      })
    }

    const errors = []
    if (!body.id || !isValidId(body.id)) errors.push({ field: 'id', message: 'id は英小文字・数字・アンダースコアのみ（1-50文字）' })
    if (!body.displayName || typeof body.displayName !== 'string' || body.displayName.length > 100) errors.push({ field: 'displayName', message: '表示名は1-100文字' })
    if (!Array.isArray(body.codes) || body.codes.length === 0) errors.push({ field: 'codes', message: 'codes は1つ以上の文字列配列' })
    else if (body.codes.some(c => !isValidCode(c))) errors.push({ field: 'codes', message: '各コードは1-50文字' })
    if (!body.successMessage?.content) errors.push({ field: 'successMessage', message: '成功メッセージのcontentは必須' })
    if (body.matchMode && !isValidMatchMode(body.matchMode)) errors.push({ field: 'matchMode', message: 'matchMode は exact または case_insensitive' })
    if (Array.isArray(body.codes) && new Set(body.codes).size !== body.codes.length) errors.push({ field: 'codes', message: 'codes に重複があります' })

    if (errors.length > 0) {
      return new Response(JSON.stringify({ success: false, errors }), {
        status: 400, headers: jsonHeaders
      })
    }

    const config = await getConfig(env)

    // ID重複チェック
    const existsHardcoded = HARDCODED_TYPES.some(h => h.type === body.id)
    const existsCustom = (config.customTypes || []).some(c => c.id === body.id)
    if (existsHardcoded || existsCustom) {
      return new Response(JSON.stringify({ success: false, error: `ID '${body.id}' は既に使用されています` }), {
        status: 409, headers: jsonHeaders
      })
    }

    // コード衝突チェック
    const matchMode = body.matchMode || 'case_insensitive'
    const conflicts = checkCodeConflicts(body.codes, matchMode, config, null)
    if (conflicts.length > 0) {
      return new Response(JSON.stringify({ success: false, error: 'コードが衝突しています', conflicts }), {
        status: 409, headers: jsonHeaders
      })
    }

    const newType = {
      id: body.id,
      displayName: body.displayName,
      codes: [...new Set(body.codes)],
      matchMode,
      successMessage: {
        content: body.successMessage.content,
        items: body.successMessage.items || [{ title: '↩️ メインメニューに戻る', value: 'welcome_message' }],
      },
      gameSelection: body.gameSelection || false,
      enabled: true,
      createdAt: new Date().toISOString(),
    }

    if (!config.customTypes) config.customTypes = []
    config.customTypes.push(newType)
    const saved = await saveConfig(env, config)
    await auditLog(env, 'bonus_create', { typeId: body.id, displayName: body.displayName, codesCount: body.codes.length })

    return new Response(JSON.stringify({ success: true, data: newType, version: saved.version }), {
      status: 201, headers: jsonHeaders
    })
  }

  // PUT /api/bonus-codes/:typeId — 更新
  if (method === 'PUT' && typeId) {
    let body
    try { body = await request.json() } catch (e) {
      return new Response(JSON.stringify({ success: false, error: 'invalid_json' }), {
        status: 400, headers: jsonHeaders
      })
    }

    const config = await getConfig(env)

    // ハードコード種別のオーバーライド
    const hc = HARDCODED_TYPES.find(h => h.type === typeId)
    if (hc) {
      if (!config.overrides) config.overrides = {}
      if (!config.overrides[typeId]) config.overrides[typeId] = { additionalVariants: [], enabled: true }

      // 有効/無効の切替
      if (body.enabled !== undefined) {
        config.overrides[typeId].enabled = Boolean(body.enabled)
      }

      // バリアント追加
      if (body.addVariant && isValidCode(body.addVariant)) {
        const conflicts = checkCodeConflicts([body.addVariant], hc.matchMode, config, null)
        // 自分自身のハードコードとの衝突は許可（同じtype内の追加なので）
        const externalConflicts = conflicts.filter(c => c.conflictsWith !== typeId)
        if (externalConflicts.length > 0) {
          return new Response(JSON.stringify({ success: false, error: 'コードが衝突しています', conflicts: externalConflicts }), {
            status: 409, headers: jsonHeaders
          })
        }
        const variants = config.overrides[typeId].additionalVariants || []
        if (!variants.includes(body.addVariant)) {
          variants.push(body.addVariant)
          config.overrides[typeId].additionalVariants = variants
        }
      }

      // バリアント削除
      if (body.removeVariant) {
        const variants = config.overrides[typeId].additionalVariants || []
        config.overrides[typeId].additionalVariants = variants.filter(v => v !== body.removeVariant)
      }

      const saved = await saveConfig(env, config)
      const auditDetails = { typeId }
      if (body.enabled !== undefined) auditDetails.action_detail = body.enabled ? 'enable' : 'disable'
      if (body.addVariant) auditDetails.action_detail = 'add_variant'
      if (body.removeVariant) auditDetails.action_detail = 'remove_variant'
      await auditLog(env, 'bonus_update', auditDetails)
      return new Response(JSON.stringify({
        success: true,
        data: {
          type: typeId,
          enabled: config.overrides[typeId].enabled,
          additionalVariants: config.overrides[typeId].additionalVariants,
        },
        version: saved.version,
      }), { headers: jsonHeaders })
    }

    // カスタム種別の更新
    const ctIndex = (config.customTypes || []).findIndex(c => c.id === typeId)
    if (ctIndex === -1) {
      return new Response(JSON.stringify({ success: false, error: 'not_found' }), {
        status: 404, headers: jsonHeaders
      })
    }

    const ct = config.customTypes[ctIndex]

    if (body.enabled !== undefined) ct.enabled = Boolean(body.enabled)
    if (body.displayName) ct.displayName = body.displayName
    if (body.successMessage?.content) ct.successMessage = {
      content: body.successMessage.content,
      items: body.successMessage.items || ct.successMessage?.items || [{ title: '↩️ メインメニューに戻る', value: 'welcome_message' }],
    }

    // バリアント追加
    if (body.addVariant && isValidCode(body.addVariant)) {
      const conflicts = checkCodeConflicts([body.addVariant], ct.matchMode || 'case_insensitive', config, typeId)
      if (conflicts.length > 0) {
        return new Response(JSON.stringify({ success: false, error: 'コードが衝突しています', conflicts }), {
          status: 409, headers: jsonHeaders
        })
      }
      if (!ct.codes.includes(body.addVariant)) ct.codes.push(body.addVariant)
    }

    // バリアント削除
    if (body.removeVariant) {
      ct.codes = ct.codes.filter(c => c !== body.removeVariant)
      if (ct.codes.length === 0) {
        return new Response(JSON.stringify({ success: false, error: 'コードは最低1つ必要です' }), {
          status: 400, headers: jsonHeaders
        })
      }
    }

    ct.updatedAt = new Date().toISOString()
    config.customTypes[ctIndex] = ct
    const saved = await saveConfig(env, config)
    const auditDetails = { typeId }
    if (body.enabled !== undefined) auditDetails.action_detail = body.enabled ? 'enable' : 'disable'
    if (body.addVariant) auditDetails.action_detail = 'add_variant'
    if (body.removeVariant) auditDetails.action_detail = 'remove_variant'
    if (body.displayName) auditDetails.action_detail = 'update_name'
    await auditLog(env, 'bonus_update', auditDetails)

    return new Response(JSON.stringify({ success: true, data: ct, version: saved.version }), {
      headers: jsonHeaders
    })
  }

  // DELETE /api/bonus-codes/:typeId — カスタム種別削除
  if (method === 'DELETE' && typeId) {
    // ハードコードは削除不可
    if (HARDCODED_TYPES.some(h => h.type === typeId)) {
      return new Response(JSON.stringify({ success: false, error: 'ハードコード種別は削除できません。無効化してください。' }), {
        status: 400, headers: jsonHeaders
      })
    }

    const config = await getConfig(env)
    const ctIndex = (config.customTypes || []).findIndex(c => c.id === typeId)
    if (ctIndex === -1) {
      return new Response(JSON.stringify({ success: false, error: 'not_found' }), {
        status: 404, headers: jsonHeaders
      })
    }

    const deletedName = config.customTypes[ctIndex].displayName
    config.customTypes.splice(ctIndex, 1)
    const saved = await saveConfig(env, config)
    await auditLog(env, 'bonus_delete', { typeId, displayName: deletedName })

    return new Response(JSON.stringify({ success: true, deleted: typeId, version: saved.version }), {
      headers: jsonHeaders
    })
  }

  return new Response(JSON.stringify({ error: 'method_not_allowed' }), {
    status: 405, headers: jsonHeaders
  })
}

// メニューツリーAPIハンドラ
export async function handleMenusAPI(url, env, corsHeaders) {
  const jsonHeaders = { 'Content-Type': 'application/json', ...corsHeaders }

  const tree = buildMenuTree()

  return new Response(JSON.stringify({
    success: true,
    data: tree,
    totalKeys: Object.keys(messages).length,
  }), { headers: jsonHeaders })
}
