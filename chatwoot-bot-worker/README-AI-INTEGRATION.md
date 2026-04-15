# Chatwoot AgentBot — AI Gateway 統合 (Pattern A Parallel Running)

## 概要

`worker.js`（既存・変更なし）と `worker-with-ai.js`（AI 統合版）を並行運用できる構成。
Pattern A = 既存メニュー・ボーナスコード・GAS フローは従来通り動作し、**メニューにマッチしない自由テキスト入力** のときだけ AI Gateway (`/api/ai/chat`) に委譲する。

## ファイル差分

| ファイル | 役割 |
|---|---|
| `worker.js` | 既存 AgentBot（変更なし） |
| `worker-with-ai.js` | 上記のコピー + AI フォールバック統合版 |
| `README-AI-INTEGRATION.md` | 本ドキュメント |

## `worker-with-ai.js` での変更点

1. **ヘッダコメント** に追加環境変数を明記
2. **`aiFallback()` 関数** を追加（Abort timeout 10s、Shadow mode 対応）
3. **`routeMessage()` 冒頭** にバウンダリボタン `ai_resolved` / `escalate_human` / `main_menu` のハンドラを追加
4. **`!messageConfig` 分岐**（従来は即 welcome メニュー表示）に AI フォールバック呼び出しを挿入。AI 応答が返ればそれを送信、失敗なら従来通り welcome メニュー

既存の `sendChatwootMessage`（`chatwoot-api.js`）を再利用し、`items` 配列で `input_select` ボタンを構成。

## 必要な環境変数（wrangler secrets）

| 変数 | 例 | 用途 |
|---|---|---|
| `AI_GATEWAY_URL` | `https://chatwoot-ai-gateway-staging-bk.rcc-aoki.workers.dev` | AI Gateway のベース URL |
| `AI_GATEWAY_SHARED_SECRET` | （任意） | Gateway 側で検証する共有シークレット |
| `AI_ENABLED` | `true` / `false` | `true` で AI 応答をユーザーに返す |
| `AI_SHADOW_MODE` | `true` / `false` | `true` かつ `AI_ENABLED=false` で Shadow（ログのみ、ユーザーへは返さない） |
| `EC_CALLBACK_SECRET` | ランダム32文字以上 | `/api/ec-callback` / `/api/debug-ec` の HMAC 共有シークレット（`X-EC-Secret` ヘッダ） |
| `ALLOW_DEBUG_EC` | `true` (任意) | 本番環境で `/api/debug-ec` を許可する場合のみ設定 |

設定例：

```bash
wrangler secret put AI_GATEWAY_URL            # 値を貼り付け
wrangler secret put AI_GATEWAY_SHARED_SECRET  # 値を貼り付け
wrangler secret put AI_SHADOW_MODE            # "true"
wrangler secret put AI_ENABLED                # "false"
```

## ロールアウト手順

### Phase 1: Shadow mode（安全な観測期間）

```
AI_SHADOW_MODE = "true"
AI_ENABLED     = "false"
```

- AI 応答はログ出力のみ。ユーザーには従来通り welcome メニューが表示される
- `wrangler tail` でログを確認し、応答品質・レイテンシを評価

### Phase 2: Canary（限定稼働）

```
AI_SHADOW_MODE = "false"
AI_ENABLED     = "true"
```

- 一部の会話で AI 応答を実送信
- `error-log` KV とバウンダリボタンの押下比率（`ai_resolved` vs `escalate_human`）を監視

### Phase 3: 本稼働

問題なければそのまま維持。

## ロールバック（即座に OFF）

```bash
wrangler secret put AI_ENABLED       # "false"
wrangler secret put AI_SHADOW_MODE   # "false"
```

これで `aiFallback()` は常に `null` を返し、従来の welcome メニュー動作に戻る。
完全に戻したい場合は wrangler のエントリーポイントを `worker.js` に戻してデプロイ。

## 動作仕様（Pattern A）

| 入力種別 | 挙動 |
|---|---|
| メニューボタンクリック | 既存処理（変更なし） |
| ボーナスコード | 既存処理（変更なし） |
| 機種選択 | 既存処理（変更なし） |
| EC 入金フロー中 | 既存処理（状態管理で上位分岐） |
| オペレーター対応中 (`conversation.status=open`) | 既存処理で早期スキップ |
| **その他の自由テキスト** | **AI Gateway に委譲 → 応答 + バウンダリボタン 3 種** |

バウンダリボタン：
- `ai_resolved` → お礼メッセージ + メインメニューボタン
- `escalate_human` → オペレーター呼び出し（`transferToAgent`）
- `main_menu` → welcome メニュー再表示

## 依存

- AI Gateway 側の変更は不要（`/api/ai/chat` がそのまま使える前提）
- D1/KV 追加バインディングは不要（env vars のみ）
- `sendChatwootMessage` / `transferToAgent` / `logError` など既存ユーティリティを再利用

## Admin page authentication (HttpOnly cookie session)

As of the latest update, the admin page (`/admin`) no longer accepts `?token=` query-string auth. URL tokens leak via browser history, logs, and Referer headers.

New flow:
- `GET /admin` — if no valid session cookie, serves an inline login form.
- `POST /admin/login` — body `{ password }`. Verifies against `ADMIN_PASSWORD` using a timing-safe compare. On success sets `chatwoot_admin_session` as `HttpOnly; Secure; SameSite=Strict; Max-Age=28800; Path=/admin`. The cookie value is an HMAC-SHA256 signed token: `base64({exp}).hexsig`.
- `POST /admin/logout` — clears cookie, redirects to `/admin`.

Required secrets (set via `wrangler secret put`):
- `ADMIN_PASSWORD` — plaintext password for the admin login form. Rotate periodically.
- `ADMIN_SESSION_KEY` — HMAC signing key. Generate with `openssl rand -hex 32`. Rotating this invalidates all active sessions.

The legacy `ADMIN_TOKEN` variable is no longer referenced by the admin route and can be removed after migration.
