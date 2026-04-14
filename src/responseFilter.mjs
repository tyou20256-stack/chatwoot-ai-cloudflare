// src/responseFilter.mjs
// 禁止回答フィルタ — LLM出力のポストプロセッシング
// 9カテゴリの禁止パターンをコードレベルでブロック

export const PROHIBITED_CATEGORIES = [
  {
    category: 'other_player_info',
    patterns: [
      /(?:他の|別の|他人の)(?:プレイヤー|ユーザー|お客様)(?:の|は).{0,20}(?:残高|入金|出金|勝ち|負け|アカウント)/i,
    ],
    fallback: '申し訳ございません。他のお客様の情報についてはお答えできません。',
  },
  {
    category: 'internal_odds_rtp',
    patterns: [
      /(?:RTP|還元率|オッズ)(?:を|は).{0,20}(?:操作|変更|調整|コントロール)/i,
      /(?:遠隔|不正|イカサマ).{0,10}(?:ある|ない|して)/i,
    ],
    fallback: '全ゲームは独立した第三者機関により公正性が検証されています。RTPは各ゲームのヘルプ画面でご確認いただけます。',
  },
  {
    category: 'legal_advice',
    patterns: [
      /(?:合法|違法|適法|犯罪|法律違反)(?:です|でしょう|かどうか)/i,
      /(?:逮捕|起訴|罰金|懲役).{0,15}(?:される|ない|ある)/i,
    ],
    fallback: '法的なご質問については、専門の法律家にご相談されることをお勧めいたします。',
  },
  {
    category: 'gambling_advice',
    patterns: [
      /(?:このゲーム|このスロット)(?:は|なら).{0,15}(?:勝てる|稼げる|儲かる)/i,
      /(?:必勝|攻略|勝ち方|稼ぎ方)(?:法|術|テクニック)/i,
    ],
    fallback: 'ギャンブルの結果は完全にランダムであり、勝利を保証する方法はありません。責任あるギャンブルを心がけてください。',
  },
  {
    category: 'internal_business',
    patterns: [
      /(?:売上|利益|収益|利益率|GGR)(?:は|を).{0,15}(?:いくら|教えて)/i,
      /(?:社員|従業員|スタッフ)(?:数|人数|何人)/i,
    ],
    fallback: '運営に関する内部情報はセキュリティ上お答えできません。',
  },
  {
    category: 'competitor_info',
    patterns: [
      /(?:ベラジョン|カジ旅|インターカジノ|ミスティーノ|ボンズ|コニベット|遊雅堂|エルドア|Stake|BC\.Game)/i,
      /(?:他の|別の)(?:カジノ|サイト)(?:より|と比べて|の方が)/i,
    ],
    fallback: '他社サービスについてのご質問にはお答えできません。スロット天国のサービスについてお気軽にお尋ねください。',
  },
  {
    category: 'unconfirmed_promo',
    patterns: [
      /(?:来月|来週|次回|今後)(?:の|は).{0,20}(?:ボーナス|プロモ|キャンペーン)/i,
    ],
    fallback: '今後のプロモーションについては、確定次第サイト上でお知らせいたします。',
  },
  {
    category: 'system_prompt_leak',
    patterns: [
      /(?:システム|内部)(?:プロンプト|指示|設定)/i,
      /(?:ignore|無視).{0,20}(?:instructions?|指示|previous)/i,
      /(?:jailbreak|脱獄|DAN|developer\s*mode)/i,
    ],
    fallback: 'AIの内部設定に関するご質問にはお答えできません。サポートに関するご質問をどうぞ。',
  },
  {
    category: 'personal_data_extraction',
    patterns: [
      /(?:クレジットカード|カード番号|CVV|暗証番号|PIN)/i,
      /(?:パスワード|PW)(?:を|は).{0,10}(?:教えて|送って)/i,
      /(?:マイナンバー|免許証番号|パスポート番号)/i,
    ],
    fallback: 'セキュリティ保護のため、機密情報をチャットでお伝えすることはできません。',
  },
];

export function filterResponse(aiResponse) {
  if (!aiResponse) return { safe: true, response: aiResponse };
  for (const cat of PROHIBITED_CATEGORIES) {
    for (const p of cat.patterns) {
      if (p.test(aiResponse)) {
        return { safe: false, response: cat.fallback, blockedCategory: cat.category };
      }
    }
  }
  return { safe: true, response: aiResponse };
}

export function detectInputThreat(userInput) {
  if (!userInput) return { suspicious: false };
  const threats = [
    { category: 'prompt_injection', patterns: [
      /(?:ignore|disregard|forget).{0,30}(?:instructions?|rules?|prompt)/i,
      /(?:無視|忘れて|無効に).{0,20}(?:指示|ルール|プロンプト)/i,
      /(?:you\s+are\s+now|act\s+as|あなたは今から)/i,
      /(?:DAN|jailbreak|脱獄|developer\s+mode)/i,
    ]},
    { category: 'data_extraction', patterns: [
      /(?:全ユーザー|全プレイヤー)(?:の|リスト|一覧|データ)/i,
      /(?:データベース|DB|SQL)(?:の|を|から).{0,15}(?:取得|ダンプ)/i,
    ]},
  ];
  for (const t of threats) {
    for (const p of t.patterns) {
      if (p.test(userInput)) return { suspicious: true, category: t.category };
    }
  }
  return { suspicious: false };
}
