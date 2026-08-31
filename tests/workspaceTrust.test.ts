import assert from "node:assert/strict";
import test from "node:test";

import {
  authoritativeWorkspaceFromDocument,
  authoritativeWorkspaceToAdminDto,
  authoritativeWorkspaceToClientDto,
  authoritativeWorkspaceToStaffDto,
  refreshAuthoritativeWorkspaceCache,
  sanitizeAuthoritativeWorkspaceForRuntime,
} from "../src/services/workspaceTrust.ts";

const timestamp = { toMillis: () => 1_777_000_000_000 };
const authoritative = {
  id: "workspace-a",
  ownerUid: "owner-a",
  ownerEmail: "owner@example.test",
  name: "Workspace A",
  industry: "Clinic",
  ownerName: "Owner",
  phone: "+201000000005",
  status: "active",
  planId: "business",
  subscriptionExpiresAt: "2026-09-30",
  entitlementExpiresAt: timestamp,
  aiConversationsUsed: 4,
  totalCustomers: 2,
  totalAppointments: 1,
  totalComplaints: 0,
  createdAt: "2026-08-26",
  telegramBotToken: "legacy-telegram-secret",
  googleSheetsAccessToken: "legacy-google-secret",
  externalCrmWebhookUrl: "https://example.test/hook/secret",
  passwordHash: "legacy-password-hash",
  encryptedPayload: { ciphertext: "secret", iv: "secret" },
  aiSettings: {
    agentName: "Fox",
    nestedToken: "must-not-leak",
    webhookUrl: "https://credential.example/secret",
    externalCrmWebhookUrl: "https://credential.example/legacy",
  },
  arbitraryFutureSecret: "must-not-leak",
};

test("tenant and admin workspace DTOs categorically omit secrets", () => {
  for (const dto of [
    authoritativeWorkspaceToClientDto(authoritative),
    authoritativeWorkspaceToAdminDto(authoritative),
  ]) {
    const serialized = JSON.stringify(dto);
    assert.equal(serialized.includes("legacy-telegram-secret"), false);
    assert.equal(serialized.includes("legacy-google-secret"), false);
    assert.equal(serialized.includes("hook/secret"), false);
    assert.equal(serialized.includes("legacy-password-hash"), false);
    assert.equal(serialized.includes("must-not-leak"), false);
    assert.equal("telegramBotToken" in dto, false);
    assert.equal("googleSheetsAccessToken" in dto, false);
    assert.equal("externalCrmWebhookUrl" in dto, false);
    assert.equal("encryptedPayload" in dto, false);
    assert.equal("arbitraryFutureSecret" in dto, false);
    assert.equal("webhookUrl" in dto.aiSettings, false);
    assert.equal("externalCrmWebhookUrl" in dto.aiSettings, false);
    assert.equal(dto.entitlementExpiresAtMillis, 1_777_000_000_000);
    assert.equal("entitlementExpiresAt" in dto, false);
  }
});

test("runtime workspace keeps authoritative Timestamp behavior but no secrets", () => {
  const runtime = sanitizeAuthoritativeWorkspaceForRuntime(authoritative);

  assert.equal(runtime.entitlementExpiresAt, timestamp);
  assert.equal(runtime.entitlementExpiresAt.toMillis(), 1_777_000_000_000);
  assert.equal("telegramBotToken" in runtime, false);
  assert.equal("googleSheetsAccessToken" in runtime, false);
  assert.equal("externalCrmWebhookUrl" in runtime, false);
  assert.deepEqual(runtime.aiSettings, { agentName: "Fox" });
});

test("runtime workspace retains non-secret Meta page routing identity", () => {
  const runtime = sanitizeAuthoritativeWorkspaceForRuntime({
    id: "ws_meta",
    metaPageId: "page_123",
    facebookPageAccessToken: "x",
  });
  assert.equal(runtime.metaPageId, "page_123");
  assert.equal(runtime.facebookPageAccessToken, undefined);
});

test("Firestore document ID always overrides stored workspace id", () => {
  const workspace = authoritativeWorkspaceFromDocument("document-id", {
    id: "forged-data-id",
    name: "Authoritative",
  });

  assert.equal(workspace.id, "document-id");
});

test("cache refresh accepts identifiers and trusted loader output only", async () => {
  const staleCache = [{
    id: "workspace-a",
    planId: "starter",
    status: "suspended",
    ownerUid: "forged-owner",
    entitlementExpiresAt: { seconds: 0 },
  }];
  const loadedIds: string[] = [];

  const refreshed = await refreshAuthoritativeWorkspaceCache(
    staleCache,
    ["workspace-a"],
    async (workspaceId) => {
      loadedIds.push(workspaceId);
      return authoritative;
    },
  );

  assert.deepEqual(loadedIds, ["workspace-a"]);
  assert.equal(refreshed[0].planId, "business");
  assert.equal(refreshed[0].status, "active");
  assert.equal(refreshed[0].ownerUid, "owner-a");
  assert.equal(refreshed[0].entitlementExpiresAt, timestamp);
});

test("staff workspace DTO exposes operational context without owner configuration or PII", () => {
  const dto = authoritativeWorkspaceToStaffDto(authoritative);

  assert.deepEqual(Object.keys(dto).sort(), [
    "entitlementExpiresAtMillis",
    "id",
    "industry",
    "name",
    "planId",
    "status",
  ]);
  assert.equal(dto.entitlementExpiresAtMillis, 1_777_000_000_000);
  assert.equal("ownerEmail" in dto, false);
  assert.equal("ownerName" in dto, false);
  assert.equal("ownerUid" in dto, false);
  assert.equal("phone" in dto, false);
  assert.equal("aiSettings" in dto, false);
  assert.equal("subscriptionExpiresAt" in dto, false);
});
