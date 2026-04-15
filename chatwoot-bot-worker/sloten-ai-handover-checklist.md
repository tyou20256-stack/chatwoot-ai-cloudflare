# スロット天国 AI CSシステム 引き継ぎ確認事項リスト（v2対応版）

**宛先:** tking510 様（納品側）
**作成:** 2026-04-13
**対象納品物:** `スロット天国_AI_CS_納品パッケージ_v2.zip`
**目的:** 引き継ぎ後の本番ローンチに向けた確認・依頼事項

---

## 0. v2納品への謝意と進捗確認

v2納品にて以下の大幅な改善を確認いたしました。ありがとうございます。

- 設計書: 17→19本（`18-CS-STAFF-MANUAL.md`, `19-PRODUCTION-MIGRATION.md` 追加）
- 実装コード: 6→21ファイル（CS機能8モジュール追加）
- マイグレーション: `production-full.sql`（43テーブル一括、750行）整備
- UI: 画像添付対応ウィジェット追加
- ユニットテスト: 68件追加（emotion-engine）
- 品質スコア: 78→83点

以下は v2 時点でも残存している確認事項です。

---

## 1. 納品物の整合性確認（v2残存）

### 1.1 FAQ実体ファイルの不整合

| 項目 | 納品書記載 | 実体ファイル | 確認事項 |
|------|------------|--------------|----------|
| FAQ日本語 | **172件** | `データ/FAQ_50件_日本語.json` (50件) | 残り122件の納品状況 |
| FAQ英語 | **25件** | 実ファイル**未同梱** | 英語FAQファイルの納品予定 |
| 合計 | **197件** | — | production-full.sql に同梱か、別途納品か |

- [ ] `production-full.sql` 内の `INSERT INTO faq` で197件すべて投入されるか確認
- [ ] 別途 JSON ファイルで納品の場合、タイミングをご教示
- [ ] ファイル名が `FAQ_50件_日本語.json` のままなのは意図通りか

### 1.2 設計書とコードの整合性

- [ ] **Geminiモデル名の統一**
  - 納品書: `Gemini 2.5 Flash Lite`
  - コード冒頭コメント: `Gemini 2.0 Flash`
  - 正確なモデル名の確定

- [ ] **Vectorize binding の不在**
  - 設計書 `02-ARCHITECTURE.md` で要求
  - `wrangler.toml` に `[[vectorize]]` 定義なし
  - FAQ 197件運用時のトークン上限対策（単純プロンプト埋め込みで賄う想定か、RAG導入予定か）

---

## 2. Phase 3（本番デプロイ）の支援

### 2.1 アカウント・権限の引き継ぎ

- [ ] **Cloudflareアカウント情報**
  - tking510アカウントのチーム管理者権限を弊社側で取得可能か
  - もしくは個別ユーザー追加でアクセス権付与可能か

- [ ] **本番環境のリソース一覧**
  - 本番D1データベースID（ステージング ID: `6d7d621c-8b4f-4211-9d97-848e05a5535c` / staging: `5bd7a51f-6e52-454b-b7ad-2614ee314098` は確認済み）
  - 本番Worker名と公開URL
  - 関連するDNSレコード・カスタムドメイン

### 2.2 デプロイ伴走

- [ ] 本番デプロイ作業の伴走（納品書記載「所要時間約1時間」）
  - 日時候補: ご都合の良い平日昼間で2〜3時間
  - 想定作業: `production-full.sql` 適用、secret設定、`wrangler deploy`、シャドーモード起動、動作確認

- [ ] **デプロイ後の障害対応窓口**
  - 初期2週間の連絡先（Slack、メール、Telegram等）
  - 緊急時の応答SLA（例: 平日2時間以内、24h以内等）

### 2.3 追加引き渡し物

- [ ] 必要な環境変数・secretの一覧（`wrangler secret put` するキー名一式）
- [ ] BigQuery関連の認証情報設定方法（`bigquery.mjs` / `bq-chat-integration.mjs` 関連）
- [ ] 画像認識機能（`image-analyzer.mjs`）の Gemini Vision 利用上限設定

