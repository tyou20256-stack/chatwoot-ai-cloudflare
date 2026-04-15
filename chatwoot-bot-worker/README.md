# Chatwoot Bot Worker

BotPress完全置き換えのChatwoot自動応答ボット。Cloudflare Workers + KVで動作。

## アーキテクチャ

```
[ユーザー] → [Chatwoot] → Webhook → [Cloudflare Worker] → Chatwoot API (応答)
                                          ↓
                                     [GAS Webhooks] → Google Sheets (記録)
                                          ↓
                                     [KV Storage] (動的設定・ログ)
```

## ファイル構成

| ファイル | 役割 |
|---------|------|
| `worker.js` | エントリポイント。Webhook受信・ルーティング・セキュリティ |
| `messages.js` | 全メッセージ定義（80キー、メニュー構造） |
| `bonus-codes.js` | ボーナスコードマッチング（14種ハードコード + KV動的） |
| `bonus-codes-api.js` | CRUD API + メニューツリー構築 |
| `chatwoot-api.js` | Chatwoot APIラッパー（メッセージ送信・転送） |
| `gas-webhooks.js` | GAS Webhookハンドオフ（PayPay・銀行・コンビニ） |
| `admin.js` | 管理画面HTML/CSS/JS（Single HTML） |
| `test.mjs` | 統合テスト（188テスト） |
| `gen-preview.mjs` | 管理画面プレビューHTML生成 |

## セキュリティ

- **Webhook認証**: URLパストークン + HMAC-SHA256署名検証
- **管理画面認証**: URLクエリトークン
- **レート制限**: KVベース（Webhook 30req/min、Admin API 60req/min）
- **入力サニタイズ**: 制御文字除去 + 長さ制限
- **CORSロック**: 指定ドメインのみ許可
- **セキュリティヘッダー**: X-Content-Type-Options, X-Frame-Options, Referrer-Policy

## API一覧

### Webhook
| メソッド | パス | 説明 |
|---------|------|------|
| POST | `/api/webhook/{token}` | Chatwoot Webhook受信 |

### 管理API（要ADMIN_TOKEN）
| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/admin?token=` | 管理画面 |
| GET | `/api/bonus-codes` | ボーナスコード一覧 |
| GET | `/api/bonus-codes/:id` | 個別取得 |
| POST | `/api/bonus-codes` | カスタム種別作成 |
| PUT | `/api/bonus-codes/:id` | 更新（有効/無効、バリアント追加/削除） |
| DELETE | `/api/bonus-codes/:id` | カスタム種別削除 |
| GET | `/api/menus` | メニューツリー |
| POST | `/api/test-webhook` | テストWebhook送信 |
| POST | `/api/test-gas` | GAS疎通テスト |
| GET | `/api/audit-log` | 監査ログ |
| GET | `/api/errors` | エラーログ |
| GET | `/api/backup` | KVバックアップ(JSON) |
| POST | `/api/restore` | KVリストア |

## ボーナスコードフロー

```
ユーザー入力 → matchBonusCode()
  ├─ KV動的コード → マッチ → GAS記録 → 成功メッセージ
  ├─ ハードコード → マッチ → GAS記録 → messages[successKey]
  └─ 非マッチ → 通常メニュー処理
```

## デプロイ

```bash
bash deploy.sh   # テスト → プレビュー生成 → デプロイ
```

詳細は [SETUP.md](SETUP.md) 参照。

## テスト

```bash
node test.mjs    # 188テスト
```

## 管理画面機能

- **ボーナスコード管理**: 一覧・作成・有効/無効・バリアント追加/削除
- **メニューツリー**: 会話フロー階層表示・キーワード検索・ノードナビゲーション
- **運用・監視**: GAS疎通テスト・監査ログ・エラーログ・バックアップ/リストア
