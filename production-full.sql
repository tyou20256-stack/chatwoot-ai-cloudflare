-- =============================================
-- Sloten AI CS - 本番環境一括セットアップSQL
-- 生成日: 2026-04-13
-- テーブル: 43 / FAQ: 197件 / 初期データ含む
-- =============================================

-- ===========================================
-- SECTION 1: テーブル作成（43テーブル）
-- ===========================================
CREATE TABLE ab_test_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_id INTEGER,
  session_id TEXT,
  variant TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(test_id, session_id)
);

CREATE TABLE ab_test_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_id INTEGER,
  session_id TEXT,
  variant TEXT,
  rating TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE ab_tests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  test_name TEXT UNIQUE NOT NULL,
  category TEXT,
  variant_a TEXT NOT NULL,
  variant_b TEXT NOT NULL,
  variant_a_count INTEGER DEFAULT 0,
  variant_b_count INTEGER DEFAULT 0,
  variant_a_positive INTEGER DEFAULT 0,
  variant_b_positive INTEGER DEFAULT 0,
  winner TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE ai_characters (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT DEFAULT 'tenant_default',
  name TEXT NOT NULL,
  tone TEXT DEFAULT 'friendly',
  first_person TEXT DEFAULT 'わたし',
  politeness_level INTEGER DEFAULT 3,
  emoji_level TEXT DEFAULT 'moderate',
  intro_message TEXT,
  suffix TEXT,
  avatar_url TEXT,
  system_prompt_override TEXT,
  is_preset INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE ai_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date TEXT NOT NULL,
  model TEXT NOT NULL,
  intent TEXT DEFAULT 'unknown',
  escalated INTEGER DEFAULT 0,
  response_time_ms INTEGER DEFAULT 0,
  input_length INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT DEFAULT 'tenant_default',
    user_id INTEGER,
    action TEXT NOT NULL, -- conversation, message, staff, tag, faq, etc.
    resource_type TEXT,
    resource_id TEXT,
    details TEXT, -- JSON
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE automation_rules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT DEFAULT 'tenant_default',
    name TEXT NOT NULL,
    event_type TEXT, -- conversation_created, message_received, etc.
    conditions TEXT, -- JSON
    actions TEXT, -- JSON
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE bonus_code_usage (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT DEFAULT 'tenant_default',
    bonus_code_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    user_id INTEGER NOT NULL,
    conversation_id INTEGER,
    channel TEXT, -- telegram, line, web, etc.
    channel_user_id TEXT, -- telegram_id or line_id
    user_name TEXT,
    metadata TEXT, -- JSON for additional info
    used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (bonus_code_id) REFERENCES bonus_codes(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);

CREATE TABLE bonus_codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT DEFAULT 'tenant_default',
    code TEXT NOT NULL UNIQUE,
    type TEXT DEFAULT 'discount', -- discount, gift, points, etc.
    value TEXT, -- discount amount, gift description, points, etc.
    description TEXT,
    max_uses INTEGER DEFAULT 1, -- 0 = unlimited
    current_uses INTEGER DEFAULT 0,
    valid_from DATETIME,
    valid_until DATETIME,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    response_message TEXT, -- カスタム応答メッセージ（ボーナスコード使用時に自動送信）
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE brand_config (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  domain TEXT,
  tenant_id TEXT DEFAULT 'tenant_default',
  welcome_message TEXT,
  tone TEXT DEFAULT 'friendly',
  language TEXT DEFAULT 'ja',
  primary_color TEXT DEFAULT '#183440',
  accent_color TEXT DEFAULT '#FFD700',
  ai_character_id INTEGER,
  gemini_model TEXT DEFAULT 'gemini-2.5-flash-lite',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE business_hours (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT DEFAULT 'tenant_default',
    day_of_week INTEGER, -- 0=Sunday, 6=Saturday
    start_time TEXT, -- HH:MM format
    end_time TEXT,
    timezone TEXT DEFAULT 'Asia/Tokyo',
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT DEFAULT 'tenant_default',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  bonus_code TEXT,
  conditions TEXT,
  start_date TEXT,
  end_date TEXT,
  is_active INTEGER DEFAULT 1,
  auto_faq INTEGER DEFAULT 1,
  linked_faq_id INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE channels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  webhook_url TEXT,
  is_active INTEGER DEFAULT 1,
  config TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE chat_sessions (
  session_id TEXT PRIMARY KEY,
  history TEXT DEFAULT '[]',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE conversation_tags (
    conversation_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (conversation_id, tag_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    FOREIGN KEY (tag_id) REFERENCES tags(id)
);

CREATE TABLE conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT DEFAULT 'tenant_default',
    user_id INTEGER NOT NULL,
    status TEXT DEFAULT 'open', -- open, in_progress, resolved, closed
    priority TEXT DEFAULT 'normal', -- low, normal, high, urgent
    assignee_id INTEGER,
    ai_handled BOOLEAN DEFAULT 0,
    satisfaction_rating INTEGER, -- 1-5
    resolved_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (assignee_id) REFERENCES users(id)
);

CREATE TABLE escalation_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  reason TEXT NOT NULL,
  priority TEXT DEFAULT 'normal',
  user_message TEXT,
  ai_summary TEXT,
  conversation_history TEXT,
  status TEXT DEFAULT 'pending',
  assigned_to TEXT,
  resolved_at TEXT,
  resolution_note TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE escalation_tracker (
  session_id TEXT PRIMARY KEY,
  consecutive_unresolved INTEGER DEFAULT 0,
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE faq (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT DEFAULT 'tenant_default',
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT,
    language TEXT DEFAULT 'ja',
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP, priority INTEGER DEFAULT 1,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE feature_flags (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT 'false',
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  message_text TEXT,
  ai_response TEXT,
  rating TEXT NOT NULL,
  comment TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT DEFAULT 'tenant_default',
    conversation_id INTEGER,
    filename TEXT NOT NULL,
    size INTEGER,
    mime_type TEXT,
    r2_key TEXT, -- R2 storage key
    uploaded_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE TABLE knowledge_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_id INTEGER,
  chunk_index INTEGER,
  content TEXT,
  embedding TEXT,
  FOREIGN KEY (source_id) REFERENCES knowledge_sources(id)
);

CREATE TABLE knowledge_sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT,
  title TEXT,
  content TEXT,
  raw_html TEXT,
  metadata TEXT,
  source_type TEXT DEFAULT 'url',
  priority INTEGER DEFAULT 3,
  content_hash TEXT,
  auto_refresh BOOLEAN DEFAULT 0,
  last_refreshed_at DATETIME,
  category TEXT DEFAULT 'general',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    sender_id INTEGER NOT NULL,
    sender_type TEXT DEFAULT 'user', -- user, agent, ai, system
    content TEXT NOT NULL,
    metadata TEXT, -- JSON (intent, language, etc.)
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    FOREIGN KEY (sender_id) REFERENCES users(id)
);

CREATE TABLE proactive_trigger_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  trigger_key TEXT,
  action TEXT DEFAULT 'shown',
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE proactive_triggers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  trigger_key TEXT UNIQUE NOT NULL,
  message TEXT NOT NULL,
  quick_replies TEXT DEFAULT '[]',
  cooldown_hours INTEGER DEFAULT 24,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE response_cache (
  question_hash TEXT PRIMARY KEY,
  question TEXT,
  response TEXT,
  model TEXT DEFAULT 'cache',
  hit_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  expires_at TEXT
);

CREATE TABLE sheet_integrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT DEFAULT 'tenant_default',
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- bonus_codes, orders, analytics, etc.
    spreadsheet_id TEXT NOT NULL,
    sheet_name TEXT NOT NULL, -- tab name
    service_account_json TEXT, -- Google Service Account JSON
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE sla_policies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT DEFAULT 'tenant_default',
    name TEXT NOT NULL,
    priority TEXT, -- low, normal, high, urgent
    first_response_time INTEGER, -- minutes
    resolution_time INTEGER, -- minutes
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE staff_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT DEFAULT 'tenant_default',
  name TEXT NOT NULL,
  email TEXT,
  role TEXT DEFAULT 'operator',
  channels TEXT DEFAULT '["web","line","telegram"]',
  ai_character_id INTEGER,
  shift_type TEXT DEFAULT 'business_hours',
  status TEXT DEFAULT 'offline',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (ai_character_id) REFERENCES ai_characters(id)
);

CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT DEFAULT 'tenant_default',
    name TEXT NOT NULL,
    color TEXT DEFAULT '#3b82f6',
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT DEFAULT 'tenant_default',
    name TEXT NOT NULL,
    category TEXT,
    content TEXT NOT NULL,
    language TEXT DEFAULT 'ja',
    shortcut TEXT,
    usage_count INTEGER DEFAULT 0,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    domain TEXT,
    settings TEXT, -- JSON
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT DEFAULT 'tenant_default',
    email TEXT,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'user', -- user, agent, admin
    avatar_url TEXT,
    metadata TEXT, -- JSON
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen_at DATETIME,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE vip_config (
  level TEXT PRIMARY KEY,
  tone TEXT DEFAULT 'friendly',
  greeting_prefix TEXT,
  escalation_threshold INTEGER DEFAULT 3,
  auto_human INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE vip_interaction_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  vip_level TEXT,
  action TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE webhook_deliveries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    webhook_id INTEGER NOT NULL,
    event_type TEXT,
    payload TEXT, -- JSON
    response_status INTEGER,
    response_body TEXT,
    delivered_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (webhook_id) REFERENCES webhooks(id)
);

CREATE TABLE webhooks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT DEFAULT 'tenant_default',
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    events TEXT, -- JSON array of event types
    secret TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE TABLE welcome_menu_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT DEFAULT 'tenant_default',
  emoji TEXT,
  label TEXT NOT NULL,
  position INTEGER DEFAULT 0,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE welcome_menu_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT DEFAULT 'tenant_default',
  welcome_message TEXT DEFAULT 'スロット天国カスタマーサポートへようこそ！',
  subtitle TEXT DEFAULT 'ご希望の項目をお選びください。',
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE widget_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT DEFAULT 'tenant_default',
  key TEXT NOT NULL,
  value TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE widget_menu_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_key TEXT NOT NULL,
  item_label TEXT NOT NULL,
  item_icon TEXT,
  is_visible INTEGER DEFAULT 1,
  display_order INTEGER DEFAULT 0,
  target_action TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);


-- ===========================================
-- SECTION 2: FAQ データ（197件）
-- ===========================================
-- FAQ: 197 items
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '営業時間を教えてください', '平日9:00-18:00（土日祝休み）です。', '営業時間', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '返品は可能ですか？', '商品到着後14日以内であれば返品可能です。', '返品・交換', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '入金方法を教えてください', 'Slotenでは7種類の入金方法をご用意しております。①ATM振込 ②銀行振り込み ③銀行振り込み（自動） ④仮想通貨 ⑤コンビニ払い ⑥PayPayマネー ⑦PayPayマネーライト からお選びいただけます。入金の最低額は¥10,000、最高額は¥200,000となっております。入金をご希望の場合は、チャットにて「入金」とメッセージをお送りください。', 'deposit', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '入金の最低額と最高額はいくらですか？', 'Slotenでの入金は、最低¥10,000から最高¥200,000までとなっております。すべての入金方法で同一の上限・下限が適用されます。高額な入金をご希望の場合は、複数回に分けてお手続きいただくか、カスタマーサポートまでご相談ください。', 'deposit', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '入金するにはどうすればいいですか？', '入金の手順は以下の通りです。まず、Slotenのチャット画面を開き「入金」とメッセージを送信してください。担当スタッフがご希望の入金方法をお伺いし、必要な振込先情報や手順をご案内いたします。7種類の方法からお選びいただけます。', 'deposit', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'PayPayで入金できますか？', 'はい、SlotenではPayPayマネーおよびPayPayマネーライトの2種類に対応しております。PayPayでの入金をご希望の場合は、チャットにて「入金」とお送りいただき、PayPayをご希望の旨をお伝えください。スタッフが送金先の情報をご案内いたします。', 'deposit', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '仮想通貨で入金できますか？', 'はい、Slotenでは仮想通貨による入金に対応しております。チャットにて「入金」とお送りいただき、仮想通貨での入金をご希望の旨をお伝えください。対応通貨やウォレットアドレスなどの詳細をスタッフがご案内いたします。', 'deposit', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'コンビニ払いで入金できますか？', 'はい、Slotenではコンビニ払いによる入金に対応しております。チャットにて「入金」とお送りいただき、コンビニ払いをご希望の旨をお伝えください。お支払い用の番号や手順をスタッフがご案内いたします。最低入金額は¥10,000です。', 'deposit', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '入金が反映されません', '入金が反映されない場合、以下をご確認ください。①振込名義がアカウント登録名と一致しているか ②入金額が最低¥10,000以上であるか ③銀行振込の場合、営業時間外は翌営業日の反映になることがあります ④仮想通貨の場合、ネットワーク承認に時間がかかることがございます。解決しない場合は振込明細をご用意の上、チャットサポートまでお問い合わせください。', 'deposit', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '出金方法を教えてください', '出金をご希望の場合は、チャットにてスタッフへ出金のご希望をお伝えください。ご登録の口座情報等を確認の上、出金手続きを進めさせていただきます。出金時にはボーナスの賭け条件が完了していることをご確認ください。', 'deposit', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '出金にかかる時間はどれくらいですか？', '通常、出金申請後24時間以内にお手続きを完了いたします。銀行側の処理状況やお申し込みのタイミングによっては多少お時間をいただく場合がございます。土日祝日や銀行の営業時間外の場合、翌営業日の対応となることもございます。', 'deposit', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ATM振込で入金する方法を教えてください', 'ATM振込での入金は、チャットにて「入金」とメッセージをお送りください。スタッフがATM振込用の口座情報をご案内いたします。最寄りのATMから¥10,000〜¥200,000の範囲でお振込みください。振込完了後、確認次第アカウント残高に反映いたします。', 'deposit', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ドリームポットとは何ですか？', 'ドリームポットは、Sloten独自の業界初のジャックポットシステムです。最大賞金はなんと¥5,000,000！対象ゲームをプレイすることで自動的にエントリーされます。詳細な条件や対象ゲームについては、プロモーションページまたはチャットサポートまでお問い合わせください。', 'bonus', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ゾロ目チャレンジとは何ですか？', 'ゾロ目チャレンジは、スロットゲームでボーナス購入を行い、配当金がゾロ目（例：¥1,111、¥22,222など）になった場合に特典がもらえるキャンペーンです。最大30%のキャッシュバックが適用されます。ボーナスコード「ゾロ目チャレンジ」をご利用ください。', 'bonus', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '入金不要ボーナスはありますか？', 'はい、Slotenでは入金不要ボーナスをご用意しております。新規登録のお客様には、入金なしでお楽しみいただけるボーナスをご提供しています。ウェルカムメニューの「入金不要ボーナス」からご確認いただけます。出金には賭け条件の達成が必要です。', 'bonus', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ボーナスコードはどこで入力しますか？', 'ボーナスコードは、チャットサポートにてスタッフへ直接お伝えください。現在ご利用いただけるコードには「ゾロ目チャレンジ」「ホワイトデー」「WELCOME10」「FREEGIFT」「POINTS500」などがございます。', 'bonus', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'WELCOME10のボーナスコードとは？', 'WELCOME10は新規のお客様向けの10%割引ボーナスコードです。初回入金時にご利用いただくと、入金額の10%分がボーナスとして付与されます。チャットで「WELCOME10」とお伝えください。', 'bonus', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ボーナスの賭け条件とは何ですか？', '賭け条件とは、ボーナスで受け取った金額を出金するために必要なベット総額の条件です。例えば¥1,000のボーナスに20倍の賭け条件がある場合、¥20,000分のベットが必要です。各ボーナスにより条件が異なりますので、ご利用前にご確認ください。', 'bonus', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ホワイトデーキャンペーンとは？', 'ホワイトデーキャンペーンは季節限定プロモーションです。ボーナスコード「ホワイトデー」をご利用いただくと、ティア別に¥500〜¥3,000のキャッシュボーナスが付与されます。期間限定ですのでお早めにご利用ください。', 'bonus', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '現在利用できるボーナスコード一覧', '現在ご利用いただけるボーナスコード: ①「ゾロ目チャレンジ」最大30%CB ②「ホワイトデー」ティア別¥500〜¥3,000 ③「WELCOME10」新規10%割引 ④「FREEGIFT」先着100名ノベルティ ⑤「POINTS500」500ポイント。有効期限や条件はチャットでご確認ください。', 'bonus', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'アカウントの登録方法を教えてください', 'sloten.ioにアクセスし、新規登録ボタンからお手続きください。必要な情報をご入力いただくだけで、すぐにアカウントが作成されます。KYC（本人確認書類の提出）は不要ですので、面倒な書類提出なしですぐにゲームをお楽しみいただけます。', 'account', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '本人確認（KYC）は必要ですか？', 'いいえ、SlotenではKYC（本人確認書類の提出）は不要です。運転免許証やパスポートなどの書類を提出することなく、アカウント登録からゲームプレイ、入出金までスムーズにご利用いただけます。ただし、不正利用防止の観点から状況に応じてご確認をお願いする場合もございます。', 'account', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ログインできません', '以下をご確認ください。①ユーザー名とパスワードが正しいか ②Caps Lockがオンになっていないか ③ブラウザのキャッシュとCookieをクリア ④別のブラウザでお試しください。解決しない場合はパスワードリセットをお試しいただくか、チャットサポートまでご連絡ください。', 'account', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'パスワードを忘れました', 'ログイン画面の「パスワードをお忘れですか？」リンクからリセットが可能です。ご登録のメールアドレスにリセット用リンクが送信されます。メールが届かない場合は迷惑メールフォルダもご確認ください。解決しない場合はチャットサポートまでご連絡ください。', 'account', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'アカウントを退会したい', '退会をご希望の場合はチャットサポートまでご連絡ください。退会前にアカウント残高の出金がお済みであることをご確認ください。退会後はアカウント情報やゲーム履歴にアクセスできなくなりますのでご注意ください。', 'account', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'アカウントがロックされました', 'チャットサポートまでお問い合わせください。パスワードの複数回誤入力やセキュリティ上の理由でロックされる場合がございます。スタッフが状況を確認し、ロック解除の手続きを行います。', 'account', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '年齢制限はありますか？', 'Slotenのご利用は18歳以上のお客様に限らせていただいております。未成年の方のご登録およびご利用は固くお断りしております。年齢に関する虚偽の申告が判明した場合、アカウントの停止となります。', 'account', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '複数アカウントは作れますか？', 'いいえ、お一人様1アカウントのみとさせていただいております。複数アカウントの作成は利用規約で禁止されており、発覚した場合はすべてのアカウントの停止および残高の没収となる場合がございます。', 'account', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'どんなゲームがありますか？', 'Slotenでは以下のカテゴリのゲームをお楽しみいただけます。①スロットゲーム ②ライブカジノ ③パチンコ・パチスロ ④ポーカー。16社のゲームプロバイダーと提携しており、数多くのタイトルをご用意しております。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '人気のスロットゲームは何ですか？', 'Slotenで特に人気のスロットゲームは、Rise of Olympus、Sweet Bonanza、Gates of Olympus、Book of Dead、Moon Princessなどです。Play''n GO、Pragmatic Play、Hacksawなど人気プロバイダーのタイトルを多数取り揃えております。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ライブカジノはありますか？', 'はい、SlotenではEvolution社をはじめとするライブカジノゲームをご用意しております。Speed Baccarat、Lightning Roulette、Crazy Time、Mega Ballなどの人気タイトルをリアルタイムでお楽しみいただけます。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'パチンコ・パチスロはありますか？', 'はい、Slotenでは日本の方に人気のパチンコ・パチスロもお楽しみいただけます。「CR グラップラー刃牙」「エヴァンゲリオン」「リング 呪いの7日間」「バジリスク」「番長ZERO」など多数のタイトルをご用意しております。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ゲームプロバイダーは何社ありますか？', 'Slotenでは16社のゲームプロバイダーと提携しております。Pragmatic Play、PG、Habanero、Booongo、CQ9、Playson、JILI、Nolimit、Evolution、Play''n GO、Hacksaw、Red Tiger、Relax、Avatar、アミュレット、Revolverの各社から厳選したゲームをお楽しみいただけます。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ゲームが動かない・フリーズした', 'ゲームが動かない場合は、以下をお試しください。①ページを再読み込み（リロード） ②ブラウザのキャッシュをクリア ③別のブラウザでお試しください ④インターネット接続をご確認ください ⑤スマホの場合はアプリを再起動。それでも解決しない場合はチャットサポートまでご連絡ください。ゲーム名とエラーの状況をお伝えいただけるとスムーズです。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ゲームの公平性は保証されていますか？', 'はい、Slotenで提供しているすべてのゲームは、各ゲームプロバイダーによって独立した乱数生成器（RNG）を使用しており、結果は完全にランダムです。また、Slotenはジョージアライセンスを取得しており、公正なゲーム運営が義務付けられております。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ポーカーはありますか？', 'はい、Slotenではポーカーゲームもお楽しみいただけます。トップメニューの「ポーカー」からアクセスいただけます。ビデオポーカーなど各種タイトルをご用意しておりますので、ぜひお試しください。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'スマホでもゲームはプレイできますか？', 'はい、Slotenはスマートフォンやタブレットからもご利用いただけます。専用アプリのダウンロードは不要で、お使いのブラウザ（Chrome、Safariなど）からsloten.ioにアクセスするだけでお楽しみいただけます。画面サイズに合わせて自動的に最適化されます。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ゲームのRTP（還元率）はどこで確認できますか？', '各ゲームのRTP（還元率）は、ゲーム画面内の「i」アイコンやヘルプセクションからご確認いただけます。一般的にスロットゲームのRTPは94〜97%程度となっております。具体的なゲームのRTPについてはチャットサポートでもお答えいたします。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'スロット天国（Sloten）とは何ですか？', 'スロット天国（Sloten）は、オンラインカジノサイトです。業界初のドリームポット（最大¥5,000,000）が楽しめるほか、スロット・ライブカジノ・パチンコ・パチスロ・ポーカーなど多彩なゲームをご用意しております。KYC不要で手軽に始められ、7種類の入金方法に対応しています。', 'general', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ライセンスはどこで取得していますか？', 'Slotenは、ジョージア共和国（Kutaisi Free Industrial Zone）のiGamingサービスライセンス（N138/1）を取得して運営しております。運営会社はSMART BIZ TECHNOLOGY INC.（フィリピン法人）です。安心してご利用いただけます。', 'general', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'カスタマーサポートの営業時間は？', 'Slotenのカスタマーサポートはチャットにて対応しております。お気軽にチャットウィンドウからお問い合わせください。また、AIアシスタントが24時間体制で基本的なご質問にお答えしております。', 'general', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '安全にプレイできますか？', 'はい、Slotenはジョージアライセンスを取得した正規のオンラインカジノです。SSL暗号化通信によりお客様の情報を保護しており、すべてのゲームは独立した乱数生成器（RNG）で公正に運営されています。また、責任あるギャンブルの観点から各種サポートもご用意しております。', 'general', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '日本語でサポートを受けられますか？', 'はい、Slotenでは日本語でのカスタマーサポートを提供しております。チャットサポートは日本語でご利用いただけますので、お気軽にお問い合わせください。サイト自体も日本語対応しております。', 'general', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'お友達紹介プログラムはありますか？', 'はい、Slotenではお友達紹介プログラムをご用意しております。お友達をSlotenにご紹介いただくと、特典を受けることができます。詳細な条件や特典内容については、サイト内の「お友達紹介」ページまたはチャットサポートまでお問い合わせください。', 'general', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'アフィリエイトプログラムはありますか？', 'はい、Slotenではアフィリエイトプログラムをご用意しております。ブログやSNSなどでSlotenをご紹介いただき、報酬を得ることができます。詳細はフッターの「アフィリエイトプログラム」リンクからご確認いただくか、チャットサポートまでお問い合わせください。', 'general', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '責任あるゲーミングとは？', '責任あるゲーミングとは、ギャンブルを健全に楽しむための取り組みです。Slotenでは自己制限の設定やアカウントの一時停止など、お客様が安全にお楽しみいただけるよう各種サポートをご用意しております。もしギャンブルに関してお悩みがある場合は、チャットサポートまでご相談ください。', 'general', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '対応しているブラウザは？', 'Slotenは主要なウェブブラウザでご利用いただけます。Google Chrome、Safari、Firefox、Microsoft Edgeの最新バージョンを推奨しております。最新のブラウザをお使いいただくことで、最適なゲーム体験をお楽しみいただけます。', 'general', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '通信は暗号化されていますか？', 'はい、SlotenではSSL（Secure Sockets Layer）暗号化技術を採用しており、お客様の個人情報や取引データは安全に保護されています。安心してご利用いただけます。', 'general', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '銀行のメンテナンスで入金できない場合は？', '銀行のメンテナンス時間中は、銀行振込やATM振込での入金がご利用いただけない場合がございます。メンテナンス情報はサイトのお知らせに掲載いたしますのでご確認ください。仮想通貨やPayPayなど、銀行を経由しない方法でしたらメンテナンス中でもご入金いただける場合がございます。', 'general', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ランキングとは何ですか？', 'Slotenではハイローラーボードとラッキープレイヤーボードの2種類のランキングをご用意しております。ハイローラーボードはベット金額の上位プレイヤーが表示され、ラッキープレイヤーボードは高配当を獲得したプレイヤーが表示されます。トップページからご確認いただけます。', 'general', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '出金が反映されません', '出金が反映されない場合は、以下をご確認ください。①ボーナスの賭け条件が達成されているか ②出金申請が正しく送信されたか ③銀行の営業時間外の場合は翌営業日の反映になります。48時間以上経っても反映されない場合は、チャットサポートまでお問い合わせください。迅速に調査いたします。', 'deposit', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '問い合わせ方法を教えてください', 'Slotenへのお問い合わせは、サイト右下のチャットアイコンからチャットサポートをご利用ください。AIアシスタントが基本的なご質問にお答えし、必要に応じて人間のオペレーターにお繋ぎいたします。入金のご希望やボーナスコードの適用もチャットから行えます。', 'general', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '入金時に名義が一致しないとエラーになりますか？', 'はい、入金時にご登録名義と送金元の名義が一致している必要がございます。名義不一致で入金された場合はサポートまでご連絡ください。', 'deposit_trouble', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '入金額を間違えて振り込んでしまいました', '入金額を間違えた場合はサポートまでご連絡ください。¥10,000〜¥200,000の範囲内であればそのまま反映されます。範囲外の場合は返金対応いたします。', 'deposit_trouble', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '二重に入金してしまったのですが返金は可能ですか？', '二重入金の返金は可能です。入金日時・金額・送金方法をサポートにお伝えください。確認後1〜3営業日で返金処理いたします。', 'deposit_trouble', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '出金申請をキャンセルできますか？', 'はい、処理が開始される前であればキャンセル可能です。マイページの出金履歴からキャンセルするか、サポートまでご連絡ください。', 'deposit_trouble', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '入出金に手数料はかかりますか？', 'Sloten側では入出金手数料は無料です。ただし銀行振込の振込手数料や仮想通貨のネットワーク手数料はお客様のご負担となります。', 'deposit_trouble', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'PayPayでの入金がエラーになります', 'PayPay残高不足、アプリのバージョンが古い、1日の利用上限到達が主な原因です。アプリを更新し残高をご確認ください。解決しない場合は別の入金方法もご利用いただけます。', 'deposit_trouble', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'コンビニ入金の手順を教えてください', '①入金画面でコンビニ入金を選択→②入金額を入力→③表示される払込番号を保存→④コンビニのレジで番号を提示し現金でお支払い→⑤通常5〜15分で残高に反映されます。', 'deposit_trouble', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '仮想通貨の送金アドレスを間違えてしまいました', '仮想通貨の誤送金は回収が困難です。速やかにサポートへトランザクションIDと送金先アドレスをお知らせください。今後はアドレスのコピー＆ペーストを推奨します。', 'deposit_trouble', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'Gates of Olympusはどんなスロットですか？', 'Pragmatic Play社の人気スロットです。ゼウスをテーマにした6x5リールで、マルチプライヤーが最大500倍まで累積します。最大配当は賭け金の5,000倍です。', 'game_detail', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'Sweet Bonanzaの特徴を教えてください', 'Pragmatic Play社のキャンディテーマスロットです。どこでもペイ方式で、フリースピン中のマルチプライヤーボムが最大100倍。最大配当は21,175倍です。ボーナスBUY機能も搭載。', 'game_detail', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ボーナスBUY機能とは何ですか？', 'ベット額の60〜100倍を支払って即座にフリースピンに突入できる機能です。Sweet BonanzaやGates of Olympus等に搭載されています。', 'game_detail', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ドリームポットの仕組みを詳しく教えてください', '対象スロットをプレイするとベット額の一部がプールに加算されます。当選はランダムで、蓄積額が最大¥5,000,000まで増加します。ベット額が大きいほど当選確率が上がります。', 'game_detail', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'デモプレイ（無料プレイ）はできますか？', 'はい、多くのスロットでデモプレイが可能です。ゲームロビーで「デモ」ボタンをクリックしてください。ライブカジノ等一部ゲームは非対応です。', 'game_detail', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ライブカジノではどんなゲームが遊べますか？', 'バカラ、ブラックジャック、ルーレット、ゲームショー（Crazy Time等）をリアルディーラーと24時間プレイできます。Evolution等の大手プロバイダーが提供しています。', 'game_detail', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'フリースピンボーナスの使い方を教えてください', '対象スロットを開くと自動的にフリースピンが利用可能です。フリースピンから得た勝利金には賭け条件が適用されます。有効期限は通常7日間です。', 'bonus_detail', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ロイヤリティプログラム（VIP）はありますか？', 'はい、プレイするたびにポイントが貯まりVIPレベルが上がります。専用ボーナス、キャッシュバック率向上、出金限度額引き上げ等の特典があります。', 'bonus_detail', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ボーナスを放棄（キャンセル）できますか？', 'はい、マイページのボーナス管理から放棄可能です。ただし放棄するとボーナス残高と勝利金も失効します。出金をお急ぎの場合にご検討ください。', 'bonus_detail', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '推奨ブラウザやデバイスは？', 'Chrome、Safari、Firefox、Edgeの最新版を推奨します。スマホ・タブレットでも利用可能で、専用アプリは不要です。', 'technical', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '画面が真っ白になりました', 'ブラウザのキャッシュクリア、ページの再読み込み、別のブラウザでお試しください。それでも解決しない場合はサポートまでご連絡ください。', 'technical', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '通信エラーが表示されます', 'インターネット接続をご確認ください。Wi-Fiの再接続やモバイルデータ通信への切替をお試しください。VPN使用中の場合はOFFにしてお試しください。', 'technical', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '個人情報はどのように保護されていますか？', 'SSL暗号化通信でデータを保護しています。個人情報は厳格なプライバシーポリシーに基づき管理され、第三者への不正な提供は一切行いません。', 'security', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '不正アクセスされた気がします', '速やかにパスワードを変更し、サポートまでご連絡ください。身に覚えのないログインや取引がないか確認いたします。', 'security', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '入金制限を設定できますか？', 'はい、責任あるゲーミングの一環として、日次・週次・月次の入金上限を設定できます。サポートまでご希望の制限額をお伝えください。', 'responsible_gaming', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '自己排除（セルフエクスクルージョン）とは？', 'ご自身で一定期間アカウントを利用停止にできる機能です。24時間〜無期限で設定可能です。設定をご希望の場合はサポートまでご連絡ください。', 'responsible_gaming', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ギャンブルに関する相談窓口を教えてください', '消費者ホットライン（188）やよりそいホットライン（0120-279-338）にご相談いただけます。当サイトでも入金制限や自己排除の設定をサポートいたします。', 'responsible_gaming', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'メンテナンス中はどうなりますか？', 'メンテナンス中はサイトの一部または全機能がご利用いただけません。メンテナンス情報はサイト上のお知らせで事前にご案内いたします。', 'general', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ポーカーはどのような形式で遊べますか？', 'ビデオポーカー（ソロ形式）、ライブカジノポーカー（ディーラー対戦）、テーブルポーカー（コンピュータ対戦）の3形式でプレイ可能です。', 'game_detail', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '花魁ドリームとはどんなゲームですか？', 'JTG社の和風テーマスロットです。リスピン機能と3種類のフリースピンボーナスが特徴で、最大配当は2,000倍以上。日本のプレイヤーに大人気です。', 'game_detail', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ハワイアンドリームの特徴は？', 'JTG社のハワイテーマスロットです。3x3リールのシンプルな構成ながら、リスピン連鎖で大きな配当を狙えます。パチスロ風の演出が楽しめます。', 'game_detail', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'アカウントの通貨は何ですか？', 'Slotenでは日本円（JPY）でプレイいただけます。入出金も全て円建てで行えますので、為替手数料の心配はございません。', 'general', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'サイトの言語を変更できますか？', 'はい、サイト右上の言語設定から変更可能です。現在は日本語、英語に対応しております。', 'general', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ゲームの途中で接続が切れた場合はどうなりますか？', 'ゲーム進行中に接続が切れた場合、再接続後にゲームは中断した時点から再開されます。ベットは有効のまま保持されますのでご安心ください。', 'technical', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'モバイルでの動作が遅い場合の対処法は？', 'ブラウザのキャッシュクリア、不要なタブを閉じる、Wi-Fi接続の確認をお試しください。また最新OSとブラウザへの更新を推奨します。', 'technical', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '出金条件（賭け条件）の進捗はどこで確認できますか？', 'マイページの「ボーナス管理」セクションから、各ボーナスの賭け条件の達成率をリアルタイムで確認いただけます。', 'bonus_detail', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'キャッシュバックボーナスとは？', 'プレイで発生した損失の一部がキャッシュバックとして返金される制度です。キャッシュバック率はVIPレベルにより異なります。', 'bonus_detail', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ゲームの勝率や確率は操作されていますか？', '一切操作しておりません。全ゲームは独立した乱数生成器（RNG）で結果が決定され、第三者機関により公正性が検証されています。', 'security', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'アフィリエイトプログラムの詳細を教えてください', 'ブログやSNSでSlotenを紹介し報酬を得られるプログラムです。フッターの「アフィリエイトプログラム」から詳細確認・申込が可能です。', 'general', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'クーリングオフ期間とは？', '自主的にアカウントの利用を一時停止できる期間です。24時間、1週間、1ヶ月から選択でき、期間中はログインやプレイができなくなります。', 'responsible_gaming', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '利用規約はどこで確認できますか？', 'サイトフッターの「一般規約」リンクからご確認いただけます。プロモーション規約、プライバシーポリシー、AML/KYCポリシーもフッターからアクセス可能です。', 'general', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'What deposit methods are available?', 'Sloten offers 7 deposit methods: Bank Transfer, ATM, Cryptocurrency, Convenience Store Payment, PayPay Money, and PayPay Money Lite. Minimum deposit is ¥10,000, maximum is ¥200,000 per transaction.', 'deposit', 'en', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'My deposit has not been reflected', 'If your deposit has not appeared, please check: 1) The sender name matches your account name, 2) The amount is at least ¥10,000, 3) Bank transfers may take up to 30-60 minutes. If still unresolved, please contact support with your transfer receipt.', 'deposit', 'en', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'How do I withdraw?', 'To withdraw, please contact our support team via chat. We will verify your account details and process your withdrawal. Please ensure any bonus wagering requirements are completed before requesting a withdrawal.', 'deposit', 'en', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'How long does withdrawal take?', 'Withdrawals are typically processed within 24 hours. Bank transfers may take 1-3 business days. Processing may take longer on weekends and holidays.', 'deposit', 'en', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'My withdrawal has not been received', 'If your withdrawal has not been received after 3 business days, please check if wagering requirements are met. Contact support with your withdrawal ID for investigation.', 'deposit', 'en', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'What is Dream Pot?', 'Dream Pot is Sloten exclusive jackpot system with a maximum prize of ¥5,000,000. Playing eligible slot games automatically enters you into the jackpot draw.', 'bonus', 'en', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'Is there a no-deposit bonus?', 'Yes, Sloten offers a no-deposit bonus for new players. You can play without making a deposit first. Check the welcome menu for details.', 'bonus', 'en', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'What are wagering requirements?', 'Wagering requirements determine how much you need to bet before withdrawing bonus winnings. For example, a 20x requirement on a ¥1,000 bonus means you need to bet ¥20,000 total.', 'bonus', 'en', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'How do I use a bonus code?', 'Please share your bonus code with our support team via chat. Available codes include: Zorome Challenge, White Day, WELCOME10, FREEGIFT, and POINTS500.', 'bonus', 'en', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'What bonus codes are available?', 'Current bonus codes: 1) Zorome Challenge - up to 30% cashback, 2) White Day - tier-based cash bonus, 3) WELCOME10 - 10% first deposit bonus, 4) FREEGIFT - novelty gift, 5) POINTS500 - 500 points.', 'bonus', 'en', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'How do I register?', 'Visit sloten.io and click the registration button. Fill in your details and your account will be created immediately. No KYC documents required.', 'account', 'en', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'Is KYC required?', 'No, Sloten does not require KYC (identity verification). You can register, play, and make deposits/withdrawals without submitting any documents.', 'account', 'en', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'I cannot log in', 'Please check: 1) Your username and password are correct, 2) Caps Lock is off, 3) Clear browser cache and cookies, 4) Try a different browser. If still unable to log in, contact support.', 'account', 'en', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'I forgot my password', 'Click the Forgot Password link on the login page. A reset link will be sent to your registered email. Check your spam folder if not received.', 'account', 'en', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'Can I have multiple accounts?', 'No, each person is limited to one account. Creating multiple accounts is prohibited and may result in account suspension.', 'account', 'en', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'What games are available?', 'Sloten offers: Slots, Live Casino, Pachinko/Pachislot, and Poker from 16 game providers including Pragmatic Play, Evolution, and Play n GO.', 'games', 'en', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'Is there live casino?', 'Yes, Sloten offers live casino games with real dealers 24/7, including Baccarat, Blackjack, Roulette, and game shows like Crazy Time.', 'games', 'en', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'A game is frozen', 'Please try: 1) Reload the page, 2) Clear browser cache, 3) Try a different browser, 4) Check your internet connection. If unresolved, contact support with the game name.', 'games', 'en', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'Can I play on mobile?', 'Yes, Sloten works on smartphones and tablets via browser. No app download needed. We recommend using the latest version of Chrome or Safari.', 'games', 'en', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'Are games fair?', 'Yes, all games use independent Random Number Generators (RNG) and are verified by third-party auditors. Sloten operates under a Georgia gaming license.', 'games', 'en', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'What is Sloten?', 'Sloten (Slot Tengoku) is an online casino featuring the industry-first Dream Pot jackpot up to ¥5,000,000. We offer slots, live casino, pachinko, and poker with no KYC required.', 'general', 'en', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'What license does Sloten have?', 'Sloten operates under Georgia iGaming Service License N138/1, issued by Kutaisi Free Industrial Zone. Operated by SMART BIZ TECHNOLOGY INC.', 'general', 'en', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'Is Sloten safe?', 'Yes, Sloten is licensed under Georgia gaming regulations. We use SSL encryption to protect your data and all games are independently verified for fairness.', 'general', 'en', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'What are support hours?', 'Our chat support is available for your inquiries. Our AI assistant provides instant responses 24/7 for common questions.', 'general', 'en', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'How do I contact support?', 'Click the chat icon on the bottom right of sloten.io. You can also contact us via LINE or Telegram. Our support team handles inquiries in Japanese and English.', 'general', 'en', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'お友達紹介プログラムの詳細を教えてください', 'お友達紹介では、紹介したお友達のベット額に対してコミッションが支払われます。コミッション率: スロット0.40%、ライブカジノ0.20%、パチンコ0.20%、ポーカー0.00%。締めは毎日23:59で、翌日18:00より順次お支払いされます。', 'general', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ロト（宝くじ）とは何ですか？', 'Slotenのロトシステムでは、¥50,000分ベットするとチケットを1枚獲得できます。抽選では6つの数字が選ばれ、一致するとジャックポット賞金が当たります。過去のジャックポットは¥9,506,328以上の実績があります。マイチケットページから獲得チケットと抽選履歴を確認できます。', 'bonus', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ロトのチケットはどうやって手に入りますか？', '¥50,000分ベットするごとにチケットを1枚獲得できます。本日の獲得チケット数と総獲得チケット数はロトページで確認可能です。チケットは自動的に付与されます。', 'bonus', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'Play n GO 熱春祭りトーナメントとは？', 'Play n GOが主催する期間限定トーナメントイベントです。最大計200フリースピンを獲得可能です。対象ゲームや参加条件等の詳細はトップページのバナーまたはプロモーションページをご確認ください。', 'bonus', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'コミッションの支払いタイミングは？', 'お友達紹介のコミッションは毎日23:59が締めで、翌日18:00より順次お支払いとなります。', 'general', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'パチンコの1玉の料金はいくらですか？', 'パチンコの1玉の料金は台によって異なります。例: CR グラップラー刃牙は¥1.80/玉、シン・エヴァンゲリオンは¥0.90/玉です。各台の詳細はパチンコページでご確認ください。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'パチスロの天井とは？', '天井とは一定のゲーム数に達すると必ずボーナスやATに当選する仕組みです。例: リング呪いの7日間は天井999回転、バジリスク絆2は天井333回転です。天井に近い台を選ぶのも遊び方の一つです。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'SlotenのSNSアカウントはありますか？', 'はい、以下のSNSで情報を発信しています: X(Twitter)、Instagram、Facebook、TikTok、Discord、Telegram。最新のキャンペーンやイベント情報はSNSでもご確認いただけます。', 'general', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '入金時にサポート確認が必要と表示されました', '一部の入金方法ではセキュリティのためサポートへの事前連絡が必要です。手順: ①入金ページで金額と方法を選択→②「カスタマーサポートへ連絡」ボタンをクリック→③チャットに「入金」とだけ入力して送信→④サポートの確認を待つ→⑤確認後に入金手続きを続行。※「入金」以外の文言は入力しないでください。', 'deposit', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'PayPayマネーとPayPayマネーライトの違いは？', 'PayPayマネーは本人確認済みの残高で出金が可能です。PayPayマネーライトは本人確認不要ですが出金はできません。当サイトではどちらも入金に使用できます。利用条件の詳細はPayPayアプリでご確認ください。', 'deposit', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'パチンコの確変・継続率とは？', '確変（確率変動）は大当たり後の高確率状態です。数値は確変突入率を表します。例:確変78なら78%が確変に。継続率は確変中に連チャンが続く確率です。例:継続率81なら81%で次の当たりに繋がります。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'パチスロの天井・純増とは？', '天井は一定ゲーム数で必ずAT/ボーナスが発動する救済機能です。例:天井999なら999ゲームまでに必ず当たります。純増はAT中1ゲームあたり増えるメダル枚数です。純増3.0なら1ゲームで約3枚増加します。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'おすすめのパチンコ・パチスロ台は？', '初心者向け: CRグラップラー刃牙(1/99・当たりやすい)、CR 009(1/99・継続率77)。一撃狙い: P GOD EATER(1/319・継続率91)、Pルパン三世(1/199・継続率89)。パチスロ: バジリスク絆2天膳(天井333・投資を抑えやすい)。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'Rise of Olympus 1000はどんなゲーム？', 'Play n GO社のギリシャ神話テーマスロットです。ゼウス・ポセイドン・ハデスが登場する5x5グリッドで、連鎖でマルチプライヤーが上昇し大きな配当を狙えます。当サイト人気ランキング上位の定番です。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'Moon Princessシリーズについて教えて', 'Play n GO社の大人気シリーズです。Moon Princess(オリジナル)は3人のプリンセスがそれぞれ異なる特殊能力を持つ5x5スロット。Moon Princess Trinity(最新作)では合体技が追加されています。落ちもの系連鎖が特徴です。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'Sweet Bonanza 1000はどんなスロット？', 'Pragmatic Play社のキャンディーテーマスロットの上位版です。6x5リールで8個以上の同シンボルで配当発生。フリースピン中のマルチプライヤーが最大1000倍まで上昇し、爆発的配当が期待できます。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ライブカジノの詳細なゲーム一覧は？', 'Evolution社提供のゲーム: バカラ(Speed Baccarat A/Squeeze Baccarat/Lightning Baccarat)、ルーレット(XXXtreme Lightning Roulette)、ゲームショー(Crazy Time/MONOPOLY Big Baller/Mega Ball)、Race Track。全てリアルタイムディーラー対戦で24時間プレイ可能です。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '銀行メンテナンス中に入金する方法は？', '銀行メンテナンス中はATM振込・銀行振込がご利用いただけません。仮想通貨、コンビニ払い、PayPayなど銀行を経由しない方法をご利用ください。メンテナンス情報はトップページのバナーでお知らせしています。', 'deposit', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ポイントシステムの仕組みは？', '入金時にポイントが付与されます（例:¥10,000入金で10,000ポイント）。ポイントはボーナスやフリースピンとの交換に使用できます。詳細な交換レートはマイアカウントページでご確認ください。', 'bonus', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ロトの抽選番号はいつ発表されますか？', 'ロトの抽選は定期的に行われ、結果はロトページで確認できます。前回の抽選番号と当選金額もロトページに表示されています。チケットは¥50,000分ベットごとに1枚自動獲得されます。', 'bonus', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ドリームポットの当選ルールを詳しく教えてください', 'ドリームポットは日本の宝くじ「ロト」と同じ方式で番号が抽選されます。ロトで発表される6桁の番号のうち、あなたの番号と抽選番号が一致すると当選となります。¥50,000分ベットするとチケットを1枚獲得でき、チケットに記載された番号で抽選に参加できます。本日のジャックポット金額は¥5,000,000です。前回の当選番号や過去の抽選履歴はロトページで確認できます。', 'bonus', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ドリームポットの前回の当選結果は？', '前回の抽選は2026年4月10日17:04:47に行われ、当選番号は08-13-27-36-37-43でした。ジャックポット金額は¥9,506,328でした。過去全ての当選番号と結果はロトページの「全ての抽選履歴」から確認できます。完全透明システムで全ての情報が公開されています。', 'bonus', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ドリームポットのチケットの確認方法は？', 'ドリームポットのチケットはロトページの「マイチケット」セクションから確認できます。本日の獲得チケット数と総獲得チケット数が表示されます。チケットは¥50,000分ベットするごとに自動で1枚獲得されます。現在のジャックポット額や進捗状況もこのページで確認可能です。', 'bonus', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'RTPとは何ですか？', 'RTP（Return To Player/還元率）はゲームがプレイヤーに還元する理論上の割合です。例:RTP96%なら¥100ベットで理論上¥96が還元されます。ただし短期的には大きく変動します。RTPは各ゲームのヘルプ画面で確認できます。', 'casino_terms', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ボラティリティとは？', 'ボラティリティ（変動率）はゲームの配当の波の大きさです。高ボラ=大きな当たりが稀に出る（一撃型）、低ボラ=小さな当たりが頻繁に出る（安定型）。初心者は低〜中ボラ、一撃狙いは高ボラがおすすめです。', 'casino_terms', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ハウスエッジとは？', 'ハウスエッジはカジノ側の理論上の優位性を表す数値です。RTP96%のゲームはハウスエッジ4%。ハウスエッジが低いほどプレイヤーに有利です。ブラックジャック(約0.5%)が最も低く、スロット(2-6%)が一般的です。', 'casino_terms', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'プログレッシブジャックポットとは？', 'プレイヤーのベットの一部が賞金プールに蓄積され、当選者がプール全額を獲得するジャックポットです。Slotenのドリームポット(¥5,000,000)もこの仕組みです。', 'casino_terms', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'マルチプライヤーとは？', 'マルチプライヤー（倍率）は配当を何倍にも増やす機能です。例:x5マルチプライヤーなら配当が5倍に。フリースピン中にマルチプライヤーが累積するゲーム(Gates of Olympus等)が人気です。', 'casino_terms', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ペイラインとは？', 'ペイラインはスロットで配当が成立するラインの形です。従来は左から右の横一列でしたが、現在は「どこでもペイ」方式(同一シンボル8個以上で配当)やメガウェイズ(最大117,649通り)など多様な方式があります。', 'casino_terms', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ワイルドシンボルとスキャッターシンボルの違いは？', 'ワイルドは他のシンボルの代わりになる万能シンボルです（トランプのジョーカーのような役割）。スキャッターはリール上のどこに出ても有効で、フリースピンやボーナスラウンドを発動させます。', 'casino_terms', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'フリースピンとは？', 'フリースピンはベットせずに無料でスピンできる特典です。スキャッターシンボルが3個以上出現すると発動するのが一般的。フリースピン中は特別な機能(マルチプライヤー増加等)が追加されることが多いです。', 'casino_terms', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'メガウェイズとは？', 'メガウェイズ(Megaways)はBig Time Gaming社が開発したスロットの仕組みで、各リールのシンボル数が毎スピン変化し、最大117,649通りの当選パターンが生まれます。当たりやすさと爆発力を兼ね備えています。', 'casino_terms', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'オートプレイとは？', 'オートプレイは設定した回数分、自動でスピンを繰り返す機能です。回数や損失上限を設定でき、手動でいつでも停止可能です。責任あるプレイのため、損失上限の設定を推奨します。', 'casino_terms', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'バカラのルールを教えてください', 'バカラはプレイヤーとバンカーのどちらが9に近いかを予想するゲームです。カードの合計値の下1桁が勝敗を決めます。プレイヤー勝利(配当2倍)、バンカー勝利(配当1.95倍)、タイ(配当8倍)の3つに賭けられます。最もシンプルで初心者にもおすすめです。', 'live_casino', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ブラックジャックの基本戦略は？', 'ブラックジャックはディーラーに勝つカードゲームです。手札の合計が21に近いほど強く、21を超えると負けます。基本戦略:ディーラーの見えてるカードが2-6なら守り(スタンド多め)、7以上なら攻め(ヒット多め)。ハウスエッジ約0.5%と最も有利なゲームです。', 'live_casino', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ルーレットの種類は？', 'ルーレットは主に3種類あります。ヨーロピアン(0が1つ・ハウスエッジ2.7%)、アメリカン(0と00・ハウスエッジ5.26%)、フレンチ(0が1つ+特殊ルール・最も有利)。ヨーロピアンが最もおすすめです。ライトニングルーレットはマルチプライヤー付きで最大500倍配当。', 'live_casino', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ポーカーの役の強さを教えてください', 'ポーカーの役(強い順): ロイヤルストレートフラッシュ→ストレートフラッシュ→フォーカード→フルハウス→フラッシュ→ストレート→スリーカード→ツーペア→ワンペア→ハイカード。Slotenではビデオポーカーとライブカジノポーカーの両方でプレイ可能です。', 'table_games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ギャンブル依存症の兆候は？', '以下の兆候がある場合はご注意ください: ①賭け金が徐々に増えている ②負けを取り戻そうとする ③やめようと思ってもやめられない ④借金をしてまでプレイする ⑤仕事や人間関係に支障が出ている。心当たりがある方は、入金制限の設定や自己排除をご検討ください。消費者ホットライン:188、よりそいホットライン:0120-279-338。', 'responsible_gaming', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'Slotenには何種類くらいのゲームがありますか？', 'Slotenでは16社のゲームプロバイダーと提携しており、推定約2,500種類以上のゲームをお楽しみいただけます。スロット、ライブカジノ、パチンコ・パチスロ、ポーカーの4カテゴリがあります。', 'general', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'Rise of Olympus 1000の特徴は？', 'Play''n GO提供。5x5グリッド、RTP約96.5%、超高ボラ。ゼウス・ポセイドン・ハデスの神々が特殊能力を発動。最大配当は賭け金の15,000倍。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'Sweet Bonanza 1000の特徴は？', 'Pragmatic Play提供。6x5リール、RTP約96.48%。8個以上の同一シンボルで配当。フリースピン中のキャンディー爆弾で最大1,000倍マルチプライヤー。最大25,000倍。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'Gates of Olympus 1000の特徴は？', 'Pragmatic Play提供。6x5リール、RTP約96.5%。ゼウスのマルチプライヤーオーブが配当を増幅。アンティベットでFS確率2倍。最大15,000倍。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'Book of Deadの特徴は？', 'Play''n GO提供。5x3リール10ライン、RTP約96.21%。ブックシンボルがスキャッター兼ワイルド。FSでは拡張シンボルが選ばれ大配当のチャンス。最大5,000倍。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'Wanted Dead or a Wildの特徴は？', 'Hacksaw Gaming提供。5x5リール、RTP約96.38%。西部劇テーマ。ワイルド同士のデュエルでマルチプライヤーが合算上昇。最大12,500倍。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '花魁ドリーム(Oiran Dream)の特徴は？', '日本の花魁テーマ3x3スロット。RTP約96.34%。リスピン連鎖→花魁ラッシュ。Doki Dokiタイムで高倍率マルチプライヤーが連続付与されるチャンスタイム。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'Lucky Nekoの特徴は？', '招き猫テーマ和風スロット。RTP約96.27%。最大6x6の巨大シンボルが特徴。招き猫がマルチプライヤーを振り、最大配当6,500倍以上。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'Mahjong Ways 2の特徴は？', 'PG Soft提供。麻雀テーマ、RTP約96.95%。ワイルドのマルチプライヤーがFS中に累積しリセットされない。最大25,000倍の配当。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'Crazy Timeの遊び方は？', 'Evolution提供のゲームショー。マネーホイールで数字配当(1/2/5/10)またはボーナス(Coin Flip/Cash Hunt/Pachinko/Crazy Time)に当選。最大25,000倍以上。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'Lightning Rouletteの特徴は？', 'Evolution提供。毎ラウンド1-5個のラッキーナンバーに50-500倍のマルチプライヤー。ストレートアップベットで的中すると超高額配当。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'Lightning Baccaratの特徴は？', 'Evolution提供。毎ラウンド1-5枚のライトニングカードに2-8倍マルチプライヤー。最大512倍配当。20%のライトニングフィーが加算されます。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'MONOPOLY Big Ballerの特徴は？', 'Evolution提供。ビンゴ形式で番号一致→ボーナスラウンドでMr.モノポリーがボード上を進みマルチプライヤー獲得。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'Mega Ballの特徴は？', 'Evolution提供のビンゴ型ゲーム。20個のボールが抽選されカードのライン成立で配当。最後のMega Ballは最大100倍マルチプライヤー。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ゲーム中にフリーズした場合は？', 'ページを再読み込み(F5)してください。進行中のゲームはサーバー側で保存されており、再接続後に結果が反映されます。解消しない場合はキャッシュクリア後に再ログイン。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'フリースピン中に接続が切れたら？', 'FSの進行状況はサーバー側で保存されています。再接続後に同じゲームを開くと中断地点から再開。残りスピンや獲得配当は失われません。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ライブカジノ中に映像が止まったら？', 'ベットはサーバーで処理済みです。回線復旧後にゲーム結果が反映されます。ベット履歴から結果確認も可能。映像遅延が頻発する場合はWi-Fi接続や画質設定を変更してください。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'スロット初心者におすすめは？', 'Moon PrincessやSweet Bonanza 1000がおすすめ。ルールがシンプルで連鎖の爽快感があります。まずはデモプレイで無料体験してから始めましょう。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ボラティリティで選ぶおすすめは？', '低ボラ(安定):Mahjong Ways 2。中ボラ(バランス):花魁ドリーム。高ボラ(一撃狙い):Gates of Olympus 1000。超高ボラ(爆発力):Sweet Bonanza 1000。予算と好みで選びましょう。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ベット額はいくらに設定すべき？', '予算の1-2%を1スピンの目安にするのがおすすめ。例:予算¥10,000なら1スピン¥100-200。高ボラスロットはフリースピンまで耐える資金が必要なので、低ベットで長く遊ぶのが基本です。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ボーナスBUYは使うべき？', 'ベット額の60-100倍で即座にフリースピンに突入できる機能。時間効率は良いですが、購入費用に対してリターンは保証されません。予算に余裕がある場合にご利用ください。', 'games', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'VPNを使ってプレイできますか？', 'VPNを使用してのプレイは利用規約で禁止されています。VPN使用が検出された場合、アカウント凍結や出金拒否の対象となる場合があります。お住まいの地域からの直接アクセスでご利用ください。', 'account', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'アカウント登録に必要なものは？', 'メールアドレス、氏名、生年月日、住所、電話番号が必要です。KYC認証として身分証明書と住所証明書（3ヶ月以内発行）の提出も求められます。', 'terms', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '複数アカウントの作成は可能？', '1人1アカウントのみ。複数アカウントは利用規約で厳禁。検出された場合は全アカウント凍結・残高没収・永久追放の対象です。', 'terms', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'KYC（本人確認）の手順は？', 'アカウント設定→本人確認から、①身分証明書（顔写真付き）②住所証明書（3ヶ月以内）をアップロード。審査は通常24〜72時間。初回出金前に必須。', 'terms', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'アカウント凍結の理由は？', '複数アカウント、不正行為、KYC未提出、虚偽登録、禁止地域アクセス、マネロン疑い、規約違反が主な理由。凍結時はサポートへ。', 'terms', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '自己排除（セルフエクスクルージョン）の設定方法は？', '責任あるギャンブル設定から24時間〜永久の期間を選択。期間中はログイン・入金・プレイ不可。途中解除はできません。サポートでも設定可能。', 'terms', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '入金制限の設定方法は？', '責任あるギャンブル設定から日次・週次・月次の上限額を設定。引き下げは即時、引き上げは24時間のクーリングオフ後に反映。', 'terms', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'アカウント削除の方法は？', 'サポートに連絡しアカウント閉鎖を依頼。閉鎖前に残高の出金を完了してください。閉鎖後は残高・ボーナス・VIPステータスは全て失われます。', 'terms', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '未成年でもプレイできますか？', '18歳未満のプレイは法律・規約により厳禁です。KYC認証で年齢確認を実施。未成年と判明した場合はアカウント即閉鎖・賞金全額没収。', 'terms', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '賭け条件（ウェージャー）とは？', 'ボーナスを出金するために必要な合計ベット額の倍率。例:30倍で100ドルボーナス→3,000ドル分ベットが必要。条件はボーナスごとに異なります。', 'terms', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '賭け条件のゲーム別消化率は？', 'スロット100%、ルーレット20-50%、ブラックジャック10-20%、ライブカジノ10%が一般的。除外ゲームもあるため各ボーナス詳細を確認。', 'terms', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ボーナスの有効期限は？', '通常7〜30日間。期限内に賭け条件未達の場合、ボーナス残高・関連賞金は自動没収。各プロモーション詳細ページで正確な期限を確認してください。', 'terms', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ボーナス利用時の最大ベット制限は？', 'アクティブボーナスがある場合、1ベット5ドル上限が一般的。超過ベットが検出されるとボーナス・賞金没収の対象。条件消化まで上限を守ってください。', 'terms', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ボーナスから除外されるゲームは？', 'ジャックポットスロット、一部高RTPスロット、特定テーブルゲームが除外対象。除外ゲームでプレイすると賭け条件に反映されずボーナス没収の可能性も。', 'terms', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ボーナスが没収される条件は？', '有効期限切れ、最大ベット違反、除外ゲームプレイ、不正行為、条件未達での出金申請、複数アカウント使用、規約違反。没収されたボーナスは復元不可。', 'terms', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '入金不要ボーナスの出金条件は？', '通常40〜60倍の賭け条件。出金上限50〜100ドル程度。出金前にKYC完了と最低1回入金が必要な場合あり。詳細は各プロモ規約を確認。', 'terms', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'フリースピンの利用条件は？', '指定スロットでのみ使用可能。賞金には20〜40倍の賭け条件。有効期限は付与から24〜72時間が一般的。未使用分は期限後に失効。', 'terms', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'キャッシュバックの計算方法は？', '対象期間の純損失額に対して5〜15%で計算。ボーナス使用プレイは対象外の場合あり。賭け条件は0〜5倍と低めに設定されるのが一般的。', 'terms', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', 'ボーナスの併用は可能？', '原則として複数ボーナス同時利用は不可。新ボーナス受取前に現在の条件を完了か放棄が必要。一部組み合わせ可能な場合もあるため規約確認を。', 'terms', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '出金が拒否される理由は？', 'KYC未完了、賭け条件未達、入金と異なる出金方法、不正疑い、最低出金額未満、入金額1倍のプレイスルー未達成が主な理由。サポートに確認を。', 'terms', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '禁止されている行為は？', 'ボット自動プレイ、ボーナス乱用、共謀プレイ、マネーロンダリング、システム脆弱性の悪用、VPN利用が禁止。違反はアカウント凍結・残高没収の対象。', 'terms', 'ja', 1);
INSERT INTO faq (tenant_id, question, answer, category, language, is_active) VALUES ('tenant_default', '規約違反時のペナルティは？', '違反程度に応じて警告→ボーナス没収→賞金無効→一時停止→永久凍結→残高没収。重大違反は関係当局に報告される場合あり。運営判断は最終的かつ拘束力あり。', 'terms', 'ja', 1);
-- ===========================================
-- SECTION 3: 初期データ
-- ===========================================
-- ERROR exporting bonus_codes: Extra data: line 5 column 6 (char 102)
-- ERROR exporting ai_characters: Extra data: line 5 column 6 (char 109)
-- ERROR exporting brand_config: Extra data: line 5 column 6 (char 105)