---

## 3. セキュリティCritical対応の責任分界（v2残存）

v2でも以下のCritical項目は**未修正**を確認いたしました。対応責任をご確認ください。

### C1. `/api/ai/toggle` `/api/ai/stats` に認証なし【v2でも未修正】

- 該当: `ai-chat-handler.mjs:1169` `handleAIToggle`、`:1211` `handleAIStatsEndpoint`
- 現状: Bearer / Authorization 検証コードなし
- リスク: 第三者がAI機能を任意にON/OFF可能（DoS）
- 対応案: Bearer token認証 + IP allowlist
- **責任分界:** [ ] 納品側で対応 / [ ] 弊社側で対応

### C2. Gemini APIキーをURLクエリに埋め込み【v2でも未修正】

- 該当: `ai-chat-handler.mjs:294` `fetch(\`${GEMINI_API_URL}?key=${apiKey}\`)`
- リスク: Cloudflareログ・エラーメッセージ経由で漏洩
- 対応案: `x-goog-api-key` ヘッダー方式に変更（1行修正）
- **責任分界:** [ ] 納品側で対応 / [ ] 弊社側で対応

### C3. ボーナスコード値の取り扱い

- v2で `prompts.mjs` からボーナスコード平文埋め込みが見当たらず、別モジュール化された可能性
- [ ] 現状のボーナスコード受け渡し経路の開示（どのモジュールで値を扱い、システムプロンプトに含まれるか）
- リスク: プロンプトインジェクション攻撃でボーナスコード一覧漏洩
- 対応案: コード値を `<BONUS:XXX>` プレースホルダー化、出力時にD1で実値検証して置換
- **責任分界:** [ ] 納品側で対応 / [ ] 弊社側で対応
- **業界特性:** カジノ業界で最重要。Air Canada訴訟事例あり

### C4. CORS Origin制限なし【v2でも未確認】

- ハンドラ内に `Access-Control-Allow-Origin` allowlist 実装が見当たらず
- リスク: 任意サイトから呼び出し可能、CSRF
- 対応案: `sloten.io` / `*.sloten.io` のみ許可
- **責任分界:** [ ] 納品側で対応 / [ ] 弊社側で対応

### C5. プロンプトインジェクション検知の強化

- 現状: `INJECTION_PATTERNS` 正規表現ベース
- リスク: Base64/全角変換/第三言語/Unicode類似字でバイパス可能
- 対応案: Gemini `safetySettings: BLOCK_MEDIUM_AND_ABOVE` + LLM judge 二段判定
- **責任分界:** [ ] 納品側で対応 / [ ] 弊社側で対応

---

## 3.5 v2コードレビューで新規検出した Critical（6件・追加確認事項）

弊社側の専門エージェントレビューで v2新規モジュールから以下の Critical を追加検出しました。設計意図の開示と対応方針の合意をお願いいたします。

### N1. キャンペーン FAQ の承認ゲート不在

- 該当: `campaigns.mjs:73-84, 286-347`
- 現状: `POST /api/campaigns` が `campaignToFAQ` 経由で `is_active=1` のまま faq テーブルへ即書込
- リスク: 誤記・誤ったボーナス条件・誤った賭け条件が **Legal レビューなしに** AI 応答として即時公開される
- 確認事項:
  - [ ] 承認ワークフローの設計意図（即時反映が仕様か、レビュー工程を挟む予定か）
  - [ ] 推奨対応: `status='pending_review'` で保存 → 管理画面から承認後に `is_active=1` へ遷移
- **責任分界:** [ ] 納品側で対応 / [ ] 弊社側で対応

### N2. VIPキャッシュの per-isolate 不整合

