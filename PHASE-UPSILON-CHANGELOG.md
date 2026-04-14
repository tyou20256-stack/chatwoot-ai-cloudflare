# Phase υ (upsilon) Changelog — ローカル実機検証 + 自動 smoke test

> ユーザー指示「B+C: ローカル + 自動テスト」に基づき、wrangler dev で実機を起動し、
> 15 項目の自動 smoke test を実行。結果は **15/15 PASS**。
> 過程で **4 件の本物のバグを実機検出** し、すべて修正済み。

## 実行サマリー

```
=== Sloten AI Gateway Smoke Test ===
Base: http://127.0.0.1:8787
User: admin@sloten.local

  [PASS] T01 GET /health
  [PASS] T02 login wrong pw → 401
  [PASS] T03 login correct → 200 + cookie set
  [PASS] T04 me (no cookie) → 401
  [PASS] T05 me (with cookie) → 200 role=admin
  [PASS] T06 faq (no cookie) → 200 (公開読み取り許容)
  [PASS] T07 faq POST + keywords → id=199 keywords stored=true
  [PASS] T08 faq search → 200 count=1
  [PASS] T09 webhook POST https → 201
  [PASS] T10 webhook http:// → 400 (SSRF guard)
  [PASS] T11 webhook private IP → 400 (SSRF guard)
  [PASS] T12 escalations list → 200
  [PASS] T13 cron-health stale=false → 200 stale=false
  [PASS] T14 logout → 200
  [PASS] T15 me after logout → 401 (cookie revoked)

=== Summary: 15 PASS / 0 FAIL ===
```

## 実機検証で発見・修正したバグ（4 件）

### B1: `apply-migrations.mjs` PRAGMA 出力パース失敗（CRITICAL）
- **症状:** Wrangler 4.x の JSON 出力形式に対応していなかったため、ALWAYS 空の `Set()` を返却し、結果として既存カラムをスキップできず ALTER TABLE がアボート
- **修正:** `--json` フラグ追加 + JSON パース、temp file 経由で実行（Windows shell エスケープ対応）
- **影響:** Phase ρ で導入した idempotent migration 機構が**実は機能していなかった**

### B2: `apply-migrations.mjs` `--config` 引数の受け渡しなし（HIGH）
- **症状:** ローカル開発環境 (`wrangler.dev.toml`) で実行できなかった
- **修正:** `--config` 引数を受け取り、wrangler に転送

### B3: Windows での `npx` 実行失敗（HIGH）
- **症状:** `spawnSync('npx', ...)` が Windows で動作しない
- **修正:** `npx.cmd` + `shell:true` パターンに変更

### B4: `staff_members.is_active` カラム欠落（CRITICAL）
- **症状:** `auth-helper.mjs:289` が読む `is_active` カラムが production schema に存在せず、`migrations/008-initial-admin.mjs` の INSERT もエラー → **本番デプロイ後の admin 作成が完全失敗**
- **修正:** `migration 014-staff-members-is-active.sql` 追加
- **検出経緯:** 静的 schema verifier はこれを見落としていた（handler 側で SELECT のみで INSERT/UPDATE がなかったため）

これら 4 件はいずれも静的解析（5 種類の verify-* スクリプト）では検知できず、実機実行で初めて顕在化しました。

## 新規納品物

### `scripts/smoke-test.mjs`
15 項目のエンドツーエンドテスト。tking510 様も本番デプロイ後に同じ手順で品質確認可能:
```bash
npm run smoke -- --base=https://your-worker-url --email=admin@... --password=...
```

### `wrangler.dev.toml.example`
ローカル開発用設定テンプレート。`.dev.vars` と組み合わせて `npm run dev:local` で起動。

### `migrations/014-staff-members-is-active.sql`
本番投入前に必須のマイグレーション（admin 作成が動かなくなるため）。

### `package.json` スクリプト追加
- `npm run dev:local` — ローカル wrangler dev (port 8787)
- `npm run verify` — 5 種類の静的検証一括実行
- `npm run smoke` — エンドツーエンド smoke test

## ローカル動作確認手順（再現可能）

tking510 様も以下で完全再現できます:
```bash
cd chatwoot-ai-gateway

# 1. ローカル設定とシークレットを用意
cp wrangler.dev.toml.example wrangler.dev.toml
cat > .dev.vars <<EOF
ADMIN_API_TOKEN=local-admin-token-1234567890abcdefghij
SESSION_SIGNING_KEY=local-session-signing-key-32bytes-minimum-length
AI_GATEWAY_SHARED_SECRET=local-agentbot-secret-1234567890
EC_CALLBACK_SECRET=local-ec-callback-secret-1234567890
REQUIRE_AGENTBOT_SECRET=false
EOF

# 2. ローカル D1 にスキーマ適用
npx wrangler d1 execute chatwoot_rag_db_local --local --config=wrangler.dev.toml --file=production-full-fixed.sql
node scripts/apply-migrations.mjs --db=chatwoot_rag_db_local --config=wrangler.dev.toml --from=003

# 3. 初期 admin 作成
node migrations/008-initial-admin.mjs > /tmp/admin.sql 2> /tmp/cred.txt
cat /tmp/cred.txt   # ← パスワードを控える
npx wrangler d1 execute chatwoot_rag_db_local --local --config=wrangler.dev.toml --file=/tmp/admin.sql

# 4. wrangler dev を別ターミナルで起動
npm run dev:local

# 5. smoke test
npm run smoke -- --password='上記のパスワード'
```

## ローカル検証で「動かないこと」を確認したもの

- **Workers AI バインディング**: `env.AI` は --local では利用不可（Cloudflare 接続必須）
- **Gemini 実呼び出し**: GEMINI_API_KEY を未設定にしたため、AI チャット (T07 以外の) は実行せず
- **Cron 実発火**: 03:00 UTC 待ち・hourly 起動はローカルで自動発生しない（手動 `wrangler dev --test-scheduled` で検証可能）

これらは **本番デプロイ後の手動 smoke test** で確認が必要です。

## 引き渡しパッケージ更新内容

- `chatwoot-ai-gateway/scripts/apply-migrations.mjs` — 修正版 (B1+B2+B3)
- `chatwoot-ai-gateway/scripts/smoke-test.mjs` — 新規
- `chatwoot-ai-gateway/migrations/014-staff-members-is-active.sql` — 新規
- `chatwoot-ai-gateway/wrangler.dev.toml.example` — 新規
- `chatwoot-ai-gateway/package.json` — npm scripts 追加

最終状態:
```
✅ verify-all.sh:    全 5 種 PASS (CRITICAL/HIGH/MEDIUM 0)
✅ smoke-test.mjs:   15 / 15 PASS (実機検証)
```
