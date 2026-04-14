-- Migration 010: webhooks schema sync with handler expectations (ξ-C4)
--
-- handlers/webhooks.mjs INSERTs/UPDATEs:
--   - webhooks.updated_at       (missing in production schema)
--   - name is optional in handler but schema declares NOT NULL
--
-- Fix: add updated_at column and relax name constraint.
-- SQLite cannot DROP NOT NULL in-place, so for `name` we use the
-- "create-new, copy, swap" pattern.

ALTER TABLE webhooks ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP;

-- Relax name NOT NULL (optional; skip if already nullable)
CREATE TABLE IF NOT EXISTS webhooks_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT DEFAULT 'tenant_default',
    name TEXT,
    url TEXT NOT NULL,
    events TEXT,
    secret TEXT,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

INSERT INTO webhooks_new (id, tenant_id, name, url, events, secret, is_active, created_at, updated_at)
SELECT id, tenant_id, name, url, events, secret, is_active, created_at,
       COALESCE(updated_at, created_at) FROM webhooks;

DROP TABLE webhooks;
ALTER TABLE webhooks_new RENAME TO webhooks;
CREATE INDEX IF NOT EXISTS idx_webhooks_tenant ON webhooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_active ON webhooks(tenant_id, is_active);