- 該当: `vip-personalization.mjs:20-25`（`vipConfigCache`, `userVipCache` モジュールレベル）
- リスク: 不正調査などで VIP レベルをダウングレード / 凍結しても、isolate 内の stale キャッシュで**最大10分間 platinum 待遇が継続**。監査・コンプライアンスギャップ
- 確認事項:
  - [ ] セキュリティ関連 VIP 変更の即時反映要件
  - [ ] 推奨対応: KV バージョンキーで即時無効化、または security-sensitive 変更は TTL=0
- **責任分界:** [ ] 納品側で対応 / [ ] 弊社側で対応

### N3. `proactive-cs.mjs` のクライアント条件バイパス

- 該当: `proactive-cs.mjs:165-199` `matchCondition`
- 現状: `first_visit` / `time_based` / `behavior` 全てで常に `true` を返却、条件判定をクライアント任せ
- リスク: 任意ユーザーが `GET /api/proactive?context=bonus_expiring` 呼出で**ボーナス期限切れメッセージを偽発火**可能。不当表示（fair-play違反）リスク
- 確認事項:
  - [ ] 設計意図の確認（クライアント検証前提か）
  - [ ] サーバー側で D1 照会して検証する設計変更の可否
- **責任分界:** [ ] 納品側で対応 / [ ] 弊社側で対応

### N4. 入金ガイドと既存GAS入金フローの干渉

- 該当: `deposit-withdraw-guide.mjs:400` `handleDepositWithdrawFlow`
- 現状: `conversation.status='open'`（GAS処理中）の判定なし
- リスク: PayPay/銀行/EC 入金フロー中に AI が「入金」キーワードに反応し、GAS の案内と競合して**ダブル決済案内**を出す
- 弊社側対応: パッチ準備済み（`options.conversationStatus === 'open'` で早期 return）、適用予定
- 確認事項:
  - [ ] パッチ方針の妥当性（既存 GAS 側の status 定義との整合）
  - [ ] Chatwoot webhook payload の `conversation.status` フィールド名確認
- **責任分界:** [ ] 納品側で設計反映 / [x] 弊社側でパッチ先行適用

### N5. `image-analyzer.mjs` のレート制限不在

- 該当: `image-analyzer.mjs` 全体（トークンバケット未実装）
- リスク: Gemini Vision API は有料・15秒 timeout を保持。悪意ユーザーが 5MB画像を連投すると **API コスト DoS + Worker リソース枯渇**
- 確認事項:
  - [ ] 想定画像送信 QPS / 上限値
  - [ ] 推奨対応: KV トークンバケット（例: 5枚/分/conversation_id）
- **責任分界:** [ ] 納品側で対応 / [ ] 弊社側で対応

### N6. エスカレーション通知の PII 漏洩

- 該当: `escalation.mjs:281-331` `sendTelegramNotification`
- 現状: `aiSummary` と `userMessage` 全文を Telegram に送信。会話中の氏名・メール・口座番号等が verbatim で転送される
- リスク: Telegram サーバーに PII が保管され、データ処理範囲外。**GDPR / 個人情報保護法 / N138/1 の違反リスク**
- 確認事項:
  - [ ] Telegram 通知の運用目的（PII 送信の必要性）
  - [ ] 代替案: PII マスク済み要約のみ送信 + 詳細は管理画面で確認
- **責任分界:** [ ] 納品側で対応 / [ ] 弊社側で対応

### 参考: その他の High / Medium

以下は Critical 未満ですが、ローンチ前の改善を推奨いたします。

- `emotion-engine.mjs:210-212` neutral 閾値 0.03 で感情判定が即発火（`/全然/` 等の誤検知）
- `escalation.mjs:228-256` UPSERT+SELECT TOCTOU で 3回連続判定が重複トリガー
- `escalation-integration.mjs:114` クライアント提供 `conversationHistory` 信頼で強制エスカレ偽装可能
- `ab-testing.mjs:8,258` `MIN_FEEDBACK_COUNT=50` は統計的に過小（推奨 200-300/arm）
- `ab-testing.mjs:44-53` djb2 ハッシュの sequential session ID 偏り
- `vip-personalization.mjs:276-324` VIP設定書込エンドポイントの認証要確認（`custom_system_prompt_suffix` 注入リスク）
- `deposit-withdraw-guide.mjs:336` `sessionStates` Map が isolate cold start で喪失 → `getMethodById(null)` でクラッシュ可能性（弊社側で null ガード stopgap 準備済、本質解決は KV/DO 移行）
- `image-analyzer.mjs:82` MIME 正規表現が SVG を受理（弊社側パッチで allowlist 化）

