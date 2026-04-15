// ============================================================================
// メッセージ定義（Standard8 v8.21 完全移植）
// 全メニューツリー + ボーナスコード成功画面
// ============================================================================

export const messages = {
  // 1. Welcome Message
  welcome_message: {
    content: 'ご希望の項目をお選びください。',
    items: [
      { title: '💰 入金・出金', value: 'deposit_withdrawal' },
      { title: '🎮 ゲームについて', value: 'game_info' },
      { title: '🎁 ボーナス・プロモ', value: 'bonus_promo' },
      { title: '🆓 入金不要ボーナス', value: 'no_deposit_bonus' },
      { title: '👤 アカウント', value: 'account_issues' },
      { title: '❓ よくある質問(FAQ)', value: 'faq_main' },
      { title: '🎟️ ボーナスコード申請', value: 'bonus_code_request' },
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }
    ]
  },

  // ============================================================================
  // 2. 入金・出金
  // ============================================================================
  deposit_withdrawal: {
    content: '入金・出金についてですね。ご希望の項目をお選びください。',
    items: [
      { title: '🏦 入金の方法', value: 'deposit_methods' },
      { title: '💸 出金の方法', value: 'withdrawal_methods' },
      { title: '😱 トラブルシューティング', value: 'payment_troubleshooting' },
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' }
    ]
  },

  // 2.1. 入金の方法
  deposit_methods: {
    content: 'ご希望の入金方法をお選びください。',
    items: [
      { title: '🏦 PayPayマネー', value: 'paypay_money' },
      { title: '🏦 PayPayマネーライト', value: 'paypay_money_lite' },
      { title: '🏦 銀行振込', value: 'bank_transfer' },
      { title: '🏪 コンビニ入金', value: 'convenience_store_deposit' },
      { title: '🏧 ATM', value: 'atm_deposit' },
      { title: '₿ 仮想通貨', value: 'cryptocurrency' },
      { title: '↩️ 戻る', value: 'deposit_withdrawal' }
    ]
  },

  // 2.1.1. PayPayマネー（GAS BOT連携）
  paypay_money: {
    content: '🏦 PayPayマネーでの入金ですね。\n\nこれより自動案内を開始いたします。\n少々お待ちください。',
    items: [
      { title: '↩️ 入金方法一覧に戻る', value: 'deposit_methods' }
    ],
    handoff_to_gasbot: true,
    payment_method: 'マネー'
  },

  // 2.1.1b. PayPayマネーライト（GAS BOT連携）
  paypay_money_lite: {
    content: '🏦 PayPayマネーライトでの入金ですね。\n\nこれより自動案内を開始いたします。\n少々お待ちください。',
    items: [
      { title: '↩️ 入金方法一覧に戻る', value: 'deposit_methods' }
    ],
    handoff_to_gasbot: true,
    payment_method: 'マネーライト'
  },

  // 2.1.2. 銀行振込（GAS BOT連携）
  bank_transfer: {
    content: '🏦 銀行振込での入金ですね。\n\nこれより自動案内を開始いたします。\n少々お待ちください。',
    items: [
      { title: '↩️ 入金方法一覧に戻る', value: 'deposit_methods' }
    ],
    handoff_to_bank_bot: true
  },

  // 2.1.3. コンビニ入金（EC入金 VPSサーバー連携）
  convenience_store_deposit: {
    content: '🏪 コンビニでの入金ですね。\n\nまず、**スロット天国のアカウントID**（ユーザー名）を入力してください。\n\n例: syt2525m, riv3633, hiromu',
    items: [
      { title: '↩️ 入金方法一覧に戻る', value: 'deposit_methods' }
    ],
    ec_start: true
  },

  ec_amount_range_1: {
    content: '💰 入金額を選択してください（¥10,000 〜 ¥100,000）',
    items: [
      { title: '¥10,000', value: 'ec_amount_10000' },
      { title: '¥20,000', value: 'ec_amount_20000' },
      { title: '¥30,000', value: 'ec_amount_30000' },
      { title: '¥40,000', value: 'ec_amount_40000' },
      { title: '¥50,000', value: 'ec_amount_50000' },
      { title: '¥60,000', value: 'ec_amount_60000' },
      { title: '¥70,000', value: 'ec_amount_70000' },
      { title: '¥80,000', value: 'ec_amount_80000' },
      { title: '¥90,000', value: 'ec_amount_90000' },
      { title: '¥100,000', value: 'ec_amount_100000' },
      { title: '↩️ 戻る', value: 'convenience_store_deposit' }
    ]
  },

  ec_amount_range_2: {
    content: '💰 入金額を選択してください（¥110,000 〜 ¥200,000）',
    items: [
      { title: '¥110,000', value: 'ec_amount_110000' },
      { title: '¥120,000', value: 'ec_amount_120000' },
      { title: '¥130,000', value: 'ec_amount_130000' },
      { title: '¥140,000', value: 'ec_amount_140000' },
      { title: '¥150,000', value: 'ec_amount_150000' },
      { title: '¥160,000', value: 'ec_amount_160000' },
      { title: '¥170,000', value: 'ec_amount_170000' },
      { title: '¥180,000', value: 'ec_amount_180000' },
      { title: '¥190,000', value: 'ec_amount_190000' },
      { title: '¥200,000', value: 'ec_amount_200000' },
      { title: '↩️ 戻る', value: 'convenience_store_deposit' }
    ]
  },

  // 2.1.4. ATM (ユーザー入力必要 → オペレーター転送)
  atm_deposit: {
    content: '🏧 ATMでの入金ですね。\n\nお手続きのため、**ご希望の入金額**をチャットにご入力ください。\n\n入力後、担当者が確認し、マニュアル、振込先、振込人名をお伝えします。',
    items: [
      { title: '↩️ 入金方法一覧に戻る', value: 'deposit_methods' }
    ],
    transfer_to_agent: true
  },

  // 2.1.5. 仮想通貨
  cryptocurrency: {
    content: '₿ 仮想通貨での入金方法\n\nスロット天国の入金ページから簡単に手続きできます。\n\n👉 入金ページはこちら: https://sloten.io/deposit\n\n**手順:**\n1. 上記リンクから入金ページにアクセスします。\n2. 支払い方法で「仮想通貨」を選択します。\n3. ご希望の仮想通貨(Bitcoin、Ethereumなど)を選択します。\n4. 入金額を入力し、「入金申請」ボタンをクリックします。\n5. 表示されたウォレットアドレスまたはQRコードを使用して送金してください。\n\n入金は通常、ブロックチェーン上で確認された後、数分～数時間以内に反映されます。',
    items: [
      { title: '↩️ 入金方法一覧に戻る', value: 'deposit_methods' },
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }
    ]
  },

  // 2.2. 出金の方法
  withdrawal_methods: {
    content: '💸 出金の方法\n\n出金方法によって手続きが異なります。\n\n**自動銀行振込・仮想通貨の場合:**\n👉 出金ページはこちら: https://sloten.io/withdraw\n\n**その他の出金方法(PayPay、銀行(手動)など)の場合:**\nチャットでご希望の出金方法と金額をお伝えください。担当者が手続きをサポートいたします。\n\n✅ スロット天国の強み:\n- **本人確認(KYC)不要**: 面倒な書類提出なしで、スムーズに出金できます！\n- **迅速な処理**: 出金は通常、申請後24時間～72時間以内に処理されます。',
    items: [
      { title: '🏦 自動鋲行振込・仮想通貨で出金', value: 'withdrawal_auto' },
      { title: '💬 その他の方法で出金(チャット対応)', value: 'transfer_to_agent' },
      { title: '↩️ 戻る', value: 'deposit_withdrawal' }
    ]
  },

  // 2.2.1. 自動銀行振込・仮想通貨で出金
  withdrawal_auto: {
    content: '🏦 自動銀行振込・仮想通貨での出金\n\n以下のリンクから出金手続きが可能です。\n\n👉 出金ページ: https://sloten.io/withdraw\n\n**手順:**\n1. 上記リンクから出金ページにアクセス\n2. 出金方法（銀行振込 or 仮想通貨）を選択\n3. 出金額を入力して申請\n\n出金は通常、申請後24時間～72時間以内に処理されます。',
    items: [
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' },
      { title: '↩️ 戻る', value: 'withdrawal_methods' }
    ]
  },

  // 2.3. トラブルシューティング
  payment_troubleshooting: {
    content: '😱 入出金のトラブルですね。\n\nどのような問題でお困りですか？',
    items: [
      { title: '⏳ 入金が反映されない', value: 'deposit_not_reflected' },
      { title: '⏳ 出金が届かない', value: 'withdrawal_not_received' },
      { title: '❌ 入金がキャンセルされた', value: 'deposit_cancelled' },
      { title: '❌ 出金がキャンセルされた', value: 'withdrawal_cancelled' },
      { title: '↩️ 戻る', value: 'deposit_withdrawal' }
    ]
  },

  deposit_not_reflected: {
    content: '⏳ 入金が反映されない場合\n\n**確認事項:**\n1. 入金申請を先に行いましたか？\n2. 正しい口座に振り込みましたか？\n3. 振込名義は正しいですか？\n\n**通常の反映時間:**\n- 銀行振込: 30分～数時間\n- 仮想通貨: 数分～数時間\n\n上記を確認しても解決しない場合は、オペレーターにお問い合わせください。',
    items: [
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' },
      { title: '↩️ 戻る', value: 'payment_troubleshooting' }
    ]
  },

  withdrawal_not_received: {
    content: '⏳ 出金が届かない場合\n\n**確認事項:**\n1. 出金申請のステータスを確認してください\n2. 登録した口座情報は正しいですか？\n\n**通常の処理時間:**\n出金は申請後24時間～72時間以内に処理されます。\n\n上記を確認しても解決しない場合は、オペレーターにお問い合わせください。',
    items: [
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' },
      { title: '↩️ 戻る', value: 'payment_troubleshooting' }
    ]
  },

  deposit_cancelled: {
    content: '❌ 入金がキャンセルされた場合\n\n入金がキャンセルされる主な理由:\n- 入金申請前に振り込んだ\n- 振込名義が異なる\n- 指定された口座以外に振り込んだ\n\n詳細はオペレーターにお問い合わせください。',
    items: [
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' },
      { title: '↩️ 戻る', value: 'payment_troubleshooting' }
    ]
  },

  withdrawal_cancelled: {
    content: '❌ 出金がキャンセルされた場合\n\n出金がキャンセルされる主な理由:\n- 出金条件を満たしていない\n- 登録情報に不備がある\n- ボーナスの出金条件が未達成\n\n詳細はオペレーターにお問い合わせください。',
    items: [
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' },
      { title: '↩️ 戻る', value: 'payment_troubleshooting' }
    ]
  },

  // ============================================================================
  // 3. ゲームについて
  // ============================================================================
  game_info: {
    content: '🎮 ゲームについてですね。\n\nどのようなことをお知りになりたいですか？',
    items: [
      { title: '🎰 ゲームの種類', value: 'game_types' },
      { title: '🔧 ゲームの不具合', value: 'game_issues' },
      { title: '📱 対応デバイス', value: 'supported_devices' },
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' }
    ]
  },

  game_types: {
    content: '🎰 ゲームの種類\n\nスロット天国では以下のゲームをお楽しみいただけます：\n\n**スロット:**\n人気のビデオスロット、クラシックスロット、ジャックポットスロットなど多数！\n\n**ライブカジノ:**\nブラックジャック、ルーレット、バカラなど本格的なライブディーラーゲーム\n\n**パチンコ・パチスロ:**\n日本人向けのパチンコ系ゲームも充実！\n\n**テーブルゲーム:**\nブラックジャック、ルーレット、ポーカーなど\n\n👉 ゲーム一覧はこちら: https://sloten.io/games',
    items: [
      { title: '↩️ 戻る', value: 'game_info' },
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }
    ]
  },

  game_issues: {
    content: '🔧 ゲームの不具合\n\nゲームに不具合が発生した場合は、以下をお試しください：\n\n1. ページを再読み込みする\n2. ブラウザのキャッシュをクリアする\n3. 別のブラウザで試す\n4. インターネット接続を確認する\n\n上記を試しても解決しない場合は、オペレーターにお問い合わせください。\n\nその際、以下の情報をお伝えいただくとスムーズです：\n- ゲーム名\n- 発生した問題の詳細\n- スクリーンショット（可能であれば）',
    items: [
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' },
      { title: '↩️ 戻る', value: 'game_info' }
    ]
  },

  supported_devices: {
    content: '📱 対応デバイス\n\nスロット天国は以下のデバイスでお楽しみいただけます：\n\n**PC:**\n- Windows (Chrome, Firefox, Edge)\n- Mac (Chrome, Firefox, Safari)\n\n**スマートフォン・タブレット:**\n- iPhone / iPad (Safari, Chrome)\n- Android (Chrome)\n\n💡 最新バージョンのブラウザをご使用ください。\nアプリのダウンロードは不要です！',
    items: [
      { title: '↩️ 戻る', value: 'game_info' },
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }
    ]
  },

  // ============================================================================
  // 4. ボーナス・プロモ
  // ============================================================================
  bonus_promo: {
    content: '🎁 ボーナス・プロモーションについてですね。\n\nどのような情報をお探しですか？',
    items: [
      { title: '🎉 現在のプロモーション', value: 'current_promotions' },
      { title: '🎰 ヘブンズ・ステップアップ', value: 'heavens_stepup' },
      { title: '🔄 賭け条件について', value: 'wagering_requirements' },
      { title: '🎟️ ボーナスコード申請', value: 'bonus_code_request' },
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' }
    ]
  },

  current_promotions: {
    content: '🎉 現在のプロモーション\n\n**🌈 Heaven\'s Shot イベント開催中！**\n3倍以上の配当を出すだけで最大200万円の賞金チャンス！\n\n**🎰 ドリームポット（業界初！）**\nロト6と連動したジャックポット！\nプレイするだけで自動的に抽選チケットがもらえます。\n\n**💰 累計11,111人突破記念キャンペーン**\n未入金・入金ゼロの新規登録者様限定！\n入金額に応じてキャッシュをプレゼント！\n\n👉 プロモーション詳細はこちら: https://sloten.io/promotions',
    items: [
      { title: '↩️ 戻る', value: 'bonus_promo' },
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }
    ]
  },

  wagering_requirements: {
    content: '🔄 賭け条件について\n\n賭け条件とは、ボーナスを出金するために必要なプレイ金額のことです。\n\n**例：**\nボーナス3,000円 × 賭け条件30倍 = 90,000円分のプレイが必要\n\n**注意事項:**\n- 賭け条件はボーナスごとに異なります\n- 対象ゲームが限定されている場合があります\n- 賭け条件達成前の出金申請はボーナス没収となる場合があります\n\n詳細は各ボーナスの利用規約をご確認ください。',
    items: [
      { title: '↩️ 戻る', value: 'bonus_promo' },
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }
    ]
  },

  // 4.3. ヘブンズ・ステップアップガチャ
  heavens_stepup: {
    content: '🎰 ヘブンズ・ステップアップガチャ\n\n✨ 初めてご入金されるお客様限定！✨\n非常にお得な限定イベントです！\n\n🎁 今なら参加費4,000円が無料！\nわずか4,000円のボーナスBUYで\n最大**50,000円**の賞金を狙える\n絶好のチャンスです！\n\n✅ 勝利条件: 3倍以上の配当\n📅 賞金付与: 翌日18時より順次\n🎯 賭け条件: 1倍\n\n参加ご希望の方は、担当スタッフが\n丁寧にサポートいたします！',
    items: [
      { title: '🎟️ 参加を希望する', value: 'stepup_apply' },
      { title: '💰 STEP別賞金を見る', value: 'stepup_rewards' },
      { title: '❓ よくある質問', value: 'stepup_faq' },
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' }
    ]
  },

  stepup_apply: {
    content: '🎟️ ステップアップガチャ 参加申請\n\nぜひこの機会に挑戦してみませんか？\n参加方法はとても簡単です！\n\n私が最後までしっかりサポート\nさせていただきますので、ご安心ください。\n\nまずはこちらのボーナスコードを\nチャットに入力してください：\n\n👉 ボーナスコード：『スペシャルステップ』\n\n入力後、担当スタッフが参加手順を\nご案内いたします！',
    items: [
      { title: '↩️ ステップアップに戻る', value: 'heavens_stepup' },
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }
    ]
  },

  stepup_success: {
    content: '✅ ボーナスコード『スペシャルステップ』を\n受け付けました！\n\n🎉 お申込ありがとうございます！\n\n🎰 ヘブンズ・ステップアップ\n　　STEP1 参加費無料特典！\n\n通常参加費￥4,000が無料に！\nボーナスBUY額￥4,000のみで\n￥50,000の賞金に挑戦できます！\n\nまずはアカウント残高を\n確認させてください。\n\n￥4,000以上の残高はありますか？',
    items: [
      { title: '✅ はい、￥4,000以上あります', value: 'stepup_has_balance' },
      { title: '❌ いいえ、￥4,000未満です', value: 'stepup_need_deposit' },
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' }
    ]
  },

  stepup_has_balance: {
    content: '✅ 残高確認ありがとうございます！\n\n次に、ボーナスBUYを行う\n機種を選択してください。\n\n下記のボタンから\nお選びください。',
    items: [
      { title: '🎰 Gates of Olympus', value: 'stepup_game_gates_olympus_og' },
      { title: '🎰 Starlight Princess', value: 'stepup_game_starlight' },
      { title: '🎰 Starlight Princess Christmas', value: 'stepup_game_starlight_xmas' },
      { title: '🎰 Wisdom of Athena', value: 'stepup_game_wisdom' },
      { title: '🎰 Gates of Olympus 1000', value: 'stepup_game_gates_olympus' },
      { title: '🎰 Gates of Gatokaca 1000', value: 'stepup_game_gatokaca' },
      { title: '🎰 Sugar Rush 1000', value: 'stepup_game_sugar_rush_1000' },
      { title: '🎰 Sweet Bonanza 1000', value: 'stepup_game_sweet_bonanza' },
      { title: '🎰 Sugar Rush', value: 'stepup_game_sugar_rush' },
      { title: '🎰 Fruit Party', value: 'stepup_game_fruit_party' }
    ]
  },

  stepup_need_deposit: {
    content: '💰 入金のご案内\n\nSTEP1に参加するには\nボーナスBUY用の￥４,０００が必要です。\n\n参加費は無料なので、\n実質￥４,０００のみで\n￥５０,０００の賞金に挑戦できます！\n\n入金後、「入金完了」ボタンを\n押してください。',
    items: [
      { title: '✅ 入金完了', value: 'stepup_deposit_done' },
      { title: '💳 入金方法を確認', value: 'deposit_methods' },
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' }
    ]
  },

  stepup_deposit_done: {
    content: '✅ 入金ありがとうございます！\n\n次に、ボーナスBUYを行う\n機種を選択してください。\n\n下記のボタンから\nお選びください。',
    items: [
      { title: '🎰 Gates of Olympus', value: 'stepup_game_gates_olympus_og' },
      { title: '🎰 Starlight Princess', value: 'stepup_game_starlight' },
      { title: '🎰 Starlight Princess Christmas', value: 'stepup_game_starlight_xmas' },
      { title: '🎰 Wisdom of Athena', value: 'stepup_game_wisdom' },
      { title: '🎰 Gates of Olympus 1000', value: 'stepup_game_gates_olympus' },
      { title: '🎰 Gates of Gatokaca 1000', value: 'stepup_game_gatokaca' },
      { title: '🎰 Sugar Rush 1000', value: 'stepup_game_sugar_rush_1000' },
      { title: '🎰 Sweet Bonanza 1000', value: 'stepup_game_sweet_bonanza' },
      { title: '🎰 Sugar Rush', value: 'stepup_game_sugar_rush' },
      { title: '🎰 Fruit Party', value: 'stepup_game_fruit_party' }
    ]
  },

  stepup_game_selected: {
    content: '✅ 機種選択ありがとうございます！\n\n🎰 選択機種: {game_name}\n\n担当スタッフがこの後の\n参加手順をご案内いたします。\n\n少々お待ちください✨',
    items: null
  },

  stepup_rewards: {
    content: '💰 STEP別賞金一覧\n\nステップを進めるほど賞金額がUP！\n\n━━━━━━━━━━━━━━━\n【STEP 1】🆓 参加費無料！\n━━━━━━━━━━━━━━━\nボーナスBUY額: ￥4,000\n賞金: **￥50,000**\n\n━━━━━━━━━━━━━━━\n【STEP 2】\n━━━━━━━━━━━━━━━\n参加費: ￥6,000\nボーナスBUY額: ￥6,000\n賞金: **￥100,000**\n\n━━━━━━━━━━━━━━━\n【STEP 3】\n━━━━━━━━━━━━━━━\n参加費: ￥8,000\nボーナスBUY額: ￥8,000\n賞金: **￥150,000**\n\n✅ 勝利条件: BUY額の3倍以上の配当',
    items: [
      { title: '🎟️ 参加を希望する', value: 'stepup_apply' },
      { title: '↩️ ステップアップに戻る', value: 'heavens_stepup' }
    ]
  },

  stepup_faq: {
    content: '❓ ステップアップ よくある質問\n\n◆ 誰でも参加できますか？\n→ 初回入金の方限定です（1人1回限り）\n\n◆ ステップを飛ばして挑戦できますか？\n→ いいえ、STEP1から順番に\n　挑戦していただく必要があります\n\n◆ 賞金はいつ振り込まれますか？\n→ 勝利確定の翌日18時より順次\n　お客様のアカウントへ付与\n\n◆ 参加費とプレイ費用は別ですか？\n→ はい、別です。ただしSTEP1は\n　ボーナスコードで参加費無料！\n　実質BUY額4,000円のみで参加可能\n\n◆ 他のプロモーションと併用できますか？\n→ いいえ、併用不可です',
    items: [
      { title: '🎟️ 参加を希望する', value: 'stepup_apply' },
      { title: '↩️ ステップアップに戻る', value: 'heavens_stepup' },
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }
    ]
  },

  // 4.4. ボーナスコード申請
  bonus_code_request: {
    content: '🎟️ ボーナスコード申請\n\nボーナスコードをお持ちの場合は、このチャットに直接入力してください。\n\n入力後、自動的に申請が受け付けられます。',
    items: [
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' },
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }
    ]
  },

  // ============================================================================
  // 4.5. バモスイボナ ボーナスフロー
  // ============================================================================
  vamos_bonus_success: {
    content: '✅ ボーナスコード『バモスイボナ』を\n受け付けました！\n\n🎉 お申込ありがとうございます！\n\n🌈 Heaven\'s Shot\n　　参加費￥10,000無料特典！\n\nボーナスBUY額￥10,000のみで\n3倍以上の配当を出せば\n20万円の賞金Get！\n\nまずはアカウント残高を\n確認させてください。\n\n￥10,000以上の残高はありますか？',
    items: [
      { title: '✅ はい、￥10,000以上あります', value: 'vamos_has_balance' },
      { title: '❌ いいえ、￥10,000未満です', value: 'vamos_need_deposit' },
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' }
    ]
  },

  vamos_has_balance: {
    content: '✅ 残高確認ありがとうございます！\n\n次に、ボーナスBUYを行う\n機種を選択してください。\n\n下記のボタンから\nお選びください。',
    items: [
      { title: '🎰 Gates of Olympus', value: 'vamos_game_gates_olympus_og' },
      { title: '🎰 Starlight Princess', value: 'vamos_game_starlight' },
      { title: '🎰 Starlight Princess Christmas', value: 'vamos_game_starlight_xmas' },
      { title: '🎰 Wisdom of Athena', value: 'vamos_game_wisdom' },
      { title: '🎰 Gates of Olympus 1000', value: 'vamos_game_gates_olympus' },
      { title: '🎰 Gates of Gatokaca 1000', value: 'vamos_game_gatokaca' },
      { title: '🎰 Sugar Rush 1000', value: 'vamos_game_sugar_rush_1000' },
      { title: '🎰 Sweet Bonanza 1000', value: 'vamos_game_sweet_bonanza' },
      { title: '🎰 Sugar Rush', value: 'vamos_game_sugar_rush' },
      { title: '🎰 Fruit Party', value: 'vamos_game_fruit_party' }
    ]
  },

  vamos_need_deposit: {
    content: '💰 入金のご案内\n\nHeaven\'s Shotに参加するには\nボーナスBUY用の￥１０,０００が必要です。\n\n参加費は無料なので、\n実質￥１０,０００のみで\n２０万円の賞金に挑戦できます！\n\n入金後、「入金完了」ボタンを\n押してください。',
    items: [
      { title: '✅ 入金完了', value: 'vamos_deposit_done' },
      { title: '💳 入金方法を確認', value: 'deposit_methods' },
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' }
    ]
  },

  vamos_deposit_done: {
    content: '✅ 入金ありがとうございます！\n\n次に、ボーナスBUYを行う\n機種を選択してください。\n\n下記のボタンから\nお選びください。',
    items: [
      { title: '🎰 Gates of Olympus', value: 'vamos_game_gates_olympus_og' },
      { title: '🎰 Starlight Princess', value: 'vamos_game_starlight' },
      { title: '🎰 Starlight Princess Christmas', value: 'vamos_game_starlight_xmas' },
      { title: '🎰 Wisdom of Athena', value: 'vamos_game_wisdom' },
      { title: '🎰 Gates of Olympus 1000', value: 'vamos_game_gates_olympus' },
      { title: '🎰 Gates of Gatokaca 1000', value: 'vamos_game_gatokaca' },
      { title: '🎰 Sugar Rush 1000', value: 'vamos_game_sugar_rush_1000' },
      { title: '🎰 Sweet Bonanza 1000', value: 'vamos_game_sweet_bonanza' },
      { title: '🎰 Sugar Rush', value: 'vamos_game_sugar_rush' },
      { title: '🎰 Fruit Party', value: 'vamos_game_fruit_party' }
    ]
  },

  vamos_game_selected: {
    content: '✅ 機種選択ありがとうございます！\n\n🎰 選択機種: {game_name}\n\n担当スタッフがこの後の\n参加手順をご案内いたします。\n\n少々お待ちください✨',
    items: null
  },

  // ============================================================================
  // 4.6. あけおめ ボーナスフロー
  // ============================================================================
  akeome_bonus_success: {
    content: '✅ ボーナスコード『あけおめ』を\n受け付けました！\n\n🎍 あけましておめでとうございます！\n\n🌈 Heaven\'s Shot\n　　参加費￥10,000無料特典！\n\nボーナスBUY額￥10,000のみで\n3倍以上の配当を出せば\n20万円の賞金Get！\n\nまずはアカウント残高を\n確認させてください。\n\n￥10,000以上の残高はありますか？',
    items: [
      { title: '✅ はい、￥10,000以上あります', value: 'akeome_has_balance' },
      { title: '❌ いいえ、￥10,000未満です', value: 'akeome_need_deposit' },
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' }
    ]
  },

  akeome_has_balance: {
    content: '✅ 残高確認ありがとうございます！\n\n次に、ボーナスBUYを行う\n機種を選択してください。\n\n下記のボタンから\nお選びください。',
    items: [
      { title: '🎰 Gates of Olympus', value: 'akeome_game_gates_olympus_og' },
      { title: '🎰 Starlight Princess', value: 'akeome_game_starlight' },
      { title: '🎰 Starlight Princess Christmas', value: 'akeome_game_starlight_xmas' },
      { title: '🎰 Wisdom of Athena', value: 'akeome_game_wisdom' },
      { title: '🎰 Gates of Olympus 1000', value: 'akeome_game_gates_olympus' },
      { title: '🎰 Gates of Gatokaca 1000', value: 'akeome_game_gatokaca' },
      { title: '🎰 Sugar Rush 1000', value: 'akeome_game_sugar_rush_1000' },
      { title: '🎰 Sweet Bonanza 1000', value: 'akeome_game_sweet_bonanza' },
      { title: '🎰 Sugar Rush', value: 'akeome_game_sugar_rush' },
      { title: '🎰 Fruit Party', value: 'akeome_game_fruit_party' }
    ]
  },

  akeome_need_deposit: {
    content: '💰 入金のご案内\n\nHeaven\'s Shotに参加するには\nボーナスBUY用の￥１０,０００が必要です。\n\n参加費は無料なので、\n実質￥１０,０００のみで\n２０万円の賞金に挑戦できます！\n\n入金後、「入金完了」ボタンを\n押してください。',
    items: [
      { title: '✅ 入金完了', value: 'akeome_deposit_done' },
      { title: '💳 入金方法を確認', value: 'deposit_methods' },
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' }
    ]
  },

  akeome_deposit_done: {
    content: '✅ 入金ありがとうございます！\n\n次に、ボーナスBUYを行う\n機種を選択してください。\n\n下記のボタンから\nお選びください。',
    items: [
      { title: '🎰 Gates of Olympus', value: 'akeome_game_gates_olympus_og' },
      { title: '🎰 Starlight Princess', value: 'akeome_game_starlight' },
      { title: '🎰 Starlight Princess Christmas', value: 'akeome_game_starlight_xmas' },
      { title: '🎰 Wisdom of Athena', value: 'akeome_game_wisdom' },
      { title: '🎰 Gates of Olympus 1000', value: 'akeome_game_gates_olympus' },
      { title: '🎰 Gates of Gatokaca 1000', value: 'akeome_game_gatokaca' },
      { title: '🎰 Sugar Rush 1000', value: 'akeome_game_sugar_rush_1000' },
      { title: '🎰 Sweet Bonanza 1000', value: 'akeome_game_sweet_bonanza' },
      { title: '🎰 Sugar Rush', value: 'akeome_game_sugar_rush' },
      { title: '🎰 Fruit Party', value: 'akeome_game_fruit_party' }
    ]
  },

  akeome_game_selected: {
    content: '✅ 機種選択ありがとうございます！\n\n🎰 選択機種: {game_name}\n\n担当スタッフがこの後の\n参加手順をご案内いたします。\n\n少々お待ちください✨',
    items: null
  },

  // ============================================================================
  // 4.7. スペシャルチャンス ボーナスフロー
  // ============================================================================
  special_chance_success: {
    content: '✅ ボーナスコード『スペシャルチャンス』を\n受け付けました！\n\n🎉 お申込ありがとうございます！\n\n🎰 ヘブンズ・ステップアップ\n　　STEP1 参加費無料特典！\n\n通常参加費￥4,000が無料に！\nボーナスBUY額￥4,000のみで\n￥50,000の賞金に挑戦できます！\n\nまずはアカウント残高を\n確認させてください。\n\n￥4,000以上の残高はありますか？',
    items: [
      { title: '✅ はい、￥4,000以上あります', value: 'special_chance_has_balance' },
      { title: '❌ いいえ、￥4,000未満です', value: 'special_chance_need_deposit' },
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' }
    ]
  },

  special_chance_has_balance: {
    content: '✅ 残高確認ありがとうございます！\n\n次に、ボーナスBUYを行う\n機種を選択してください。\n\n下記のボタンから\nお選びください。',
    items: [
      { title: '🎰 Gates of Olympus', value: 'special_chance_game_gates_olympus_og' },
      { title: '🎰 Starlight Princess', value: 'special_chance_game_starlight' },
      { title: '🎰 Starlight Princess Christmas', value: 'special_chance_game_starlight_xmas' },
      { title: '🎰 Wisdom of Athena', value: 'special_chance_game_wisdom' },
      { title: '🎰 Gates of Olympus 1000', value: 'special_chance_game_gates_olympus' },
      { title: '🎰 Gates of Gatokaca 1000', value: 'special_chance_game_gatokaca' },
      { title: '🎰 Sugar Rush 1000', value: 'special_chance_game_sugar_rush_1000' },
      { title: '🎰 Sweet Bonanza 1000', value: 'special_chance_game_sweet_bonanza' },
      { title: '🎰 Sugar Rush', value: 'special_chance_game_sugar_rush' },
      { title: '🎰 Fruit Party', value: 'special_chance_game_fruit_party' }
    ]
  },

  special_chance_need_deposit: {
    content: '💰 入金のご案内\n\nSTEP1に参加するには\nボーナスBUY用の￥４,０００が必要です。\n\n参加費は無料なので、\n実質￥４,０００のみで\n￥５０,０００の賞金に挑戦できます！\n\n入金後、「入金完了」ボタンを\n押してください。',
    items: [
      { title: '✅ 入金完了', value: 'special_chance_deposit_done' },
      { title: '💳 入金方法を確認', value: 'deposit_methods' },
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' }
    ]
  },

  special_chance_deposit_done: {
    content: '✅ 入金ありがとうございます！\n\n次に、ボーナスBUYを行う\n機種を選択してください。\n\n下記のボタンから\nお選びください。',
    items: [
      { title: '🎰 Gates of Olympus', value: 'special_chance_game_gates_olympus_og' },
      { title: '🎰 Starlight Princess', value: 'special_chance_game_starlight' },
      { title: '🎰 Starlight Princess Christmas', value: 'special_chance_game_starlight_xmas' },
      { title: '🎰 Wisdom of Athena', value: 'special_chance_game_wisdom' },
      { title: '🎰 Gates of Olympus 1000', value: 'special_chance_game_gates_olympus' },
      { title: '🎰 Gates of Gatokaca 1000', value: 'special_chance_game_gatokaca' },
      { title: '🎰 Sugar Rush 1000', value: 'special_chance_game_sugar_rush_1000' },
      { title: '🎰 Sweet Bonanza 1000', value: 'special_chance_game_sweet_bonanza' },
      { title: '🎰 Sugar Rush', value: 'special_chance_game_sugar_rush' },
      { title: '🎰 Fruit Party', value: 'special_chance_game_fruit_party' }
    ]
  },

  special_chance_game_selected: {
    content: '✅ 機種選択ありがとうございます！\n\n🎰 選択機種: {game_name}\n\n担当スタッフがこの後の\n参加手順をご案内いたします。\n\n少々お待ちください✨',
    items: null
  },

  // ============================================================================
  // 4.8. 特別ステップ ボーナスフロー
  // ============================================================================
  tokubetsu_step_success: {
    content: '✅ ボーナスコード『特別ステップ』を\n受け付けました！\n\n🎉 お申込ありがとうございます！\n\n🎰 ヘブンズ・ステップアップ\n　　参加費￥4,000無料特典！\n\nボーナスBUY額￥4,000のみで\n3倍以上の配当を出せば\n50,000円の賞金Get！\n\nまずはアカウント残高を\n確認させてください。\n\n￥4,000以上の残高はありますか？',
    items: [
      { title: '✅ はい、￥4,000以上あります', value: 'tokubetsu_step_has_balance' },
      { title: '❌ いいえ、￥4,000未満です', value: 'tokubetsu_step_need_deposit' },
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' }
    ]
  },

  tokubetsu_step_has_balance: {
    content: '✅ 残高確認ありがとうございます！\n\n次に、ボーナスBUYを行う\n機種を選択してください。\n\n下記のボタンから\nお選びください。',
    items: [
      { title: '🎰 Gates of Olympus', value: 'tokubetsu_step_game_gates_olympus_og' },
      { title: '🎰 Starlight Princess', value: 'tokubetsu_step_game_starlight' },
      { title: '🎰 Starlight Princess Christmas', value: 'tokubetsu_step_game_starlight_xmas' },
      { title: '🎰 Wisdom of Athena', value: 'tokubetsu_step_game_wisdom' },
      { title: '🎰 Gates of Olympus 1000', value: 'tokubetsu_step_game_gates_olympus' },
      { title: '🎰 Gates of Gatokaca 1000', value: 'tokubetsu_step_game_gatokaca' },
      { title: '🎰 Sugar Rush 1000', value: 'tokubetsu_step_game_sugar_rush_1000' },
      { title: '🎰 Sweet Bonanza 1000', value: 'tokubetsu_step_game_sweet_bonanza' },
      { title: '🎰 Sugar Rush', value: 'tokubetsu_step_game_sugar_rush' },
      { title: '🎰 Fruit Party', value: 'tokubetsu_step_game_fruit_party' }
    ]
  },

  tokubetsu_step_need_deposit: {
    content: '💰 入金のご案内\n\nステップアップに参加するには\nボーナスBUY用の￥４,０００が必要です。\n\n参加費は無料なので、\n実質￥４,０００のみで\n￥５０,０００の賞金に挑戦できます！\n\n入金後、「入金完了」ボタンを\n押してください。',
    items: [
      { title: '✅ 入金完了', value: 'tokubetsu_step_deposit_done' },
      { title: '💳 入金方法を確認', value: 'deposit_methods' },
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' }
    ]
  },

  tokubetsu_step_deposit_done: {
    content: '✅ 入金ありがとうございます！\n\n次に、ボーナスBUYを行う\n機種を選択してください。\n\n下記のボタンから\nお選びください。',
    items: [
      { title: '🎰 Gates of Olympus', value: 'tokubetsu_step_game_gates_olympus_og' },
      { title: '🎰 Starlight Princess', value: 'tokubetsu_step_game_starlight' },
      { title: '🎰 Starlight Princess Christmas', value: 'tokubetsu_step_game_starlight_xmas' },
      { title: '🎰 Wisdom of Athena', value: 'tokubetsu_step_game_wisdom' },
      { title: '🎰 Gates of Olympus 1000', value: 'tokubetsu_step_game_gates_olympus' },
      { title: '🎰 Gates of Gatokaca 1000', value: 'tokubetsu_step_game_gatokaca' },
      { title: '🎰 Sugar Rush 1000', value: 'tokubetsu_step_game_sugar_rush_1000' },
      { title: '🎰 Sweet Bonanza 1000', value: 'tokubetsu_step_game_sweet_bonanza' },
      { title: '🎰 Sugar Rush', value: 'tokubetsu_step_game_sugar_rush' },
      { title: '🎰 Fruit Party', value: 'tokubetsu_step_game_fruit_party' }
    ]
  },

  tokubetsu_step_game_selected: {
    content: '✅ 機種選択ありがとうございます！\n\n🎰 選択機種: {game_name}\n💰 参加費: 無料（通常￥４,０００）\n🎯 ボーナスBUY額: ￥４,０００\n🏆 賞金: ￥５０,０００\n\n担当スタッフがこの後の\n参加手順をご案内いたします。\n\n少々お待ちください✨',
    items: null
  },

  // ============================================================================
  // 4.9. 特別ヘブンズ ボーナスフロー
  // ============================================================================
  tokubetsu_heavens_success: {
    content: '✅ ボーナスコード『特別ヘブンズ』を\n受け付けました！\n\n🎉 お申込ありがとうございます！\n\n🌈 Heaven\'s Shot\n　　参加費￥10,000無料特典！\n\nボーナスBUY額￥10,000のみで\n3倍以上の配当を出せば\n20万円の賞金Get！\n\nまずはアカウント残高を\n確認させてください。\n\n￥10,000以上の残高はありますか？',
    items: [
      { title: '✅ はい、￥10,000以上あります', value: 'tokubetsu_heavens_has_balance' },
      { title: '❌ いいえ、￥10,000未満です', value: 'tokubetsu_heavens_need_deposit' },
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' }
    ]
  },

  tokubetsu_heavens_has_balance: {
    content: '✅ 残高確認ありがとうございます！\n\n次に、ボーナスBUYを行う\n機種を選択してください。\n\n下記のボタンから\nお選びください。',
    items: [
      { title: '🎰 Gates of Olympus', value: 'tokubetsu_heavens_game_gates_olympus_og' },
      { title: '🎰 Starlight Princess', value: 'tokubetsu_heavens_game_starlight' },
      { title: '🎰 Starlight Princess Christmas', value: 'tokubetsu_heavens_game_starlight_xmas' },
      { title: '🎰 Wisdom of Athena', value: 'tokubetsu_heavens_game_wisdom' },
      { title: '🎰 Gates of Olympus 1000', value: 'tokubetsu_heavens_game_gates_olympus' },
      { title: '🎰 Gates of Gatokaca 1000', value: 'tokubetsu_heavens_game_gatokaca' },
      { title: '🎰 Sugar Rush 1000', value: 'tokubetsu_heavens_game_sugar_rush_1000' },
      { title: '🎰 Sweet Bonanza 1000', value: 'tokubetsu_heavens_game_sweet_bonanza' },
      { title: '🎰 Sugar Rush', value: 'tokubetsu_heavens_game_sugar_rush' },
      { title: '🎰 Fruit Party', value: 'tokubetsu_heavens_game_fruit_party' }
    ]
  },

  tokubetsu_heavens_need_deposit: {
    content: '💰 入金のご案内\n\nHeaven\'s Shotに参加するには\nボーナスBUY用の￥１０,０００が必要です。\n\n参加費は無料なので、\n実質￥１０,０００のみで\n２０万円の賞金に挑戦できます！\n\n入金後、「入金完了」ボタンを\n押してください。',
    items: [
      { title: '✅ 入金完了', value: 'tokubetsu_heavens_deposit_done' },
      { title: '💳 入金方法を確認', value: 'deposit_methods' },
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' }
    ]
  },

  tokubetsu_heavens_deposit_done: {
    content: '✅ 入金ありがとうございます！\n\n次に、ボーナスBUYを行う\n機種を選択してください。\n\n下記のボタンから\nお選びください。',
    items: [
      { title: '🎰 Gates of Olympus', value: 'tokubetsu_heavens_game_gates_olympus_og' },
      { title: '🎰 Starlight Princess', value: 'tokubetsu_heavens_game_starlight' },
      { title: '🎰 Starlight Princess Christmas', value: 'tokubetsu_heavens_game_starlight_xmas' },
      { title: '🎰 Wisdom of Athena', value: 'tokubetsu_heavens_game_wisdom' },
      { title: '🎰 Gates of Olympus 1000', value: 'tokubetsu_heavens_game_gates_olympus' },
      { title: '🎰 Gates of Gatokaca 1000', value: 'tokubetsu_heavens_game_gatokaca' },
      { title: '🎰 Sugar Rush 1000', value: 'tokubetsu_heavens_game_sugar_rush_1000' },
      { title: '🎰 Sweet Bonanza 1000', value: 'tokubetsu_heavens_game_sweet_bonanza' },
      { title: '🎰 Sugar Rush', value: 'tokubetsu_heavens_game_sugar_rush' },
      { title: '🎰 Fruit Party', value: 'tokubetsu_heavens_game_fruit_party' }
    ]
  },

  tokubetsu_heavens_game_selected: {
    content: '✅ 機種選択ありがとうございます！\n\n🎰 選択機種: {game_name}\n💰 参加費: 無料（通常￥１０,０００）\n🎯 ボーナスBUY額: ￥１０,０００\n🏆 賞金: ￥２００,０００\n\n担当スタッフがこの後の\n参加手順をご案内いたします。\n\n少々お待ちください✨',
    items: null
  },

  // ============================================================================
  // 4.10. カスタムヘブンズショット
  // ============================================================================
  custom_heavens_success: {
    content: '✅ ボーナスコード\n『カスタムヘブンズショット』を\n受け付けました！\n\n🎉 お申込ありがとうございます！\n\n🌟 カスタムヘブンズショット\n\n勝利条件と受け取り方法を\n自由に選択できる\nあなただけのヘブンズショット！\n\n👉 シミュレーターはこちら\nhttps://customheavensshot.slomanga.com/\n\n上記URLをタップして\nシミュレーターを開いてください。\n\n【設定手順】\n1️⃣ BUY額を選択\n2️⃣ 勝利条件を選択\n3️⃣ 受け取り方法を選択\n4️⃣ 機種を選択\n5️⃣ 「条件をコピー」をタップ\n\nコピーした条件を\nこのチャットに貼り付けてください。',
    items: [
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' },
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }
    ]
  },

  custom_heavens_simulator: {
    content: '📊 シミュレーターの使い方\n\n下記のリンクから\nシミュレーターを開いてください。\n\n👉 https://customheavensshot.slomanga.com/\n\n【設定手順】\n1️⃣ BUY額を選択\n　￥10,000～￥100,000\n\n2️⃣ 勝利条件を選択\n　・3倍以上 → 20倍賞金\n　・5倍以上 → 30倍賞金\n　・7倍以上 → 40倍賞金\n　・10倍以上 → 60倍賞金\n\n3️⃣ 受け取り方法を選択\n　・一括: 100%\n　・2分割: 125%\n　・4分割: 150%（最もお得！）\n\n4️⃣ 機種を選択\n\n5️⃣ 「条件をコピー」ボタンをクリック\n\nコピーした条件を\nこのチャットに貼り付けてください。',
    items: [
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' },
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }
    ]
  },

  custom_heavens_condition_received: {
    content: '✅ 条件を受け付けました！\n\n{condition_text}\n\n担当スタッフが確認後、\n参加手順をご案内いたします。\n\n少々お待ちください✨\n\n※参加条件に合わせた残高が\n　必要となります。',
    items: null
  },

  // ============================================================================
  // 4.18. トライアスロン
  // ============================================================================
  triathlon_success: {
    content: '🌈 Heaven Road イベント参加承認\nボーナスコード『トライアスロン』を\n受け付けました。\n天国への道に挑戦できます！\n\n📅 イベント期間\n2024年2月24日 ～ 2月28日\n\n━━━━━━━━━━━━━━━\n🛑【重要：終了報告必須】\n━━━━━━━━━━━━━━━\nチャレンジ終了後は、必ずchatへ\n終了ステージをご連絡ください。\n\n▼送信テンプレ\nーーーーーーー\nステージ○で終了\nーーーーーーー\n\n※ご連絡がない場合、特典付与\n対象外となる可能性がございます。\n\n確認後、対象の方へ\n3/1 12:00～順次報酬付与いたします。\n\n⚠️【基本ルール】\n・失敗時の再挑戦不可\n・各ステージクリア後、途中終了可能\n・報酬の賭け条件は1倍\n\n【BET制限】\nStage 1：最大5,000円\nStage 2：最低5,000円\nStage 3：WISDOM OF ATHENA 1000\n／FS購入額6,000円固定\n\n📖 イベント詳細\nhttps://heavensroad.slomanga.com/\n\n最終報酬¥300,000を目指して\n頑張ってください！🏆',
    items: [
      { title: '↔️ メインメニューに戻る', value: 'welcome_message' },
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }
    ]
  },

  // 4.20. ひな祭り
  hinamatsuri_success: {
    content: '🌸✨ 「ひな祭り」ボーナスコードの\nご申請ありがとうございます！ ✨🌸\n\n本キャンペーンの参加条件は\n以下の通りです🎎\n\n🎯 参加方法（4ステップ）\n① 毎日00:00にTelegramで発表される\n　対象スロットをチェック👀✨\n📢 対象機種の発表はこちら\n👉 https://t.me/slotheaven\n② 当日中に3,000円以上のご入金💰\n③ ご入金後、ボーナスコード\n　「ひな祭り」をサイト内チャットへ\n　送信📩\n④ 発表された対象スロットで\n　プレイ🎰🔥\n\n🎁✨ 特典内容 ✨🎁\n対象スロットにて\n【🎰30フリースピン🎰】をプレゼント！\n⏰ 有効期限：付与から48時間\n🏆 賭け条件：10倍\n\n🏆🌸 ひな壇コンプリートボーナス 🌸🏆\n3日間すべてご参加いただいた方へ、\n🎁✨ 特別ボーナスを3月7日に\n付与いたします。\n詳細は3月3日終了後に発表予定です。\n\n📖 イベント詳細はこちら\n👉 https://hinamatsuri.slotenpromotion.com/\n\nまだご入金がお済みでない場合は、\n当日中に3,000円以上のご入金を\nお願いいたします💡\nご入金完了後に、改めて\n「ひな祭り」とチャットへ\nお送りください📩\n確認後、フリースピンを\n付与させていただきます✨',
    items: [
      { title: '⇔️ メインメニューに戻る', value: 'welcome_message' },
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }
    ]
  },

  // 4.21. ヘブンズミッション
  heavens_mission_success: {
    content: '🎉 ボーナスコード『ヘブンズミッション』を受け付けました！ 🎉\nHEAVEN\'S MISSIONへのご参加ありがとうございます✨\nいよいよミッションスタートです🔥\n📅 本イベントは10日間連続のスタンプラリー形式！\n毎日異なるミッションに挑戦し、達成コードを集めて豪華報酬を目指しましょう💰\n開催期間：3/1 00:00～3/10 23:59\n📝 本日のミッション達成後は、\nこのchatへ「終了報告」をお送りください。\n例）Day1 終了\n確認後、達成コードをお渡しいたします🎫\n🔗 イベント詳細・入力ページはこちら\nhttps://mission.slomanga.com/\n🎁 【特典付与について】\nステージ達成特典は\n3/11 12:00～順次付与予定 となります。\nご不明点がございましたらいつでもご連絡ください😊\nそれでは、本日のミッションに挑戦してください！ 🎮🔥',
    items: [
      { title: '⇔️ メインメニューに戻る', value: 'welcome_message' },
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }
    ]
  },

  // 4.22. ヘブンズウィン
  heavens_win_success: {
    content: 'ボーナスコード『ヘブンズウィン』の申請完了！🎉\n🕊 勝った週は、利益の5％を自動還元！\n毎週のスロット利益に応じて【5％】をボーナスポイントでプレゼント。\n申請不要・自動付与でラクラク受け取り✨\n🎯 プロモーション概要\n対象：全スロット（パチスロ・ビデオスロット）\n集計：毎週 月曜0:00～日曜23:59\n付与：翌週月曜中に反映\n賭け条件：1倍のみ\n参加条件：週間ベット合計 ￥10,000以上\n📝 参加方法\n① 申請完了（済）\n② スロットをプレイ🎰\n③ 勝った週は翌週ボーナスGET🎁\n※ご入金後のプレイが対象です\n🔎 詳細はこちら\nhttps://heavenswin.slotenpromotion.com/\n🕊 勝つほど積み上がる、天国級リワード。\n今週の幸運を。',
    items: [
      { title: '⇔️ メインメニューに戻る', value: 'welcome_message' },
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }
    ]
  },

  // 4.23. ELITE参加
  elite_challenge_success: {
    content: 'ボーナスコード『✨ELITE参加✨』の申請を受け付けました！🎉🔥\nELITE CHALLENGEへようこそ 💎👑\n本気のプレイヤーだけが挑める――\n3日間限定・超豪華チャレンジ開幕です 🚀🔥\n━━━━━━━━━━━━━━━\n🎯《参加方法｜簡単3ステップ》\n━━━━━━━━━━━━━━━\n① 仮想通貨でご入金 💰\n② チャットで「ELITE参加」と送信 ✉️（申請完了✅）\n③ 参加表明後3日間の【スロット🎰・バカラ🃏合計ベット額】で勝負🔥\n━━━━━━━━━━━━━━━\n💰《達成報酬一覧》豪華特典🎁\n━━━━━━━━━━━━━━━\n💎 合計 ￥3,000,000\n🎟 Heaven\'s SHOT 1万円コース 無料チケット ×1\n💎 合計 ￥5,000,000\n🎟 無料チケット ×2\n💎 合計 ￥10,000,000\n🎟 無料チケット ×3\n＋ 💸 特別リベート\n※報酬は【3月12日 12:00～】順次付与⏰\n━━━━━━━━━━━━━━━\n🎟《チケットご利用方法》\n━━━━━━━━━━━━━━━\nELITE達成後、3月12日以降に\n「ヘブンショットELITE達成」と送信📩\n📅 有効期限：3月31日まで\n━━━━━━━━━━━━━━━\n🔎 イベント詳細はこちら\n👉 https://elite-challenge.slotenpromotion.com/\n※未入金の場合は、ご入金確認後にチャレンジ開始となります💡\n🔥 3日間で頂点へ。\n💎 あなたの本気を、ここで証明してください。',
    items: [
      { title: '⇔️ メインメニューに戻る', value: 'welcome_message' },
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }
    ]
  },

  // 4.24. ホワイトデー
  white_day_success: {
    content: '🎁 ホワイトデー・お返しチャレンジへのご参加ありがとうございます！\nボーナスコード\n✨「ホワイトデー」✨ を確認しました。\n2月のプレイ実績に応じたティア条件を達成すると、キャッシュをプレゼント🎁\n📌 条件（3月14日限定）\n🥉 ブロンズ\n入金 ￥5,000以上 / ベット ￥15,000以上 → ￥500\n🥈 シルバー\n入金 ￥10,000以上 / ベット ￥50,000以上 → ￥1,500\n🥇 ゴールド\n入金 ￥20,000以上 / ベット ￥100,000以上 → ￥3,000\n※キャッシュ賭け条件：1倍\n📅 対象期間\n3月14日 00:00〜23:59\n💰 キャッシュ付与\n3月15日 12:00〜順次付与\n入金＆ベット条件を達成すると自動で対象となります。\nご不明点があればお気軽にチャットまでお問い合わせください✨\nホワイトデー限定チャレンジをぜひお楽しみください！ 🎰',
    items: [
      { title: '⇔️ メインメニューに戻る', value: 'welcome_message' },
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }
    ]
  },

  // ============================================================================
  // BC_ギルド イベント
  // ============================================================================
  suroten_dream_success: {
    content: 'ボーナスコード「スロ天ドリーム」の申請を受け付けました！🎉✨\n\n現在、サポートにて内容の確認を行っております🔍\n恐れ入りますが、チャットを閉じずにこのまま少々お待ちくださいませ🙇‍♂️💬\n\n確認が取れ次第、対象の方にはドリームチケットの付与を行わせていただきます🎫✨\n付与が完了いたしましたら、改めてこちらのチャットにてご案内させていただきますのでご安心ください😊',
    items: [
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' },
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }
    ]
  },

  // ============================================================================
  // ゾロ目チャレンジ
  // ============================================================================
  zorome_success: {
    content: '🌸「スロット天国 ゾロ目チャレンジ」へようこそ！ 🌸\nボーナスコード「ゾロ目チャレンジ」を確認しました！\nご参加ありがとうございます 😊✨\n\n📅 開催期間\n🗓 4月7日(月) 〜 4/21(月)\n\nキャンペーンの詳細やルールは、\nこちらのページからご確認ください👇\n🔗 https://slotenpromotion.com/zoromechallenge/\n\n⚠️ 注意事項\nこのイベントは【ボーナスコード申請 → 入金 → BUY】の順序が必要です。\n※最低入金額10,000円～、ボーナス購入2,000円以上が対象となります。\n対象のボーナス購入で配当金にゾロ目（同じ数字3つ以上、または777）が出ましたら、チャットにてご報告ください！\nサポートにて結果を確認後、フリースピンやキャッシュバックなどの豪華特典を付与いたします。\n\n※チャレンジは1日1回まで可能です。\n※末尾の 00 / 000 / 0000 はゾロ目の対象外となります。\n\nご不明な点がございましたら、\nお気軽にチャットでお問い合わせください 💬✨\n\n🎰 春の運試しに挑戦し、豪華フリースピンや超豪華賞金を掴み取ってください！ 🏆',
    items: [
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' },
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }
    ]
  },

  // ============================================================================
  // BC_入学 イベントコード
  // ============================================================================

  // ゲートリアン（Heaven Day）
  gatorian_success: {
    content: '✨【シークレットコード】✨\nこのボーナスコードを入力した方だけに公開される限定キャンペーンです！\n詳細はこちらからご確認いただけます👇\n\n✨「Heaven Day」へようこそ！✨\nボーナスコード「ゲートリアン」を確認しました！\nご参加ありがとうございます😊✨\n\n📅 開催期間\n🗓 2026年4月1日 〜 4月14日\n\nキャンペーンの詳細や特典内容は、\nこちらのページからご確認ください👇\n🔗 https://heavensday.gatorian.slotenpromotion.com/\n\n⚠️ 注意事項\n本キャンペーンは初回入金（FTD）のお客様が対象です。\n\nボーナスとドリームチケットは、ご入金のタイミングに応じて以下の日程で付与されます。\n4/1〜4/7のご入金 → 4/8 12:00以降、順次付与\n4/8〜4/14のご入金 → 4/15 12:00以降、順次付与\n\n特典の「ドリームチケット」を受け取るには、別途Telegramへの登録が必須となりますのでご注意ください。\n👉 Telegram追加後は、アカウントIDをメッセージにて送信ください。\n\n付与されるボーナスの賭け条件は「1倍」です。\n\n分からないことがあれば、\nお気軽にチャットでお問い合わせください 💬✨\n\n🎰 史上最大級のボーナスキャンペーン、ぜひ楽しんでください！ ✨',
    items: [
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' },
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }
    ]
  },

  // リリシア（Heaven Road）
  riricia_success: {
    content: '🌈「Heaven Road ― 天国への道 ―」へようこそ！ 🌈\nボーナスコード「リリシア」を確認しました！\nご参加ありがとうございます 😊✨\n\n📅 開催期間\n🗓 2026年4月1日 〜 4月14日\n\nキャンペーンの詳細や各ステージのルールは、\nこちらのページからご確認ください👇\n🔗 https://heavensroad.riricia.slotenpromotion.com/\n\n⚠️ 注意事項\nこのイベントは3つのステージからなるトライアスロン形式のチャレンジです。\n各ステージをクリアするごとに、チャットで「stage1終了」「stage2終了」のようにご報告ください。\nサポートにて達成状況を確認後、次のステージへのご案内、または報酬を付与いたします。\n\nステージクリア報酬は、イベント終了後の4月15日 12:00より順次付与されます。\n\nご不明な点がございましたら、\nお気軽にチャットでお問い合わせください 💬✨\n\n🏊‍♀️🚴‍♀️🏃‍♀️ 天国への道を制覇し、最終報酬¥300,000を目指してください！ 🏆',
    items: [
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' },
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }
    ]
  },

  // ルシフィーレ（異次元の100%キャッシュバック）
  lucifire_success: {
    content: '🔥「異次元の100%キャッシュバック」へようこそ！🔥\nボーナスコード「ルシフィーレ」を確認しました！\nご参加ありがとうございます 😊✨\n\n📅 開催期間\n🗓 2026年4月1日 〜 4月14日\n\nキャンペーンの詳細やルールは、\nこちらのページからご確認ください👇\n🔗 https://100cashback.lucifire.slotenpromotion.com/\n\n次に、ご希望のプランに応じてご入金いただいた後、\n下記のどちらかのプランコードをチャットに送信してください📩\n\n1万円プランの場合 → 「入学10000」\n2万円プランの場合 → 「入学20000」\n\n⚠️ 注意事項\n本キャンペーンは初回入金のお客様限定です。\nプランコードの申請が完了してからの初回バカラBETがキャッシュバックの対象となります。\n対象ゲームは「スピードバカラ」または「スクイーズバカラ」です。\n初回BETで勝利した場合のみキャッシュバックが発生します。（負け・タイは対象外）\nキャッシュバックはご入金のタイミングに応じて、4月8日または4月15日に順次付与されます。\n\nご不明な点がございましたら、\nお気軽にチャットでお問い合わせください 💬✨\n\n😈 さあ、運命の初回ベットで勝利を掴み取ってください！ 🃏',
    items: [
      { title: '💰 1万円プラン → 入学10000', value: '入学10000' },
      { title: '💰 2万円プラン → 入学20000', value: '入学20000' },
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' }
    ]
  },

  // ルシフィーレ後続（入学10000 / 入学20000）
  lucifire_plan_success: {
    content: '✅ プランコードを受け付けました！\n\nご入金が確認でき次第、キャッシュバック対象としてエントリーが完了します。\n\n担当スタッフが確認後、ご案内いたします。\n少々お待ちください✨',
    items: null
  },

  // ハルピナ（ドリームチケット20枚プレゼント）
  harpina_success: {
    content: '👼「初回入金でドリームチケット20枚プレゼント！」へようこそ！👼\nボーナスコード「ハルピナ」を確認しました！\nご参加ありがとうございます 😊✨\n\nキャンペーンの詳細やドリームチケットについては、\nこちらのページからご確認ください👇\n🔗 https://harpina.slotenpromotion.com/\n\n本キャンペーンは、3,000円以上の初回入金が対象となります。\nご入金が確認でき次第、参加完了となります！\n\n⚠️ 注意事項\n本キャンペーンは初回入金のお客様限定です。\n最低入金額は3,000円となります。\nドリームチケット20枚は、ご入金が完了した翌日の12:00以降に付与されます。\n付与されたチケットの有効期限は、直近の抽選までとなりますのでご注意ください。\n\nご不明な点がございましたら、\nお気軽にチャットでお問い合わせください 💬✨\n\n🎟️ 100万円ベット相当の価値があるドリームチケットで、大きな夢を掴んでください！ 幸運を祈ります！ ✨',
    items: [
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' },
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }
    ]
  },

  // アークエル（ヘブンズショット・ステップアップ）
  arquel_success: {
    content: '「ヘブンズショット・ステップアップへようこそ！\nボーナスコード「アークエル」を確認しました！\nご参加ありがとうございます 😊✨\n\nこの特典により、STEP 1の参加費（¥4,000）が無料になります！\n\nキャンペーンの詳細や対象機種は、\nこちらのページからご確認ください👇\n🔗 https://stepshot.slomanga.com/\n\n【STEP 1 挑戦までの流れ】\n①まず、挑戦するスロットの機種を下記ボタンからお選びください。\n②次に、STEP 1のボーナスBUY額となる¥4,000をご入金ください。\n③サポートにて確認後、ボーナスBUYのご案内をいたします。\n\n⚠️ 注意事項\n本キャンペーンは初回入金のお客様限定です。\n必ずサポートからの案内の後に、指定金額でボーナスBUYを実行してください。申請前のプレイは対象外となります。\nボーナスBUYで3倍以上の配当が出ると勝利となり、賞金が付与されます。\n賞金は勝利が確定した翌日の18:00より順次配布いたします。\n\nご不明な点がございましたら、\nお気軽にチャットでお問い合わせください 💬✨\n\n🪜 天国への階段を駆け上がり、高額賞金を掴み取ってください！ 💰',
    items: [
      { title: '🎰 Gates of Olympus', value: 'arquel_game_gates_olympus_og' },
      { title: '🎰 Starlight Princess', value: 'arquel_game_starlight' },
      { title: '🎰 Starlight Princess Christmas', value: 'arquel_game_starlight_xmas' },
      { title: '🎰 Wisdom of Athena', value: 'arquel_game_wisdom' },
      { title: '🎰 Gates of Olympus 1000', value: 'arquel_game_gates_olympus' },
      { title: '🎰 Gates of Gatokaca 1000', value: 'arquel_game_gatokaca' },
      { title: '🎰 Sugar Rush 1000', value: 'arquel_game_sugar_rush_1000' },
      { title: '🎰 Sweet Bonanza 1000', value: 'arquel_game_sweet_bonanza' },
      { title: '🎰 Sugar Rush', value: 'arquel_game_sugar_rush' },
      { title: '🎰 Fruit Party', value: 'arquel_game_fruit_party' }
    ]
  },

  arquel_game_selected: {
    content: '✅ 機種選択ありがとうございます！\n\n🎰 選択機種: {game_name}\n💰 参加費: 無料（通常￥4,000）\n🎯 ボーナスBUY額: ￥4,000\n\n担当スタッフがこの後の\n参加手順をご案内いたします。\n\n少々お待ちください✨',
    items: null
  },

  // ラフィエル（聖域からの贈り物）
  rafiel_success: {
    content: '💎「聖域からの贈り物」へようこそ！💎\nボーナスコード「ラフィエル」を確認しました！\nご参加ありがとうございます 😊✨\n\n📅 開催期間\n🗓 2026年4月1日 〜 4月14日\n\nこのプロモーションは、「ラフィエル」を選んだあなただけの特別なプランです。\nキャンペーンの詳細やボーナス内容は、こちらのページからご確認ください👇\n🔗 https://crypto.rafiel.slotenpromotion.com/\n\n本キャンペーンは、1万円相当以上の仮想通貨でのご入金が対象となります。\nご入金が確認でき次第、参加完了となります！\n\n⚠️ 注意事項\nご入金完了から3日後より「天国タイム」がスタートします。\n天国タイム開始後、10日間にわたって毎日13:00〜14:00にボーナスが自動付与されます。\n付与されるボーナス額はご入金額によって変動します。（最大50%還元）\nボーナスの有効期限は付与された当日の23:59までです。持ち越しはできませんのでご注意ください。\n\nご不明な点がございましたら、\nお気軽にチャットでお問い合わせください 💬✨\n\n💸 仮想通貨の力で、毎日続くボーナスチャンスをぜひお楽しみください！ 💰',
    items: [
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' },
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }
    ]
  },

  // セレフィム（ヘブンショット）
  seraphim_success: {
    content: '🎯「ヘブンショット」へようこそ！🎯\nボーナスコード「セレフィム」を確認しました！\nご参加ありがとうございます 😊✨\n\nこのコードにより、特別に「1万コース」への参加費（10,000円分）が無料となります！\n\nキャンペーンの詳細や対象機種は、\nこちらのページからご確認ください👇\n🔗 https://heavensshotkaisetsu.slomanga.com/\n\n【挑戦までの流れ】\n①まず、挑戦するスロットの機種を下記ボタンからお選びください。\n②次に、ボーナスBUY額となる¥10,000をご入金ください。\n③サポートにて確認後、ボーナスBUYのご案内をいたします。\n\n⚠️ 注意事項\n必ずサポートからの案内の後に、指定金額でボーナスBUYを実行してください。申請前のプレイは対象外となります。\nボーナスBUYで購入金額の3倍以上の配当が出れば勝利となり、賞金¥200,000が付与されます。\n勝利した際は、ゲームのリプレイリンクをこのチャットにご報告ください。\n賞金は勝利が確定した翌日の18:00より順次配布いたします。\n\nご不明な点がございましたら、\nお気軽にチャットでお問い合わせください 💬✨\n\n🎤 あなたの一撃で、夢のステージを掴み取ってください！ 🌟',
    items: [
      { title: '🎰 Gates of Olympus', value: 'seraphim_game_gates_olympus_og' },
      { title: '🎰 Starlight Princess', value: 'seraphim_game_starlight' },
      { title: '🎰 Starlight Princess Christmas', value: 'seraphim_game_starlight_xmas' },
      { title: '🎰 Wisdom of Athena', value: 'seraphim_game_wisdom' },
      { title: '🎰 Gates of Olympus 1000', value: 'seraphim_game_gates_olympus' },
      { title: '🎰 Gates of Gatokaca 1000', value: 'seraphim_game_gatokaca' },
      { title: '🎰 Sugar Rush 1000', value: 'seraphim_game_sugar_rush_1000' },
      { title: '🎰 Sweet Bonanza 1000', value: 'seraphim_game_sweet_bonanza' },
      { title: '🎰 Sugar Rush', value: 'seraphim_game_sugar_rush' },
      { title: '🎰 Fruit Party', value: 'seraphim_game_fruit_party' }
    ]
  },

  seraphim_game_selected: {
    content: '✅ 機種選択ありがとうございます！\n\n🎰 選択機種: {game_name}\n💰 参加費: 無料（通常￥10,000）\n🎯 ボーナスBUY額: ￥10,000\n🏆 賞金: ￥200,000\n\n担当スタッフがこの後の\n参加手順をご案内いたします。\n\n少々お待ちください✨',
    items: null
  },

  // 4.25. ボーナスコードエラー
  bonus_code_error: {
    content: '❌ 入力されたボーナスコードは\n該当するコードではありません。\n\nお手数ですが、再度正しい\nボーナスコードを入力してください。',
    items: [
      { title: '🎟️ ボーナスコード申請', value: 'bonus_code_request' },
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' },
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }
    ]
  },

  // ============================================================================
  // 5. 入金不要ボーナス
  // ============================================================================
  no_deposit_bonus: {
    content: '🆓 入金不要ボーナス\n\n新規登録のお客様限定！\n入金なしでボーナスをゲットできます🎉\n\n\n🎁 ボーナス内容\n\n💰 ボーナス金額：3,000円\n🎰 対象ゲーム：スロットゲームのみ\n　（ボーナスBUY可能）\n🚫 禁止ゲーム：スロット以外全て\n🔄 賭け条件：ボーナス金額 × 30倍\n💸 出金上限額：15,000円\n\n\n✅ 出金条件\n\n・賭け条件（30倍）達成後、出金申請可能\n・出金可能額は最大15,000円まで\n・出金申請前に1回以上の入金が必要\n・出金はPayPayにて手続き\n\n⚠️ ボーナスプレイ中に入金を行った場合、\nボーナスおよび勝利金が無効となる\n場合があります。\n\n\n📝 利用上の注意事項\n\n・お一人様1回限りのご利用\n・スロット以外のゲームでのプレイが\n　確認された場合、ボーナスおよび\n　勝利金が没収される場合があります\n・出金申請までの全プレイ履歴は\n　プロモーション審査の対象となります\n・不正行為、複数アカウント作成、\n　利用規約違反が確認された場合、\n　ボーナスおよび出金権利は無効\n\n\nℹ️ その他\n\n・他の入金不要ボーナスとの併用不可\n・スロット天国は本プロモーションの\n　内容を予告なく変更・中止する権利、\n　および最終的な判断権を有します\n\n\n🗑️ 入金不要ボーナスの破棄方法\n\n・未使用のボーナスについては、\n　当社にて1日1回のペースで\n　破棄対応が可能です。\n・すでに使用されたボーナスは、\n　破棄対象外となります。\n・未使用ボーナスの破棄を希望する\n　場合は、カスタマーサポートへの\n　連絡が必要となります。\n・ボーナス残高が10円を下回ると、\n　残高は自動的に0円にリセットされます。\n　プレイ継続が難しい少額のため、\n　ご了承ください。',
    items: [
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' },
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }
    ]
  },

  // ============================================================================
  // 6. アカウント
  // ============================================================================
  account_issues: {
    content: '👤 アカウントについてですね。\n\nどのような問題でお困りですか？',
    items: [
      { title: '🔑 ログインできない', value: 'login_issues' },
      { title: '📧 メールアドレス変更', value: 'email_change' },
      { title: '📱 電話番号変更', value: 'phone_change' },
      { title: '🔒 パスワード変更', value: 'password_change' },
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' }
    ]
  },

  login_issues: {
    content: '🔑 ログインできない場合\n\n以下をお試しください：\n\n1. **メールアドレス/電話番号の確認**\n   登録時のメールアドレスまたは電話番号を正しく入力していますか？\n\n2. **パスワードの確認**\n   大文字・小文字を正しく入力していますか？\n\n3. **パスワードリセット**\n   ログイン画面の「パスワードを忘れた方」からリセットできます。\n\n上記を試しても解決しない場合は、オペレーターにお問い合わせください。',
    items: [
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' },
      { title: '↩️ 戻る', value: 'account_issues' }
    ]
  },

  email_change: {
    content: '📧 メールアドレスの変更\n\nメールアドレスの変更をご希望の場合は、オペレーターにお問い合わせください。\n\n本人確認のため、以下の情報をご準備ください：\n- 現在のメールアドレス\n- 新しいメールアドレス\n- 登録時の電話番号',
    items: [
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' },
      { title: '↩️ 戻る', value: 'account_issues' }
    ]
  },

  phone_change: {
    content: '📱 電話番号の変更\n\n電話番号の変更をご希望の場合は、オペレーターにお問い合わせください。\n\n本人確認のため、以下の情報をご準備ください：\n- 現在の電話番号\n- 新しい電話番号\n- 登録時のメールアドレス',
    items: [
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' },
      { title: '↩️ 戻る', value: 'account_issues' }
    ]
  },

  password_change: {
    content: '🔒 パスワードの変更\n\nパスワードはログイン画面から変更できます。\n\n**手順:**\n1. ログイン画面にアクセス\n2. 「パスワードを忘れた方」をクリック\n3. 登録メールアドレスを入力\n4. 届いたメールのリンクから新しいパスワードを設定\n\nメールが届かない場合は、オペレーターにお問い合わせください。',
    items: [
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' },
      { title: '↩️ 戻る', value: 'account_issues' }
    ]
  },

  // ============================================================================
  // 7. よくある質問(FAQ)
  // ============================================================================
  faq_main: {
    content: '❓ よくある質問(FAQ)\n\nどのカテゴリの質問をお探しですか？',
    items: [
      { title: '🔐 本人確認(KYC)について', value: 'faq_kyc' },
      { title: '⏱️ 入出金の時間', value: 'faq_processing_time' },
      { title: '💳 対応している決済方法', value: 'faq_payment_methods' },
      { title: '🎁 ボーナスの使い方', value: 'faq_bonus_usage' },
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' }
    ]
  },

  faq_kyc: {
    content: '🔐 本人確認(KYC)について\n\n**スロット天国では本人確認(KYC)は不要です！**\n\n面倒な書類提出なしで、電話番号とメールだけで即プレイ可能です。\n\nこれがスロット天国の大きな強みの一つです！',
    items: [
      { title: '↩️ FAQに戻る', value: 'faq_main' },
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }
    ]
  },

  faq_processing_time: {
    content: '⏱️ 入出金の処理時間\n\n**入金:**\n- 銀行振込: 30分～数時間\n- 仮想通貨: 数分～数時間\n- PayPay: 即時～30分\n\n**出金:**\n- 通常: 24時間～72時間以内\n- PayPay: 30分以内\n\n※ 混雑状況により時間が前後する場合があります。',
    items: [
      { title: '↩️ FAQに戻る', value: 'faq_main' },
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }
    ]
  },

  faq_payment_methods: {
    content: '💳 対応している決済方法\n\n**入金:**\n- 銀行振込\n- 仮想通貨 (Bitcoin, Ethereumなど)\n- PayPay (マネー / マネーライト)\n- コンビニ払い\n- ATM\n\n**出金:**\n- 銀行振込\n- 仮想通貨\n- PayPay\n\n👉 入金ページ: https://sloten.io/deposit\n👉 出金ページ: https://sloten.io/withdraw',
    items: [
      { title: '↩️ FAQに戻る', value: 'faq_main' },
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }
    ]
  },

  faq_bonus_usage: {
    content: '🎁 ボーナスの使い方\n\n**ボーナスの種類:**\n1. 入金不要ボーナス - 新規登録で自動付与\n2. 入金ボーナス - 入金時に付与\n3. プロモーションボーナス - キャンペーン参加で獲得\n\n**ボーナスの使用方法:**\n1. ボーナスが付与されると、ボーナス残高に反映されます\n2. 対象ゲームでプレイすると、ボーナス残高から消費されます\n3. 賭け条件を達成すると、出金可能になります\n\n**注意事項:**\n- 賭け条件を確認してからプレイしてください\n- 対象外ゲームでのプレイはボーナス没収の原因になります',
    items: [
      { title: '↩️ FAQに戻る', value: 'faq_main' },
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }
    ]
  },

  // ヘブンズショット
  heavens_shot: {
    content: '🌈 Heaven\'s Shot イベント\n\n3倍以上の配当を出すだけで最大200万円の賞金チャンス！\n\n**参加方法:**\n1. 対象スロットをプレイ\n2. 3倍以上の配当を獲得\n3. 自動的にエントリー完了！\n\n**賞金:**\n- 最大200万円の賞金プール\n- 配当倍率に応じてランキング\n\n詳細はプロモーションページをご確認ください。\n👉 https://sloten.io/promotions',
    items: [
      { title: '↩️ メインメニューに戻る', value: 'welcome_message' },
      { title: '🙋 オペレーターと話す', value: 'transfer_to_agent' }
    ]
  }
}
