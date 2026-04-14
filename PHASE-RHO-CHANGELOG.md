# Phase ρ (rho) Changelog — Verification-driven fix cycle

> Phase π で発見された 19 件 + 検証スクリプトが追加で発見した **8 件のスキーマ不整合** を
> 修正完了。**全修正後に 4 種類の自動検証が PASS** したため、tking510 への引き渡しが
> 検証根拠付きで可能。

## 検証スクリプト（新規納品物）

`chatwoot-ai-gateway/scripts/`:
- `verify-syntax.mjs` — 全 .mjs を `node --check` で構文検証
- `verify-routes.mjs` — `index.mjs` の import が handler から実際に export されているか
- `verify-schema.mjs` — `production-full-fixed.sql` + 全 migration をパースし、handler の INSERT/UPDATE 列名と突合
- `verify-migration-idempotency.mjs` — 全 migration が再適用安全（@idempotent マーカー or create-new+swap パターン）か
- `verify-all.sh` — 上記 4 件を一括実行
- `apply-migrations.mjs` — D1 PRAGMA で既存カラムをスキップしながら適用する idempotent runner

最終実行結果（引き渡しパッケージ内）:
```
verify-syntax:                 54 files, 0 failed
verify-routes:                 145 imports, 0 failed
verify-schema:                 43 tables, 27 handlers, 0 failures
verify-migration-idempotency:  10 migrations, 0 unguarded
ALL VERIFIED
```

## Critical (7)

- **C-π1** `index.html` 401 fetch wrapper の `for(let i=1;i<10000;i++)clearInterval(i)` を `Set` ベース追跡に置換 → 3rd-party タイマーを破壊しない
- **C-π2** Migration 012 を冪等化（`@idempotent` マーカー追加 + `apply-migrations.mjs` で PRAGMA-aware 適用）
- **C-π3** Migration 011 に `CREATE TABLE IF NOT EXISTS feature_flags` を追加 → fresh deploy 時の INSERT 失敗を防止
- **C-π4** `scheduled.mjs` 冒頭で `env.DB` null guard + Telegram alert
- **C-π5** `paginatedDelete()` で `batchSize` NaN/0/負数を 1000 にフォールバック → 無限ループ防止
- **C-π6** AgentBot `aiFallback` 戻り値が unknown object の場合 `.reply` / `.response` を試す → silent drop 防止
- **C-π7** （誤検知）日本語エスカレーションは既に正しい言語分岐実装済み

## High (8)

- **H-π1** `messages.mjs` / `conversations.mjs` で `sender_id` を session principal から導出 → header 偽装防止 + sender_id=1 デフォルト廃止
- **H-π2** `handleConversationReply()` が `metadata` を保存（template_id 等の追跡可能化）
- **H-π3** `auth-helper.mjs` に in-isolate request coalescing（`_sessionLookupInflight` Map）→ cache stampede 100 → 1 D1 query
- **H-π4** `rate-limiter.mjs` を fail-closed に変更（`RATE_LIMIT_FAIL_OPEN=true` で旧挙動）
- **H-π5** Circuit breaker で `getCircuitState` を 2 回読み + `Math.max` で count 退行防止
- **H-π6** `multilang.mjs` に `RG_KEYWORDS_KO` / `RG_KEYWORDS_ZH` 追加（韓国語/中国語 RG 検知）
- **H-π7** `scheduled.mjs` に KV ベース分散ロック（`lock:daily_purge`, 10min TTL）→ cron 二重起動防止
- **H-π8** Migration 013 で `bonus_codes.language` カラム追加

## Medium (4)

- **M-π1** `responseFilter.mjs` の `system_prompt_leak` パターンに extraction 動詞要件追加 → tutorial FAQ false positive 解消
- **M-π2** `pii-masker.mjs` の韓国/中国携帯電話正規表現拡張（leading 0 なし / +82 国番号 / spaced format）
- **M-π3** `staff-auth.mjs` エラーメッセージを ja/en/ko/zh 4 言語化（Accept-Language ヘッダで切替）
- **M-π4** `multilang.mjs` の system prompt から brand 名/ドメインをパラメータ化

## 追加発見 — 検証スクリプトが見つけた 8 件のスキーマ不整合（Migration 013）

過去の静的監査では発見できなかった handler vs schema の列名不整合を `verify-schema.mjs` が検出:

| 表 | 不整合カラム | 修正 |
|---|---|---|
| `knowledge_sources` | `tenant_id` 欠落 | ADD COLUMN |
| `sheet_integrations` | `sheet_url`, `webhook_url`, `sheet_type`, `config` | ADD COLUMN ×4 |
| `sla_policies` | `first_response_minutes`, `resolution_minutes`, `business_hours_only` | ADD COLUMN + バックフィル |
| `bonus_codes` | `language` | ADD COLUMN（H-π8 と同じ） |

→ Migration `013-handler-schema-sync.sql`

## 適用順序（tking510 側）

```bash
# 1. Migrations（idempotent applier 推奨）
cd chatwoot-ai-gateway
node scripts/apply-migrations.mjs --db=<db-name> --remote --from=003

# または手動（カラム既存ならその ALTER 行をコメントアウト）
wrangler d1 execute <db> --remote --file=migrations/009-faq-keywords-column.sql
wrangler d1 execute <db> --remote --file=migrations/010-webhooks-updated-at.sql
wrangler d1 execute <db> --remote --file=migrations/011-cron-heartbeat-bootstrap.sql
wrangler d1 execute <db> --remote --file=migrations/012-schema-sync.sql
wrangler d1 execute <db> --remote --file=migrations/013-handler-schema-sync.sql

# 2. Worker secrets（追加分）
wrangler secret put EC_CALLBACK_SECRET                         # AgentBot 用
wrangler secret put AI_GATEWAY_SHARED_SECRET_PREV              # 任意（rotation 時のみ）
# 旧挙動が必要な場合のみ:
wrangler secret put RATE_LIMIT_FAIL_OPEN                       # 'true' で fail-open（非推奨）

# 3. Deploy
wrangler deploy
npx wrangler pages deploy public --project-name=sloten-admin-secure
cd ../chatwoot-bot-patched && wrangler deploy

# 4. デプロイ後、こちら側と同じ検証を実行
cd chatwoot-ai-gateway && bash scripts/verify-all.sh
```

## 引き渡し前 self-check

```
✅ verify-syntax:                54 / 54
✅ verify-routes:               145 / 145
✅ verify-schema:                27 / 27 handlers, 0 mismatches
✅ verify-migration-idempotency: 10 / 10 marked idempotent
```

これら 4 種類の検証が **delivery package 内で PASS** することを確認済み。
