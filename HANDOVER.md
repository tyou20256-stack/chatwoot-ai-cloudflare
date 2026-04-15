# HANDOVER.md — Sloten AI Customer Support System v1.0 (Chatwoot-dependent)

**Version:** v1.0-chatwoot-handover
**Tag:** `v1.0-chatwoot-handover`
**Frozen:** 2026-04-15
**Scope:** Chatwoot-dependent deliverable. Standalone (Chatwoot-less) version is developed separately at `tyou20256-stack/sloten-standalone`.

---

## 1. Repository Layout

```
chatwoot-ai-cloudflare/
├── src/                       Cloudflare Worker (Gateway + Admin API)
├── public/                    Admin UI (static) served by Pages
├── migrations/                D1 schema migrations 001-014
├── seeds/                     Real-data seeds (templates, KB, FAQ)
├── scripts/                   Extract/verify/smoke-test tools
├── chatwoot-bot-worker/       AgentBot Worker (separate deploy)
└── sloten-admin-secure/       Admin UI Pages project (Origin-pinned proxy)
```

Three deployables:

| Component | What | Deploy Target |
|---|---|---|
| `src/` + `public/` | Gateway Worker + static admin | `chatwoot-ai-gateway` Worker |
| `sloten-admin-secure/` | Pages project (Admin UI + auth proxy) | `sloten-admin-secure` Pages |
| `chatwoot-bot-worker/` | AgentBot Worker (Chatwoot webhook receiver) | `chatwoot-bot` Worker |

---

## 2. Verified Staging Environment (弊社 staging-bk)

This environment proves the system end-to-end. Use it as the reference for a fresh deploy.

### URLs

| Service | URL |
|---|---|
| Gateway Worker | https://chatwoot-ai-gateway-staging-bk.rcc-aoki.workers.dev |
| Admin UI (Pages) | https://sloten-admin-secure.pages.dev |
| Widget page | https://sloten-admin-secure.pages.dev/widget |
| AgentBot Worker (production Chatwoot) | https://chatwoot-bot.rcc-aoki.workers.dev |

### Admin credentials (staging-bk)

```
Email:    admin@sloten.local
Password: RWCGAGj82d2qgTtenx#91
```

> Change on first login. Use `migrations/008-initial-admin.mjs` to reset.

### Seeded data (verified 2026-04-15)

- `templates`: **69 rows** (real staff messages from im.sloten.io, PII-masked, frequency-ranked)
- `knowledge_sources`: **17 rows** (11 manual KB + 6 real-FAQ)
- `faq`: **214 rows**
- Dream pot banner: **live** from https://sloten.io/api/jackpot/campaign/current (60s KV cache)

### Verified endpoints

| Endpoint | Auth | Behavior |
|---|---|---|
| `GET /health` | none | 200 |
| `GET /api/public/jackpot` | none | Live ¥ amount + source chain (`sloten-live` → `db-fallback` → `default`) |
| `POST /api/auth/login` | Origin+password | Sets `sloten_session` HttpOnly cookie |
| `GET /api/faq` | session cookie | 214 rows |
| `GET /api/templates` | session cookie | 69 rows |
| `GET /api/knowledge-sources` | session cookie | 17 rows |
| `PUT /api/widget-config/jackpot` | session cookie | Admin override of jackpot amount |
| `POST /api/ai/chat` | AgentBot secret | Gemini/Anthropic via provider chain |

---

## 3. Required Secrets (per-environment)

Set via `wrangler secret put <NAME>`.

### Gateway Worker (`chatwoot-ai-gateway`)

| Secret | Required | Purpose |
|---|---|---|
| `ADMIN_API_TOKEN` | ✅ | Pages → Worker bearer auth |
| `SESSION_SIGNING_KEY` | ✅ | HMAC for session cookies (32+ bytes) |
| `AGENTBOT_SECRET` | ✅ | AgentBot → Gateway shared secret |
| `GEMINI_API_KEY` | ✅ | AI provider (currently primary) |
| `ANTHROPIC_API_KEY` | optional | Fallback AI provider |
| `CHATWOOT_API_TOKEN` | ✅ | Pull conversations for Admin UI |
| `CHATWOOT_BASE_URL` | ✅ | e.g., `https://im.sloten.io` |
| `EC_CALLBACK_SECRET` | optional | EC deposit webhook auth (accepts all if unset + warns) |

