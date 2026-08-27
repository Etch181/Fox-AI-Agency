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

## Docker Usage

### Build the image locally

```bash
docker build -t fox-ai-agency:staging .
```

### Run with Docker Compose (recommended for staging)

```bash
# 1. Copy env template
cp .env.staging.example .env.staging

# 2. Fill in staging values (never use production credentials)
nano .env.staging

# 3. Start
docker compose -f docker-compose.staging.yml up -d
```

The compose file binds the app to `127.0.0.1:4000` on the host.
Configure Nginx to proxy to this address.

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

```bash
# Docker Compose
docker compose -f docker-compose.staging.yml logs -f

# Or via journalctl if running as system service
journalctl -u fox-ai-agency -f
```

Logs are sanitized — secret values are never logged. Only variable names
appear in startup validation output.

## Shutdown

```bash
# Docker Compose
docker compose -f docker-compose.staging.yml down

# Graceful shutdown — app handles SIGTERM and closes server cleanly
docker stop fox-ai-agency-staging
```

## Rollback

1. Identify the previous working image: `docker images fox-ai-agency`
2. Revert the compose file to the previous version
3. Restore the previous `.env.staging` if needed
4. `docker compose -f docker-compose.staging.yml up -d`

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
