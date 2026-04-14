-- ============================================================
-- Sloten AI CS — エスカレーション機能 D1マイグレーション
-- 実行: wrangler d1 execute chatwoot_rag_db --file=migration-escalation.sql
-- ステージング: wrangler d1 execute chatwoot_rag_db_staging --file=migration-escalation.sql
-- Generated: 2026-04-13
-- ============================================================

-- エスカレーションキューテーブル
CREATE TABLE IF NOT EXISTS escalation_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT 'unresolved',  -- 'rg_concern' | 'human_request' | 'anger' | 'unresolved'
  priority TEXT NOT NULL DEFAULT 'normal',     -- 'critical' | 'high' | 'normal'
  user_message TEXT,
  ai_summary TEXT,
  conversation_history TEXT,                   -- JSON array
  status TEXT NOT NULL DEFAULT 'pending',      -- 'pending' | 'assigned' | 'resolved'
  assigned_to TEXT,
  resolved_at TEXT,
  resolution_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- インデックス
CREATE INDEX IF NOT EXISTS idx_escalation_status ON escalation_queue(status);
CREATE INDEX IF NOT EXISTS idx_escalation_session ON escalation_queue(session_id);
CREATE INDEX IF NOT EXISTS idx_escalation_created ON escalation_queue(created_at);
CREATE INDEX IF NOT EXISTS idx_escalation_priority ON escalation_queue(priority, status);

-- 自動エスカレーション追跡テーブル（連続不満足カウント用）
CREATE TABLE IF NOT EXISTS escalation_tracker (
  session_id TEXT PRIMARY KEY,
  consecutive_unresolved INTEGER NOT NULL DEFAULT 0,
  last_updated TEXT NOT NULL DEFAULT (datetime('now'))
);
