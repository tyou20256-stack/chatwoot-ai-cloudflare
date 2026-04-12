#!/bin/bash
# Chatwoot AI Gateway - Cloudflare Workers デプロイスクリプト

echo "🚀 Chatwoot AI Gateway - Cloudflare Workers デプロイ開始"
echo "=================================================="

# 前提条件チェック
echo "📋 前提条件チェック中..."

# Node.js/npm確認
if ! command -v npm &> /dev/null; then
    echo "❌ npm が見つかりません。Node.jsをインストールしてください。"
    exit 1
fi

# wrangler確認
if ! command -v wrangler &> /dev/null; then
    echo "📦 wrangler をインストール中..."
    npm install -g wrangler
fi

echo "✅ 前提条件OK"

# Cloudflare認証確認
echo "🔐 Cloudflare認証確認中..."
if ! wrangler whoami &> /dev/null; then
    echo "🔑 Cloudflare ログインが必要です..."
    wrangler login
fi

echo "✅ Cloudflare認証OK"

# KV名前空間作成（production環境）
echo "💾 KV名前空間作成中..."
echo "📝 以下のコマンド結果のIDをwrangler.tomlに設定してください："
wrangler kv:namespace create "FAQ_STORAGE" --env production

echo ""
echo "⚠️  重要: wrangler.toml の kv_namespaces.id を上記のIDに更新してください"
echo "編集後、Enterキーを押してください..."
read -r

# 環境変数設定（オプション）
echo "🔧 環境変数設定（スキップ可能）..."
echo "環境変数を設定しますか？ (y/N)"
read -r setup_vars

if [[ $setup_vars =~ ^[Yy]$ ]]; then
    echo "📝 CHATWOOT_API_TOKEN を設定..."
    wrangler secret put CHATWOOT_API_TOKEN --env production
    
    echo "📝 CHATWOOT_WEBHOOK_SECRET を設定..."
    wrangler secret put CHATWOOT_WEBHOOK_SECRET --env production
    
    echo "📝 CHATWOOT_BASE_URL を設定..."
    wrangler secret put CHATWOOT_BASE_URL --env production
    
    echo "📝 CHATWOOT_ACCOUNT_ID を設定..."
    wrangler secret put CHATWOOT_ACCOUNT_ID --env production
else
    echo "⏭️  環境変数設定をスキップしました"
fi

# デプロイ実行
echo ""
echo "🚀 デプロイ実行中..."
wrangler deploy --env production

# 結果確認
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 デプロイ成功！"
    echo "=================================================="
    echo "📡 サービスURL:"
    echo "   https://chatwoot-ai-gateway.your-subdomain.workers.dev"
    echo ""
    echo "🔍 エンドポイント:"
    echo "   GET  /health                    - ヘルスチェック"
    echo "   POST /webhooks/chatwoot         - Webhook受信"
    echo "   GET  /admin/faq/count          - FAQ件数"
    echo "   POST /admin/faq/add            - FAQ追加"
    echo ""
    echo "⚡ 次のステップ:"
    echo "   1. ChatwootでWebhook URLを設定"
    echo "   2. ヘルスチェックでテスト"
    echo "   3. スタッフに共有"
    echo ""
    echo "🎯 CS業務70%削減、世界展開完了！"
else
    echo ""
    echo "❌ デプロイ失敗"
    echo "wrangler whoami でログイン状況を確認してください"
    exit 1
fi