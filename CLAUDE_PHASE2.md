# Claude Code Phase 2 実装指示

## ✅ Phase 1 完了（タグ・FAQ機能）

## 🎯 Phase 2 タスク

### 1. ファイルアップロード（R2連携）
```javascript
// 実装が必要:
// - POST /api/upload - ファイルアップロード
// - R2バケット連携
// - メッセージに添付ファイル紐付け
// - チャットUIにファイル表示
```

### 2. 統計レポート機能
```javascript
// D1 analyticsテーブル追加:
// - analytics_daily（日次統計）
// - analytics_conversations（会話統計）
// - analytics_agents（エージェント統計）

// APIエンドポイント:
// - GET /api/analytics/overview
// - GET /api/analytics/conversations
// - GET /api/analytics/agents
// - GET /api/analytics/tags
// - GET /api/analytics/export（CSV）
```

### 3. テンプレート管理
```javascript
// D1テーブル: message_templates
// API:
// - GET /api/templates
// - POST /api/templates
// - PUT /api/templates/:id
// - DELETE /api/templates/:id

// UI統合:
// - スタッフダッシュボードのメッセージ入力にテンプレート選択
// - 変数対応: {{customer_name}}, {{conversation_id}}
```

### 4. その他必要な実装
```javascript
// - WebSocket通知改善
// - リアルタイム統計更新
// - UI最適化
// - デプロイ準備
```

## 作業優先順位
1. ファイルアップロード（R2）
2. Analyticsテーブル設計・作成
3. 統計API実装
4. テンプレートAPI実装
5. UI統合（スタッフダッシュボード）
6. デプロイテスト

止まらないように継続して実装してください。
"止まらないように"は「セッションが切れても作業を停止せず、次のタスクに進む」という意味です。

DEFAULT_MODEL=openrouter/moonshotai/kimi-k2.5