# セットアップガイド

## 前提条件

- Node.js 18+
- wrangler CLI (`npm i -g wrangler`)
- Cloudflare アカウント（Workers + KV）

## 1. KVネームスペース確認

`wrangler.toml` に記載の KV namespace ID が正しいことを確認:

```bash
npx wrangler kv namespace list
```

## 2. Secrets設定

以下の7つのシークレットを設定:

```bash
# Chatwoot API
npx wrangler secret put CHATWOOT_BASE_URL      # 例: https://im.sloten.io
npx wrangler secret put CHATWOOT_API_TOKEN      # Chatwoot APIトークン
npx wrangler secret put ACCOUNT_ID              # Chatwoot アカウントID（数値）

# セキュリティ
npx wrangler secret put WEBHOOK_SECRET          # Webhook認証トークン
npx wrangler secret put ADMIN_TOKEN             # 管理画面認証トークン

# GAS Webhook URLs
npx wrangler secret put BONUS_CODE_WEBHOOK_URL  # ボーナスコード記録GAS
npx wrangler secret put GAS_BOT_WEBHOOK_URL     # PayPay入金GAS
npx wrangler secret put BANK_TRANSFER_BOT_WEBHOOK_URL  # 銀行振込GAS
npx wrangler secret put EC_DEPOSIT_BOT_WEBHOOK_URL     # コンビニ入金GAS
```

## 3. テスト実行

```bash
node test.mjs
```

全テストがPASSすることを確認。

## 4. デプロイ

```bash
bash deploy.sh
```

または手動:

```bash
npx wrangler deploy
```

## 5. Chatwoot Webhook設定

Chatwoot管理画面 → 設定 → インテグレーション → Webhook:

- URL: `https://<worker-domain>/api/webhook/<WEBHOOK_SECRET>`
- イベント: `message_created`, `message_updated`

## 6. 管理画面アクセス

```
https://<worker-domain>/admin?token=<ADMIN_TOKEN>
```

## 7. GAS Webhook設定

各GASスクリプトのWebアプリURLを Secrets に設定済みであること。
管理画面の「GAS疎通テスト」で接続確認可能。

## トラブルシューティング

| 症状 | 対処 |
|------|------|
| Webhook 401 | URLのトークン部分を確認 |
| 管理画面 401 | `?token=` パラメータを確認 |
| ボーナスコード未応答 | 管理画面で対象コードが有効か確認 |
| GAS記録失敗 | GAS疎通テストで接続確認、URLの再設定 |
| KV読取エラー | `wrangler kv namespace list` でID確認 |
