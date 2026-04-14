# Phase ο (omicron) Changelog — Self-audit findings

> Phase ξ で本番投入したコードを自己監査した結果、ξ-C1（Pages proxy Bearer 自動注入削除）に
> 起因する **管理画面の機能停止リグレッション** と、追加のスキーマ不整合 / セキュリティギャップを
> 発見。Phase ο で全 27 件を修正。

## Critical (12)

### R1 — 管理画面 全フェッチ 401 リグレッション（ξ-C1 由来）
**影響:** 管理画面の 116 fetch のうち 1 件のみが `credentials: 'include'` 設定だったため、
ξ-C1 で Bearer 自動注入を停止後、ほぼ全機能が 401 で動作不能。
**修正:** `public/index.html` 冒頭で `window.fetch` をラップし、`/api/*` 全リクエストに
`credentials: 'include'` を付与。401 受信時は全 setInterval を停止して `/staff/login` へ強制遷移。

### スキーマ不整合（migration 012 で一括解消）
- **C-A1** `audit_logs.user_agent` カラム欠落 → 監査ログ INSERT 失敗
- **C-A2** `faq.view_count`, `faq.helpful_count` カラム欠落
- **C-A3** `business_hours.is_open / open_time / close_time / ooo_message` 欠落（既存は `is_active / start_time / end_time`）→ 営業時間 全機能不能
- **C-A4** `staff_members` 拡張プロフィール（phone/department/hired_at/bio/language/avatar_url）が migration 003 未適用環境で欠落
**修正:** `migrations/012-schema-sync.sql` 作成（idempotent ALTER + バックフィル）

### コード Critical
- **C-B1** `messages.mjs:93` `result.meta.last_row_id` の null チェックなし → 修正済（500 を返却）
- **C-B2** `[[path]].ts:51` Sec-Fetch-Site ヘッダ欠落リクエストを通過 → 修正（厳格化）
- **C-B3** AgentBot `worker-with-ai.js:102` `escalate=true` を無視 → 修正（escalate sentinel + Chatwoot label 付与 + メニューボタン抑制）
- **C-B4** AgentBot typing indicator が例外時クリアされず → `try/finally` で全パス cleanup
- **C-B5** `/api/ec-callback` 認証なし → `X-EC-Secret` + timing-safe compare 追加
- **C-B6** `/api/debug-ec` 認証なし → `ALLOW_DEBUG_EC=true` + `X-EC-Secret` 二重ゲート

## High (9)

- **H1** `ai_characters.mjs` POST/PUT で `detectInputThreat()` 未適用 → 追加
- **H2** `templates.mjs` POST/PUT で `detectInputThreat()` 未適用 → 追加
- **H3** `knowledge-sources.mjs` `url` フィールドに SSRF 検証なし → `validateUrl()` 追加（HTTPS only / private IP block / metadata.google.internal block）
- **H4** `auth-helper.mjs` の 3 箇所の `session_token_hash ===` 比較 → `timingSafeEqual()` に置換
- **H5** Admin polling が 401 で停止せず無限ループ → グローバル fetch ラッパで全 setInterval 停止 + login 遷移
- **H6** Admin `e.message` を `innerHTML` に直接挿入（XSS） → `escHtml()` + `renderErrorRow()` 安全 helper 追加
- **H7** AgentBot `AI_GATEWAY_SHARED_SECRET_PREV` grace なし → 401 時に PREV で 1 回リトライ
- **H8** AgentBot が `conversation_history` を空配列で送信 → Chatwoot API から直近 10 件取得して送信
- **H9** Sec-Fetch-Site CSRF 検証強化（C-B2 と関連）

## Medium (3 — docs only)

- **M1** D1 time-travel CLI 手順を `OPERATIONS.md` に追加（dashboard 操作と並記）
- **M2** Migrations 009-012 全て idempotent（`IF NOT EXISTS`, `INSERT OR REPLACE`, `INSERT OR IGNORE`）
- **M3** スキーマ差分は本ファイルに集約（次回の `ARCHITECTURE.md` 改訂時に統合予定）

## 適用順序（tking510 側）

```bash
# 1. Migrations
wrangler d1 execute <db> --remote --file=migrations/009-faq-keywords-column.sql
wrangler d1 execute <db> --remote --file=migrations/010-webhooks-updated-at.sql
wrangler d1 execute <db> --remote --file=migrations/011-cron-heartbeat-bootstrap.sql
wrangler d1 execute <db> --remote --file=migrations/012-schema-sync.sql

# 2. Worker secrets（追加分）
wrangler secret put EC_CALLBACK_SECRET                         # AgentBot 用
wrangler secret put AI_GATEWAY_SHARED_SECRET_PREV              # 任意（rotation 時のみ）

# 3. Deploy
wrangler deploy
npx wrangler pages deploy public --project-name=sloten-admin-secure
cd ../chatwoot-bot-patched && wrangler deploy

# 4. 検証
# 4-1. 未認証で /api/faq → 401
curl -i https://<pages>/api/faq

# 4-2. ログイン → cookie 取得 → /api/audit-logs POST → 200
# 4-3. RG キーワード送信 → escalation_queue に行追加 + Chatwoot label
# 4-4. POST /api/webhooks → 201（migration 010 適用後）
# 4-5. POST /api/faq with keywords → 201（migration 009 適用後）
# 4-6. /api/ops/cron-health → stale:false（migration 011 適用後）
```

## 残課題（Backlog）

- AgentBot 12s timeout の circuit-breaker（現在は単純 fallback）
- Knowledge base フォルダと faq テーブルの sync 戦略（現在 KB は未読込）
- Bonus code 重複処理（AgentBot と Gateway の mutual exclusion）
- `/api/faq/search` のレートリミット個別設定（現在グローバル 60/min のみ）

これらは BACKLOG.md に追記。
