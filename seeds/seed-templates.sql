-- @idempotent — seed-templates.sql (Phase φ)
-- 40 staff-quick-reply templates across 8 categories for sloten.io operations.
-- Re-running is safe (DELETE by tenant_id + name uniqueness via DELETE-then-INSERT).

DELETE FROM templates WHERE tenant_id = 'tenant_default' AND name LIKE 'tpl-%';

-- ==========================================================
-- 1. 入金 / Deposit (5 件)
-- ==========================================================
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES
('tenant_default', 'tpl-deposit-confirm', '入金', 'ご入金いただきありがとうございます。\n現在、入金確認中ですので、反映まで数分〜30分ほどお待ちくださいませ。\n反映され次第、ご利用いただけます。', 'ja', '/dep-ok', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-deposit-pending', '入金', 'ご入金の確認が取れておりません。\n以下をご確認ください:\n・送金完了画面のスクリーンショット\n・送金日時とご入金額\n・取引番号（あれば）\nお手数ですがチャットにお送りください。', 'ja', '/dep-pending', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-deposit-failed', '入金', 'ご入金に失敗されているようです。誠に申し訳ございません。\nお支払い元の銀行・決済サービスから返金処理が行われている可能性があります。\n3〜5営業日ほどお待ちいただき、返金されない場合は再度ご連絡ください。', 'ja', '/dep-fail', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-deposit-method-list', '入金', 'スロット天国の入金方法は以下に対応しております:\n・銀行振込（即時反映）\n・PayPay\n・コンビニ入金（ローソン）\n・仮想通貨（BTC / ETH 等）\n・ATM入金\nメニューの「💰 入金・出金」からお進みください。', 'ja', '/dep-method', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-deposit-min-max', '入金', '各入金方法の上限・下限は以下の通りです:\n・銀行振込: 最低 ¥3,000 / 上限なし\n・PayPay: 最低 ¥1,000 / 上限 ¥100,000/日\n・コンビニ: 最低 ¥3,000 / 上限 ¥300,000/回\n・仮想通貨: 最低相当額 ¥3,000 / 上限なし\n詳細はメニューをご確認ください。', 'ja', '/dep-limit', 0, datetime('now'), datetime('now'));

-- ==========================================================
-- 2. 出金 / Withdrawal (5 件)
-- ==========================================================
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES
('tenant_default', 'tpl-withdrawal-received', '出金', '出金申請を承りました。\n通常24時間以内（土日祝除く）に処理させていただきます。\n進捗はマイページの「出金履歴」からご確認いただけます。', 'ja', '/wd-recv', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-withdrawal-pending', '出金', '出金処理を進めております。\n現在、混雑により通常より時間を要しており、申し訳ございません。\nおおむね本日中には処理完了予定です。', 'ja', '/wd-pending', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-withdrawal-need-kyc', '出金', '出金にあたり本人確認(KYC)が必要となります。\nマイページ→「本人確認」より以下をアップロードしてください:\n・身分証（運転免許証・パスポート・マイナンバーカードのいずれか）\n・住所確認書類（公共料金請求書など、3ヶ月以内発行）', 'ja', '/wd-kyc', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-withdrawal-min', '出金', '出金最低額は以下の通りです:\n・銀行振込: ¥3,000\n・仮想通貨: 相当額 ¥3,000\n・PayPay: ¥1,000\n上記未満の残高は次回出金時に合算してお引き出しください。', 'ja', '/wd-min', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-withdrawal-bonus-condition', '出金', 'ボーナス利用の出金には、賭け条件のクリアが必要です。\nマイページ→「ボーナス履歴」で各ボーナスの賭け条件達成率をご確認いただけます。\n100% に達してから出金申請をお願いいたします。', 'ja', '/wd-bonus', 0, datetime('now'), datetime('now'));

