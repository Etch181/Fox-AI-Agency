# FOX AI AGENCY — Engineering Operating Manual

> Persistent operating memory for autonomous FOX development.
> If a new session starts: read this file first, then inspect the real repository.

---

## 1. Project Identity

**FOX AI AGENCY** — multi-tenant SaaS AI platform for business automation.

**Target verticals:** clinics, pharmacies, retail/stores, restaurants, course/education centers, customer support businesses, SMBs.

**FOX provides:** AI agents, customer communication, CRM/business operations, analytics, marketing automation, multi-channel customer interaction, appointment booking, complaint management, and n8n-powered automation.

FOX is a production system, not a demo.

---

## 2. Authoritative Source Repository

**Root:** `/docker/hermes-agent-6pb0/data/fox-ai-agency`

Before any work:
- `git status` / `git branch --show-current` / `git log --oneline -15`
- Search existing code before creating anything new
- Never assume a feature doesn't exist — grep the repository first
- Never create duplicate implementations

The repository is the source of truth for implementation.
This file is the source of truth for operating rules and project context.

---

## 3. Technology Stack (Verified)

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite 6, Tailwind CSS v4 (@tailwindcss/vite), Recharts, Lucide icons, Motion, react-markdown |
| Backend | Node.js, single server.ts (Express 4, ~10,300 lines), esbuild bundle → dist/server.cjs |
| AI / Brain | OpenRouter (primary, nvidia/nemotron-3.5-lightning:free), optional Gemini keys per-workspace, @google/genai + OpenAI SDK |
| Database | Firebase/Firestore (firebase-admin), Google Sheets (booking), Qdrant (knowledge vectors) |
| Auth | Firebase Auth, registration claims + provisioning system, OTP (cryptographically secure) |
| Build | npm run build = vite build (frontend) + esbuild server.ts (backend) |
| Lint | tsc --noEmit |
| Tests | node --test tests/*.test.ts (47 files, 225+ cases), npm run test:firestore-rules, npm run test:integration |
| Deploy | VPS broker (fox-vps push/deploy), Docker staging container, staging.foxaiagency.online |
| n8n | 38 live workflows (verified via MCP), n8n-mcp control surface |

---

## 4. Architecture

```
Customer/Channel
    ↓
FOX Channel Gateway (server.ts)
    ↓
FOX Brain / Intent System (aiAgentService.ts)
    ↓
Specialized Business Agents (n8n workflows + FOX services)
    ↓
Business Operations / CRM (workspaceCrmService, workspaceDataService)
    ↓
n8n Automation (38 workflows)
    ↓
Structured Result → FOX → Customer
```

**Key truth: server.ts is the single backend file** (~10,300 lines) containing all API routes. Services are separated into src/services/ (50+ files).

---

## 5. Frontend Structure (Verified)

**Routing model:** Custom role-based SPA (no react-router-dom). Views managed via useState + localStorage + resolveAuthorizedView(role, requestedView) from src/security/appAuthorization.ts.

**Component tree:**

```
src/
├── App.tsx              (main shell: Navbar + Sidebar + active view)
├── context/AppContext.tsx
├── security/            (appAuthorization, registrationClaims, registrationProvisioning)
├── components/
│   ├── admin/           (13 views: AdminDashboard, AdminClientManager, AdminPlansManager,
│   │                      AdminPayments, AdminActivationCodes, AdminTelegramBot,
│   │                      AdminN8nWorkflows, AdminAgentCenter, AdminInfrastructure,
│   │                      AdminSupportTickets, AdminAuditLogs, AdminGeminiMonitoring,
│   │                      AdminAgencyRatings, AgentControlCenter)
│   ├── client/          (30+ views: ClientDashboard, ClientCRM, ClientAppointments,
│   │                      ClientComplaints, ClientAISettings, ClientMarketingAgent,
│   │                      ClientUnifiedInbox, ClientLiveChat, ClientWhatsAppQR,
│   │                      ClientN8n, ClientKnowledgeBuilder, + industry subdirs:
│   │                      clinic/, pharmacy/, restaurant/, store/)
│   ├── public/          (PublicLandingPage, AgencySalesBotWidget)
│   ├── auth/            (AuthPortal)
│   └── common/          (GmailIntegrationWidget)
├── services/            (50+ service files)
└── types.ts
```

**Entitlement gating:** canWorkspaceUseFeature(feature, workspace) enforced per feature (see src/services/entitlementService.ts).

**Industry modules:** Clinic, Pharmacy, Restaurant, Course Center, Retail — loaded via ClientIndustryModule.

---

## 6. Backend Route Groups (Verified)

server.ts route groups (partial — 80+ endpoints):

- **OTP/Auth:** /api/send-otp, /api/verify-otp
- **Marketing:** /api/marketing/strategy, /api/marketing/schedule, /api/marketing/publish/:recordId, /api/marketing/media/:jobId, /api/generate-ai-post
- **Meta/Facebook:** /api/meta/publish-post, /api/meta/test-connection, /api/meta/subscribe-page, /api/webhooks/meta-social, /api/meta/auto-reply-comment, /api/webhook/facebook
- **Telegram:** /api/telegram/webhook, /api/telegram/client-data-request
- **WhatsApp:** /api/whatsapp/workspace/:workspaceId/webhook-token, /api/whatsapp/webhook/:workspaceId
- **ManyChat/Make:** /api/manychat/chat, /api/make/chat
- **AI Brain:** /api/ai/build-system-prompt, /api/ai/fox-advisor, /api/command/execute
- **Conversations:** /api/conversations/:id/takeover, /api/conversations/:id/reply
- **CRM/Business:** /api/workspaces/:id/ai/gemini-key (GET/PUT/DELETE), /api/agency/leads, /api/agency/ratings
- **Health:** /api/health, /api/ready

---

## 7. Brain / Intent System (Verified — Actual Code Vocabulary)

Implemented in src/services/aiAgentService.ts.

Arabic regex detection (deterministic paths) + LLM classification (ambiguous cases).

**Actual code intent classes** (differs from older design docs):
- appointment (new booking)
- cancel_booking
- reschedule_booking
- complaint
- support
- sales
- marketing
- inquiry
- human_handoff

**Critical code behavior:**
- Arabic phrases mapped deterministically: إلغاء الحجز → cancel_booking, أغير الحجز → reschedule_booking
- Arabic حجز/موعد alone → routes to appointment (sales path), NOT new_booking
- human_handoff → customer-support agent (never executes operations)
- When intent ambiguous → always escalates to human_handoff
- LLM prompt enforces JSON-only output with allowed intents and allowed agents
- Workspace industry selects appropriate fallback agent

**Booking ops:** checkAvailability, bookAppointmentInSheet (Google Sheets), getCustomerAppointments (workspaceDataService), deterministic reschedule/cancel flows with appointment list lookup.

---

## 8. n8n Workflows (38 Live — Verified via MCP on 2026-09-15)

| Category | Workflows | Status |
|----------|-----------|--------|
| Core Routers | FOX Unified Agent Router v3 | ✅ active |
| Core Routers | FOX Unified Agent Router v1 | ❌ inactive (historical) |
| Core Routers | FOX Unified Agent Router v2 | ❌ inactive (historical) |
| Appointments | FOX - Appointment Reminder Automation (active) | ✅ active |
| Appointments | FOX - Appointment Reminder Automation (inactive duplicate) | ❌ inactive |
| Industry Agents | Clinic/Pharmacy/Retail/Restaurant/Course Center: appointment, complaints, support, marketing, sales | ✅ all active |
| Operations | Executive Development Cycle, Executive Activity Log, Executive Exception Alerts | ✅ active |
| Operations | Hermes Health Monitor, AI Technical Reviewer, Fox Events Receiver | ✅ active |
| Operations | Sales Follow-up Automation, Alert Delivery Receiver | ✅ active |

**Repo workflow JSONs:** deploy/n8n-staging/workflows/ — 23 files (16 core 00-15 + 7 agents) ready for import.

**Before modifying a workflow:** inspect live state via mcp__n8n-mcp__get_workflow_details — do not rely on names or repo JSONs alone.

**Never delete workflows. Extend or fix them. Do not rebuild n8n from scratch.**

---

## 9. Source → Staging Deployment Chain (Verified)

**Authoritative source repo:** `/docker/hermes-agent-6pb0/data/fox-ai-agency`
**Remote:** `github.com/Etch181/Fox-AI-Agency.git`
**Approved staging branch:** `safety/pre-vps-audit-2026-08-26`
**Audit HEAD:** `69659af` (`feat(n8n): unified multi-channel workflows`)
**Staging URL:** `https://staging.foxaiagency.online/`
**Staging compose:** `/docker/fox-ai-staging/docker-compose.yml`
**Staging env:** `/docker/fox-ai-staging/.env.staging`
**Compose project/service:** `fox-ai-staging` / `fox-staging`

### Proven runtime chain
```
FOX source repo
  → approved Git commit
  → broker / deploy-staging-handoff.sh / trusted-deploy.sh
  → Docker image
  → fox-ai-staging / fox-staging :3000
  → Traefik TLS router
  → staging.foxaiagency.online
```

DNS and Traefik route `staging.foxaiagency.online` to the `fox-staging` service on port 3000.
The running container has no source/dist bind mount; the application is baked into the Docker image. Therefore **editing source and refreshing the browser does NOT update staging**. A rebuild and approved staging deployment are required.

### Required staging deployment flow
1. Work only from the authoritative repo and approved branch.
2. Run lint/build/tests and verify the working tree.
3. Commit the change cleanly; deployment requires the approved branch HEAD to match the commit being deployed.
4. Push the approved commit to GitHub.
5. Invoke the staging deployment through the authorized VPS broker / handoff mechanism.
6. Broker verifies the approved commit/tree and infrastructure manifest hashes, builds the image with the required Firebase VITE build args, restarts only the staging service, and performs health/rollback checks.
7. Verify `/api/health`, `/api/ready`, the changed UI/route, and the actual behavior on `https://staging.foxaiagency.online/`.
8. Report the deployed commit SHA and verification result.

**Never claim that a source edit is live until the rebuilt image is deployed and the live staging behavior is verified.**

### Current deployment reality at the last verified audit (2026-09-15)
- Current source HEAD: `69659af`.
- Running staging image was built on 2026-09-12 and predates the current September 14 source commits.
- Live frontend assets were therefore older than the current source.
- The current source `dist/server.cjs` matched the backend bytes previously baked into the inspected image, but the live frontend was confirmed stale.
- No successful staging deployment had occurred since 2026-09-12 at that audit.
- The deployment chain itself was proven healthy: HTTPS 200, `/api/health` OK, `/api/ready` ready.
- A prior manifest-hash blocker was later cleared; **do not assume a deploy is blocked now**. Re-check the live manifest/broker status before declaring a blocker.

### Deployment safety
- Production deployment is not available through this staging mechanism and is forbidden without explicit approval.
- Never expose the broker token or any manifest/credential secrets.
- Never bypass broker verification or modify release manifests just to force a deployment.

## 10. Current Project State (Verified 2026-09-15)

### Verified Implemented

- Multi-tenant SaaS foundation (workspace isolation, Firebase Auth, registration claims, OTP)
- server.ts backend with 80+ API endpoints
- React 19 frontend with 30+ client views, 13 admin views, role-based routing
- Brain/intent system (Arabic regex + LLM, aiAgentService.ts) with 9 intent classes
- Booking operations (check availability, book, reschedule, cancel — via Google Sheets)
- Complaint system (crmService + workspaceCrmService, complaint intent class)
- Marketing engine (generate AI posts, strategy, schedule, publish, media jobs)
- Marketing publishing bridge + social publishing service
- 38 live n8n workflows (agents, routers, reminders, executive automation, analytics)
- OTP with cryptographically secure random, email fallback
- Campaign engine (campaignEngineService)
- Credit/coupon system (creditService, couponService)
- Trial/entitlement system (TrialLimitManager, entitlementService — 11+ feature keys)
- Knowledge system (qdrantKnowledgeService — workspace-scoped index/search)
- WhatsApp: architecture implemented (Cloud API, webhook-token, secret vault) — **NOT connected** (no Meta WABA credentials)
- Instagram: services implemented — **NOT connected** (no Instagram Business Account)
- Facebook: webhook handler implemented — **NOT configured** (no Meta App credentials)
- Telegram: webhook handler implemented — **status unclear** (ENABLE_TELEGRAM flag in .env.staging)
- SMTP/email: architecture present — ENABLE_SMTP=false in staging
- Super Admin system (AdminClientManager, AdminPlansManager, AdminPayments, AdminActivationCodes, AdminInfrastructure, AdminAuditLogs, AdminGeminiMonitoring)
- Agent control plane (AdminAgentCenter, AgentControlCenter, AdminN8nWorkflows, workspaceAgentService)
- AI provider management (Gemini key per workspace, OpenRouter/Hermes runtime)
- Staff management (ClientStaff)
- Support tickets (AdminSupportTickets, ClientSupportTickets)
- Live chat (ClientLiveChat)
- Unified inbox (ClientUnifiedInbox)
- Analytics dashboard (ClientAnalyticsDashboard, ClientAIEngagement)
- Subscription system (ClientSubscription, paymentSubmissionService, paymentTransitionService)
- Industry modules: Clinic, Pharmacy, Restaurant, Course Center, Retail
- Security: multi-tenant isolation verified (0 critical/high findings per config/REAL-INTEGRATION-CHECKLIST.md)
- Test suite: 47 files, 225+ cases, ~87+ passing, 2 expected failures (Firebase env in dev)

### Partially Implemented / Incomplete

- Telegram integration: needs staging verification (ENABLE_TELEGRAM flag present but runtime unconfirmed)
- Human handoff UI: ClientLiveChat + /api/conversations/:id/takeover exists — verify UI↔behavior consistency
- Appointment reschedule/cancel: deterministic flow exists in aiAgentService.ts — verify against real customer scenarios
- ClientLiveChat: verify actual real-time WebSocket/SSE mechanism vs polling

### External Integrations: NOT CONNECTED (Blocked by Credentials)

| Integration | Architecture | External Config Required |
|------------|-------------|-------------------------|
| WhatsApp | IMPLEMENTED | Meta WABA credentials |
| Instagram | IMPLEMENTED | Instagram Business Account + linked Facebook Page |
| Facebook/Messenger | IMPLEMENTED | Meta App (APP_ID, APP_SECRET, PAGE_ID) |
| SMTP | IMPLEMENTED | SMTP_HOST/PORT/USER/PASS + domain DNS (SPF/DKIM/DMARC) |
| Telegram | IMPLEMENTED | ENABLE_TELEGRAM=true + TELEGRAM_BOT_TOKEN (verify staging active) |
| Gemini | IMPLEMENTED | Per-workspace GEMINI_API_KEY rotation |
| External CRM | NOT ENABLED | ENABLE_EXTERNAL_CRM=false |

### Deploy Status (must be re-verified before each deployment)

- Branch: `safety/pre-vps-audit-2026-08-26`
- Audit HEAD: `69659af`
- Source-to-staging chain: **PROVEN**
- Last audit: running image was older than current source; frontend was stale.
- **Do not carry forward the old "manifest SHA mismatch" blocker without re-checking it.**
- Inspect the actual broker/container state before declaring a deployment blocker or using rollback.

### Known Previous Findings (Re-verify when Relevant)

- 38 n8n workflows exist; should be preserved, not rebuilt
- FOX Unified Agent Router v3 is primary router (active)
- v1/v2 routers inactive, should NOT be deleted
- Two Appointment Reminder workflows: active (created Sep 6) + inactive duplicate (created Sep 10) — duplicate can be archived/deleted when operator is ready
- Some channel integrations have architecture but not production credentials
- AGENTROUTER_ENABLED flag present in .env.staging (check whether it should be disabled — current AI direction is OpenRouter/Hermes, not Agent Router)

---

## 11. AI Provider Configuration

**Current direction:** OpenRouter / Hermes.

**Primary model:** nvidia/nemotron-3.5-lightning:free

**Agent Router:** AGENTROUTER_ENABLED is present in .env.staging — verify whether this should be false. Do NOT re-enable Agent Router unless explicitly authorized.

**Fallback handling:** AI layer must handle quota exhaustion, rate limits, 5xx errors, connection failures with provider/model fallback.

**Gemini keys:** per-workspace secret vault rotation supported (/api/workspaces/:id/ai/gemini-key). Never expose key values.

---

## 12. Security Rules (Non-Negotiable)

- **Never expose:** API keys, tokens, OAuth tokens, passwords, webhook secrets, Firebase credentials, encryption keys, FOX_SECRET_KEY, SMTP credentials, Telegram bot tokens, Meta tokens
- **Never print secrets** in logs, chat, or CLAUDE.md
- **Never weaken security rules** to make a feature work
- **Multi-tenant isolation mandatory:** workspace data never leaks across tenants
- **Register webhook secrets** in workspace secret vault — never hardcode
- .env.staging is mode 600 — never print its contents; only .env.staging.example is safe to display

---

## 13. Development Workflow

**Before work:**
```
cd /docker/hermes-agent-6pb0/data/fox-ai-agency
git status
git branch --show-current
git log --oneline -10
```

**Implementation loop:**
```
READ → UNDERSTAND → PLAN → IMPLEMENT → LINT → BUILD → TEST → STAGING → VERIFY → DIFF → REPORT
```

**Commands:**
- Lint: npm run lint (tsc --noEmit)
- Build: npm run build
- Test: npm run test / npm run test:integration / npm run test:firestore-rules
- Full verify: npm run verify

**After changes:**
- Run full QA before committing
- Commit with clear message
- Push the clean approved commit using the repository's authorized deployment handoff/broker mechanism (see Section 9 and AGENTS.md).
- Deploy staging only after QA and explicit staging authorization.
- Never invent or expose broker tokens/credentials.

---

## 14. Deployment Rules

- **Production deployment: FORBIDDEN** without explicit user approval in current conversation
- **Staging deploy:** permitted after QA passes; use the authorized broker/handoff path described in Section 9.
- Deploy target: Docker container `fox-ai-staging` / service `fox-staging` at `staging.foxaiagency.online`.
- Never deploy without build verification first.
- After deploy: verify health/readiness, changed routes, and real user behavior.

---

## 15. White Screen Protection (CRITICAL)

FOX has had white-screen regressions. Every frontend change:
1. npm run lint (TypeScript check)
2. npm run build
3. Check import paths
4. Check environment assumptions (VITE_FIREBASE_* vars)
5. Verify staging loads
6. Verify changed route specifically

**If white screen occurs: STOP everything, fix regression first.**

---

## 16. Feature Completion Standard

A feature is **COMPLETE** only when:
- Source code changed (frontend + backend)
- Persistence implemented (Firestore/Sheets as needed)
- UI works (no white screen, correct behavior)
- Build passes
- Tests pass where applicable
- Staging verified
- Behavior is real, not simulated

"Button exists" = NOT complete.
"Code written" = NOT complete.
Actual implementation must work end-to-end.

---

## 17. n8n Operating Rules

Using mcp__n8n-mcp__* tools:
- Claude MAY: list, inspect, update, create (when genuinely needed), execute staging workflows, publish/unpublish, inspect executions, troubleshoot
- Claude MUST NOT: delete workflows, replace working workflows unnecessarily, rotate credentials, expose credentials, fabricate execution results

**Always inspect workflow details before modifying** — do not rely on names alone.

---

## 18. Git Safety

- Never git reset --hard without explicit instruction
- Never force push
- Never delete unrelated work
- Preserve untracked files unless explicitly told to clean
- Review git status after broad git add — check for secrets

---

## 19. Current Roadmap (Verify Implementation Status Before Acting)

**DONE (Verified):** Multi-tenant SaaS foundation, Firebase Auth, brain/intent system, core CRM, appointments, complaints, marketing engine, 38 n8n workflows, 30+ frontend views, OTP, entitlements, staff, support tickets, knowledge system

**NEXT (Priorities):**
1. Fix deploy block (manifest SHA update — needs root)
2. Activate n8n workflows if not yet live in staging
3. Connect real channel credentials (WhatsApp/Instagram/Facebook) when ready
4. Human handoff: verify UI↔backend behavior end-to-end
5. Marketing: actual publishing (requires channel credentials)
6. Appointment reminder: verify active workflow fires correctly in staging
7. Production deployment preparation

**NOT IMPLEMENTED / DEFERRED:**
- Agent Router: not in scope (AGENTROUTER_ENABLED may be vestigial)
- Analytics deep-dive dashboard
- Full content calendar UI
- Real email delivery (SMTP not configured)

---

## 20. Session Continuity

1. **Read this file** at start of every session
2. **Inspect git status and git log** to verify state
3. **Grep the repository** before creating anything new
4. **Trust this file** for operating rules; **trust the repository** for implementation reality
5. **If this file conflicts with the repo:** update this file to match reality

---

## 21. User Communication Preferences

- Prefer direct execution over tutorials
- For staging edits: execute, report result
- Ask before: production deploys, deleting workflows, deleting data, credential rotation, destructive changes
- Report: what changed, files changed, commit SHA, QA result, staging status, blockers, remaining work
- Do not fabricate verification results

---

## 22. Never Do These Things

- Expose secrets
- Delete n8n workflows
- Rebuild everything from scratch
- Enable Agent Router without explicit authorization
- Deploy production without approval
- Fake integrations, CRM records, publishing results
- Ignore tenant isolation
- Create UI-only features without backend
- Claim success without verification
- Make destructive changes silently
- Print customer data, tokens, or credentials in logs or chat

---

*Last updated: 2026-09-16 — deployment chain and source-to-staging rules reconciled with the verified read-only deployment audit.*
*Verified: git state, n8n workflow count (38), server routes, frontend structure, integration checklist, deploy status*