---

## 3.6 v2納品パッケージの欠落ファイル（N7・最優先）

弊社側で v2 パッケージを作業用環境に展開して確認したところ、以下の**エントリポイントおよびハンドラ実装が同梱されていない**ことが判明いたしました。納品側の現行稼働 Worker（`chatwoot-ai-gateway-staging.tik-betrnk.workers.dev`）では全エンドポイントが HTTP 200 で応答することを確認済みのため、**v2 zip 作成時の同梱漏れ**と推測しております。

### N7-1. ルーターエントリポイントの不在

- `wrangler.toml` で `main = "src/index.mjs"` が指定されているが、実体が v2 に含まれず
- 弊社側で最小ルーターを暫定作成済（Worker デプロイは成功）。ただし、納品側の実装と差分がある可能性
- [ ] `src/index.mjs`（または相当するエントリポイント）の追加納品

### N7-2. 管理画面が呼び出す API のハンドラ不在

管理画面 `UI/管理画面.html` は以下のエンドポイントを呼び出しますが、v2 同梱の `.mjs` ファイルには実装が存在せず:

| カテゴリ | 欠落エンドポイント |
|---|---|
| マルチテナント | `/api/tenants`, `/api/tenants/:id` |
| SLA | `/api/sla`, `/api/sla/:id`, `/api/sla/dashboard` |
| 監査 | `/api/audit-logs` |
| Webhook | `/api/webhooks`, `/api/webhooks/:id`, `/api/webhooks/deliveries`, `/api/webhooks/:id/test` |
| 営業時間 | `/api/business-hours`, `/api/business-hours/status` |
| 自動化 | `/api/automation-rules`, `/api/automation-rules/:id` |
| ダッシュボード | `/api/dashboard/stats` |
| FAQ管理 | `/api/faq`, `/api/faq/:id`, `/api/faq/search` |
| タグ/テンプレート | `/api/tags`, `/api/tags/:id`, `/api/templates`, `/api/templates/:id` |
| チャネル | `/api/channels`, `/api/channels/:id` |
| ユーザー | `/api/users` |
| 会話 | `/api/conversations`, `/api/conversations/:id`, `/api/conversations/search` |
| ファイル | `/api/files`, `/api/files/:id`, `/api/files/upload` |
| ボーナス | `/api/bonus-codes`, `/api/bonus-codes/:id`, `/api/bonus-code-usage` |
| ナレッジ | `/api/knowledge-sources`, `/api/knowledge-sources/:id` |
| シート連携 | `/api/sheet-integrations`, `/api/sheet-integrations/:id` |
| 分析 | `/api/analytics`, `/api/analytics/summary`, `/api/analytics/satisfaction` |

**合計: 約25系統、約40エンドポイント分のハンドラ実装**

- [ ] 各カテゴリ対応の `.mjs` ハンドラファイルの追加納品
- [ ] 納品欠落の理由・背景の開示（開発中 / 別リポジトリ管理 / 意図的除外 等）

### N7-3. 現状の弊社側対応

- v2 同梱分（AI / escalation / campaigns / VIP / A/B tests / proactive）のみの縮小版管理画面として `https://sloten-admin-secure.pages.dev` を運用予定
- **フル機能の管理画面運用は N7-1 + N7-2 の追加納品完了後**に再構築予定
- それまでの間、マルチテナント・FAQ 管理・監査ログ等の運用は納品側の `sloten-admin.pages.dev` を継続使用（ただし C1/C2/C4 未対応のまま公開状態）

