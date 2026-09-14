#!/usr/bin/env node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const baseUrl = process.env.FOX_SMOKE_BASE_URL || "https://staging.foxaiagency.online";
const workspaceId = process.env.FOX_SMOKE_WORKSPACE_ID || "ws_tg_924598";
const envFile = process.env.FOX_SMOKE_ENV_FILE || path.join(root, ".env.staging");
const failures = [];
const passes = [];

function pass(name, detail = "") {
  passes.push(name);
  console.log(`PASS ${name}${detail ? ` — ${detail}` : ""}`);
}

function fail(name, error) {
  failures.push(name);
  console.error(`FAIL ${name} — ${error instanceof Error ? error.message : String(error)}`);
}

async function check(name, fn) {
  try {
    await fn();
  } catch (error) {
    fail(name, error);
  }
}

async function request(relative, options = {}) {
  return fetch(new URL(relative, baseUrl), {
    ...options,
    redirect: "manual",
    signal: AbortSignal.timeout(20_000),
  });
}

await check("health", async () => {
  const response = await request("/api/health");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, "ok");
  pass("health", "HTTP 200 status=ok");
});

await check("readiness", async () => {
  const response = await request("/api/ready");
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ready, true);
  pass("readiness", "HTTP 200 ready=true");
});

await check("frontend Firebase isolation and secret scan", async () => {
  const htmlResponse = await request("/");
  assert.equal(htmlResponse.status, 200);
  const html = await htmlResponse.text();
  const assets = [...html.matchAll(/(?:src|href)=["']([^"']+\.js)["']/g)].map((m) => m[1]);
  assert.ok(assets.length > 0, "no JavaScript bundle found");
  const bundles = await Promise.all(
    assets.map(async (asset) => (await request(asset)).text()),
  );
  const bundle = bundles.join("\n");
  assert.match(bundle, /fox-ai-agency-staging/);
  assert.doesNotMatch(bundle, /fox-ai-agency-(?:prod|production)/i);

  const firebaseHosts = [...bundle.matchAll(/([a-z0-9-]+)\.firebaseapp\.com/gi)].map((m) => m[1]);
  assert.ok(firebaseHosts.every((id) => id === "fox-ai-agency-staging"), `unexpected Firebase project reference count=${firebaseHosts.filter((id) => id !== "fox-ai-agency-staging").length}`);

  const forbidden = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /"private_key"\s*:/,
    /(?:sk|xox[baprs]|ghp)_[0-9A-Za-z_-]{20,}/,
  ];
  for (const pattern of forbidden) assert.doesNotMatch(bundle, pattern);
  pass("frontend Firebase isolation and secret scan", `${assets.length} JS bundle(s)`);
});

await check("Telegram webhook route", async () => {
  const response = await request(`/api/telegram/webhook/${encodeURIComponent(workspaceId)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  pass("Telegram webhook route", "reachable without exposing token");
});

await check("n8n endpoint fails closed without auth", async () => {
  const response = await request("/api/n8n/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ workspaceId, event: "smoke.test", payload: {} }),
  });
  assert.equal(response.status, 401, `unexpected HTTP ${response.status}`);
  pass("n8n endpoint fails closed without auth", `HTTP ${response.status}`);
});

await check("Meta verification fails closed", async () => {
  const response = await request("/api/webhooks/meta-social?hub.mode=subscribe&hub.challenge=fox-smoke");
  assert.ok([403, 503].includes(response.status), `unexpected HTTP ${response.status}`);
  pass("Meta verification fails closed", `HTTP ${response.status}`);
});

await check("WhatsApp verification rejects missing token", async () => {
  const response = await request(`/api/whatsapp/webhook/${encodeURIComponent(workspaceId)}?hub.mode=subscribe&hub.challenge=fox-smoke`);
  assert.equal(response.status, 400);
  pass("WhatsApp verification rejects missing token", "HTTP 400");
});

if (!args.has("--skip-firestore")) {
  await check("staging Firestore workspace and entitlement", async () => {
    dotenv.config({ path: envFile, override: false, quiet: true });
    assert.equal(process.env.GOOGLE_CLOUD_PROJECT, "fox-ai-agency-staging");
    assert.equal(process.env.VITE_FIREBASE_PROJECT_ID, "fox-ai-agency-staging");
    assert.equal(process.env.FIRESTORE_DATABASE_ID || "", "", "default Firestore database requires an empty FIRESTORE_DATABASE_ID");

    let credential = applicationDefault();
    const credentialPath = String(process.env.GOOGLE_APPLICATION_CREDENTIALS || "").trim();
    if (credentialPath) {
      const serviceAccount = JSON.parse(await readFile(credentialPath, "utf8"));
      assert.equal(serviceAccount.project_id, "fox-ai-agency-staging");
      credential = cert(serviceAccount);
    }

    const app = getApps()[0] || initializeApp({ credential, projectId: "fox-ai-agency-staging" });
    const db = getFirestore(app);
    const snapshot = await db.collection("workspaces").doc(workspaceId).get();
    assert.equal(snapshot.exists, true, "workspace does not exist");
    const workspace = { id: snapshot.id, ...snapshot.data() };
    assert.equal(String(workspace.planId || workspace.plan || "").toLowerCase(), "business");
    assert.notEqual(String(workspace.status || "active").toLowerCase(), "disabled");

    const { canWorkspaceUseFeature } = await import("../src/services/entitlementService.ts");
    assert.equal(canWorkspaceUseFeature(workspace, "telegram"), true);
    assert.equal(canWorkspaceUseFeature(workspace, "whatsapp"), true);
    pass("staging Firestore workspace and entitlement", "workspace exists; business includes Telegram and WhatsApp");
  });
}

if (process.env.FOX_SMOKE_LOG_FILE) {
  await check("startup log scan", async () => {
    const log = await readFile(process.env.FOX_SMOKE_LOG_FILE, "utf8");
    const startupErrors = log.match(/(?:uncaught|unhandled rejection|startup failed|EADDRINUSE|Firebase Admin initialization failed)/gi) || [];
    assert.equal(startupErrors.length, 0, `startup error markers=${startupErrors.length}`);
    pass("startup log scan");
  });
}

console.log(`SUMMARY pass=${passes.length} fail=${failures.length}`);
if (failures.length) process.exitCode = 1;
