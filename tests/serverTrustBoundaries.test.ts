import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const serverSource = readFileSync(new URL("../server.ts", import.meta.url), "utf8");
const adminTelegramSource = readFileSync(
  new URL("../src/components/admin/AdminTelegramBot.tsx", import.meta.url),
  "utf8",
);
const appContextSource = readFileSync(
  new URL("../src/context/AppContext.tsx", import.meta.url),
  "utf8",
);

test("Telegram dashboard simulator is super-admin authenticated and DTO-free", () => {
  const start = serverSource.indexOf('"/api/telegram/bot"');
  const end = serverSource.indexOf("// n8n Webhook Simulation", start);
  const route = serverSource.slice(start, end);

  assert.match(route, /authenticateFirebaseRequest/);
  assert.match(route, /requireSuperAdmin/);
  assert.match(route, /secureAsyncRoute/);
  assert.doesNotMatch(route, /registeredWorkspacesStore/);
  assert.doesNotMatch(route, /registeredLeadsStore/);
  assert.match(adminTelegramSource, /authenticatedFetch\("\/api\/telegram\/bot"/);
});

test("Telegram registration replies never reveal OTP values", () => {
  const otpSectionStart = serverSource.indexOf("Generate 6-Digit OTP");
  const otpSectionEnd = serverSource.indexOf(
    'if (session.step === "AWAITING_PLAN_CHOICE")',
    otpSectionStart,
  );
  assert.notEqual(otpSectionStart, -1);
  assert.notEqual(otpSectionEnd, -1);
  const otpSection = serverSource.slice(otpSectionStart, otpSectionEnd);

  assert.doesNotMatch(
    otpSection,
    /return `[^`]*\$\{(?:otpCode|newOtp|session\.otpCode)\}/s,
  );
});

test("workspace modification routes and callers are authenticated", () => {
  const start = serverSource.indexOf("// Subscriber Modification Requests Endpoints");
  const end = serverSource.indexOf(
    'app.post("/api/telegram/client-data-request"',
    start,
  );
  const routes = serverSource.slice(start, end);

  assert.match(
    routes,
    /modification-requests",\s*authenticateFirebaseRequest,\s*requireSuperAdmin/s,
  );
  assert.match(
    routes,
    /confirm-by-client",\s*authenticateFirebaseRequest,\s*secureAsyncRoute/s,
  );
  assert.match(
    routes,
    /:id\/reject",\s*authenticateFirebaseRequest,\s*requireSuperAdmin/s,
  );
  assert.doesNotMatch(
    appContextSource,
    /fetch\("\/api\/agency\/modification-requests/,
  );
});

test("WhatsApp credential mutation routes require workspace owner", () => {
  for (const routePath of [
    "/api/whatsapp/workspace/:workspaceId/webhook-token",
    "/api/whatsapp/workspace/:workspaceId/connect",
    "/api/whatsapp/workspace/:workspaceId/disconnect",
  ]) {
    const start = serverSource.indexOf(`"${routePath}"`);
    assert.notEqual(start, -1, routePath);
    const route = serverSource.slice(start, start + 400);
    assert.match(route, /requireWorkspaceOwner/, routePath);
  }
});

test("admin workspace mutations and deletion use trusted server routes", () => {
  const mutationStart = appContextSource.indexOf("const updateWorkspaceStatus");
  const deletionEnd = appContextSource.indexOf(
    "// CRM & Industry actions with strict tenant boundary checks",
    mutationStart,
  );
  const mutations = appContextSource.slice(mutationStart, deletionEnd);

  assert.match(
    mutations,
    /authenticatedFetch\(\s*`\/api\/admin\/workspaces\/\$\{workspaceId\}/s,
  );
  assert.match(mutations, /method:\s*"DELETE"/);
  assert.doesNotMatch(mutations, /deleteDoc\(/);
  assert.doesNotMatch(mutations, /setDeletedWorkspaceIds/);
});

test("OTP is not disclosed in /api/send-otp response", () => {
  const start = serverSource.indexOf('"/api/send-otp"');
  assert.notEqual(start, -1);
  const route = serverSource.slice(start, start + 500);

  assert.doesNotMatch(route, /otpCode:/);
  assert.doesNotMatch(route, /password/);
});

test("async API routes are wrapped with secureAsyncRoute or sanitized error handling", () => {
  for (const routePath of [
    "/api/ai/reset-session",
    "/api/ai/extract-knowledge",
  ]) {
    const start = serverSource.indexOf(`"${routePath}"`);
    assert.notEqual(start, -1, routePath);
    const route = serverSource.slice(start, start + 200);
    assert.match(route, /secureAsyncRoute/, routePath);
    assert.doesNotMatch(route, /err\.message/, routePath);
    assert.doesNotMatch(route, /error\.message\|\|/, routePath);
  }
});

test("n8n webhook proxy is wrapped with secureAsyncRoute and does not leak error messages", () => {
  const start = serverSource.indexOf('"/api/n8n/webhook"');
  assert.notEqual(start, -1);
  const route = serverSource.slice(start, start + 300);

  assert.match(route, /secureAsyncRoute/);
  assert.doesNotMatch(route, /err\.message/);
  assert.doesNotMatch(route, /error\.message\|\|/);
});

test("AI chat and Fox Advisor routes do not leak raw error messages", () => {
  const chatStart = serverSource.indexOf('"/api/ai/chat"');
  assert.notEqual(chatStart, -1);
  const chatRoute = serverSource.slice(chatStart, chatStart + 500);
  assert.doesNotMatch(chatRoute, /error\.message\s*\|\|/);

  const advisorStart = serverSource.indexOf('"/api/ai/fox-advisor"');
  assert.notEqual(advisorStart, -1);
  const advisorRoute = serverSource.slice(advisorStart, advisorStart + 500);
  assert.doesNotMatch(advisorRoute, /error\.message\s*\|\|/);
});
