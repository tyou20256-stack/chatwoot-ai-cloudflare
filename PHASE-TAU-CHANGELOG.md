# Phase τ (tau) Changelog — Dynamic-behavior bug fixes + CF Workers detector

> Phase σ で 4 並列エージェントによる動的挙動監査を実施。Phase ρ 修正で混入した
> **Cloudflare Workers Request immutability に起因する重大バグ** を発見し修正。
> さらに「静的解析では見えない CF Workers アンチパターン」を検出する 5 つ目の
> verify スクリプトを追加。

## Critical (2)

### C-τ1: `request.__principal` 代入が silent fail（Phase ρ で混入したリグレッション）
- **症状:** Cloudflare Workers の Request オブジェクトは immutable。Phase ρ で書いた
  `request.__principal = auth.principal` は try/catch で握りつぶされ、
  ハンドラ側で `request.__principal?.staff_id` が常に undefined → メッセージ送信が 400 で失敗
- **修正:** WeakMap ベースの `setPrincipal()` / `getPrincipal()` API を `auth-helper.mjs` に追加
  - `index.mjs` の `withAuth()` で `setPrincipal(request, auth.principal)`
  - `messages.mjs` / `conversations.mjs` で `getPrincipal(request)?.staff_id` で読む

### C-τ2: AgentBot escalate=true で reply=null のケース
- **分析結果:** 既存の分岐順序で実害なし（escalate チェックが reply 有無より先に実行される）
- **アクション:** 修正不要、ドキュメント化のみ

## High (6)

- **H-τ1**: admin UI 4箇所の `is_active!==false` バグ修正（D1 の 0 値が「有効」と誤表示）
  - `tenant?.is_active`, `policy?.is_active`, `policy?.escalation_enabled`, `webhook?.is_active`
  - すべて `(field==null||Number(field)===1||field===true)` パターンに統一
- **H-τ2**: モーダル DOM 累積バグ — `insertAdjacentHTML('beforeend', ...)` を `modalContainer.innerHTML = ...` に変更
- **H-τ3**: `scheduled.mjs paginatedDelete` の `LIMIT ?` bind を inline integer literal に変更（D1 旧バージョン互換）
- **H-τ4**: cron 分散ロックの TTL を 600s → 90s に短縮 + `try/finally` で完了時即解放（stale lock 回復時間 10min → 1.5min）
- **H-τ5**: FAQ form に `keywords` フィールド追加（migration 009 で列追加していたが UI 未対応）
  - 二重サブミット防止（disabled トグル）も追加
- **H-τ6**: AgentBot から Gateway へ `user_id` を送信（contactId フォールバック `chatwoot:${conversationId}`）

## Medium (3)

- **M-τ1**: migration 013 に `UPDATE knowledge_sources SET tenant_id = 'tenant_default' WHERE tenant_id IS NULL` 追加（既存行の backfill）
- **M-τ2**: `responseFilter` system_prompt_leak パターンに「何/ですか/開示/について」等の質問形を追加
- **M-τ3**: PII 韓国/中国携帯電話正規表現の境界強化（`+82` / `+86` 明示時のみ広範マッチ、bare 番号は標準形のみ）

## 新規納品物 — `verify-cf-workers-patterns.mjs`

「静的解析が見落とす CF Workers 固有のアンチパターン」を検出:

| 検出パターン | 重要度 | 例 |
|---|---|---|
| `request.__xxx =` | CRITICAL | Request immutability 違反（C-τ1 を再発させない） |
| `setTimeout(..., 30000+)` | HIGH | Worker CPU 予算超過 |
| `LIMIT ?` bind | INFO | D1 portable warning |
| `globalThis.x = ...` | MEDIUM | リクエスト間状態リーク |
| KV.put without await/waitUntil | INFO | promise 取りこぼし可能性 |
| console.log 内の PII 変数 | INFO | ログ漏洩可能性 |

## 検証結果（最終 / 引き渡しパッケージ内）

```
✅ verify-syntax:                54 files,  0 failed
✅ verify-routes:               145 imports, 0 failed
✅ verify-schema:                43 tables, 27 handlers, 0 failures
✅ verify-migration-idempotency: 10 migrations, 0 unguarded
✅ verify-cf-workers-patterns:   CRITICAL: 0, HIGH: 0, MEDIUM: 0, INFO: 10 (advisory only)
=== ALL VERIFIED ===
```

5 種類の自動検証すべて PASS。INFO の 10 件は LIMIT ? の portability 提案のみで実害なし。

## 残課題（tking510 引き継ぎ後の判断委ねる項目）

- **ローカル実機テスト**: wrangler dev でログイン → メッセージ送信 → FAQ 追加 → 検索 → ログアウトの golden path を 30 分テスト推奨。Phase ρ で混入したような silent failure は静的解析では検知不能。
- **多言語拡張**: Korean/Chinese RG キーワードは追加済だが `detectEscalation` 関数は ja/en のみ対応
- **AgentBot circuit breaker**: 現在は単純 timeout fallback、open/half-open state 機械実装は未着手
- **Cloudflare Access 移行**: 中長期で PBKDF2 自前認証から CF Access (Zero Trust) へ移行推奨

## 引き渡し前 self-check 再実行コマンド

tking510 側で、デプロイ前 / デプロイ後の両方で:
```bash
cd chatwoot-ai-gateway && bash scripts/verify-all.sh
```
を実行してください。CRITICAL/HIGH が 0 件であることを確認できます。
