-- @idempotent (Phase ρ: tking510 should drop ALTER lines if column already exists)
-- Migration 009: Add keywords column to faq table (ξ-C3)
--
-- src/handlers/faq.mjs references `keywords` column for INSERT/UPDATE/decorate
-- but the production schema never created it. POST /api/faq returns 500 as a result.
--
-- Applied via: wrangler d1 execute <db-name> --file=migrations/009-faq-keywords-column.sql --remote

ALTER TABLE faq ADD COLUMN keywords TEXT;
CREATE INDEX IF NOT EXISTS idx_faq_keywords ON faq(keywords) WHERE keywords IS NOT NULL;
