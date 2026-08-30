# FOX n8n staging deployment

This is a separate, persistent, fail-closed n8n Compose project. The editor router is protected by Traefik BasicAuth and n8n owner login; webhook paths remain reachable for signed automation events. All supplied workflows import inactive and outbound campaign actions remain disabled until an operator reviews credentials and policy constraints.

## VPS prerequisites

1. Create DNS `A n8n-staging.foxaiagency.online -> 2.57.91.91` (currently unresolved as of 2026-08-29).
2. Identify existing networks without exposing secrets: `docker inspect traefik --format '{{json .NetworkSettings.Networks}}'` and `docker inspect fox-ai-staging --format '{{json .NetworkSettings.Networks}}'`.
3. Copy `n8n.env.template` to `.env`, replace placeholders, generate independent random values, and run `chmod 600 .env`.
4. Generate BasicAuth with `htpasswd -nbB`; double every `$` in the Compose env value so Compose preserves the bcrypt hash.
5. Before certificate activation, validate: `docker compose --env-file .env config --quiet`.
6. After DNS resolves, run: `docker compose --env-file .env up -d` then inspect `docker compose ps` and `docker compose logs --since=10m n8n`.
7. Create the n8n owner account on first login, enable MFA if available, import `workflows/*.json`, configure credentials, and activate only reviewed workflows.

## FOX runtime variables

Set FOX staging only: `ENABLE_N8N=true`, `N8N_WEBHOOK_URL=http://fox-n8n-staging:5678/webhook/fox-events`, and `N8N_WEBHOOK_SECRET` equal to the n8n-side shared secret. Never place these values in git or workflow JSON.

The official n8n reverse-proxy guidance requires `N8N_WEBHOOK_URL` and `N8N_PROXY_HOPS=1`; this Compose uses both. The image tag `n8nio/n8n:2.35.0` was verified to exist for amd64 and arm64 before this file was prepared.

## Safety

- Do not copy production FOX, Meta, Telegram, SMTP, or Firebase credentials.
- Do not activate marketing or customer-campaign workflows until consent, messaging-window, template, and human review gates are configured.
- Keep webhook shared-secret validation as the first node for incoming FOX events.
