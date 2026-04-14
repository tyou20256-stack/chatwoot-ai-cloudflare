-- migrations/006-indexes.sql
-- Performance indexes for growth tables + frequent lookup/JOIN columns.
-- All CREATE INDEX statements use IF NOT EXISTS so this migration is idempotent.
-- Column existence verified against seeds/production-full-fixed.sql.

-- === Growth tables with frequent time-range queries ===
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_created ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_ai_stats_date_model ON ai_stats(date, model);
CREATE INDEX IF NOT EXISTS idx_ai_stats_created ON ai_stats(created_at);

-- === Conversations ===
CREATE INDEX IF NOT EXISTS idx_conversations_tenant_status ON conversations(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_assignee ON conversations(assignee_id);

-- === Escalation queue ===
CREATE INDEX IF NOT EXISTS idx_escalation_queue_status_priority ON escalation_queue(status, priority);
CREATE INDEX IF NOT EXISTS idx_escalation_queue_session ON escalation_queue(session_id);
CREATE INDEX IF NOT EXISTS idx_escalation_tracker_session ON escalation_tracker(session_id);

-- === FAQ search (tenant + language + active) ===
CREATE INDEX IF NOT EXISTS idx_faq_tenant_active ON faq(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_faq_category ON faq(category);

-- === Bonus code lookups ===
CREATE INDEX IF NOT EXISTS idx_bonus_codes_code ON bonus_codes(code);
CREATE INDEX IF NOT EXISTS idx_bonus_codes_active ON bonus_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_bonus_code_usage_code ON bonus_code_usage(bonus_code_id);
CREATE INDEX IF NOT EXISTS idx_bonus_code_usage_conv ON bonus_code_usage(conversation_id);

-- === Staff members (tenant scope + JOIN on ai_character_id) ===
CREATE INDEX IF NOT EXISTS idx_staff_members_tenant ON staff_members(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_character ON staff_members(ai_character_id);

-- === Webhooks ===
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_delivered ON webhook_deliveries(webhook_id, delivered_at);

-- === Conversation tags (JOIN) ===
CREATE INDEX IF NOT EXISTS idx_conversation_tags_conv ON conversation_tags(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conversation_tags_tag ON conversation_tags(tag_id);

-- === Proactive triggers ===
CREATE INDEX IF NOT EXISTS idx_proactive_trigger_log_session ON proactive_trigger_log(session_id);
CREATE INDEX IF NOT EXISTS idx_proactive_trigger_log_trigger ON proactive_trigger_log(trigger_key);

-- === VIP interactions ===
CREATE INDEX IF NOT EXISTS idx_vip_interaction_session ON vip_interaction_log(session_id);

-- === Feedback ===
-- Note: feedback table has session_id, not conversation_id — indexing session_id instead.
CREATE INDEX IF NOT EXISTS idx_feedback_session ON feedback(session_id);

-- === Files ===
CREATE INDEX IF NOT EXISTS idx_files_conversation ON files(conversation_id);
CREATE INDEX IF NOT EXISTS idx_files_tenant ON files(tenant_id);
