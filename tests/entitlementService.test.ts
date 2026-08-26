import assert from "node:assert/strict";
import test from "node:test";

import { Timestamp } from "firebase/firestore";
import { canWorkspaceUseFeature } from "../src/services/entitlementService.ts";
import type { Workspace } from "../src/types.ts";

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: "workspace-a",
    ownerUid: "owner-a",
    name: "Workspace A",
    industry: "Clinic",
    ownerName: "Owner A",
    ownerEmail: "owner-a@example.test",
    phone: "+201000000003",
    status: "active",
    planId: "business",
    subscriptionExpiresAt: "2099-12-31",
    entitlementExpiresAt: Timestamp.fromMillis(Date.now() + 60_000),
    aiConversationsUsed: 0,
    totalCustomers: 0,
    totalAppointments: 0,
    totalComplaints: 0,
    createdAt: "2026-08-26",
    ...overrides,
  };
}

test("active authoritative entitlement permits plan features", () => {
  assert.equal(canWorkspaceUseFeature(workspace(), "analytics"), true);
});

test("expired authoritative entitlement blocks plan features", () => {
  assert.equal(
    canWorkspaceUseFeature(
      workspace({
        entitlementExpiresAt: Timestamp.fromMillis(Date.now() - 60_000),
      }),
      "analytics",
    ),
    false,
  );
});

test("missing authoritative entitlement blocks plan features", () => {
  assert.equal(
    canWorkspaceUseFeature(
      workspace({ entitlementExpiresAt: undefined }),
      "analytics",
    ),
    false,
  );
});

test("inactive workspace blocks plan features", () => {
  assert.equal(
    canWorkspaceUseFeature(workspace({ status: "suspended" }), "analytics"),
    false,
  );
});
