# chatwoot-ai-cloudflare プロジェクト状態

## 📍 基本情報

| 項目 | 内容 |
|------|------|
| **プロジェクトパス** | `~/projects/chatwoot-ai-cloudflare/` |
| **デプロイURL** | https://chatwoot-ai-gateway.koni-tanaka.workers.dev |
| **バージョン** | v7.0 Phase 3-4 |
| **プラットフォーム** | Cloudflare Workers + D1 + KV + AI |

## 🔐 Cloudflare認証情報

- **アカウント**: koni.tanaka@gmail.com
- **D1 DB ID**: `fa4ab2dc-6180-4c5d-bb0d-45e3bc05cee0`
- **KV ID**: `a2fb4ab11c6d480f897e310b10b78d0d`

## ✅ 完了済み機能

### 1. Workers AI統合（2026-03-14完了）
- **モデル**: Llama 3 8B Instruct (`@cf/meta/llama-3-8b-instruct`)
- **ファイル変更**:
  - `wrangler.toml` - AIバインディング追加
  - `src/index.js` - `generateAIReply()`関数修正
- **動作**: 日本語・英語対応、フォールバック応答あり

### 2. 基本機能（Phase 1-4）
- タグ管理（CRUD）
- FAQ管理（KV + D1）
- ファイルアップロード（R2）
- テンプレート管理
- 分析・レポート
- マルチテナント
- SLA管理
- Webhook
- 監査ログ

## ❌ 未完了タスク（RAG機能）

### タスク一覧

| # | タスク | 詳細 | 優先度 |
|---|--------|------|--------|
| 1 | **D1テーブル作成** | `knowledge_sources`テーブル作成<br>カラム: id, url, title, content, content_type, last_fetched_at, is_active, created_at, updated_at | 高 |
| 2 | **API実装** | `/api/knowledge-sources`エンドポイント<br>GET/POST/PUT/DELETE | 高 |
| 3 | **URLコンテンツ取得** | URLからfetch → テキスト抽出 → D1保存<br>定期更新機能（cron trigger） | 中 |
| 4 | **管理画面UI** | 管理画面に「ナレッジベース」タブ追加<br>URL一覧・追加・削除・再取得ボタン | 中 |
| 5 | **AI統合** | `generateAIReply()`修正<br>ユーザー質問に関連するコンテンツを検索→プロンプトに含める | 高 |

### 目的
登録したURLのコンテンツだけを使ってAIが回答（NotebookLM的な動作）

## 🗄 データベース情報

### 既存テーブル
- `users`, `conversations`, `messages`
- `tags`, `conversation_tags`
- `faq_articles`
- `templates`, `file_uploads`
- `tenants`, `roles`, `staff_roles`
- `sla_policies`, `sla_events`
- `audit_logs`, `webhooks`, `webhook_deliveries`
- `business_hours`, `automation_rules`

### 作成が必要なテーブル
```sql
CREATE TABLE knowledge_sources (
  id TEXT PRIMARY KEY,
  url TEXT NOT NULL UNIQUE,
  title TEXT,
  content TEXT,
  content_type TEXT DEFAULT 'text',
  last_fetched_at TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 技術スタック

- **Runtime**: Cloudflare Workers
- **Database**: D1 (SQLite)
- **Cache**: KV
- **Storage**: R2
- **AI**: Workers AI (Llama 3 8B)
- **Language**: JavaScript

## 🚀 デプロイ方法

```bash
cd ~/projects/chatwoot-ai-cloudflare
npx wrangler deploy --env production
```

## 📝 注意事項

1. **Git未初期化** - このプロジェクトはまだGit管理されていません
2. **RAG未実装** - URL管理機能は未完了
3. **Workers AI有効済み** - 従量課金（Free枠: 10,000 neurons/日）

## 🎯 次のアクション

RAG機能を実装する場合:
1. `knowledge_sources`テーブル作成
2. APIエンドポイント追加
3. 管理画面UI追加
4. AI応答ロジック修正

---
**最終更新**: 2026-03-14
**作成者**: やります君
