# Phase 2B server trust boundaries

This document records the local architecture implemented for Phase 2B. It does not authorize deployment or production migration.

## Authoritative workspace cache

`registeredWorkspacesStore` is a runtime cache, never a browser-owned source of truth. Browser clients do not upload workspace objects. The manual cache endpoint accepts workspace IDs only and reloads documents through the Firebase Admin SDK.

Authoritative cache write sources:

1. **Server startup hydration** — full Admin SDK read of `workspaces`, followed by `sanitizeAuthoritativeWorkspaceForRuntime`.
2. **Manual admin refresh** — authenticated super-admin submits identifiers only; the server fetches each document through Admin SDK.
3. **Cache removal refresh** — authenticated super-admin submits an identifier; Admin SDK decides whether the document still exists.
4. **Telegram registration** — starter-only workspace is created in an Admin SDK transaction; the sanitized transaction result enters cache.
5. **Payment transition** — Admin SDK transaction commits payment/workspace state, then the server rereads the workspace through Admin SDK.
6. **Workspace modification approval** — authenticated super-admin transaction updates safe profile fields, then Admin SDK rereads the workspace. Plan changes are excluded.
7. **Legacy-secret migration** — explicit authenticated super-admin migration, followed by Admin SDK reread.
8. **Integration connection/disconnection metadata** — authenticated owner/admin server routes validate credentials, persist secret values only to the encrypted vault, update safe Firestore metadata through Admin SDK, and apply only that trusted metadata to cache.
9. **Activation-code redemption** — Admin SDK transaction result updates plan, entitlement Timestamp, status, and limits.

No remaining cache path accepts plan, status, owner identity, entitlement, counters, limits, billing state, or feature flags from browser JSON.

## Workspace DTOs

All server responses containing workspaces use one of:

- `authoritativeWorkspaceToClientDto`
- `authoritativeWorkspaceToAdminDto`

Both are explicit allowlist mappers. Nested objects are recursively stripped of secret-like keys. Firestore entitlement timestamps are converted to `entitlementExpiresAtMillis` for JSON and are never round-tripped back into the authoritative cache.

Categorically excluded fields include tokens, secrets, passwords/hashes, credentials, private/API keys, encrypted payloads, IV/auth tags, ciphertext, webhook credential URLs, and unknown future top-level fields.

## Legacy secret migration

Startup hydration strips legacy secret fields from runtime memory but does not modify Firestore. Migration is explicit through the authenticated super-admin migration route. The migration:

1. Reads the authoritative workspace with Admin SDK.
2. Checks the encrypted vault first.
3. Does not overwrite an existing vault value.
4. Validates external webhook URLs before vault storage.
5. Writes missing values to `workspaceSecrets` through the encrypted vault.
6. Deletes legacy fields only after all required vault writes succeed.
7. Is idempotent and returns field names only, never values.

## SSRF boundary

External CRM delivery permits HTTPS only. DNS is resolved once, every answer must be globally routable unicast, and the connection is pinned to a validated address with the original hostname used for TLS SNI and Host. Redirects are not followed. One absolute deadline covers DNS, TCP/TLS, headers, body, and cleanup. Response bodies are consumed with a 64 KiB limit; violations destroy the stream/socket.

## Payment transitions

Browser code submits only payment ID, action, and optional rejection reason to an authenticated super-admin endpoint. The server transaction reads payment, workspace, and authoritative plan pricing; verifies pending state and ownership; calculates entitlement from the Firestore Timestamp; commits workspace/payment/audit records atomically; and prevents repeated or racing terminal transitions. Browser Firestore rules deny direct payment update/delete.
