# FOX AI AGENCY — VPS Staging Deployment Guide

## Architecture Overview

```
Internet
   ↓  (HTTPS :443)
Nginx (reverse proxy)
   ↓  (HTTP 127.0.0.1:3000)
Node.js/Express Application
   ↓
Firebase / External Integrations (Gemini, Telegram, etc.)
```

The Node application is **never** directly exposed to the public internet.
Nginx terminates TLS, sets security headers, and proxies to the Node app
listening on `127.0.0.1:3000`.

## Required Software on VPS

| Component | Version |
|-----------|---------|
| Node.js | 24.x (see .nvmrc) |
| npm | 11.x |
| Docker | 27.x+ |
| Docker Compose | 2.x+ |
| Nginx | 1.24+ |
| OpenSSL | for Let's Encrypt certs |

## Node/npm Version

- See `.nvmrc` for the exact Node version (24)
- See `package.json` `engines` for Node/npm constraints
- Install via: `nvm install $(cat .nvmrc) && nvm use`

## Staging Deployment Path

**Direct deployment from a mutable checkout is prohibited.** Do not run
`docker build`, `docker compose up`, `docker compose down`, or manual recreate
commands from this repository or any Hermes working tree.

The only supported staging deployment path is the separately reviewed,
root-owned trusted remote-release launcher on the VPS. It acquires the exact
approved commit from the authorized remote, creates an immutable release area,
and runs Compose only from that protected release snapshot.

Production is a separate procedure and must never use the staging launcher or
its files. Any emergency/manual bypass requires a separately reviewed
break-glass procedure; this document intentionally contains no unsafe shortcut.

## Environment Preparation

### Required Variables (Production)

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | Must be `production` |
| `GOOGLE_CLOUD_PROJECT` | Your Firebase/GCP project ID |
| `FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON` | Full service account JSON (preferred) |
| `FOX_SECRET_KEY` | AES-256-GCM key (generate: `openssl rand -base64 32`) |
| `FOX_PUBLIC_BASE_URL` | Public HTTPS URL for webhooks |

### Optional Variables (Staging/Dev)

| Variable | Description |
|----------|-------------|
| `ENABLE_TELEGRAM` | Enable Telegram polling (default: false) |
| `ENABLE_META` | Enable Meta/Facebook integration (default: false) |
| `ENABLE_SMTP` | Enable SMTP email (default: false) |
| `ENABLE_EXTERNAL_CRM` | Enable external CRM webhooks (default: false) |
| `ENABLE_N8N` | Enable n8n webhook proxy (default: false) |

See `.env.example` for the full catalog.

## Safe Staging Startup

1. **All integrations default to disabled** — set `ENABLE_*` to `true` explicitly
2. **Telegram polling does not start** unless `ENABLE_TELEGRAM=true` AND `TELEGRAM_BOT_TOKEN` is set
3. **SMTP does not send emails** unless `ENABLE_SMTP=true` AND SMTP credentials are configured
4. **Meta/WhatsApp webhooks are not activated** unless `ENABLE_META=true`
5. **Never point to the production Firebase project** from staging

### Verify startup

```bash
# Health check
curl http://localhost:3000/api/health
# Expected: {"status":"ok","service":"fox-ai-agency",...}

# Readiness check
curl http://localhost:3000/api/ready
# Expected: 200 if all required env vars are set, 503 otherwise
```

## Log Inspection

Use only the approved trusted-launcher release identifier and the exact
root-owned release-local Compose file for read-only logs. Do not run Compose
from a mutable checkout.

Logs are sanitized — secret values are never logged. Only variable names
appear in startup validation output.

## Shutdown and Rollback

Staging rollback is performed only by the reviewed launcher using its
staging-only rollback image path. Manual `docker compose down`, direct image
retagging, and mutable-worktree Compose commands are prohibited.

## Production Promotion Checklist

- [ ] All CI checks pass on the PR
- [ ] Independent security review = PASS
- [ ] Independent compatibility review = PASS (no functionality regression)
- [ ] No secrets staged in git
- [ ] Staging environment validation passes
- [ ] Health and readiness endpoints return OK
- [ ] All feature flags confirmed disabled for non-integrated services
- [ ] Docker image built from pinned Node 24 base
- [ ] Nginx template reviewed and applied on the VPS
- [ ] Let's Encrypt certificate obtained
- [ ] `FOX_PUBLIC_BASE_URL` set to the real HTTPS URL
- [ ] Firebase Admin service account scoped to staging project
- [ ] `FOX_SECRET_KEY` generated with `openssl rand -base64 32`
- [ ] Integration feature flags verified before enabling (ENABLE_TELEGRAM, etc.)

## Security Notes

- Node app listens on `127.0.0.1` by default (behind Nginx)
- Container runs as non-root user (uid 1001)
- No privileges, no Docker socket, no host networking
- All integration endpoints require `requireSuperAdmin` middleware
- Payment submission is server-only transaction with SHA-256 reference claim
- Firestore rules enforce tenant isolation at the database level