---

## 4. データ保護・規制対応

### 4.1 Gemini API のデータ利用

- [ ] **データ利用 opt-out の現状**
  - 無料API（`generativelanguage.googleapis.com`）使用中の場合、Googleの学習データ利用可能性
  - 有料Vertex AI（`dataGovernance: NO_TRAINING`）への切替予定
  - GDPR/個人情報保護法対応の方針

### 4.2 PIIマスキング実装の証跡

- [ ] **送信前PIIマスキングのコード位置**
  - メール、電話番号、口座番号、カード番号下4桁、マイナンバーが Gemini に流れる前にマスクされているか
  - `sanitizeInput` は制御文字除去のみと見え、PIIマスキングは別実装か確認
  - 新規追加の `image-analyzer.mjs` で画像内PIIがGemini Visionに送信される経路のマスキング

### 4.3 ジョージアライセンス（N138/1）対応

- [ ] **20歳未満防止の実装**
  - 年齢ゲート（age gate）の技術実装
  - 自己申告 + RG検出時のクーリング期間

- [ ] **責任あるギャンブル（RG）検知**
  - `escalation.mjs` 内のキーワード検知リストの開示
  - エスカレーション先（誰が、いつ対応）
  - 14-OPS-WORKFLOW.md「30秒以内エスカレ」基準の実装位置

- [ ] **監査ログの90日保管**
  - 16-INCIDENT-RESPONSE.md 記載の保管要件の実装状況
  - `audit_logs` テーブル（v2で確認）の TTL ポリシー

---

## 5. 信頼性・運用設計の確認

### 5.1 サーキットブレーカー

- [ ] **per-isolate問題**
  - ES Module トップレベル変数 → isolate 間で共有されない
  - Durable Object / KV による共有状態化の予定

### 5.2 レート制限・コスト管理

- [ ] **設計書記載のレート制限の実装位置**
  - `16-INCIDENT-RESPONSE.md`: IP 60/分、user 30/分、AI 50/10分
  - 該当コードの開示
  - Cloudflare Rate Limiting Rules + KV カウンタの実装状況

- [ ] **コスト上限ガード**
  - 月次予算の上限額
  - 上限到達時の自動停止 or アラート
  - 過去のステージング実績（1日あたりのAPIコール数、トークン消費量）

### 5.3 監査・モニタリング

- [ ] **既設のモニタリング**
  - Langfuse、Helicone等のLLM観測ツール導入状況
  - エラーアラート通知先
  - ダッシュボードURL

---

## 6. ビジネス・KPI の合意

### 6.1 BUSINESS-PLAN.mdの試算検証

| 項目 | 納品書記載 | 弊社評価 |
|------|------------|----------|
| CS人件費削減 | ¥1,680万/年（8名→3名） | 1-2名分（¥400-700万/年）が現実的 |
| 収益貢献 | ¥3.6億/年 | 因果帰属困難、過大評価の懸念 |
| 損益分岐 | 3.4ヶ月 | 実コスト確定後に再算定必要 |
| 月次コスト | $5,000-10,000 と $65-265 で**3-4倍乖離** | 確定値の開示希望 |

- [ ] **コスト試算の確定**（ステージング実績ベース）
- [ ] **KPI定義の書面合意**
  - 自動解決率の定義
  - CSAT計測方法（`ab_test_feedback` テーブル等）
  - エージェント工数削減の測定方法

### 6.2 SLA・サポート契約

- [ ] **保守契約の有無**（引き継ぎ後の保守費用、対応範囲、機能追加見積もり要否）
- [ ] **本番化Phase 3の作業範囲**（納品書「約1時間」と実測見込みのすり合わせ）

---

## 7. 既存システムとの統合（並列運用前提）

弊社方針: 既存 `chatwoot-bot` Worker と納品 AI Worker の **並列運用** を採用予定。

### 7.1 既存Chatwoot Bot との通信