-- ==========================================================
-- 3. KYC / 本人確認 (4 件)
-- ==========================================================
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES
('tenant_default', 'tpl-kyc-required', 'KYC', '本人確認(KYC)書類のご提出をお願いいたします。\n以下からそれぞれ1点ずつアップロードしてください:\n【身分証】運転免許証 / パスポート / マイナンバーカード\n【住所証明】公共料金請求書 / 銀行明細 / 住民票（3ヶ月以内）\nぼやけや反射のない、文字がはっきり読める画像でお願いいたします。', 'ja', '/kyc-req', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-kyc-approved', 'KYC', '本人確認手続きが完了いたしました。\nご協力ありがとうございます。\n出金や追加入金など、すべての機能をご利用いただけます。', 'ja', '/kyc-ok', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-kyc-rejected', 'KYC', 'お送りいただいた書類について、確認が取れない箇所がございました。\n以下を再度ご確認のうえアップロードをお願いいたします:\n・四隅すべてが画像内に収まっていること\n・氏名・生年月日が鮮明に読めること\n・有効期限内であること', 'ja', '/kyc-ng', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-kyc-time', 'KYC', '本人確認の審査はおおむね24時間以内（営業時間内）に完了いたします。\n混雑時は最大72時間お待ちいただく場合がございます。\n進捗はマイページの「本人確認ステータス」からご確認ください。', 'ja', '/kyc-time', 0, datetime('now'), datetime('now'));

-- ==========================================================
-- 4. ボーナス / Bonus (5 件)
-- ==========================================================
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES
('tenant_default', 'tpl-bonus-welcome', 'ボーナス', 'ご登録ありがとうございます！\nお客様限定の入金不要ボーナスをご用意しております。\n詳細はマイページ→「ボーナス」からご確認ください。', 'ja', '/bonus-welcome', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-bonus-wagering', 'ボーナス', '賭け条件は「ボーナス額 × 倍率」で計算されます。\n例: ¥1,000 ボーナス × 30倍 = ¥30,000 のベットが必要\nクリア状況はマイページ→「ボーナス履歴」でリアルタイム確認できます。', 'ja', '/bonus-wager', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-bonus-expired', 'ボーナス', 'ボーナスの有効期限は付与から30日間となっております。\n期限切れのボーナスは自動的に消滅し、復活はできません。\n申し訳ございませんが、新しいボーナス取得をご検討ください。', 'ja', '/bonus-exp', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-bonus-code-invalid', 'ボーナス', 'お送りいただいたボーナスコードは無効、または既に使用済みです。\nご確認いただきたい点:\n・大文字・小文字が正しいか\n・有効期限内か\n・お一人様1回限定でないか\n再度コードをご確認のうえお試しください。', 'ja', '/bonus-bad', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-bonus-disabled-game', 'ボーナス', 'ボーナス利用中は一部のゲームが対象外となります。\n対象外ゲームでのベットは賭け条件に加算されません。\n対象ゲーム一覧はマイページ→「ボーナス利用規約」をご確認ください。', 'ja', '/bonus-game', 0, datetime('now'), datetime('now'));

-- ==========================================================
-- 5. トラブル / Trouble (5 件)
-- ==========================================================
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES
('tenant_default', 'tpl-trouble-game-stuck', 'トラブル', 'ゲームが固まってしまった場合、まず以下をお試しください:\n1. ブラウザを完全に閉じてから再度ログイン\n2. 別のブラウザ（Chrome / Safari など）で試す\n3. キャッシュクリア\n上記で解決しない場合、ベット履歴を確認のうえ対応いたしますので、ゲーム名・時刻をお教えください。', 'ja', '/trouble-game', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-trouble-login', 'トラブル', 'ログインできない場合、以下をご確認ください:\n1. メールアドレス（または電話番号）の入力ミスがないか\n2. パスワードの大文字・小文字\n3. パスワードを忘れた場合: ログイン画面「パスワードを忘れた方」からリセット\n上記で解決しない場合、ご登録のメール/電話番号をお教えください。', 'ja', '/trouble-login', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-trouble-balance', 'トラブル', '残高に不一致がある可能性のご報告ありがとうございます。\nベット履歴を確認のうえ詳細を調査いたします。\n以下をお教えください:\n・お気づきになった日時\n・該当のゲーム名\n・想定残高と実際の残高の差額', 'ja', '/trouble-bal', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-trouble-2fa', 'トラブル', '2段階認証(2FA)コードが届かない場合:\n1. 迷惑メールフォルダをご確認ください\n2. SMSの場合、電波状況をご確認ください\n3. 数分待っても届かない場合、再送信ボタンを押してください\n上記でも解決しない場合、登録メール/電話番号をお教えください。', 'ja', '/trouble-2fa', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-trouble-payment-stuck', 'トラブル', '決済処理が進まず申し訳ございません。\nお支払い元（銀行・PayPay・コンビニ）側で完了している場合、最大30分ほどで反映されます。\nそれ以上経過しても反映されない場合、取引番号と決済完了画面の写真をお送りください。', 'ja', '/trouble-pay', 0, datetime('now'), datetime('now'));

-- ==========================================================
-- 6. 案内 / Guidance (5 件)
-- ==========================================================
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES
('tenant_default', 'tpl-guide-vip', '案内', 'VIPプログラムへのご案内です。\n月間ベット額に応じて以下の特典をご用意しております:\n・キャッシュバック率アップ\n・専用カスタマーサポート\n・誕生日ボーナス\n・限定キャンペーン招待\n詳細はマイページ→「VIPステータス」からご確認ください。', 'ja', '/guide-vip', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-guide-tournament', '案内', '現在、トーナメント開催中です！\n参加方法:\n1. マイページ→「トーナメント」→ 参加登録\n2. 対象ゲームをプレイ\n3. リアルタイムランキングを確認\n上位入賞で豪華賞金をゲット！詳細は告知ページをご覧ください。', 'ja', '/guide-tourn', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-guide-business-hours', '案内', '弊社カスタマーサポートの対応時間は以下となっております:\n・チャット: 10:00 - 26:00 (JST) 年中無休\n・メール: 24時間受付（返信は営業時間内）\n営業時間外のお問い合わせには順次対応いたします。', 'ja', '/guide-hours', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-guide-app', '案内', 'スマートフォンアプリのご案内:\nブラウザでスロット天国にアクセスいただくだけで、デスクトップ・モバイルどちらも快適にお楽しみいただけます。\n専用アプリのインストールは不要です。', 'ja', '/guide-app', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-guide-rg-self-exclusion', '案内', 'ご自身のプレイをコントロールするためのツールをご用意しております:\n・入金上限の設定\n・ベット上限の設定\n・損失上限の設定\n・自己除外（クールダウン期間設定）\nマイページ→「責任あるギャンブル」からご利用いただけます。', 'ja', '/guide-rg', 0, datetime('now'), datetime('now'));

-- ==========================================================
-- 7. お詫び / Apology (4 件)
-- ==========================================================
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES
('tenant_default', 'tpl-apology-wait', 'お詫び', '長らくお待たせし、申し訳ございません。\nただいまお調べしておりますので、もう少々お待ちください。', 'ja', '/sorry-wait', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-apology-incident', 'お詫び', 'この度はご不便をおかけし、誠に申し訳ございません。\n現在、技術チームにて原因調査と復旧作業を進めております。\n進捗が確認でき次第、改めてご連絡いたします。', 'ja', '/sorry-issue', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-apology-misunderstanding', 'お詫び', 'こちらの説明不足により、ご不快な思いをさせてしまい誠に申し訳ございません。\n改めて正しい内容をご案内させていただきます。', 'ja', '/sorry-misun', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-apology-feature-unavailable', 'お詫び', '申し訳ございません。現在、その機能は提供しておりません。\n今後の機能追加に関するご要望として、開発チームへ申し送りさせていただきます。\n貴重なご意見ありがとうございます。', 'ja', '/sorry-noimpl', 0, datetime('now'), datetime('now'));

-- ==========================================================
-- 8. クロージング / Closing (4 件)
-- ==========================================================
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES
('tenant_default', 'tpl-close-resolved', 'クロージング', 'ご利用ありがとうございました。\n問題が解決できたようで安心いたしました。\n他にご不明な点がございましたら、いつでもお声がけください。\nスロット天国を引き続きお楽しみくださいませ。', 'ja', '/close-ok', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-close-followup', 'クロージング', '本件、後ほど担当部署から改めてご連絡させていただきます。\nお時間をいただき申し訳ございませんが、よろしくお願いいたします。', 'ja', '/close-fu', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-close-thanks-vip', 'クロージング', 'いつもスロット天国をご愛顧いただき、誠にありがとうございます。\nVIPカスタマーサポートとして、引き続き全力でサポートさせていただきます。', 'ja', '/close-vip', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-close-csat', 'クロージング', '本日はお時間をいただきありがとうございました。\nもしよろしければ、対応に関する評価をお聞かせください。\nいただいたフィードバックは今後のサービス改善に活用させていただきます。', 'ja', '/close-csat', 0, datetime('now'), datetime('now'));

-- ==========================================================
-- 9. 英語版 (English) (3 件) — 多言語サポート用 starter
-- ==========================================================
INSERT INTO templates (tenant_id, name, category, content, language, shortcut, usage_count, created_at, updated_at) VALUES
('tenant_default', 'tpl-en-greeting', 'English', 'Hello and thank you for contacting Sloten Customer Support!\nHow may we assist you today?', 'en', '/en-hi', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-en-deposit-confirm', 'English', 'Thank you for your deposit. We are currently confirming the transaction.\nIt should be reflected in your account within 30 minutes. Please wait a moment.', 'en', '/en-dep', 0, datetime('now'), datetime('now')),
('tenant_default', 'tpl-en-kyc', 'English', 'For account verification (KYC), please upload the following documents from your account page:\n1. ID document (passport, driver license, or national ID)\n2. Proof of address (utility bill, bank statement, issued within 3 months)', 'en', '/en-kyc', 0, datetime('now'), datetime('now'));

-- 計 40 件の seed templates 投入完了
