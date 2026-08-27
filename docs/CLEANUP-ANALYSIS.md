# FOX AI AGENCY — Historical Script Cleanup Analysis

## Summary

The repository root contains a large number of historical one-time-use patch scripts
(`patch*.cjs`, `patch*.js`, `fix*.cjs`) and a backup file
(`server.ts.before-telegram-portable-runtime`).

## Classification

### SAFE TO DELETE LATER

All of the following are one-time-use scripts that were executed during
earlier development phases. They are **not imported or referenced** by
the current build, test, or runtime. They can be safely removed in a
future cleanup commit once their changes have been confirmed in git history.

| File Pattern | Count | Purpose |
|---|---|---|
| `patch*.cjs` | 38 files | One-time patch scripts for aiAgentService, AppContext, ClientAISettings, server.ts, etc. |
| `patch*.js` | 1 file (`patch.js`) | Duplicate of `patch.cjs`, one-time patch script |
| `fix*.cjs` | 21 files | One-time fix scripts for JSX/TSX escaping, syntax, types |
| `server.ts.before-telegram-portable-runtime` | 1 file | Backup of server.ts before Telegram portable runtime migration |

**Total historical scripts: 60 files + 1 backup**

Verification was performed via grep across all source files — no `require()`
or `import` statements reference any of these files.

### REQUIRES REVIEW

None.

### STILL REFERENCED

None.

## Recommendation

These files are already tracked in git history. They should be removed
from the working tree in a future maintenance commit (not this one) to
keep the security commit focused.

They have already been added to `.dockerignore` to prevent inclusion
in Docker images.
