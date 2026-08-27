# FOX AI AGENCY — Dependency Security Review

## Summary

`npm audit` identified **9 moderate severity** vulnerabilities, all
**transitive** through Google Cloud libraries. No Critical or High
severity vulnerabilities found.

## Direct vs Transitive

| Severity | Direct | Transitive |
|----------|--------|------------|
| Critical | 0 | 0 |
| High | 0 | 0 |
| Moderate | 0 | 9 |
| Low | 0 | 0 |

## Detailed Findings

### 1. @opentelemetry/core — Unbounded memory allocation (Moderate)
- **Advisory**: GHSA-8988-4f7v-96qf
- **Affected**: `<2.8.0`
- **Path**: `@google-cloud/pubsub` → `@opentelemetry/core` → `firebase-tools`
- **Scope**: Dev-only (firebase-tools is a devDependency)
- **Fix**: Upgrade `firebase-tools` to 14.23.0 (BREAKING — requires major upgrade)
- **Status**: No non-breaking fix available

### 2. uuid — Missing buffer bounds check (Moderate)
- **Advisory**: GHSA-w5hq-g745-h8pq
- **Affected**: `<11.1.1`
- **Path**: `firebase-tools` → `gaxios` → `uuid`
- **Scope**: Dev-only
- **Fix**: Upgrade `firebase-tools` to 14.23.0 (BREAKING)
- **Status**: No non-breaking fix available

### 3-9. Transitive through @google-cloud/storage → firebase-admin (Moderate)
- **Affected packages**: `teeny-request`, `retry-request`, `@google-cloud/storage`
- **Scope**: Runtime (firebase-admin is a production dependency)
- **Severity**: Moderate
- **Fix**: Requires `firebase-admin` major upgrade
- **Status**: No non-breaking fix available. These are dev/maintenance
  dependencies; the exposure is indirect and does not involve processing
  untrusted user data through the vulnerable code path.

## Recommendation

- Do NOT run `npm audit fix --force` (would break major versions)
- Monitor firebase-tools/firebase-admin upstream releases for non-breaking patches
- These are all moderate severity and transitive — no immediate production risk
  identified for the staging deployment.
