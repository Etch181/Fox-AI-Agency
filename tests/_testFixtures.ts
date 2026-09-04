// FOX STEP9 — shared test helper for integration tests that need a
// real workspace document + Instagram credentials seeded in the
// Firestore emulator. Import from instagramStep{1..8} test files.
//
// Usage:
//   import { seedWorkspace, seedInstagramCredentials } from "./_testFixtures.ts";
//   before(async () => {
//     await seedWorkspace('ws-dedup', { planId: 'business' });
//     await seedInstagramCredentials('ws-dedup', 'acc-1', 'token-1');
//   });

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "../src/services/firebaseAdmin.ts";
import { setInstagramCredentials } from "../src/services/instagramService.ts";

export interface SeedWorkspaceOptions {
  planId?: "starter" | "business" | "enterprise";
  industry?: string;
  name?: string;
}

export async function seedWorkspace(
  workspaceId: string,
  opts: SeedWorkspaceOptions = {}
): Promise<void> {
  const planId = opts.planId ?? "business";
  // Future timestamp so isWorkspaceEntitlementActive() returns true.
  const future = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  await adminDb.collection("workspaces").doc(workspaceId).set(
    {
      id: workspaceId,
      planId,
      industry: opts.industry ?? "Small Business",
      status: "active",
      name: opts.name ?? workspaceId,
      ownerName: "Test Owner",
      ownerEmail: "test@example.com",
      phone: "+123****7890",
      totalCustomers: 0,
      totalAppointments: 0,
      totalComplaints: 0,
      createdAt: new Date().toISOString(),
      aiConversationsUsed: 0,
      subscriptionExpiresAt: future.toISOString(),
      // Real Firestore Timestamp — isWorkspaceEntitlementActive reads .toMillis()
      entitlementExpiresAt: Timestamp.fromDate(future),
    },
    { merge: true }
  );
}

export async function seedInstagramCredentials(
  workspaceId: string,
  businessAccountId: string,
  accessToken: string
): Promise<void> {
  await setInstagramCredentials(workspaceId, businessAccountId, accessToken);
}
