#!/usr/bin/env node
import assert from "node:assert/strict";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFile } from "node:fs/promises";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: path.join(root, ".env.staging"), override: true, quiet: true });
assert.equal(process.env.GOOGLE_CLOUD_PROJECT, "fox-ai-agency-staging");
const serviceAccount = JSON.parse(await readFile(process.env.GOOGLE_APPLICATION_CREDENTIALS, "utf8"));
assert.equal(serviceAccount.project_id, "fox-ai-agency-staging");
const app = getApps()[0] || initializeApp({ credential: cert(serviceAccount), projectId: "fox-ai-agency-staging" });
const db = getFirestore(app);
const workspaceId = process.env.FOX_SMOKE_WORKSPACE_ID || "ws_tg_924598";
const expectedLeadId = process.env.FOX_SMOKE_LEAD_ID || "telegram_8793942466";
const expectedAppointmentId = process.env.FOX_SMOKE_APPOINTMENT_ID || "apt_1788006344181_88z0og";

const workspaceSnap = await db.collection("workspaces").doc(workspaceId).get();
assert.equal(workspaceSnap.exists, true);
const workspace = workspaceSnap.data() || {};
const forbiddenWorkspaceFields = [
  "telegramBotToken",
  "telegramToken",
  "whatsappAccessToken",
  "facebookPageAccessToken",
  "metaPageAccessToken",
];
assert.equal(forbiddenWorkspaceFields.some((field) => Boolean(workspace[field])), false);

const [nestedLeads, rootLeads, nestedAppointments, rootAppointments, conversations, memory, tokenSecret, expectedLeadSnap, expectedAppointmentSnap, clinicServices, knowledgeFacts, coupons] = await Promise.all([
  db.collection("workspaces").doc(workspaceId).collection("crmLeads").get(),
  db.collection("crmLeads").where("workspaceId", "==", workspaceId).get(),
  db.collection("workspaces").doc(workspaceId).collection("appointments").get(),
  db.collection("appointments").where("workspaceId", "==", workspaceId).get(),
  db.collection("workspaces").doc(workspaceId).collection("conversations").get(),
  db.collection("workspaces").doc(workspaceId).collection("shared_memory").get(),
  db.collection("workspaceSecrets").doc(workspaceId).collection("secrets").doc("telegramBotToken").get(),
  db.collection("workspaces").doc(workspaceId).collection("crmLeads").doc(expectedLeadId).get(),
  db.collection("workspaces").doc(workspaceId).collection("appointments").doc(expectedAppointmentId).get(),
  db.collection("clinicServices").where("workspaceId", "==", workspaceId).get(),
  db.collection("knowledgeFacts").where("workspaceId", "==", workspaceId).get(),
  db.collection("coupons").where("workspaceId", "==", workspaceId).get(),
]);

assert.equal(expectedLeadSnap.exists, true, "expected nested CRM lead is missing");
assert.equal(expectedAppointmentSnap.exists, true, "expected nested appointment is missing");
const expectedLead = expectedLeadSnap.data() || {};
const expectedAppointment = expectedAppointmentSnap.data() || {};
assert.equal(expectedLead.workspaceId, workspaceId);
assert.equal(expectedLead.name, "hesham");
assert.equal(expectedLead.phone, "01555193491");
assert.equal(String(expectedLead.channel || "").toLowerCase(), "telegram");
assert.equal(expectedAppointment.workspaceId, workspaceId);
assert.equal(expectedAppointment.customerName, "hesham");
assert.equal(expectedAppointment.phone, "01555193491");
assert.equal(expectedAppointment.date, "2026-08-30");
assert.equal(expectedAppointment.time, "05:00 PM");
assert.equal(expectedAppointment.status, "Scheduled");
assert.equal(String(expectedAppointment.channel || "").toLowerCase(), "telegram");
assert.equal(expectedAppointment.source, "ai_agent");

const nestedLeadIds = new Set(nestedLeads.docs.map((doc) => doc.id));
const rootLeadIds = new Set(rootLeads.docs.map((doc) => doc.id));
const nestedAppointmentIds = new Set(nestedAppointments.docs.map((doc) => doc.id));
const rootAppointmentIds = new Set(rootAppointments.docs.map((doc) => doc.id));

console.log(JSON.stringify({
  workspaceExists: true,
  planId: workspace.planId || null,
  workspacePlaintextChannelSecrets: false,
  telegramVaultSecretExists: tokenSecret.exists,
  nestedCrmLeads: nestedLeads.size,
  rootCrmLeads: rootLeads.size,
  crmCompatibilityMatches: [...nestedLeadIds].filter((id) => rootLeadIds.has(id)).length,
  nestedAppointments: nestedAppointments.size,
  rootAppointments: rootAppointments.size,
  appointmentCompatibilityMatches: [...nestedAppointmentIds].filter((id) => rootAppointmentIds.has(id)).length,
  expectedNestedLeadVerified: true,
  expectedNestedAppointmentVerified: true,
  expectedAppointmentDateOnlyKey: expectedAppointment.date,
  configuredWorkingHours: workspace.aiSettings?.workingHours || null,
  configuredBusinessDescription: Boolean(workspace.businessDescription),
  clinicServices: clinicServices.docs.map((doc) => ({
    name: doc.data().name || null,
    price: Number.isFinite(Number(doc.data().price)) ? Number(doc.data().price) : null,
    available: doc.data().available !== false,
  })),
  approvedKnowledgeFacts: knowledgeFacts.docs.filter((doc) => doc.data().approved === true).length,
  activeAiCoupons: coupons.docs.filter((doc) => doc.data().isActive === true && doc.data().aiCanUse === true).map((doc) => doc.data().code || doc.id),
  conversations: conversations.size,
  sharedMemorySessions: memory.size,
}, null, 2));
