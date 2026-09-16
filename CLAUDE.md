# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start dev server (tsx server.ts, port 3000)
npm run build        # Vite frontend + esbuild server bundle → dist/
npm run lint         # tsc --noEmit (type-check only, no output files)
npm test             # node --test (Vitest configured but runner is node:test)
npm run verify       # lint + build + test in sequence
```

Single test: `node --test src/path/to/file.test.ts`

## Architecture

**FOX AI Agency** — multi-tenant SaaS platform for AI-powered business automation (Arabic-first market).

### Stack
- **Frontend**: React 19 + Vite + TypeScript (SPA, single index.html)
- **Backend**: Express on Node.js 24 — single `server.ts` at repo root (27K+ lines, all routes defined inline)
- **Auth/Firestore**: Firebase Admin SDK; Firestore collections under `workspaces/{id}/...`
- **AI**: Google Gemini (`@google/genai`) + OpenAI; 10 specialized AI agents
- **Orchestration**: n8n workflows (19 total) in `deploy/n8n-staging/workflows/`
- **Containerization**: Docker Compose — `fox-ai-staging` (Node app) + `n8n-staging` + `nginx-staging`
- **Deploy**: Trusted snapshot chain via `safety/pre-vps-audit-2026-08-26` branch

### Server Route Organization (server.ts)

All routes are defined in `server.ts` at the root. Key groups:
- **Lines ~50–400**: Lead capture, AI config, billing, marketplace, pricing, virtualnumbers
- **Lines ~400–900**: Email campaigns, customer export, coupon/loyalty, aiAgents, event logs, appointments
- **Lines ~1200–1800**: Instagram/Facebook webhook handlers (webhookrouter, comment dispatch)
- **Lines ~1800–2400**: Telegram polling, `/start` onboarding, auto-reply, n8n-triggered agent endpoints
- **Lines ~2400–2800**: Media proxy, newsletter subscription, `/api/automation/agent` (n8n dispatch), `/api/automation/events`
- **Lines ~2800–3200**: Status page, FOX3 launch queue, secure key-endpoint gate, delivery controls
- **Lines ~3200+**: CRM leads API, AI agents API, language proxy, voice agent, business profile, session reset, encryption check, n8n sales followup

### Security Model

- `secureEndpoint(path, handler)` — requires Firebase ID token via `Authorization: Bearer` header
- `secureAsyncRoute(path, handler)` — async variant of secureEndpoint
- `requireWorkspaceFeature(workspace, feature)` — checks `workspace.features[feature]` flag; throws 403 if missing
- n8n integration gate: `INTEGRATION_FLAGS.n8n === true` (checked at `/api/automation/agent`)
- Shared-secret dispatch: n8n → FOX uses `X-FOX-N8N-Secret` header matched against `N8N_WEBHOOK_SECRET`
- `require(path).guard` pattern — inline module guard on sensitive admin routes
- `secureKeyEndpoint(path, handler)` — HMAC-signed query gate for key-protected endpoints
- Role hierarchy: `owner > admin > manager > employee` (checked via `requireUserRole`)

### Core Data Collections (Firestore)

```
workspaces/{workspaceId}/
  conversations/{conversationId}/messages/{messageId}
  crmLeads/{leadId}
  aiAgentConfigs/{configId}
  appointments/{appointmentId}
  sessions/{sessionId}
  sessions_by_channel/{channelSessionId}
  whatsappMedia/{mediaId}
  telegramSessions/{sessionId}
```

Top-level: `organizations/{orgId}`, `platformusage/{usageId}`

### n8n Integration

- `deploy/n8n-staging/` — staging Docker Compose stack (n8n + node + nginx)
- `deploy/n8n-staging/workflows/` — 19 workflow JSON exports (import format, not live export format)
- Workflows 00–10: active core (unified agent router, channel messages, auto-reply, Facebook, Instagram DMs, Telegram, WhatsApp, AI ControlPlane, daily summary, AI agent analytics)
- Workflows 11–15: unified inbox (multi-channel events, WhatsApp trigger, Instagram comments, Telegram auto-reply, analytics digest)
- Workflows 16–18: sales followup, appointment reminders, Google Sheets sync
- FOX→n8n dispatch: POST to `n8n_webhook_base` with `X-FOX-N8N-Secret` header
- n8n→FOX dispatch: POST to `/api/automation/agent` with same shared secret
- Required n8n env: `FOX_INTERNAL_BASE_URL`, `FOX_N8N_SHARED_SECRET`, `WHATSAPP_APP_SECRET`, `WHATSAPP_PHONE_NUMBER_ID`, `META_PAGE_ACCESS_TOKEN`, `TELEGRAM_BOT_TOKEN`

### Trusted Deploy Chain

`/docker/fox-ai-staging/trusted-deploy.sh` enforces integrity:
1. Reads `release-manifest.env` for expected commit + SHA256 hashes
2. Fetches source tarball from GitHub (`safety/pre-vps-audit-2026-08-26` branch)
3. Validates 7 hashes: handoff.sh, preflight.sh, docker-compose.yml, .env.staging, credentials/.env, tree_hash(source/), commit SHA
4. Materializes to `releases/{commit}/` snapshot
5. Runs `deploy-staging-handoff.sh` which counts workflow JSONs (expects exactly 16), then runs `docker compose build && up`

### Key Patterns

- **Dynamic imports** used extensively to lazy-load heavy services (instagramService, gmailService, etc.)
- **Workspace resolved from query or body**: `workspaceId || workspace?.id || workspaceId` pattern appears throughout
- **Telegram polling loop**: `startTelegramPolling()` at ~line 2100 uses long-polling with 30s timeout
- **AI agent dispatch**: `/api/automation/agent` resolves workspace → loads agent config → calls Gemini/OpenAI → stores reply → returns JSON
- **Event pipeline**: `/api/automation/events` → Firestore event log →实时对账 via SSE (`/api/events/stream`)

### Frontend Structure

- `src/App.tsx` — single-file SPA with role-based rendering (owner/admin vs employee), React Router v7, onboarding tour, login modal
- `src/context/AppContext.tsx` — global state (workspace, user, role, billing)
- `src/security/appAuthorization.ts` — role permissions, plan limits, billing state
- `src/services/` — 32 service modules (crm, email, campaign, ai, billing, integrations)
- `src/components/` — reusable UI (Navbar, Sidebar, Breadcrumbs, LoginModal, PricingPlans, OnboardingTour)
- `src/types.ts` — shared TypeScript interfaces