- [ ] **通信方式の推奨**
  - Service Binding（Cloudflare内部RPC）
  - HTTP fetch（外部API）
  - 認証方式（Bearer token、HMAC等）

- [ ] **AI応答が `input_select` ボタン構造に対応可能か**
  - AI応答にもボタン（解決した/オペレーター呼出/メインメニュー）を付けたい
  - レスポンス形式の柔軟性（`brand-router.mjs` で対応可能か）

### 7.2 入金フロー干渉防止

- [ ] **GAS BOT処理中（status=open）のAI無効化**
  - 既存システムでは PayPay/銀行/EC 入金フロー中は `open`
  - AI Worker もこの状態を尊重する設計か
  - 干渉時のフェイルセーフ

---

## 8. ステージング環境の引き継ぎ

### 8.1 アクセス情報（v2確認済み）

- チャットUI: `https://sloten-ai-test.pages.dev`
- 管理画面: `https://sloten-admin.pages.dev`
- API: `https://chatwoot-ai-gateway-staging.tik-betrnk.workers.dev`
- staging D1 ID: `5bd7a51f-6e52-454b-b7ad-2614ee314098`

- [ ] 管理画面ログイン情報、API認証トークンの引き継ぎ方法

### 8.2 ステージング継続運用

- [ ] **本番化後のステージング環境の扱い**（継続運用 or 停止、弊社側引き継ぎの場合のアカウント追加）

---

## 9. その他の確認事項

### 9.1 AIキャラクター（ひかり/まさと/あおい）

- [ ] 3キャラクターの使い分け運用方針
- [ ] ユーザー視点での選択可否
- [ ] キャラごとの学習データ・トーン設定の差分

### 9.2 BigQuery連携（v2で追加モジュール確認）

- [ ] `bigquery.mjs` / `bq-chat-integration.mjs` の必須度
- [ ] GCP費用負担
- [ ] PIIマスキング方針

### 9.3 新機能の運用ポリシー（v2追加分）

- [ ] **画像認識（`image-analyzer.mjs`）**: 受付画像サイズ上限、保存ポリシー、PII対応
- [ ] **A/Bテスト（`ab-testing.mjs`）**: テスト稼働中の3項目（トーン・長さ・絵文字）の運用判断者
- [ ] **VIPパーソナライゼーション**: bronze/silver/gold/platinum の判定ロジック・データソース
- [ ] **プロアクティブCS**: 4トリガー発火条件と停止/サイレント化手段
- [ ] **キャンペーン自動更新**: FAQ自動生成の承認フロー（即時反映 or レビュー必要）

### 9.4 多言語対応

- [ ] 現状: 日本語/英語
- [ ] 中国語、韓国語等の追加予定

### 9.5 知財・ライセンス

- [ ] コードの著作権・ライセンス（改変可、再配布等）
- [ ] サードパーティライブラリのライセンス一覧
- [ ] ロゴ・キャラクター素材の権利関係

---

## 10. 引き継ぎ完了の定義

以下が揃った時点で「引き継ぎ完了」とします。

- [ ] 上記Section 1〜9 のすべての確認事項に回答済み
- [ ] Cloudflareアカウントへのアクセス権付与完了
- [ ] D1 / KV / Vectorize 等のリソース引き継ぎ完了
- [ ] Critical 5件のセキュリティ対策完了（責任分界に従い）
- [ ] **N7: ルーター + 欠落ハンドラ約25系統の追加納品完了**
- [ ] FAQ 197件（日本語172 + 英語25）の実体納品完了
- [ ] 本番デプロイPhase 3完了
- [ ] 引き継ぎ後の障害対応SLA合意
- [ ] KPI定義書面合意

---

## 補足: 連絡方法

- ご返答方法: メール / Slack / Telegram のいずれでも
- 期日希望: 上記項目について **YYYY/MM/DD まで** にご回答いただけると、ローンチプランが立てられます

v2での大幅な品質改善、誠にありがとうございました。ご多忙のところ恐縮ですが、上記残存事項についてご確認のほどよろしくお願いいたします。
