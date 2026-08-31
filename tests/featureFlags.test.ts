import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const serverSource = readFileSync(new URL("../server.ts", import.meta.url), "utf8");

test("integration feature flags default to fail-safe (disabled)", () => {
  // INTEGRATION_FLAGS should read from ENABLE_* env vars
  assert.match(serverSource, /ENABLE_TELEGRAM/);
  assert.match(serverSource, /ENABLE_META/);
  assert.match(serverSource, /ENABLE_SMTP/);
  assert.match(serverSource, /ENABLE_EXTERNAL_CRM/);
  assert.match(serverSource, /ENABLE_N8N/);

  // Flags must be parsed from env, not hardcoded to true
  assert.match(serverSource, /String\(process\.env\.ENABLE_TELEGRAM/);
  assert.match(serverSource, /String\(process\.env\.ENABLE_META/);
  assert.match(serverSource, /String\(process\.env\.ENABLE_SMTP/);
  assert.match(serverSource, /String\(process\.env\.ENABLE_EXTERNAL_CRM/);
  assert.match(serverSource, /String\(process\.env\.ENABLE_N8N/);

  // Default must be empty string (not "true")
  assert.match(serverSource, /process\.env\.ENABLE_TELEGRAM \|\| ""/);
});

test("legacy agency polling requires an explicit separate opt-in", () => {
  assert.doesNotMatch(serverSource, /let isBotEnabled = true/);
  assert.match(serverSource, /INTEGRATION_FLAGS\.telegram && INTEGRATION_FLAGS\.agencyTelegramPolling/);
  assert.match(serverSource, /ENABLE_AGENCY_TELEGRAM_POLLING/);
  assert.match(serverSource, /AGENCY_TELEGRAM_POLLING_DISABLED/);
});

test("Telegram polling only starts when explicitly enabled", () => {
  // The startup should check the flag before starting polling
  const start = serverSource.indexOf("startTelegramPolling()");
  assert.notEqual(start, -1);
  const context = serverSource.slice(Math.max(0, start - 800), start + 200);

  assert.match(context, /INTEGRATION_FLAGS\.telegram/);
  assert.match(context, /isBotEnabled/);
});

test("n8n webhook simulation is gated behind feature flag", () => {
  // Verify ENABLE_N8N is in the INTEGRATION_FLAGS block
  const flagsStart = serverSource.indexOf("const INTEGRATION_FLAGS");
  assert.notEqual(flagsStart, -1);
  const flagsBlock = serverSource.slice(flagsStart, flagsStart + 800);
  assert.match(flagsBlock, /n8n/);
  assert.match(flagsBlock, /ENABLE_N8N/);
});
