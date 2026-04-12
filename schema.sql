-- Chatwoot完全代替システム - データベーススキーマ

-- ユーザーテーブル
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    name TEXT,
    avatar_url TEXT,
    language TEXT DEFAULT 'japanese',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- スタッフテーブル
CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'agent', -- agent, supervisor, admin
    avatar_url TEXT,
    is_online BOOLEAN DEFAULT FALSE,
    last_seen DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- 会話テーブル
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    assigned_staff_id TEXT,
    status TEXT DEFAULT 'open', -- open, in_progress, resolved, closed
    priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
    title TEXT,
    language TEXT DEFAULT 'japanese',
    last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    resolved_at DATETIME,
    satisfaction_rating INTEGER, -- 1-5
    ai_handled BOOLEAN DEFAULT FALSE,
    total_messages INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (assigned_staff_id) REFERENCES staff(id)
);

-- メッセージテーブル  
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    sender_type TEXT NOT NULL, -- user, staff, ai, system
    sender_id TEXT,
    content TEXT NOT NULL,
    content_type TEXT DEFAULT 'text', -- text, image, file, system
    ai_processed BOOLEAN DEFAULT FALSE,
    ai_confidence REAL,
    detected_language TEXT,
    detected_intent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    edited_at DATETIME,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- タグテーブル
CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#3B82F6',
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