### AgentBot Worker (`chatwoot-bot`)

| Secret | Required |
|---|---|
| `CHATWOOT_API_TOKEN` | ✅ |
| `BONUS_CODE_WEBHOOK_URL` | ✅ (GAS) |
| `GAS_BOT_WEBHOOK_URL` | ✅ (GAS) |
| `BANK_TRANSFER_BOT_WEBHOOK_URL` | ✅ (GAS) |
| `EC_DEPOSIT_BOT_WEBHOOK_URL` | ✅ (GAS) |
| `WEBHOOK_SECRET` | optional | Hardens `/api/webhook/{secret}` path |
| `ADMIN_TOKEN` | optional | Hardens `/admin?token={value}` |

### Pages Project (`sloten-admin-secure`)

Set as plain env vars (not secrets):

- `AI_GATEWAY_URL` — Gateway Worker URL
- `ADMIN_API_TOKEN` — same value as Gateway `ADMIN_API_TOKEN`

---

## 4. First-Deploy Checklist

1. **Create D1 + 2 KVs** for Gateway Worker; fill IDs into `wrangler.toml` (replaces `REPLACE_WITH_*`).
2. **Apply migrations**: `node scripts/apply-migrations.mjs --remote` (all 014 are idempotent).
3. **Apply seeds**:
   ```bash
   wrangler d1 execute <DB_NAME> --remote --file=seeds/seed-templates-real.sql
   wrangler d1 execute <DB_NAME> --remote --file=seeds/seed-knowledge-sources.sql
   wrangler d1 execute <DB_NAME> --remote --file=seeds/seed-knowledge-sources-faq.sql
   ```
4. **Create admin**: `node migrations/008-initial-admin.mjs` (outputs password — save it).
5. **Set all required secrets** (section 3).
6. **Deploy Gateway Worker**: `wrangler deploy`.
7. **Deploy Pages** (`sloten-admin-secure/`): `wrangler pages deploy public`.
8. **Deploy AgentBot** (`chatwoot-bot-worker/`): `cd chatwoot-bot-worker && wrangler deploy`.
9. **Register AgentBot in Chatwoot**: Inbox → Bot Configuration → URL = AgentBot Worker URL. Do NOT also register as webhook (duplicate delivery).
10. **Smoke test**: `scripts/smoke-test.mjs`.

---

## 5. Known Constraints (by design, Chatwoot-dependent)

- Widget (`/widget`) has no menu buttons — menu is delivered by AgentBot `input_select` after user sends a message in the Chatwoot widget.
- Admin UI "Conversations" view pulls from Chatwoot API. Without `CHATWOOT_API_TOKEN` + `CHATWOOT_BASE_URL`, view is empty (by design).
- AgentBot-to-GAS handoff assumes GAS web apps exist at `*_WEBHOOK_URL` values. Handover includes GAS script sources in `chatwoot-bot-worker/gas-*.js`.

---

## 6. Version Notes

- **v1.0-chatwoot-handover (this tag):** Chatwoot-dependent, production-ready. All seeded data verified. Admin panel + widget + AgentBot + EC callback all functional in staging-bk.
- **Next:** Standalone (Chatwoot-less) version developed in separate repo `tyou20256-stack/sloten-standalone`. Not a supersession — a parallel track for customers who don't want Chatwoot.

---

## 7. Contact Points

- Extraction script token: `C:/tmp/cw_token.txt` (Chatwoot API token, not committed)
- Origin allowlist (admin Pages Functions): `sloten-admin-secure.pages.dev` + preview subdomains
- Rate limits: 50 req/10min per IP on `/api/ai/chat`

---

## 8. Changelog

See `PHASE-*-CHANGELOG.md` files for phase-by-phase history (ξ through υ + φ content-extraction phase).
