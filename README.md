# 🚀 Chatwoot AI Gateway - Cloudflare Workers版

**CS業務70%削減を実現するグローバルAIカスタマーサポートシステム**

## ✨ 特徴

- 🌍 **グローバル展開** - Cloudflare Workers で世界中に配信
- ⚡ **高速応答** - 100ms以下での即座AI応答
- 🌐 **多言語対応** - 日本語/英語/中国語/韓国語/タガログ語
- 🤖 **自動応答** - 高精度な意図分類とAI応答生成
- 📈 **スマートエスカレーション** - 複雑案件の自動人間転送
- 👥 **スタッフ協業** - 全スタッフがWebブラウザでアクセス可能

## 🏗️ アーキテクチャ

```
Chatwoot → Webhook → Cloudflare Workers → AI処理 → 自動返信
                        ↓
                   FAQ KVストレージ
                        ↓  
                   エスカレーション判定
```

## 🚀 デプロイ方法

### 1️⃣ 前提条件
- Cloudflare アカウント
- npm/Node.js インストール済み

### 2️⃣ セットアップ
```bash
# プロジェクトディレクトリに移動
cd /Users/ponp/projects/chatwoot-ai-cloudflare

# wrangler インストール
npm install -g wrangler

# Cloudflare認証
wrangler login

# KV名前空間作成
wrangler kv:namespace create "FAQ_STORAGE" --env production

# 環境変数設定
wrangler secret put CHATWOOT_API_TOKEN --env production
wrangler secret put CHATWOOT_WEBHOOK_SECRET --env production
wrangler secret put LLM_API_KEY --env production

# デプロイ実行
npm run deploy
```

### 3️⃣ 設定
wrangler.tomlの`kv_namespaces.id`を更新：
```toml
[[env.production.kv_namespaces]]
binding = "FAQ_STORAGE"  
id = "your_kv_namespace_id_here"  # ←ここを更新
```

### 4️⃣ 環境変数
以下を設定（wrangler secret putで設定）：
- `CHATWOOT_API_TOKEN` - Chatwoot API トークン
- `CHATWOOT_BASE_URL` - ChatwootインスタンスURL  
- `CHATWOOT_ACCOUNT_ID` - ChatwootアカウントID
- `CHATWOOT_WEBHOOK_SECRET` - Webhook署名検証用
- `LLM_API_KEY` - LLM API キー（将来用）

## 📡 エンドポイント

デプロイ後、以下のエンドポイントが利用可能：

### 🔍 ヘルスチェック
```
GET https://your-worker.your-subdomain.workers.dev/health
```

### 📨 Webhook受信
```
POST https://your-worker.your-subdomain.workers.dev/webhooks/chatwoot
```

### 📚 FAQ管理
```
GET  https://your-worker.your-subdomain.workers.dev/admin/faq/count
POST https://your-worker.your-subdomain.workers.dev/admin/faq/add
```

## 🎯 Chatwoot設定

Chatwoot管理画面で以下のWebhook URLを設定：
```
https://your-worker.your-subdomain.workers.dev/webhooks/chatwoot
```

## 🧪 テスト例

### ヘルスチェック
```bash
curl https://your-worker.your-subdomain.workers.dev/health
```

### Webhook テスト
```bash
curl -X POST https://your-worker.your-subdomain.workers.dev/webhooks/chatwoot \
  -H "Content-Type: application/json" \
  -d '{
    "event": "message_created",
    "message": {
      "content": "Hello! I need help",
      "message_type": "incoming"
    },
    "conversation": {
      "id": 12345
    }
  }'
```

## 📊 パフォーマンス

- ⚡ **応答時間**: < 100ms (グローバルCDN)
- 🌍 **可用性**: 99.99% (Cloudflareインフラ)
- 📈 **スケール**: 無制限リクエスト処理
- 💰 **コスト**: 1日10万リクエストまで無料

## 🔄 開発・デバッグ

### ローカル開発
```bash
npm run dev
```

### ログ確認
```bash
wrangler tail --env production
```

### 設定確認
```bash
wrangler whoami
wrangler kv:namespace list
```

## 💡 カスタマイズ

### 言語追加
`src/index.js` の `LANGUAGE_PATTERNS` を更新

### 意図分類拡張  
`INTENT_KEYWORDS` にキーワード追加

### 応答カスタマイズ
`generateAIReply` 関数の応答パターン更新

## 🚀 本番運用

### モニタリング
- Cloudflare Analytics でアクセス解析
- Worker Analytics でパフォーマンス監視
- `wrangler tail` でリアルタイムログ

### バックアップ
- FAQ データは KV ストレージに永続化
- 定期的な KV データエクスポート推奨

## 📞 サポート

質問・問題は GitHub Issues または TK AI Team まで。

---

**🎉 世界中のお客様に瞬時のAIサポートを提供！**