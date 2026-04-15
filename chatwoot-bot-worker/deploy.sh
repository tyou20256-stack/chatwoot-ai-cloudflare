#!/bin/bash
set -e

echo "=== Chatwoot Bot Worker Deploy ==="
echo ""

# テスト実行
echo "[1/3] テスト実行..."
node test.mjs
if [ $? -ne 0 ]; then
  echo "テスト失敗！デプロイを中止します。"
  exit 1
fi
echo ""

# プレビュー再生成
echo "[2/3] プレビュー再生成..."
node gen-preview.mjs
echo ""

# デプロイ
echo "[3/3] Cloudflare Workers にデプロイ..."
npx wrangler deploy
echo ""

echo "=== デプロイ完了 ==="
