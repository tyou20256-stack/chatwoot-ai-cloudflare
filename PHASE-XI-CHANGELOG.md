# Phase ξ (xi) Changelog — 4th-round audit fixes

## Critical
- **C1 Pages proxy auth bypass** — `functions/api/[[path]].ts`: removed automatic Bearer injection; 401 when no session cookie on non-auth endpoints.
- **C2 RG escalation persistence** — `src/ai-chat-handler.mjs`: invoke `handleEscalation()` via `ctx.waitUntil` so every `escalate:true` reply also writes to `escalation_queue`.
- **C3 faq.keywords missing** — migration `009-faq-keywords-column.sql`: adds `keywords TEXT` + index.
- **C4 webhooks POST 500** — migration `010-webhooks-updated-at.sql`: adds `updated_at`, relaxes `name NOT NULL`, rebuilds table to match handler expectations.
- **C5 cron heartbeat null** — migration `011-cron-heartbeat-bootstrap.sql`: seeds `feature_flags.last_cron_success` so /api/ops/cron-health doesn't flatline on fresh deploys.
- **C6 CORS allowlist regression** — `src/cors-helper.mjs`: `sloten-admin.pages.dev` → `sloten-admin-secure.pages.dev` (main + preview regex).

## High
- **H1 UTF-8 charset** — all `application/json` responses across `src/**/*.mjs` now include `charset=utf-8`.
- **H2 /api/staff-members/me alias** — `src/index.mjs`: aliased to existing `handleStaffMe`.
- **H3 retention extension** — `src/scheduled.mjs`: adds paginated purge for `proactive_trigger_log`, `vip_interaction_log`, `escalation_queue`, `chat_sessions`, `response_cache`, `webhook_deliveries` (column `delivered_at`).
- **H4 ai-cs-core.mjs cleanup** — confirmed not present in current tree; no action.
- **H5 e.message leak** — `src/index.mjs:303`: `/api/ops/cron-health` catch path now logs internally and returns `{error:"Internal error"}`.
- **H6 webhook_deliveries column** — addressed via H3 inline (uses `delivered_at`).
- **H7 Status page provisioning** — `STATUS-PAGE.md`.
- **H8 Customer-comms templates** — `INCIDENT-COMMS.md`.
- **H9 On-call escalation tree** — `ON-CALL-ESCALATION.md`.

## Medium (docs-only)
- **M1 D1 time-travel CLI** — documented in `OPERATIONS.md` (`wrangler d1 time-travel restore <db> --timestamp=<ISO>`).
- **M2 Migration idempotency** — `009`, `010`, `011` all use `IF NOT EXISTS` / `INSERT OR REPLACE`.
- **M3 Schema docs** — this file serves as the delta; integrate into `ARCHITECTURE.md` during next doc sweep.

## Apply order (tking510)
1. `wrangler d1 execute <db> --remote --file=migrations/009-faq-keywords-column.sql`
2. `wrangler d1 execute <db> --remote --file=migrations/010-webhooks-updated-at.sql`
3. `wrangler d1 execute <db> --remote --file=migrations/011-cron-heartbeat-bootstrap.sql`
4. Deploy Worker: `wrangler deploy`
5. Deploy Pages: `npx wrangler pages deploy public --project-name=sloten-admin-secure`
6. Verify:
   - `curl -i https://<pages>/api/faq` → 401 (no cookie)
   - Login → `curl -b cookie /api/ops/cron-health` → `{stale:false}`
   - Send RG test message → check `/api/escalations`