-- 会話タグテーブル（多対多）
CREATE TABLE IF NOT EXISTS conversation_tags (
    conversation_id TEXT,
    tag_id TEXT,
    added_by_staff_id TEXT,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (conversation_id, tag_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    FOREIGN KEY (tag_id) REFERENCES tags(id),
    FOREIGN KEY (added_by_staff_id) REFERENCES staff(id)
);

-- FAQ記事テーブル
CREATE TABLE IF NOT EXISTS faq_articles (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    language TEXT DEFAULT 'japanese',
    category TEXT,
    keywords TEXT, -- JSON array
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    unhelpful_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_staff_id TEXT,
    is_published BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (created_by_staff_id) REFERENCES staff(id)
);

-- 統計テーブル
CREATE TABLE IF NOT EXISTS analytics (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    metric_type TEXT NOT NULL, -- conversations, messages, resolutions, ai_responses
    metric_value REAL NOT NULL,
    dimension_1 TEXT, -- language, staff_id, etc
    dimension_2 TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ファイルアップロードテーブル
CREATE TABLE IF NOT EXISTS file_uploads (
    id TEXT PRIMARY KEY,
    conversation_id TEXT,
    message_id TEXT,
    original_filename TEXT NOT NULL,
    file_type TEXT,
    file_size INTEGER,
    storage_url TEXT NOT NULL,
    uploaded_by_type TEXT, -- user, staff
    uploaded_by_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    FOREIGN KEY (message_id) REFERENCES messages(id)
);

-- テンプレート（定型応答）テーブル
CREATE TABLE IF NOT EXISTS templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    content TEXT NOT NULL,
    language TEXT DEFAULT 'all',
    category TEXT DEFAULT 'general',
    shortcut TEXT,
    use_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by_staff_id TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (created_by_staff_id) REFERENCES staff(id)
);

-- 設定テーブル
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    description TEXT,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_by_staff_id TEXT,
    FOREIGN KEY (updated_by_staff_id) REFERENCES staff(id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_staff_id ON conversations(assigned_staff_id);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_date_metric ON analytics(date, metric_type);
CREATE INDEX IF NOT EXISTS idx_faq_articles_language ON faq_articles(language);
CREATE INDEX IF NOT EXISTS idx_faq_articles_category ON faq_articles(category);
CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
CREATE INDEX IF NOT EXISTS idx_file_uploads_conversation ON file_uploads(conversation_id);

-- 初期データ挿入

-- デフォルトタグ
INSERT OR IGNORE INTO tags (id, name, color, description) VALUES 
('tag_general', 'General', '#6B7280', '一般的な問い合わせ'),
('tag_billing', 'Billing', '#DC2626', '請求・支払い関連'),
('tag_technical', 'Technical', '#2563EB', '技術的問題'),
('tag_complaint', 'Complaint', '#DC2626', '苦情・不満'),
('tag_urgent', 'Urgent', '#EF4444', '緊急対応'),
('tag_resolved', 'Resolved', '#10B981', '解決済み'),
('tag_followup', 'Follow-up', '#F59E0B', 'フォローアップ要'),
('tag_vip', 'VIP', '#8B5CF6', '重要顧客');

-- 基本設定
INSERT OR IGNORE INTO settings (key, value, category, description) VALUES 
('site_name', 'AIカスタマーサポート', 'general', 'サイト名'),
('default_language', 'japanese', 'general', 'デフォルト言語'),
('ai_confidence_threshold', '0.7', 'ai', 'AI応答信頼度閾値'),
('auto_assignment', 'true', 'workflow', '自動アサイン有効'),
('business_hours_start', '09:00', 'general', '営業時間開始'),
('business_hours_end', '18:00', 'general', '営業時間終了'),
('max_file_size_mb', '10', 'upload', '最大ファイルサイズ(MB)'),
('supported_languages', 'japanese,english,chinese,korean,tagalog', 'ai', '対応言語');

-- 管理者スタッフ作成（初期セットアップ用）
INSERT OR IGNORE INTO staff (id, email, name, role, is_active) VALUES
('staff_admin', 'admin@company.com', 'System Admin', 'admin', TRUE),
('staff_ai', 'ai@system.local', 'AI Assistant', 'ai', TRUE);

-- ========== Phase 3: エンタープライズ機能 ==========

-- テナントテーブル
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    plan TEXT DEFAULT 'basic', -- basic, professional, enterprise
    settings TEXT DEFAULT '{}', -- JSON
    business_hours_start TEXT DEFAULT '09:00',
    business_hours_end TEXT DEFAULT '18:00',
    timezone TEXT DEFAULT 'Asia/Tokyo',
    auto_reply_enabled BOOLEAN DEFAULT TRUE,
    auto_reply_message TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ロール権限テーブル
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT UNIQUE NOT NULL, -- admin, supervisor, agent
    display_name TEXT NOT NULL,
    permissions TEXT NOT NULL DEFAULT '[]', -- JSON array of permission strings
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- スタッフロール紐付けテーブル（テナント対応）
CREATE TABLE IF NOT EXISTS staff_roles (
    staff_id TEXT NOT NULL,
    role_id TEXT NOT NULL,
    tenant_id TEXT,
    assigned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (staff_id, role_id),
    FOREIGN KEY (staff_id) REFERENCES staff(id),
    FOREIGN KEY (role_id) REFERENCES roles(id)
);

-- SLAポリシーテーブル
CREATE TABLE IF NOT EXISTS sla_policies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tenant_id TEXT,
    first_response_minutes INTEGER DEFAULT 60,
    resolution_minutes INTEGER DEFAULT 480,
    priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
    escalation_staff_id TEXT,
    escalation_enabled BOOLEAN DEFAULT TRUE,
    notify_before_breach_minutes INTEGER DEFAULT 15,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- SLAイベントテーブル（監視用）
CREATE TABLE IF NOT EXISTS sla_events (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    sla_policy_id TEXT NOT NULL,
    event_type TEXT NOT NULL, -- first_response_breach, resolution_breach, first_response_met, resolution_met
    breached_at DATETIME,
    resolved_at DATETIME,
    response_time_minutes REAL,
    notified BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    FOREIGN KEY (sla_policy_id) REFERENCES sla_policies(id)
);

-- 監査ログテーブル
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    actor_type TEXT NOT NULL, -- staff, system, api
    actor_id TEXT,
    actor_name TEXT,
    action TEXT NOT NULL, -- conversation.created, message.sent, staff.login, etc.
    resource_type TEXT, -- conversation, message, staff, tag, faq, etc.
    resource_id TEXT,
    details TEXT DEFAULT '{}', -- JSON
    ip_address TEXT,
    user_agent TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ========== Phase 4: Webhook・自動化 ==========

-- Webhookテーブル
CREATE TABLE IF NOT EXISTS webhooks (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    events TEXT NOT NULL DEFAULT '[]', -- JSON array: conversation.created, message.created, etc.
    secret TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    retry_count INTEGER DEFAULT 3,
    last_triggered_at DATETIME,
    failure_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Webhook配信ログテーブル
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id TEXT PRIMARY KEY,
    webhook_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    payload TEXT, -- JSON
    response_status INTEGER,
    response_body TEXT,
    attempt_count INTEGER DEFAULT 1,
    delivered_at DATETIME,
    failed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (webhook_id) REFERENCES webhooks(id)
);

-- 営業時間テーブル
CREATE TABLE IF NOT EXISTS business_hours (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    day_of_week INTEGER NOT NULL, -- 0=Sun, 1=Mon, ..., 6=Sat
    open_time TEXT NOT NULL DEFAULT '09:00',
    close_time TEXT NOT NULL DEFAULT '18:00',
    is_open BOOLEAN DEFAULT TRUE,
    UNIQUE(tenant_id, day_of_week)
);

-- 自動化ルールテーブル
CREATE TABLE IF NOT EXISTS automation_rules (
    id TEXT PRIMARY KEY,
    tenant_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    trigger_event TEXT NOT NULL, -- message.created, conversation.opened, conversation.resolved
    conditions TEXT DEFAULT '[]', -- JSON array of condition objects
    actions TEXT NOT NULL DEFAULT '[]', -- JSON array of action objects
    is_active BOOLEAN DEFAULT TRUE,
    run_count INTEGER DEFAULT 0,
    last_run_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- インデックス (Phase 3-4)
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id, actor_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sla_events_conversation ON sla_events(conversation_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_automation_rules_trigger ON automation_rules(trigger_event);

-- デフォルトテナント
INSERT OR IGNORE INTO tenants (id, name, slug, plan, is_active) VALUES
('tenant_default', 'Default Organization', 'default', 'enterprise', TRUE);

-- デフォルトロール
INSERT OR IGNORE INTO roles (id, name, display_name, permissions) VALUES
('role_admin', 'admin', 'Administrator', '["*"]'),
('role_supervisor', 'supervisor', 'Supervisor', '["conversations.*","messages.*","staff.view","staff.update","tags.*","faq.*","templates.*","analytics.*","sla.*","webhooks.*","business_hours.*","automation.*"]'),
('role_agent', 'agent', 'Agent', '["conversations.view","conversations.update","messages.view","messages.create","tags.view","faq.view","templates.view"]');

-- デフォルトSLAポリシー
INSERT OR IGNORE INTO sla_policies (id, name, first_response_minutes, resolution_minutes, priority, is_active) VALUES
('sla_urgent', 'Urgent SLA', 15, 60, 'urgent', TRUE),
('sla_high', 'High Priority SLA', 30, 240, 'high', TRUE),
('sla_normal', 'Normal SLA', 60, 480, 'normal', TRUE),
('sla_low', 'Low Priority SLA', 240, 1440, 'low', TRUE);

-- デフォルト営業時間（月〜金 9:00-18:00）
INSERT OR IGNORE INTO business_hours (id, tenant_id, day_of_week, open_time, close_time, is_open) VALUES
('bh_0', 'tenant_default', 0, '09:00', '18:00', FALSE), -- 日曜
('bh_1', 'tenant_default', 1, '09:00', '18:00', TRUE),  -- 月曜
('bh_2', 'tenant_default', 2, '09:00', '18:00', TRUE),  -- 火曜
('bh_3', 'tenant_default', 3, '09:00', '18:00', TRUE),  -- 水曜
('bh_4', 'tenant_default', 4, '09:00', '18:00', TRUE),  -- 木曜
('bh_5', 'tenant_default', 5, '09:00', '18:00', TRUE),  -- 金曜
('bh_6', 'tenant_default', 6, '09:00', '18:00', FALSE); -- 土曜

-- ========== Phase 1 CRM Features ==========

-- プレイヤー情報表示設定テーブル
CREATE TABLE IF NOT EXISTS player_info_settings (
    id INTEGER PRIMARY KEY,
    field_name TEXT NOT NULL,
    display_name TEXT NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0
);
INSERT OR IGNORE INTO player_info_settings (id, field_name, display_name, enabled, display_order) VALUES
(1, 'username', 'ユーザー名', TRUE, 1),
(2, 'email', 'メール', TRUE, 2),
(3, 'vip_tier', 'VIPランク', TRUE, 3),
(4, 'balance', '残高', TRUE, 4),
(5, 'total_deposits', '累計入金', TRUE, 5),
(6, 'total_bets', '累計ベット', TRUE, 6),
(7, 'kyc_level', 'KYCレベル', TRUE, 7),
(8, 'registration_date', '登録日', TRUE, 8),
(9, 'bonus_balance', 'ボーナス残高', TRUE, 9),
(10, 'last_login', '最終ログイン', TRUE, 10);

-- ボーナス付与テーブル
CREATE TABLE IF NOT EXISTS bonus_grants (
    id TEXT PRIMARY KEY,
    conversation_id TEXT,
    user_id TEXT,
    staff_id TEXT,
    amount REAL NOT NULL,
    type TEXT DEFAULT 'bonus',
    wager_multiplier REAL DEFAULT 1,
    expires_in_days INTEGER DEFAULT 30,
    reason TEXT,
    status TEXT DEFAULT 'granted',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- ボーナス設定テーブル
CREATE TABLE IF NOT EXISTS bonus_settings (
    id INTEGER PRIMARY KEY,
    max_amount_per_grant REAL DEFAULT 10000,
    max_daily_total REAL DEFAULT 50000,
    require_approval_above REAL DEFAULT 5000,
    default_wager_multiplier REAL DEFAULT 1,
    default_expires_days INTEGER DEFAULT 30,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO bonus_settings (id) VALUES (1);

-- コールバックリクエストテーブル
CREATE TABLE IF NOT EXISTS callback_requests (
    id TEXT PRIMARY KEY,
    conversation_id TEXT,
    user_id TEXT,
    channel TEXT NOT NULL,
    contact TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notified_at DATETIME,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- Phase 1 CRM インデックス
CREATE INDEX IF NOT EXISTS idx_bonus_grants_conversation ON bonus_grants(conversation_id);
CREATE INDEX IF NOT EXISTS idx_bonus_grants_user ON bonus_grants(user_id);
CREATE INDEX IF NOT EXISTS idx_bonus_grants_status ON bonus_grants(status);
CREATE INDEX IF NOT EXISTS idx_bonus_grants_created_at ON bonus_grants(created_at);
CREATE INDEX IF NOT EXISTS idx_callback_requests_status ON callback_requests(status);
CREATE INDEX IF NOT EXISTS idx_callback_requests_conversation ON callback_requests(conversation_id);

-- ========== Phase 2 CRM Features ==========

-- エスカレーションルールテーブル
CREATE TABLE IF NOT EXISTS escalation_rules (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    priority_threshold TEXT DEFAULT 'high',
    wait_time_minutes INTEGER DEFAULT 10,
    escalate_to_role TEXT DEFAULT 'supervisor',
    category TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- エスカレーションログテーブル
CREATE TABLE IF NOT EXISTS escalation_logs (
    id TEXT PRIMARY KEY,
    conversation_id TEXT,
    from_type TEXT,
    from_id TEXT,
    to_type TEXT,
    to_id TEXT,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- AI提案テーブル
CREATE TABLE IF NOT EXISTS ai_suggestions (
    id TEXT PRIMARY KEY,
    conversation_id TEXT,
    original_text TEXT,
    suggested_text TEXT,
    suggestion_type TEXT DEFAULT 'grammar',
    accepted BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- デフォルトエスカレーションルール
INSERT OR IGNORE INTO escalation_rules (id, name, priority_threshold, wait_time_minutes, escalate_to_role, category) VALUES
('esc1', 'VIPユーザー自動エスカレーション', 'normal', 5, 'supervisor', 'vip'),
('esc2', '入出金問題', 'high', 10, 'supervisor', 'payment'),
('esc3', 'クレーム', 'urgent', 3, 'admin', 'complaint'),
('esc4', '長時間未応答', 'normal', 15, 'supervisor', NULL);

-- Phase 2 CRM インデックス
CREATE INDEX IF NOT EXISTS idx_escalation_logs_conversation ON escalation_logs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_escalation_logs_created_at ON escalation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_ai_suggestions_conversation ON ai_suggestions(conversation_id);

-- ========== Phase 3 CRM Features ==========

-- チャット内入出金テーブル
CREATE TABLE IF NOT EXISTS chat_transactions (
    id TEXT PRIMARY KEY,
    conversation_id TEXT,
    user_id TEXT,
    type TEXT NOT NULL,
    amount REAL,
    method TEXT,
    status TEXT DEFAULT 'initiated',
    external_ref TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- チップテーブル
CREATE TABLE IF NOT EXISTS tips (
    id TEXT PRIMARY KEY,
    conversation_id TEXT,
    from_user_id TEXT,
    to_staff_id TEXT,
    amount REAL NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'completed',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- チップ設定テーブル
CREATE TABLE IF NOT EXISTS tip_settings (
    id INTEGER PRIMARY KEY,
    enabled BOOLEAN DEFAULT TRUE,
    min_amount REAL DEFAULT 100,
    max_amount REAL DEFAULT 10000,
    preset_amounts TEXT DEFAULT '[100,500,1000,3000]',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
INSERT OR IGNORE INTO tip_settings (id) VALUES (1);

-- ゲームレコメンデーションテーブル
CREATE TABLE IF NOT EXISTS game_recommendations (
    id TEXT PRIMARY KEY,
    conversation_id TEXT,
    user_id TEXT,
    recommended_games TEXT,
    reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- 不正検知提案テーブル
CREATE TABLE IF NOT EXISTS fraud_suggestions (
    id TEXT PRIMARY KEY,
    conversation_id TEXT,
    user_id TEXT,
    type TEXT NOT NULL,
    severity TEXT DEFAULT 'low',
    description TEXT,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_by TEXT,
    resolved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

-- Phase 3 CRM インデックス
CREATE INDEX IF NOT EXISTS idx_chat_transactions_conversation ON chat_transactions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_transactions_user ON chat_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_transactions_status ON chat_transactions(status);
CREATE INDEX IF NOT EXISTS idx_tips_from_user ON tips(from_user_id);
CREATE INDEX IF NOT EXISTS idx_tips_to_staff ON tips(to_staff_id);
CREATE INDEX IF NOT EXISTS idx_game_recommendations_conversation ON game_recommendations(conversation_id);
CREATE INDEX IF NOT EXISTS idx_game_recommendations_user ON game_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_suggestions_conversation ON fraud_suggestions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_fraud_suggestions_user ON fraud_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_fraud_suggestions_resolved ON fraud_suggestions(resolved);