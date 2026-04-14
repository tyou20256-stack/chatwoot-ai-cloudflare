-- @idempotent
-- Migration 013: Sync remaining handler/schema column gaps discovered by Phase ρ
-- verify-schema script.
--
-- Strategy: ALTER TABLE ADD COLUMN — wrapped in handler logic to be safe.
-- For SQLite ALTER TABLE re-application protection, tking510 should run this
-- on an environment where the columns don't yet exist. If they exist, drop
-- the corresponding ALTER lines.

-- ============================================
-- knowledge_sources: add tenant_id (handler binds it)
-- ============================================
ALTER TABLE knowledge_sources ADD COLUMN tenant_id TEXT DEFAULT 'tenant_default';
-- τ-M: backfill existing rows so handler queries with `WHERE tenant_id=?` find them
UPDATE knowledge_sources SET tenant_id = 'tenant_default' WHERE tenant_id IS NULL;

-- ============================================
-- sheet_integrations: add handler-expected columns
--   handler uses: sheet_url, webhook_url, sheet_type, config
--   schema has:   spreadsheet_id, sheet_name, type
-- Add as aliases (additional columns) to preserve back-compat.
-- ============================================
ALTER TABLE sheet_integrations ADD COLUMN sheet_url TEXT;
ALTER TABLE sheet_integrations ADD COLUMN webhook_url TEXT;
ALTER TABLE sheet_integrations ADD COLUMN sheet_type TEXT;
ALTER TABLE sheet_integrations ADD COLUMN config TEXT;

-- ============================================
-- sla_policies: add handler-expected columns
--   handler uses: first_response_minutes, resolution_minutes, business_hours_only
--   schema has:   first_response_time, resolution_time
-- ============================================
ALTER TABLE sla_policies ADD COLUMN first_response_minutes INTEGER;
ALTER TABLE sla_policies ADD COLUMN resolution_minutes INTEGER;
ALTER TABLE sla_policies ADD COLUMN business_hours_only INTEGER DEFAULT 0;

-- Backfill from old columns
UPDATE sla_policies SET first_response_minutes = first_response_time WHERE first_response_minutes IS NULL AND first_response_time IS NOT NULL;
UPDATE sla_policies SET resolution_minutes = resolution_time WHERE resolution_minutes IS NULL AND resolution_time IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_knowledge_sources_tenant ON knowledge_sources(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sheet_integrations_tenant_active ON sheet_integrations(tenant_id, is_active);

-- ρ-Hπ8: bonus_codes language column for multi-language deployment
ALTER TABLE bonus_codes ADD COLUMN language TEXT DEFAULT 'ja';
CREATE INDEX IF NOT EXISTS idx_bonus_codes_language ON bonus_codes(tenant_id, language, is_active);
