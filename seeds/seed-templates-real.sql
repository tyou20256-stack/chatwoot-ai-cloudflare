-- @idempotent — seed-templates-real.sql
-- Generated from REAL Chatwoot staff outgoing messages (im.slot-h.com / account 3).
-- Source: 300 conversations scanned, 2275 staff messages,
-- 80 frequent clusters identified, 61 representative templates emitted.
-- PII (email/phone/amount/account_id) masked before clustering.

DELETE FROM templates WHERE tenant_id = 'tenant_default' AND name LIKE 'real-%';

-- count=289 (frequency rank #1)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-001-メニュー', 'メニュー', 'スロット天国カスタマーサポートへようこそ！🎰

ご希望の項目を下記メニューからお選びください。', 'ja', '/r001', 289, datetime('now'), datetime('now'));

-- count=252 (frequency rank #2)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-002-入金', '入金', '入金・出金についてですね。ご希望の項目をお選びください。', 'ja', '/r002', 252, datetime('now'), datetime('now'));

-- count=209 (frequency rank #3)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-003-入金', '入金', '入金のご案内をいたします💰

まず、**スロット天国のアカウントID**（ユーザー名）を教えてください。', 'ja', '/r003', 209, datetime('now'), datetime('now'));

-- count=160 (frequency rank #4)
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
その際はお手数ですが、再度ご対応をお願いいたします。', 'ja', '/r004', 160, datetime('now'), datetime('now'));

-- count=136 (frequency rank #5)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-005-入金', '入金', 'ありがとうございます✨
アカウントID: **[ID]**

次に、**入金金額**を入力してください。
（[AMT]円〜[AMT]円）', 'ja', '/r005', 136, datetime('now'), datetime('now'));

-- count=113 (frequency rank #6)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-006-入金-確認', '入金-確認', '取引番号を受け取りました✅

**スクリーンショット** もお送りください📷
（取引詳細画面で①取引番号 ②金額 ③日時 が確認できるもの）', 'ja', '/r006', 113, datetime('now'), datetime('now'));

-- count=91 (frequency rank #7)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-007-入金-確認', '入金-確認', 'スクリーンショットを受け取りました📷

**取引番号（取引ID）** もテキストでコピー＆ペーストしてお送りください。
👉 数字20桁程度の番号です。', 'ja', '/r007', 91, datetime('now'), datetime('now'));

-- count=86 (frequency rank #8)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-008-転送', '転送', 'オペレーターにお繋ぎします。ご用件をお書きになって、そのままお待ちください。', 'ja', '/r008', 86, datetime('now'), datetime('now'));

-- count=27 (frequency rank #9)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-009-入金-銀行', '入金-銀行', '銀行振込でのご入金案内をいたします🏦

まず、**スロット天国のアカウントID**（ユーザー名）を教えてください。', 'ja', '/r009', 27, datetime('now'), datetime('now'));

-- count=23 (frequency rank #10)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-010-入金-銀行', '入金-銀行', '💸 出金の方法

出金方法によって手続きが異なります。

**自動銀行振込・仮想通貨の場合:**
👉 出金ページはこちら: https://sloten.io/withdraw

**その他の出金方法(PayPay、銀行(手動)など)の場合:**
チャットでご希望の出金方法と金額をお伝えください。担当者が手続きをサポートいたします。

✅ スロット天国の強み:
- **本人確認(KYC)不要**: 面倒な書類提出なしで、スムーズに出金できます！
- **迅速な処理**: 出金は通常、申請後24時間～72時間以内に処理されます。', 'ja', '/r010', 23, datetime('now'), datetime('now'));

-- count=18 (frequency rank #11)
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

※ **土曜、日曜**は着金確認に**1時間以上お待ち頂く場合があります**ので予めご了承ください。', 'ja', '/r011', 18, datetime('now'), datetime('now'));

-- count=12 (frequency rank #12)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-012-入金', '入金', '💰 入金額を選択してください（¥[AMT] 〜 ¥[AMT]）', 'ja', '/r012', 12, datetime('now'), datetime('now'));

-- count=10 (frequency rank #13)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-013-出金', '出金', '😱 入出金のトラブルですね。

どのような問題でお困りですか？', 'ja', '/r013', 10, datetime('now'), datetime('now'));

-- count=9 (frequency rank #14)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-014-入金-コンビニ', '入金-コンビニ', '🏪 コンビニでの入金ですね。

まず、**スロット天国のアカウントID**（ユーザー名）を入力してください。

例: syt2525m, [ID], hiromu', 'ja', '/r014', 9, datetime('now'), datetime('now'));

-- count=9 (frequency rank #15)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-015-出金', '出金', '🌟 大変お待たせいたしました！

アカウントの方に ポイント反映が完了いたしました🎉🙌

ここからぜひ、

たくさん勝って✨ 出金までつかみ取ってくださいね💪🔥💸

全力で応援しております！！📣💖

何かございましたら、いつでもお気軽にご連絡ください😊🌈', 'ja', '/r015', 9, datetime('now'), datetime('now'));

-- count=6 (frequency rank #16)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-016-待機案内', '待機案内', 'ご確認させて頂きましたところ、対応中ですので反映までお待ちくださいませ😊', 'ja', '/r016', 6, datetime('now'), datetime('now'));

-- count=6 (frequency rank #17)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-017-入金', '入金', '✅ アカウントID: **[ID]**

ご希望の入金額を選択してください。', 'ja', '/r017', 6, datetime('now'), datetime('now'));

-- count=6 (frequency rank #18)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-018-入金-コンビニ', '入金-コンビニ', '✅ **入金申請受付完了**

💰 **金額**: ¥[AMT]
🆔 **アカウント**: [ID]

⏳ **決済番号発行中...**
約10分程度お時間をいただきます。
発行完了次第、こちらのチャットにてお知らせいたします。', 'ja', '/r018', 6, datetime('now'), datetime('now'));

-- count=5 (frequency rank #19)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-019-入金-銀行', '入金-銀行', '⏳ 入金が反映されない場合

**確認事項:**
1. 入金申請を先に行いましたか？
2. 正しい口座に振り込みましたか？
3. 振込名義は正しいですか？

**通常の反映時間:**
- 銀行振込: 30分～数時間
- 仮想通貨: 数分～数時間

上記を確認しても解決しない場合は、オペレーターにお問い合わせください。', 'ja', '/r019', 5, datetime('now'), datetime('now'));

-- count=5 (frequency rank #20)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-020-その他', 'その他', '**明細書のお写真** または **スクリーンショット** をお送りください📷

（振込人名・金額・日時が確認できるもの）', 'ja', '/r020', 5, datetime('now'), datetime('now'));

-- count=5 (frequency rank #21)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-021-その他', 'その他', '❓ よくある質問(FAQ)

どのカテゴリの質問をお探しですか？', 'ja', '/r021', 5, datetime('now'), datetime('now'));

-- count=5 (frequency rank #22)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-022-待機案内', '待機案内', 'お待たせいたしました。   
アカウントを更新いたしましたのでご確認くださいませ！', 'ja', '/r022', 5, datetime('now'), datetime('now'));

-- count=5 (frequency rank #23)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-023-入金-銀行', '入金-銀行', '🏦 自動銀行振込・仮想通貨での出金

以下のリンクから出金手続きが可能です。

👉 出金ページ: https://sloten.io/withdraw

**手順:**
1. 上記リンクから出金ページにアクセス
2. 出金方法（銀行振込 or 仮想通貨）を選択
3. 出金額を入力して申請

出金は通常、申請後24時間～72時間以内に処理されます。', 'ja', '/r023', 5, datetime('now'), datetime('now'));

-- count=5 (frequency rank #24)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-024-待機案内', '待機案内', '順番に対応させて頂いておりますのしばらくお待ちください。', 'ja', '/r024', 5, datetime('now'), datetime('now'));

-- count=5 (frequency rank #25)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-025-待機案内', '待機案内', '確認させて頂きますので少々お待ちください。', 'ja', '/r025', 5, datetime('now'), datetime('now'));

-- count=4 (frequency rank #26)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-026-入金', '入金', '✅ アカウントID: **pipibob**

ご希望の入金額を選択してください。', 'ja', '/r026', 4, datetime('now'), datetime('now'));

-- count=4 (frequency rank #27)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-027-待機案内', '待機案内', '恐れ入りますお時間を要する場合がございます。 ご不安かと思われますがお手数ですが反映をお待ちくださいませ。🤲', 'ja', '/r027', 4, datetime('now'), datetime('now'));

-- count=4 (frequency rank #28)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-028-入金-銀行', '入金-銀行', '⏳ 出金が届かない場合

**確認事項:**
1. 出金申請のステータスを確認してください
2. 登録した口座情報は正しいですか？

**通常の処理時間:**
出金は申請後24時間～72時間以内に処理されます。

上記を確認しても解決しない場合は、オペレーターにお問い合わせください。', 'ja', '/r028', 4, datetime('now'), datetime('now'));

-- count=4 (frequency rank #29)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-029-入金-銀行', '入金-銀行', '下記の口座へお振込みをお願いいたします。

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

※ **土曜、日曜**は着金確認に**1時間以上お待ち頂く場合があります**ので予めご了承ください。', 'ja', '/r029', 4, datetime('now'), datetime('now'));

-- count=4 (frequency rank #30)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-030-入金-確認', '入金-確認', '送金完了後、以下の2点をお送りください：

**1）取引番号** → テキストでコピー＆ペースト
**2）スクリーンショット** → 取引詳細画面の画像

※取引番号は数字20桁程度の番号です。', 'ja', '/r030', 4, datetime('now'), datetime('now'));

-- count=4 (frequency rank #31)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-031-待機案内', '待機案内', 'お待たせしております。  
順番にご対応させていただいておりますので今しばらくお待ち下さいませ。', 'ja', '/r031', 4, datetime('now'), datetime('now'));

-- count=4 (frequency rank #32)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-032-入金', '入金', 'ありがとうございます✨
アカウントID: **tennemoto**

次に、**入金金額**を入力してください。
（[AMT]円〜[AMT]円）', 'ja', '/r032', 4, datetime('now'), datetime('now'));

-- count=4 (frequency rank #33)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-033-その他', 'その他', '🎮 ゲームについてですね。

どのようなことをお知りになりたいですか？', 'ja', '/r033', 4, datetime('now'), datetime('now'));

-- count=4 (frequency rank #34)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-034-入金', '入金', 'ありがとうございます✨
アカウントID: **about**

次に、**入金金額**を入力してください。
（[AMT]円〜[AMT]円）', 'ja', '/r034', 4, datetime('now'), datetime('now'));

-- count=4 (frequency rank #35)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-035-待機案内', '待機案内', 'お待たせいたしました。   
確認したところ対応中ですのでもう少しお待ちください。', 'ja', '/r035', 4, datetime('now'), datetime('now'));

-- count=4 (frequency rank #36)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-036-入金', '入金', 'ありがとうございます✨
アカウントID: **dali562929**

次に、**入金金額**を入力してください。
（[AMT]円〜[AMT]円）', 'ja', '/r036', 4, datetime('now'), datetime('now'));

-- count=3 (frequency rank #37)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-037-入金-銀行', '入金-銀行', 'ご入金ありがとうございます✨

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
※しばらく経っても反映されない場合は、お気軽にお問い合わせください📩', 'ja', '/r037', 3, datetime('now'), datetime('now'));

-- count=3 (frequency rank #38)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-038-入金', '入金', 'ありがとうございます✨
アカウントID: **ken2711pro**

次に、**入金金額**を入力してください。
（[AMT]円〜[AMT]円）', 'ja', '/r038', 3, datetime('now'), datetime('now'));

-- count=3 (frequency rank #39)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-039-入金', '入金', 'ありがとうございます✨
アカウントID: **doradesu**

次に、**入金金額**を入力してください。
（[AMT]円〜[AMT]円）', 'ja', '/r039', 3, datetime('now'), datetime('now'));

-- count=3 (frequency rank #40)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-040-ボーナス', 'ボーナス', '🎁 ボーナス・プロモーションについてですね。

どのような情報をお探しですか？', 'ja', '/r040', 3, datetime('now'), datetime('now'));

-- count=3 (frequency rank #41)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-041-入金-完了', '入金-完了', 'ご入金ありがとうございます。   
確認させて頂きますので少々お待ちください。', 'ja', '/r041', 3, datetime('now'), datetime('now'));

-- count=3 (frequency rank #42)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-042-入金-PayPay', '入金-PayPay', 'ご不便をおかけしておりますが、現在PayPayでの出金はご利用出来ません。

代替といたしまして、銀行振り込みもしくは仮想通貨での出金が可能となっておりますので、出金ページより、銀行振り込み（自働）または仮想通貨をご選択いただきご出金申請の提出をお願い致します。', 'ja', '/r042', 3, datetime('now'), datetime('now'));

-- count=3 (frequency rank #43)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-043-その他', 'その他', '❌ アカウントIDは英数字3〜20文字で入力してください。

例: syt2525m, [ID], hiromu', 'ja', '/r043', 3, datetime('now'), datetime('now'));

-- count=2 (frequency rank #44)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-044-待機案内', '待機案内', 'ご確認いたしますので少々お待ちくださいませ。', 'ja', '/r044', 2, datetime('now'), datetime('now'));

-- count=2 (frequency rank #45)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-045-入金-銀行', '入金-銀行', '振込人名: **タケナカ　レンタロウ** で承りました✅

お振込みが完了しましたら、
**明細書のお写真** または **スクリーンショット** をこちらのチャットにお送りください📷

（振込人名・金額・日時が確認できるもの）', 'ja', '/r045', 2, datetime('now'), datetime('now'));

-- count=2 (frequency rank #46)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-046-その他', 'その他', '調整いたしましたので、ご確認くださいませ！', 'ja', '/r046', 2, datetime('now'), datetime('now'));

-- count=2 (frequency rank #47)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-047-入金', '入金', 'ありがとうございます✨
アカウントID: **20000円**

次に、**入金金額**を入力してください。
（[AMT]円〜[AMT]円）', 'ja', '/r047', 2, datetime('now'), datetime('now'));

-- count=2 (frequency rank #48)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-048-入金', '入金', 'ありがとうございます✨
アカウントID: **ugpnw**

次に、**入金金額**を入力してください。
（[AMT]円〜[AMT]円）', 'ja', '/r048', 2, datetime('now'), datetime('now'));

-- count=2 (frequency rank #49)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-049-入金-銀行', '入金-銀行', '振込人名: **ナカクラタイシ** で承りました✅

お振込みが完了しましたら、
**明細書のお写真** または **スクリーンショット** をこちらのチャットにお送りください📷

（振込人名・金額・日時が確認できるもの）', 'ja', '/r049', 2, datetime('now'), datetime('now'));

-- count=2 (frequency rank #50)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-050-入金', '入金', 'ありがとうございます✨
アカウントID: **15000円**

次に、**入金金額**を入力してください。
（[AMT]円〜[AMT]円）', 'ja', '/r050', 2, datetime('now'), datetime('now'));

-- count=2 (frequency rank #51)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-051-入金', '入金', 'ありがとうございます✨
アカウントID: **ravege2**

次に、**入金金額**を入力してください。
（[AMT]円〜[AMT]円）', 'ja', '/r051', 2, datetime('now'), datetime('now'));

-- count=2 (frequency rank #52)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-052-待機案内', '待機案内', 'お待たせいたしました。   
対応中ですのでしばらくお待ちください。', 'ja', '/r052', 2, datetime('now'), datetime('now'));

-- count=2 (frequency rank #53)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-053-入金', '入金', 'ありがとうございます✨
アカウントID: **yoshto**

次に、**入金金額**を入力してください。
（[AMT]円〜[AMT]円）', 'ja', '/r053', 2, datetime('now'), datetime('now'));

-- count=2 (frequency rank #54)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-054-入金', '入金', 'ありがとうございます✨
アカウントID: **sgz4r6hbb**

次に、**入金金額**を入力してください。
（[AMT]円〜[AMT]円）', 'ja', '/r054', 2, datetime('now'), datetime('now'));

-- count=2 (frequency rank #55)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-055-入金-銀行', '入金-銀行', '振込人名: **イイノヒロツグ** で承りました✅

お振込みが完了しましたら、
**明細書のお写真** または **スクリーンショット** をこちらのチャットにお送りください📷

（振込人名・金額・日時が確認できるもの）', 'ja', '/r055', 2, datetime('now'), datetime('now'));

-- count=2 (frequency rank #56)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-056-入金-銀行', '入金-銀行', '振込人名: **ミゾロキ　カズマ** で承りました✅

お振込みが完了しましたら、
**明細書のお写真** または **スクリーンショット** をこちらのチャットにお送りください📷

（振込人名・金額・日時が確認できるもの）', 'ja', '/r056', 2, datetime('now'), datetime('now'));

-- count=2 (frequency rank #57)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-057-入金', '入金', 'ありがとうございます✨
アカウントID: **keirin**

次に、**入金金額**を入力してください。
（[AMT]円〜[AMT]円）', 'ja', '/r057', 2, datetime('now'), datetime('now'));

-- count=2 (frequency rank #58)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-058-その他', 'その他', '金額は **[AMT]円〜[AMT]円** の範囲で入力してください。
（例: 10000）', 'ja', '/r058', 2, datetime('now'), datetime('now'));

-- count=2 (frequency rank #59)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-059-待機案内', '待機案内', '確認させて頂きますので少々お待ちくださいませ。', 'ja', '/r059', 2, datetime('now'), datetime('now'));

-- count=2 (frequency rank #60)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-060-トラブル', 'トラブル', '現在、スロット天国にログインできない事象について、複数のお客様よりお問い合わせをいただいております。  
当サイトでも、原因の調査を進めております。

ご不便をおかけしておりますこと、深くお詫び申し上げます。  
恐れ入りますが、状況改善まで今しばらくお待ちくださいますようお願いいたします。', 'ja', '/r060', 2, datetime('now'), datetime('now'));

-- count=2 (frequency rank #61)
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES (
  'tenant_default', 'real-061-その他', 'その他', '金額は **[AMT]円〜[AMT]円** の範囲で入力してください。
（例: 5000）', 'ja', '/r061', 2, datetime('now'), datetime('now'));
