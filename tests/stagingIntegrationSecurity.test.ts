import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";

const serverSource = readFileSync(new URL("../server.ts", import.meta.url), "utf8");
const deploymentSource = readFileSync(
  new URL("../deploy-staging-handoff.sh", import.meta.url),
  "utf8",
);

test("Meta webhook verification fails closed and never returns a challenge without an exact configured token", () => {
  const start = serverSource.indexOf("// Meta Webhook Verification (GET)");
  const end = serverSource.indexOf("// Meta Webhook Event Handler (POST)");
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const route = serverSource.slice(start, end);

  assert.match(route, /!EXPECTED_TOKEN/);
  assert.match(route, /mode\s*!==\s*["']subscribe["']/);
  assert.match(route, /!token\s*\|\|\s*token\s*!==\s*EXPECTED_TOKEN/);
  assert.doesNotMatch(route, /if\s*\(challenge\)\s*\{/);
  assert.doesNotMatch(route, /without challenge, returning OK/);
});

test("legacy Facebook webhook aliases are Meta-gated, token-checked, and signature-checked", () => {
  const start = serverSource.indexOf("// GET Facebook Webhook Verification");
  const end = serverSource.indexOf("// MANYCHAT INTEGRATION ENDPOINT", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const legacyRoutes = serverSource.slice(start, end);

  assert.match(legacyRoutes, /INTEGRATION_FLAGS\.meta/);
  assert.match(legacyRoutes, /activeFacebookVerifyToken/);
  assert.match(legacyRoutes, /token\s*!==\s*activeFacebookVerifyToken/);
  assert.doesNotMatch(legacyRoutes, /if \(challenge\) \{/);
  assert.match(legacyRoutes, /verifyMetaWebhookSignature/);

  const configStart = serverSource.indexOf("// Facebook Config API Endpoints");
  const configEnd = serverSource.indexOf("// Official Telegram Bot Simulation Endpoint", configStart);
  const configRoutes = serverSource.slice(configStart, configEnd);
  assert.match(configRoutes, /authenticateFirebaseRequest/);
  assert.match(configRoutes, /requireSuperAdmin/);
  assert.doesNotMatch(configRoutes, /verifyToken:\s*activeFacebookVerifyToken/);
  assert.doesNotMatch(configRoutes, /activeFacebookPageToken\s*=\s*pageToken/);
});

test("n8n webhook is authenticated, feature-gated, and uses only a server-configured target", () => {
  const start = serverSource.indexOf('"/api/n8n/webhook"');
  const end = serverSource.indexOf("// FOX RUNTIME READINESS", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const route = serverSource.slice(start, end);

  assert.match(route, /authenticateFirebaseRequest/);
  assert.match(route, /INTEGRATION_FLAGS\.n8n/);
  assert.match(route, /process\.env\.N8N_WEBHOOK_URL/);
  assert.match(route, /process\.env\.N8N_WEBHOOK_SECRET/);
  assert.match(route, /requireWorkspaceOwner/);
  assert.doesNotMatch(route, /customWebhookUrl/);
  assert.doesNotMatch(route, /Internal n8n simulation/);
  assert.doesNotMatch(route, /Math\.random/);
});

test("every staged n8n webhook rejects missing or empty shared-secret headers", () => {
  const workflowsDirectory = new URL(
    "../deploy/n8n-staging/workflows/",
    import.meta.url,
  );
  const workflows = readdirSync(workflowsDirectory)
    .filter((name) => name.endsWith(".json"));
  assert.equal(workflows.length, 10);

  for (const workflow of workflows) {
    const source = readFileSync(new URL(workflow, workflowsDirectory), "utf8");
    assert.doesNotMatch(
      source,
      /headers\?\.\['x-fox-n8n-secret'\]\s*\|\|\s*\$env\.FOX_N8N_SHARED_SECRET/,
      `${workflow} must not substitute the expected secret when the header is absent`,
    );
    assert.match(source, /:\s*'NO'/);
    assert.match(
      source,
      /\$env\.FOX_N8N_SHARED_SECRET\s*&&\s*\$json\.headers/,
    );
  }
});

test("Meta webhook resolves each Page to a workspace and reads only that tenant token from the secret vault", () => {
  const start = serverSource.indexOf("// Meta Webhook Event Handler (POST)");
  const end = serverSource.indexOf("// AI Agent System Prompt Builder Endpoint", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const route = serverSource.slice(start, end);

  assert.match(route, /getWorkspaceByMetaPageId/);
  assert.match(route, /getWorkspaceSecret/);
  assert.match(route, /facebookPageAccessToken/);
  assert.doesNotMatch(route, /activeMetaPageAccessToken/);
  assert.doesNotMatch(route, /process\.env\.META_PAGE_ACCESS_TOKEN/);
});

test("Meta and WhatsApp POST webhooks verify sha256 signatures over preserved raw request bytes", () => {
  assert.match(serverSource, /rawBody/);
  assert.match(serverSource, /META_APP_SECRET/);
  const calls = serverSource.match(/verifyMetaWebhookSignature\(/g) || [];
  assert.equal(calls.length, 3, "Meta Page, deprecated Facebook alias, and WhatsApp handlers must verify signatures");
});

test("AI session reset is authenticated and restricted to the authoritative workspace owner", () => {
  const start = serverSource.indexOf('"/api/ai/reset-session"');
  const end = serverSource.indexOf('"/api/ai/extract-knowledge"', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const route = serverSource.slice(start, end);
  assert.match(route, /authenticateFirebaseRequest/);
  assert.match(route, /requireAuthenticatedWorkspace/);
});

test("tenant Telegram webhooks require the derived Telegram secret and honor the feature flag", () => {
  const configureStart = serverSource.indexOf("async function configureWorkspaceTelegramWebhook");
  const routeStart = serverSource.indexOf('"/api/telegram/webhook/:workspaceId"');
  const routeEnd = serverSource.indexOf("// EXPLICIT LEGACY WORKSPACE SECRET MIGRATION", routeStart);
  const configure = serverSource.slice(configureStart, routeStart);
  const route = serverSource.slice(routeStart, routeEnd);

  assert.match(configure, /secret_token/);
  assert.match(configure, /getWorkspaceTelegramWebhookSecret/);
  assert.match(route, /INTEGRATION_FLAGS\.telegram/);
  assert.match(route, /x-telegram-bot-api-secret-token/);
  assert.match(serverSource, /function isValidWorkspaceTelegramWebhookSecret[\s\S]*?timingSafeEqual/);
});

test("tenant Telegram token management honors the global integration kill switch", () => {
  const start = serverSource.indexOf('"/api/telegram/workspace/:workspaceId/token"');
  const route = serverSource.slice(start, start + 7000);
  assert.match(route, /INTEGRATION_FLAGS\.telegram/);
});

test("staging handoff excludes env secrets, requires a clean tree, and verifies Node 24 without printing raw logs", () => {
  assert.match(deploymentSource, /--exclude='\.env'/);
  assert.match(deploymentSource, /--exclude='\.env\.\*'/);
  assert.match(deploymentSource, /status --porcelain/);
  assert.match(deploymentSource, /process\.versions\.node/);
  assert.match(deploymentSource, /error_marker_lines/);
  assert.doesNotMatch(deploymentSource, /for line in selected\[-120:\]/);
  assert.match(deploymentSource, /Automated deployment checks: PASS/);
  assert.doesNotMatch(deploymentSource, /Deployment result: PASS/);
  assert.doesNotMatch(deploymentSource, /activeTab\.startsWith\(\\"admin_\\"\)/);
  assert.match(deploymentSource, /resolveAuthorizedView/);
  assert.match(deploymentSource, /const activeTab: ViewTab/);
  assert.match(deploymentSource, /setRequestedView\(authorized\)/);
});
