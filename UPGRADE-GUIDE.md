# UPGRADE GUIDE — Phase ξ → υ

このブランチは元の `main` (commit `74ec8b9`) に対して、弊社 (rcc.aoki@gmail.com 環境) で
5 ラウンドの監査・修正を経た差分を取り込んだものです。

## 適用前の必読事項

このアップグレードを反映しないと本番で発生する問題:

| 症状 | 原因 | 修正 |
|---|---|---|
| `/api/auth/login` が 500 で完全に動かない | `staff_members.is_active` カラム欠落 | migration 014 |
| メッセージ送信時 sender_id=1 で全件記録 | `request.__principal` が CF Workers immutability で silent fail | src/auth-helper.mjs WeakMap |
| `POST /api/faq` が 500 | `faq.keywords` カラム欠落 | migration 009 |
| `POST /api/webhooks` が 500 | `webhooks.updated_at` カラム欠落 | migration 010 |
| 営業時間設定が動かない | `business_hours` 4 列の名前不整合 | migration 012 |
| `POST /api/sheet-integrations` が 500 | 5 列欠落 | migration 013 |
| `POST /api/sla-policies` が 500 | 4 列欠落 | migration 013 |
| 監査ログが INSERT 失敗 | `audit_logs.user_agent` 欠落 | migration 012 |

## 適用手順

### 1. PR を merge

### 2. マイグレーション適用（idempotent）
```bash
node scripts/apply-migrations.mjs --db=chatwoot_rag_db --remote --from=003
```
このランナーは PRAGMA で既存カラムを検出してスキップするため、何度実行しても安全です。

### 3. 追加シークレット（必要時のみ）
```bash
wrangler secret put EC_CALLBACK_SECRET                  # AgentBot 連携時
wrangler secret put AI_GATEWAY_SHARED_SECRET_PREV       # rotation 時
```

### 4. デプロイ
```bash
wrangler deploy
```

### 5. デプロイ後検証（必須）
```bash
bash scripts/verify-all.sh
# 期待: 5 種類すべて PASS、CRITICAL/HIGH/MEDIUM 0

npm run smoke -- \
  --base=https://chatwoot-ai-gateway.koni-tanaka.workers.dev \
  --email=admin@sloten.local \
  --password=<initial admin password>
# 期待: 15 / 15 PASS
```

## フェーズ別変更（PHASE-*-CHANGELOG.md 参照）

| Phase | 内容 |
|---|---|
| ξ (xi) | Pages proxy auth bypass, RG escalation persistence, CORS regression, mig 009-011 |
| ο (omicron) | 116 fetch credentials regression, schema sync 4 件, AgentBot escalate handling |
| ρ (rho) | 検証スクリプト 5 種, 新たに 8 件のスキーマバグ発見, 19 件修正 |
| τ (tau) | WeakMap principal (CF Workers immutability), CF patterns detector, 11 件修正 |
| υ (upsilon) | ローカル smoke test 15/15 PASS, 4 件の本物バグ発見 (mig 014 含む) |

## 引き継ぎ前最終状態

```
verify-syntax:                54 / 54        PASS
verify-routes:               145 / 145       PASS
verify-schema:                43 tables, 27 handlers, 0 mismatches
verify-migration-idempotency: 11 migrations, 0 unguarded
verify-cf-workers-patterns:   CRITICAL 0 / HIGH 0 / MEDIUM 0
smoke-test (live):            15 / 15        PASS
```

## Gemini API キーの取り扱い

元納品物 v2 zip に Gemini API キー `AIzaSyCx18hd...DU` が**平文で含まれていました**。
新規キーを発行し、旧キーは Google Cloud Console で revoke することを強く推奨します。
