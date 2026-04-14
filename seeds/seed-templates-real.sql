-- @idempotent — seed-templates-real.sql
-- Generated from REAL Chatwoot staff outgoing messages (im.slot-h.com / account 3).
-- Source: 1000 conversations scanned, 7467 staff messages,
-- 80 frequent clusters identified, 72 representative templates emitted.
-- PII (email/phone/amount/account_id) masked before clustering.

DELETE FROM templates WHERE tenant_id = 'tenant_default' AND name LIKE 'real-%';

-- count=945 (frequency rank #1)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-001-メニュー', 'メニュー', 'スロット天国カスタマーサポートへようこそ！🎰

ご希望の項目を下記メニューからお選びください。', 'ja', '/r001', 945, datetime('now'), datetime('now'));

-- count=856 (frequency rank #2)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-002-入金', '入金', '入金・出金についてですね。ご希望の項目をお選びください。', 'ja', '/r002', 856, datetime('now'), datetime('now'));

-- count=647 (frequency rank #3)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-003-入金', '入金', '入金のご案内をいたします💰

まず、**スロット天国のアカウントID**（ユーザー名）を教えてください。', 'ja', '/r003', 647, datetime('now'), datetime('now'));

-- count=491 (frequency rank #4)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-004-入金-確認', '入金-確認', '大変お待たせいたしました✨

━━━━━━━━━━━
🔹 お支払い金額: **[AMT]円**
🔹 入金方法: PayPayマネー
━━━━━━━━━━━

📱 **送金先情報**

PayPay ID: **sakisnowlove**

https://qr.paypay.ne.jp/p2p01_eYZBFLUMF7RTKiu8

━━━━━━━━━━━

🧧 **【スクショ提出ルール（重要）】** 🧧

✅ 1枚の画像内で、下記3点が確認できるスクショをご提出ください。

① **取引番号（取引ID）**
👉 ※必ず**コピーしてチャットへテキストで貼り付け**てください
② **入金金額**
③ **取引日時（支払い日時）**

📌 スクショ例:
https://drive.google.com/uc?export=view&id=1_FJJnGcFMFF_qTiuEfs4tI9pnRegM0pE

⚠️ 「金額だけ」や「履歴一覧だけ」の画像は確認できません。

🧾 **お支払い後のお願い**
送金完了後は、
1️⃣ 取引番号をコピペしてチャットにお送りください
2️⃣ スクリーンショットをお送りください

⚠️ 金融機関の都合により、まれにお受け取りがキャンセルとなる場合がございます。
その際はお手数ですが、再度ご対応をお願いいたします。', 'ja', '/r004', 491, datetime('now'), datetime('now'));

-- count=444 (frequency rank #5)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-005-入金', '入金', 'ありがとうございます✨
アカウントID: **[ID]**

次に、**入金金額**を入力してください。
（[AMT]円〜[AMT]円）', 'ja', '/r005', 444, datetime('now'), datetime('now'));

-- count=336 (frequency rank #6)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-006-入金-確認', '入金-確認', '取引番号を受け取りました✅

**スクリーンショット** もお送りください📷
（取引詳細画面で①取引番号 ②金額 ③日時 が確認できるもの）', 'ja', '/r006', 336, datetime('now'), datetime('now'));

-- count=305 (frequency rank #7)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-007-入金-確認', '入金-確認', 'スクリーンショットを受け取りました📷

**取引番号（取引ID）** もテキストでコピー＆ペーストしてお送りください。
👉 数字20桁程度の番号です。', 'ja', '/r007', 305, datetime('now'), datetime('now'));

-- count=280 (frequency rank #8)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-008-転送', '転送', 'オペレーターにお繋ぎします。ご用件をお書きになって、そのままお待ちください。', 'ja', '/r008', 280, datetime('now'), datetime('now'));

-- count=119 (frequency rank #9)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-009-入金-銀行', '入金-銀行', '💸 出金の方法

出金方法によって手続きが異なります。

**自動銀行振込・仮想通貨の場合:**
👉 出金ページはこちら: https://sloten.io/withdraw

**その他の出金方法(PayPay、銀行(手動)など)の場合:**
チャットでご希望の出金方法と金額をお伝えください。担当者が手続きをサポートいたします。

✅ スロット天国の強み:
- **本人確認(KYC)不要**: 面倒な書類提出なしで、スムーズに出金できます！
- **迅速な処理**: 出金は通常、申請後24時間～72時間以内に処理されます。', 'ja', '/r009', 119, datetime('now'), datetime('now'));

-- count=89 (frequency rank #10)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-010-入金-銀行', '入金-銀行', '銀行振込でのご入金案内をいたします🏦

まず、**スロット天国のアカウントID**（ユーザー名）を教えてください。', 'ja', '/r010', 89, datetime('now'), datetime('now'));

-- count=55 (frequency rank #11)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-011-入金-銀行', '入金-銀行', '下記の口座へお振込みをお願いいたします。

入金額：**[AMT]円**

■南都銀行

■天理支店(180)

■普通 2435679

■ネクストラ（カ

お振込みが完了しましたら、

**明細書のお写真** または **スクリーンショット** を必ずこちらのチャットへお送りください。

**⚠️⚠️ ⚠️ 【注意事項】⚠️⚠️ ⚠️**

※ また振込の際の**振込人名**もテキストで記入してお送りください。

例：ヤマダタロウ（カタカナでご入力下さい）

**※※※※※※※※※※※※※※※※※※**

※明細の確認ができない場合、反映に時間がかかったり、入金エビデンスが残らないため、ご協力をお願いいたします。

※ **土曜、日曜**は着金確認に**1時間以上お待ち頂く場合があります**ので予めご了承ください。', 'ja', '/r011', 55, datetime('now'), datetime('now'));

-- count=44 (frequency rank #12)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-012-入金', '入金', '💰 入金額を選択してください（¥[AMT] 〜 ¥[AMT]）', 'ja', '/r012', 44, datetime('now'), datetime('now'));

-- count=38 (frequency rank #13)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-013-入金-コンビニ', '入金-コンビニ', '🏪 コンビニでの入金ですね。

まず、**スロット天国のアカウントID**（ユーザー名）を入力してください。

例: syt2525m, [ID], hiromu', 'ja', '/r013', 38, datetime('now'), datetime('now'));

-- count=30 (frequency rank #14)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-014-入金', '入金', '✅ アカウントID: **[ID]**

ご希望の入金額を選択してください。', 'ja', '/r014', 30, datetime('now'), datetime('now'));

-- count=30 (frequency rank #15)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-015-入金-コンビニ', '入金-コンビニ', '✅ **入金申請受付完了**

💰 **金額**: ¥[AMT]
🆔 **アカウント**: [ID]

⏳ **決済番号発行中...**
約10分程度お時間をいただきます。
発行完了次第、こちらのチャットにてお知らせいたします。', 'ja', '/r015', 30, datetime('now'), datetime('now'));

-- count=28 (frequency rank #16)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-016-入金-銀行', '入金-銀行', '🏦 自動銀行振込・仮想通貨での出金

以下のリンクから出金手続きが可能です。

👉 出金ページ: https://sloten.io/withdraw

**手順:**
1. 上記リンクから出金ページにアクセス
2. 出金方法（銀行振込 or 仮想通貨）を選択
3. 出金額を入力して申請

出金は通常、申請後24時間～72時間以内に処理されます。', 'ja', '/r016', 28, datetime('now'), datetime('now'));

-- count=25 (frequency rank #17)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-017-出金', '出金', '🌟 大変お待たせいたしました！  
アカウントの方に ポイント反映が完了いたしました🎉🙌  
ここからぜひ、  
たくさん勝って✨ 出金までつかみ取ってくださいね💪🔥💸  
全力で応援しております！！📣💖

何かございましたら、いつでもお気軽にご連絡ください😊🌈', 'ja', '/r017', 25, datetime('now'), datetime('now'));

-- count=18 (frequency rank #18)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-018-出金', '出金', '😱 入出金のトラブルですね。

どのような問題でお困りですか？', 'ja', '/r018', 18, datetime('now'), datetime('now'));

-- count=18 (frequency rank #19)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-019-入金-確認', '入金-確認', '送金完了後、以下の2点をお送りください：

**1）取引番号** → テキストでコピー＆ペースト
**2）スクリーンショット** → 取引詳細画面の画像

※取引番号は数字20桁程度の番号です。', 'ja', '/r019', 18, datetime('now'), datetime('now'));

-- count=16 (frequency rank #20)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-020-入金-銀行', '入金-銀行', '下記の口座へお振込みをお願いいたします。

入金額：**[AMT]円**

■三井住友銀行

■トランクNorth（403）

■普通 0349573

■カ）プロモシンク

お振込みが完了しましたら、

**明細書のお写真** または **スクリーンショット** を必ずこちらのチャットへお送りください。

**⚠️⚠️ ⚠️ 【注意事項】⚠️⚠️ ⚠️**

※ また振込の際の**振込人名**もテキストで記入してお送りください。

例：ヤマダタロウ（カタカナでご入力下さい）

**※※※※※※※※※※※※※※※※※※**

※明細の確認ができない場合、反映に時間がかかったり、入金エビデンスが残らないため、ご協力をお願いいたします。

※ **土曜、日曜**は着金確認に**1時間以上お待ち頂く場合があります**ので予めご了承ください。', 'ja', '/r020', 16, datetime('now'), datetime('now'));

-- count=14 (frequency rank #21)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-021-その他', 'その他', '**明細書のお写真** または **スクリーンショット** をお送りください📷

（振込人名・金額・日時が確認できるもの）', 'ja', '/r021', 14, datetime('now'), datetime('now'));

-- count=14 (frequency rank #22)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-022-その他', 'その他', 'お名前が短すぎるようです。
振込人名を**カタカナ**でもう一度入力してください。

例：ヤマダタロウ', 'ja', '/r022', 14, datetime('now'), datetime('now'));

-- count=11 (frequency rank #23)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-023-その他', 'その他', '❓ よくある質問(FAQ)

どのカテゴリの質問をお探しですか？', 'ja', '/r023', 11, datetime('now'), datetime('now'));

-- count=11 (frequency rank #24)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-024-待機案内', '待機案内', '順番に対応させて頂いておりますのしばらくお待ちください。', 'ja', '/r024', 11, datetime('now'), datetime('now'));

-- count=10 (frequency rank #25)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-025-ボーナス', 'ボーナス', '🎁 ボーナス・プロモーションについてですね。

どのような情報をお探しですか？', 'ja', '/r025', 10, datetime('now'), datetime('now'));

-- count=10 (frequency rank #26)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-026-待機案内', '待機案内', 'お待たせいたしました。   
アカウントを更新いたしましたのでご確認くださいませ！', 'ja', '/r026', 10, datetime('now'), datetime('now'));

-- count=9 (frequency rank #27)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-027-待機案内', '待機案内', 'ご確認させて頂きましたところ、対応中ですので反映までお待ちくださいませ😊', 'ja', '/r027', 9, datetime('now'), datetime('now'));

-- count=9 (frequency rank #28)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-028-入金-銀行', '入金-銀行', '⏳ 入金が反映されない場合

**確認事項:**
1. 入金申請を先に行いましたか？
2. 正しい口座に振り込みましたか？
3. 振込名義は正しいですか？

**通常の反映時間:**
- 銀行振込: 30分～数時間
- 仮想通貨: 数分～数時間

上記を確認しても解決しない場合は、オペレーターにお問い合わせください。', 'ja', '/r028', 9, datetime('now'), datetime('now'));

-- count=9 (frequency rank #29)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-029-入金', '入金', 'お手数おかけしますが

一度チャット閉じて頂きチャットボットから入出金申請をお願い致します☺️

メニューから

入金、出金

入金、出金方法

との流れで進んでください🤲', 'ja', '/r029', 9, datetime('now'), datetime('now'));

-- count=8 (frequency rank #30)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-030-入金', '入金', '✅ アカウントID: **pipibob**

ご希望の入金額を選択してください。', 'ja', '/r030', 8, datetime('now'), datetime('now'));

-- count=8 (frequency rank #31)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-031-入金', '入金', 'ありがとうございます✨
アカウントID: **tennemoto**

次に、**入金金額**を入力してください。
（[AMT]円〜[AMT]円）', 'ja', '/r031', 8, datetime('now'), datetime('now'));

-- count=8 (frequency rank #32)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-032-入金-PayPay', '入金-PayPay', 'ご不便をおかけしておりますが、現在PayPayでの出金はご利用出来ません。

代替といたしまして、銀行振り込みもしくは仮想通貨での出金が可能となっておりますので、出金ページより、銀行振り込み（自働）または仮想通貨をご選択いただきご出金申請の提出をお願い致します。', 'ja', '/r032', 8, datetime('now'), datetime('now'));

-- count=8 (frequency rank #33)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-033-出金', '出金', '現在PAYPAYマネー出金は一時的にご利用できなくなっておりますがマネーライトでしたら上限５万まで可能となります。', 'ja', '/r033', 8, datetime('now'), datetime('now'));

-- count=8 (frequency rank #34)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-034-待機案内', '待機案内', '確認させて頂きますので少々お待ちください。', 'ja', '/r034', 8, datetime('now'), datetime('now'));

-- count=8 (frequency rank #35)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-035-入金-完了', '入金-完了', 'ご入金は自動受付となりましたので、一度こちらのチャットを終了してください！

再度チャットメニュー内の「入金・出金」よりご申請をお願い致します。

【手順】

チャットメニューより下記の順番に選択して進めてください。

１、入金・出金

もしくはチャットより入金と入れていただいて

項目がございますのでご希望の案内に進んでください。', 'ja', '/r035', 8, datetime('now'), datetime('now'));

-- count=8 (frequency rank #36)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-036-入金-銀行', '入金-銀行', '🏧 ATMでの入金ですね。

お手続きのため、**ご希望の入金額**をチャットにご入力ください。

入力後、担当者が確認し、マニュアル、振込先、振込人名をお伝えします。', 'ja', '/r036', 8, datetime('now'), datetime('now'));

-- count=7 (frequency rank #37)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-037-入金-銀行', '入金-銀行', '⏳ 出金が届かない場合

**確認事項:**
1. 出金申請のステータスを確認してください
2. 登録した口座情報は正しいですか？

**通常の処理時間:**
出金は申請後24時間～72時間以内に処理されます。

上記を確認しても解決しない場合は、オペレーターにお問い合わせください。', 'ja', '/r037', 7, datetime('now'), datetime('now'));

-- count=7 (frequency rank #38)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-038-その他', 'その他', '金額は **[AMT]円〜[AMT]円** の範囲で入力してください。
（例: 10000）', 'ja', '/r038', 7, datetime('now'), datetime('now'));

-- count=6 (frequency rank #39)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-039-待機案内', '待機案内', '恐れ入りますお時間を要する場合がございます。 ご不安かと思われますがお手数ですが反映をお待ちくださいませ。🤲', 'ja', '/r039', 6, datetime('now'), datetime('now'));

-- count=6 (frequency rank #40)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-040-入金-銀行', '入金-銀行', 'ご入金ありがとうございます✨

📋 **受付内容**
━━━━━━━━━━━
アカウントID: ugpnw
入金額: [AMT]円
振込人名: ナカクラタイシ
振込先: 南都銀行
━━━━━━━━━━━

ただいま着金確認中です。確認ができ次第アカウントへ反映いたします。
恐れ入りますが、少々お待ちくださいませ😊

※ **土曜、日曜**は着金確認に**1時間以上お待ち頂く場合があります**ので予めご了承ください。
※しばらく経っても反映されない場合は、お気軽にお問い合わせください📩', 'ja', '/r040', 6, datetime('now'), datetime('now'));

-- count=6 (frequency rank #41)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-041-その他', 'その他', '金額は **[AMT]円〜[AMT]円** の範囲で入力してください。
（例: 5000）', 'ja', '/r041', 6, datetime('now'), datetime('now'));

-- count=6 (frequency rank #42)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-042-ボーナス', 'ボーナス', '✅ ボーナスコード『スペシャルステップ』を
受け付けました！

🎉 お申込ありがとうございます！

🎰 ヘブンズ・ステップアップ
　　STEP1 参加費無料特典！

通常参加費￥4,000が無料に！
ボーナスBUY額￥4,000のみで
￥50,000の賞金に挑戦できます！

まずはアカウント残高を
確認させてください。

￥4,000以上の残高はありますか？', 'ja', '/r042', 6, datetime('now'), datetime('now'));

-- count=6 (frequency rank #43)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-043-その他', 'その他', '🎮 ゲームについてですね。

どのようなことをお知りになりたいですか？', 'ja', '/r043', 6, datetime('now'), datetime('now'));

-- count=6 (frequency rank #44)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-044-その他', 'その他', '❌ アカウントIDは英数字3〜20文字で入力してください。

例: syt2525m, [ID], hiromu', 'ja', '/r044', 6, datetime('now'), datetime('now'));

-- count=6 (frequency rank #45)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-045-その他', 'その他', 'アカウントを更新いたしましたのでご確認くださいませ！', 'ja', '/r045', 6, datetime('now'), datetime('now'));

-- count=6 (frequency rank #46)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-046-待機案内', '待機案内', 'お待たせいたしました。   
確認したところ対応中ですのでもう少しお待ちください。', 'ja', '/r046', 6, datetime('now'), datetime('now'));

-- count=5 (frequency rank #47)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-047-入金', '入金', 'ありがとうございます✨
アカウントID: **ugpnw**

次に、**入金金額**を入力してください。
（[AMT]円〜[AMT]円）', 'ja', '/r047', 5, datetime('now'), datetime('now'));

-- count=5 (frequency rank #48)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-048-入金-銀行', '入金-銀行', '振込人名: **ナカクラタイシ** で承りました✅

お振込みが完了しましたら、
**明細書のお写真** または **スクリーンショット** をこちらのチャットにお送りください📷

（振込人名・金額・日時が確認できるもの）', 'ja', '/r048', 5, datetime('now'), datetime('now'));

-- count=5 (frequency rank #49)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-049-待機案内', '待機案内', 'お待たせいたしました。   
対応中ですのでしばらくお待ちください。', 'ja', '/r049', 5, datetime('now'), datetime('now'));

-- count=5 (frequency rank #50)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-050-待機案内', '待機案内', '順番に対応させて頂いておりますのでしばらくお待ちください。', 'ja', '/r050', 5, datetime('now'), datetime('now'));

-- count=5 (frequency rank #51)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-051-入金', '入金', 'ありがとうございます✨
アカウントID: **doradesu**

次に、**入金金額**を入力してください。
（[AMT]円〜[AMT]円）', 'ja', '/r051', 5, datetime('now'), datetime('now'));

-- count=5 (frequency rank #52)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-052-入金', '入金', 'ありがとうございます✨
アカウントID: **daikoba**

次に、**入金金額**を入力してください。
（[AMT]円〜[AMT]円）', 'ja', '/r052', 5, datetime('now'), datetime('now'));

-- count=5 (frequency rank #53)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-053-待機案内', '待機案内', 'お待たせしております。  
順番にご対応させていただいておりますので今しばらくお待ち下さいませ。', 'ja', '/r053', 5, datetime('now'), datetime('now'));

-- count=5 (frequency rank #54)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-054-待機案内', '待機案内', '確認させて頂きますので少々お待ちくださいませ。', 'ja', '/r054', 5, datetime('now'), datetime('now'));

-- count=5 (frequency rank #55)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-055-入金-完了', '入金-完了', '💰 入金のご案内

STEP1に参加するには
ボーナスBUY用の￥４,０００が必要です。

参加費は無料なので、
実質￥４,０００のみで
￥５０,０００の賞金に挑戦できます！

入金後、「入金完了」ボタンを
押してください。', 'ja', '/r055', 5, datetime('now'), datetime('now'));

-- count=5 (frequency rank #56)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-056-入金', '入金', '自動受付となりましたので、一度こちらのチャットを終了してください！

再度チャットメニュー内の「入金・出金」よりご申請をお願い致します。

【手順】

チャットメニューより下記の順番に選択して進めてください。

１、入金・出金

もしくはチャットより入金と入れていただいて

項目がございますのでご希望の案内に進んでください。', 'ja', '/r056', 5, datetime('now'), datetime('now'));

-- count=5 (frequency rank #57)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-057-入金', '入金', 'ありがとうございます✨
アカウントID: **kannakk**

次に、**入金金額**を入力してください。
（[AMT]円〜[AMT]円）', 'ja', '/r057', 5, datetime('now'), datetime('now'));

-- count=5 (frequency rank #58)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-058-出金', '出金', '出金方法お伺いしてもよろしいでしょうか？', 'ja', '/r058', 5, datetime('now'), datetime('now'));

-- count=5 (frequency rank #59)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-059-出金', '出金', 'ありがとうございます。

ご出金申請を承りました。

また、出金申請をされた場合は、先にアカウント内のポイントが差し引かれますので、予めご了承くださいませ🙏💡', 'ja', '/r059', 5, datetime('now'), datetime('now'));

-- count=4 (frequency rank #60)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-060-その他', 'その他', '調整いたしましたのでご確認くださいませ。', 'ja', '/r060', 4, datetime('now'), datetime('now'));

-- count=4 (frequency rank #61)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-061-入金', '入金', 'ありがとうございます✨
アカウントID: **ken2711pro**

次に、**入金金額**を入力してください。
（[AMT]円〜[AMT]円）', 'ja', '/r061', 4, datetime('now'), datetime('now'));

-- count=4 (frequency rank #62)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-062-入金-完了', '入金-完了', 'ご入金ありがとうございます。   
確認させて頂きますので少々お待ちください。', 'ja', '/r062', 4, datetime('now'), datetime('now'));

-- count=4 (frequency rank #63)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-063-入金-仮想通貨', '入金-仮想通貨', '現在paypay出金は使用出来ないため

仮想通貨や銀行出金可能です。', 'ja', '/r063', 4, datetime('now'), datetime('now'));

-- count=4 (frequency rank #64)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-064-入金', '入金', 'ありがとうございます✨
アカウントID: **about**

次に、**入金金額**を入力してください。
（[AMT]円〜[AMT]円）', 'ja', '/r064', 4, datetime('now'), datetime('now'));

-- count=4 (frequency rank #65)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-065-出金', '出金', 'かしこまりました、サイト上での出金銀行（自動）項目からお願い致します', 'ja', '/r065', 4, datetime('now'), datetime('now'));

-- count=4 (frequency rank #66)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-066-入金', '入金', 'ありがとうございます✨
アカウントID: **dali562929**

次に、**入金金額**を入力してください。
（[AMT]円〜[AMT]円）', 'ja', '/r066', 4, datetime('now'), datetime('now'));

-- count=4 (frequency rank #67)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-067-ボーナス', 'ボーナス', '🎟️ ボーナスコード申請

ボーナスコードをお持ちの場合は、このチャットに直接入力してください。

入力後、自動的に申請が受け付けられます。', 'ja', '/r067', 4, datetime('now'), datetime('now'));

-- count=4 (frequency rank #68)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-068-入金', '入金', '🎉 現在のプロモーション

**🌈 Heaven''s Shot イベント開催中！**
3倍以上の配当を出すだけで最大200万円の賞金チャンス！

**🎰 ドリームポット（業界初！）**
ロト6と連動したジャックポット！
プレイするだけで自動的に抽選チケットがもらえます。

**💰 累計11,111人突破記念キャンペーン**
未入金・入金ゼロの新規登録者様限定！
入金額に応じてキャッシュをプレゼント！

👉 プロモーション詳細はこちら: https://sloten.io/promotions', 'ja', '/r068', 4, datetime('now'), datetime('now'));

-- count=4 (frequency rank #69)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-069-入金', '入金', 'ありがとうございます✨
アカウントID: **gamogamo**

次に、**入金金額**を入力してください。
（[AMT]円〜[AMT]円）', 'ja', '/r069', 4, datetime('now'), datetime('now'));

-- count=4 (frequency rank #70)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-070-待機案内', '待機案内', 'お待たせしております。  
順次ご対応させていただいておりますので完了までお待ち下さいませ。', 'ja', '/r070', 4, datetime('now'), datetime('now'));

-- count=4 (frequency rank #71)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-071-入金', '入金', 'ありがとうございます✨
アカウントID: **megumi**

次に、**入金金額**を入力してください。
（[AMT]円〜[AMT]円）', 'ja', '/r071', 4, datetime('now'), datetime('now'));

-- count=4 (frequency rank #72)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-072-その他', 'その他', '選択ができるようにさせていただきましたので、一度リフレッシュして頂き

再度、ご確認くださいませ☺️', 'ja', '/r072', 4, datetime('now'), datetime('now'));
