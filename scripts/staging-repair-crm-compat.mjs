#!/usr/bin/env node
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

import dotenv from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.staging"), override: true, quiet: true });
assert.equal(process.env.GOOGLE_CLOUD_PROJECT, "fox-ai-agency-staging");
const serviceAccount = JSON.parse(await readFile(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
assert.equal(serviceAccount.project_id, "fox-ai-agency-staging");
const app = getApps()[0] || initializeApp({ credential: cert(serviceAccount), projectId: "fox-ai-agency-staging" });
const db = getFirestore(app);
const workspaceId = process.env.FOX_SMOKE_WORKSPACE_ID || "ws_tg_924598";
assert.equal(workspaceId, "ws_tg_924598");

const nested = await db.collection("workspaces").doc(workspaceId).collection("crmLeads").get();
let repaired = 0;
for (const source of nested.docs) {
  const target = db.collection("crmLeads").doc(source.id);
  const existing = await target.get();
  if (existing.exists) continue;
  const data = source.data();
  assert.equal(data.workspaceId, workspaceId);
  await target.set(data);
  const verified = await target.get();
  assert.equal(verified.exists, true);
  assert.equal(verified.data()?.workspaceId, workspaceId);
  repaired += 1;
}
console.log(JSON.stringify({ workspaceId, repaired, deleted: 0 }));