-- proactive_triggers: 4 items
INSERT INTO proactive_triggers (trigger_key, message, quick_replies, cooldown_hours, is_active) VALUES ('deposit_page_long_stay', '入金でお困りですか？入金方法のご案内や手順をお伝えできます。', '["入金方法を知りたい","PayPayで入金","大丈夫です"]', 24, 1);
INSERT INTO proactive_triggers (trigger_key, message, quick_replies, cooldown_hours, is_active) VALUES ('first_visit', 'スロット天国へようこそ！初めての方は入金不要ボーナスからお試しいただけます。', '["入金不要ボーナスとは？","ゲームを見る","大丈夫です"]', 24, 1);
INSERT INTO proactive_triggers (trigger_key, message, quick_replies, cooldown_hours, is_active) VALUES ('bonus_expiring', 'お持ちのボーナスの有効期限が明日までです。', '["ボーナスの使い方","賭け条件を確認","大丈夫です"]', 24, 1);
INSERT INTO proactive_triggers (trigger_key, message, quick_replies, cooldown_hours, is_active) VALUES ('returning_after_absence', 'お久しぶりです！新しいキャンペーンやゲームが追加されています。', '["新キャンペーン","新着ゲーム","大丈夫です"]', 24, 1);

-- vip_config: 4 items
INSERT INTO vip_config (level, tone, greeting_prefix, escalation_threshold, auto_human) VALUES ('bronze', 'friendly', '', 3, 0);
INSERT INTO vip_config (level, tone, greeting_prefix, escalation_threshold, auto_human) VALUES ('silver', 'polite', '様', 2, 0);
INSERT INTO vip_config (level, tone, greeting_prefix, escalation_threshold, auto_human) VALUES ('gold', 'premium', '様、いつもご利用ありがとうございます', 1, 0);
INSERT INTO vip_config (level, tone, greeting_prefix, escalation_threshold, auto_human) VALUES ('platinum', 'vip', '様、VIPサポートでございます', 0, 1);

-- ab_tests: 3 items
INSERT INTO ab_tests (test_name, category, variant_a, variant_b, is_active) VALUES ('tone_formal_vs_casual', 'tone', 'です・ます調で丁寧に回答してください', 'フレンドリーで親しみやすい口調で回答してください', 1);
INSERT INTO ab_tests (test_name, category, variant_a, variant_b, is_active) VALUES ('length_short_vs_detailed', 'length', '100文字以内で簡潔に回答してください', '詳しく丁寧に200-300文字で回答してください', 1);
INSERT INTO ab_tests (test_name, category, variant_a, variant_b, is_active) VALUES ('emoji_yes_vs_no', 'style', '適切な絵文字を1-2個使ってください', '絵文字は使わないでください', 1);