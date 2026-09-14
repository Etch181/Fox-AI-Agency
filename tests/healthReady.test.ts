import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const serverSource = readFileSync(new URL("../server.ts", import.meta.url), "utf8");

test("GET /api/health returns safe response without secrets", () => {
  const start = serverSource.indexOf('"/api/health"');
  assert.notEqual(start, -1);
  // Only read the health endpoint block (up to the closing });)
  const end = serverSource.indexOf("});", start);
  const route = serverSource.slice(start, end + 3);

  assert.match(route, /status:\s*"ok"/);
  assert.match(route, /service:\s*"fox-ai-agency"/);
  // Health endpoint must not reference any secret env vars
  assert.doesNotMatch(route, /FIREBASE_ADMIN/);
  assert.doesNotMatch(route, /FOX_SECRET_KEY/);
  assert.doesNotMatch(route, /API_KEY/);
  assert.doesNotMatch(route, /telegramBotToken/);
  assert.doesNotMatch(route, /accessToken/);
});

test("GET /api/ready returns readiness checks without leaking secret values", () => {
  const start = serverSource.indexOf('"/api/ready"');
  assert.notEqual(start, -1);
  const end = serverSource.indexOf("});", start);
  const route = serverSource.slice(start, end + 3);

  // The ready endpoint checks var presence by name only — it must not
  // return the actual value of any secret in its JSON response
  assert.match(route, /fox_secret_key/);
  assert.match(route, /firebase_admin_credentials/);
  assert.match(route, /public_base_url/);
  assert.match(route, /ready/);
  // Must not interpolate secret values into response
  assert.doesNotMatch(route, /\$\{.*FOX_SECRET/);
  assert.doesNotMatch(route, /\$\{.*FIREBASE_ADMIN/);
});

test("health endpoint does not depend on AI providers", () => {
  const start = serverSource.indexOf('"/api/health"');
  assert.notEqual(start, -1);
  const end = serverSource.indexOf("});", start);
  const route = serverSource.slice(start, end + 3);

  // Health endpoint should not call any AI provider
  assert.doesNotMatch(route, /generateContent/);
  assert.doesNotMatch(route, /generateWithFallback/);
  assert.doesNotMatch(route, /aiAgentService/);
});

test("ready endpoint does not make provider calls", () => {
  const start = serverSource.indexOf('"/api/ready"');
  assert.notEqual(start, -1);
  const end = serverSource.indexOf("});", start);
  const route = serverSource.slice(start, end + 3);

  // Readiness should only check env var presence, not call providers
  assert.doesNotMatch(route, /fetch\(/);
  assert.doesNotMatch(route, /adminDb/);
});
