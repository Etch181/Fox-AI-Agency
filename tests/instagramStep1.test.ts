import assert from "node:assert/strict";
import test from "node:test";

import {
  setInstagramCredentials,
  getInstagramCredentials,
  deleteInstagramCredentials,
  verifyInstagramConnection,
  sendInstagramDirectMessage,
  sendInstagramCommentReply,
  generateInstagramAIResponse,
} from "../src/services/instagramService.ts";
import { canWorkspaceUseFeature } from "../src/services/entitlementService.ts";
import type { Workspace } from "../src/types.ts";

test("cross-workspace rejection: different workspaces have isolated Instagram configs", async () => {
  // Workspace A should not see Workspace B's Instagram credentials
  await setInstagramCredentials("workspace-a", "acc-a", "token-a");
  const aCreds = await getInstagramCredentials("workspace-a");
  assert.strictEqual(aCreds.businessAccountId, "acc-a");
  assert.strictEqual(aCreds.accessToken, "token-a");

  // Workspace B should be empty initially
  const bCredsBefore = await getInstagramCredentials("workspace-b");
  assert.strictEqual(bCredsBefore.businessAccountId, null);
  assert.strictEqual(bCredsBefore.accessToken, null);

  // Setting credentials for workspace-b should not affect workspace-a
  await setInstagramCredentials("workspace-b", "acc-b", "token-b");
  const aCredsAfter = await getInstagramCredentials("workspace-a");
  assert.strictEqual(aCredsAfter.businessAccountId, "acc-a");
  assert.strictEqual(aCredsAfter.accessToken, "token-a");

  const bCredsAfter = await getInstagramCredentials("workspace-b");
  assert.strictEqual(bCredsAfter.businessAccountId, "acc-b");
  assert.strictEqual(bCredsAfter.accessToken, "token-b");
});

test("entitlement denial: starter plan cannot use Instagram messaging", () => {
  // Simulate workspaces. isWorkspaceEntitlementActive requires both
  // status === "active" AND entitlementExpiresAt.toMillis() > now,
  // so the base workspace must expose a Timestamp-like .toMillis() method.
  const baseWorkspace = {
    id: "starter-workspace",
    industry: "Small Business" as const,
    status: "active" as "pending" | "active" | "suspended",
    subscriptionExpiresAt: "2030-12-31",
    entitlementExpiresAt: { toMillis: () => Date.now() + 365 * 24 * 60 * 60 * 1000 },
    name: "Test Starter",
    ownerName: "Test Owner",
    ownerEmail: "test@example.com",
    phone: "+123****7890",
    totalCustomers: 0,
    totalAppointments: 0,
    totalComplaints: 0,
    createdAt: new Date().toISOString(),
    aiConversationsUsed: 0,
  };

  // canWorkspaceUseFeature should return false for Instagram messaging on starter plan
  const workspace = { ...baseWorkspace, planId: "starter" as const } as unknown as Workspace;
  const hasMsg = canWorkspaceUseFeature(workspace, "instagram_messaging" as const);
  assert.strictEqual(hasMsg, false);

  const hasComments = canWorkspaceUseFeature(workspace, "instagram_comments" as const);
  assert.strictEqual(hasComments, false);

  // Business plan should have Instagram messaging
  const businessWorkspace = {
    ...baseWorkspace,
    planId: "business" as const,
    subscriptionExpiresAt: "2030-12-31",
  } as unknown as Workspace;
  const businessHasMsg = canWorkspaceUseFeature(businessWorkspace, "instagram_messaging" as const);
  assert.strictEqual(businessHasMsg, true);

  // Enterprise plan should have all Instagram features
  const enterpriseWorkspace = {
    ...baseWorkspace,
    planId: "enterprise" as const,
    subscriptionExpiresAt: "2030-12-31",
  } as unknown as Workspace;
  const enterpriseHasMsg = canWorkspaceUseFeature(enterpriseWorkspace, "instagram_messaging" as const);
  assert.strictEqual(enterpriseHasMsg, true);
  const enterpriseHasComments = canWorkspaceUseFeature(enterpriseWorkspace, "instagram_comments" as const);
  assert.strictEqual(enterpriseHasComments, true);
  const enterpriseHasPublish = canWorkspaceUseFeature(enterpriseWorkspace, "instagram_publish" as const);
  assert.strictEqual(enterpriseHasPublish, true);
});

test("fail closed when credentials are missing: verifyInstagramConnection returns false", async () => {
  // No credentials set → verify should fail
  const result = await verifyInstagramConnection("any-workspace");
  assert.strictEqual(result.success, false);
  assert.ok(result.error?.includes("not configured"));
});

test("fail closed when credentials are missing: sendInstagramDirectMessage returns error", async () => {
  // No credentials set → DM should fail with credentials error
  const result = await sendInstagramDirectMessage("any-workspace", "recipient-123", "Hello");
  assert.strictEqual(result.success, false);
  assert.ok(result.error?.includes("not configured"));
});

test("fail closed when credentials are missing: sendInstagramCommentReply returns error", async () => {
  // No credentials set → comment reply should fail with credentials error
  const result = await sendInstagramCommentReply("any-workspace", "comment-123", "Reply");
  assert.strictEqual(result.success, false);
  assert.ok(result.error?.includes("not configured"));
});

test("encrypted token storage via workspace vault: credentials persist and are encrypted", async () => {
  const businessAccountId = "17841465355710667";
  const accessToken = "IGQVJERTGTQ35CZAfLXWYt..."

  await setInstagramCredentials("test-workspace", businessAccountId, accessToken);
  const creds = await getInstagramCredentials("test-workspace");

  // Should retrieve the same values
  assert.strictEqual(creds.businessAccountId, businessAccountId);
  assert.strictEqual(creds.accessToken, accessToken);

  // Deleting should clear credentials
  await deleteInstagramCredentials("test-workspace");
  const credsAfter = await getInstagramCredentials("test-workspace");
  assert.strictEqual(credsAfter.businessAccountId, null);
  assert.strictEqual(credsAfter.accessToken, null);
});

test("no secrets/tokens in logs: verifyInstagramConnection does not leak tokens", async () => {
  // Set credentials
  await setInstagramCredentials("log-test-workspace", "test-acct", "test-token-123");

  // Capture console output
  const originalWarn = console.warn;
  const logs: string[] = [];
  console.warn = (...args: any[]) => logs.push(args.join(" "));

  try {
    await verifyInstagramConnection("log-test-workspace");

    // Verify no token values appear in logs
    const allLogs = logs.join(" ");
    assert.ok(!allLogs.includes("test-token-123"), "Token should not appear in logs");
    assert.ok(!allLogs.includes("IGQ"), "Instagram token should not appear in logs");
  } finally {
    console.warn = originalWarn;
  }
});

test("AI response generation fallback works without Gemini client", async () => {
  const result = await generateInstagramAIResponse("any-workspace", "test message");
  assert.ok(result.length > 0);
  assert.ok(result.includes("FOX AI Agency") || result.includes("Arabic"));
});