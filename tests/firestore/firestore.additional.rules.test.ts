import assert from "node:assert/strict";
import { after, before, beforeEach, describe, test } from "node:test";
import { readFile } from "node:fs/promises";

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

const PROJECT_ID = process.env.FOX_RULES_PROJECT_ID || "demo-fox-rules";
const WORKSPACE_A = "workspace-a";
const WORKSPACE_B = "workspace-b";
const TENANT_A_OWNER = "tenant-a-owner";
const TENANT_B_OWNER = "tenant-b-owner";
const SUPER_ADMIN = "super-admin";
const NEW_TENANT_OWNER = "new-tenant-owner";

let testEnv: RulesTestEnvironment;

function firestoreHost() {
  const configured = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
  const separator = configured.lastIndexOf(":");

  return {
    host: configured.slice(0, separator),
    port: Number(configured.slice(separator + 1)),
  };
}

async function seed(path: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), path), data);
  });
}

function authenticatedDb(uid: string, email: string) {
  return testEnv.authenticatedContext(uid, { email }).firestore();
}

function tenantADb() {
  return authenticatedDb(TENANT_A_OWNER, "owner-a@example.test");
}

function tenantBDb() {
  return authenticatedDb(TENANT_B_OWNER, "owner-b@example.test");
}

function superDb() {
  return authenticatedDb(SUPER_ADMIN, "admin@example.test");
}

function newTenantDb() {
  return authenticatedDb(NEW_TENANT_OWNER, "new-owner@example.test");
}

async function commitRegistration(
  db: any,
  uid: string,
  email: string,
  workspaceId: string,
  workspace: Record<string, unknown>,
) {
  const batch = writeBatch(db);

  batch.set(doc(db, "workspaces", workspaceId), workspace);
  batch.set(doc(db, "users", uid), {
    uid,
    name: "Workspace Owner",
    email,
    role: "client_owner",
    workspaceId,
    active: true,
    createdAt: "2026-08-26T18:00:00.000Z",
  });

  return batch.commit();
}

function validRegistrationWorkspace(
  workspaceId: string,
  uid: string,
  email: string,
) {
  return {
    id: workspaceId,
    ownerUid: uid,
    ownerEmail: email,
    name: "Registration Workspace",
    industry: "Clinic",
    ownerName: "Workspace Owner",
    phone: "+201000000004",
    status: "active",
    planId: "starter",
    subscriptionExpiresAt: "2026-09-25",
    entitlementExpiresAt: Timestamp.fromMillis(
      Date.now() + 30 * 24 * 60 * 60 * 1000,
    ),
    aiConversationsUsed: 0,
    totalCustomers: 0,
    totalAppointments: 0,
    totalComplaints: 0,
    createdAt: "2026-08-26",
    registrationSource: "web_portal",
    onboardingStatus: "in_progress",
    onboardingCompleted: false,
    onboardingStep: 1,
    businessDescription: "",
    onboardingAiReady: false,
    onboardingCatalogReady: false,
    aiSettings: { agentName: "Registration AI" },
  };
}

before(async () => {
  const rules = await readFile(new URL("../../firestore.rules", import.meta.url), "utf8");
  const { host, port } = firestoreHost();

  testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { host, port, rules },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await Promise.all([
      setDoc(doc(db, "users", TENANT_A_OWNER), {
        role: "client_owner",
        workspaceId: WORKSPACE_A,
      }),
      setDoc(doc(db, "users", TENANT_B_OWNER), {
        role: "client_owner",
        workspaceId: WORKSPACE_B,
      }),
      setDoc(doc(db, "users", SUPER_ADMIN), {
        role: "super_admin",
      }),
      setDoc(doc(db, "workspaces", WORKSPACE_A), {
        ownerUid: TENANT_A_OWNER,
        ownerEmail: "owner-a@example.test",
      }),
      setDoc(doc(db, "workspaces", WORKSPACE_B), {
        ownerUid: TENANT_B_OWNER,
        ownerEmail: "owner-b@example.test",
      }),
    ]);
  });
});

after(async () => {
  await testEnv.cleanup();
});

describe("additional cross-tenant and authoritative-data coverage", () => {
  test("missing, malformed, and unknown profile roles cannot access a bound workspace", async () => {
    await seed("crmLeads/role-guard-record", {
      workspaceId: WORKSPACE_A,
      name: "Protected lead",
    });
    await seed("payments/role-guard-payment", {
      workspaceId: WORKSPACE_A,
      status: "pending",
    });
    await seed("gemini_metrics/workspace-a", {
      workspaceId: WORKSPACE_A,
      totalCalls: 1,
    });

    for (const [uid, roleData] of [
      ["missing-role", {}],
      ["empty-role", { role: "" }],
      ["malformed-role", { role: ["client_owner"] }],
      ["unknown-role", { role: "workspace_admin" }],
    ] as const) {
      await seed(`users/${uid}`, {
        workspaceId: WORKSPACE_A,
        ...roleData,
      });
      const db = authenticatedDb(uid, `${uid}@example.test`);

      await assertFails(getDoc(doc(db, "workspaces", WORKSPACE_A)));
      await assertFails(getDoc(doc(db, "crmLeads", "role-guard-record")));
      await assertFails(getDoc(doc(db, "payments", "role-guard-payment")));
      await assertFails(getDoc(doc(db, "gemini_metrics", WORKSPACE_A)));
    }

    await seed(`users/${TENANT_A_OWNER}`, {
      role: "unsupported_owner_role",
      workspaceId: WORKSPACE_A,
    });
    await assertFails(
      updateDoc(doc(tenantADb(), "workspaces", WORKSPACE_A), {
        name: "Invalid-role owner mutation",
      }),
    );
  });

  test("valid staff retains workspace-scoped operational access", async () => {
    const staffUid = "tenant-a-staff";
    await seed(`users/${staffUid}`, {
      role: "staff",
      workspaceId: WORKSPACE_A,
    });
    await seed("crmLeads/staff-record", {
      workspaceId: WORKSPACE_A,
      name: "Staff lead",
    });

    const db = authenticatedDb(staffUid, "staff-a@example.test");
    await assertFails(getDoc(doc(db, "workspaces", WORKSPACE_A)));
    await assertSucceeds(getDoc(doc(db, "crmLeads", "staff-record")));
  });

  test("staff cannot bypass owner-only views through direct Firestore access", async () => {
    const staffUid = "tenant-a-staff";
    await seed(`users/${staffUid}`, {
      role: "staff",
      workspaceId: WORKSPACE_A,
    });

    const ownerOnlyCollections = [
      "knowledgeFacts",
      "coupons",
      "n8nWorkflows",
      "marketing_generated_posts",
    ];

    for (const collectionName of ownerOnlyCollections) {
      await seed(`${collectionName}/owner-only-record`, {
        workspaceId: WORKSPACE_A,
        name: "Owner-only record",
      });
      const db = authenticatedDb(staffUid, "staff-a@example.test");

      await assertFails(
        getDoc(doc(db, collectionName, "owner-only-record")),
      );
      await assertFails(
        setDoc(doc(db, collectionName, "staff-forged-record"), {
          workspaceId: WORKSPACE_A,
          name: "Forged by staff",
        }),
      );
    }

    const db = authenticatedDb(staffUid, "staff-a@example.test");
    await seed("payments/staff-hidden-payment", {
      workspaceId: WORKSPACE_A,
      status: "pending",
    });
    await seed("gemini_metrics/workspace-a", {
      workspaceId: WORKSPACE_A,
      totalCalls: 1,
    });
    await assertFails(getDoc(doc(db, "payments", "staff-hidden-payment")));
    await assertFails(getDoc(doc(db, "gemini_metrics", WORKSPACE_A)));
  });

  test("browser cannot directly provision even a baseline starter workspace", async () => {
    const baselineWorkspace = {
      id: "workspace-new",
      ownerUid: NEW_TENANT_OWNER,
      ownerEmail: "new-owner@example.test",
      name: "New Workspace",
      industry: "Clinic",
      ownerName: "New Owner",
      phone: "+201000000000",
      status: "active",
      planId: "starter",
      subscriptionExpiresAt: "2026-09-25",
      entitlementExpiresAt: Timestamp.fromMillis(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ),
      aiConversationsUsed: 0,
      totalCustomers: 0,
      totalAppointments: 0,
      totalComplaints: 0,
      createdAt: "2026-08-26",
      registrationSource: "web_portal",
      onboardingStatus: "in_progress",
      onboardingCompleted: false,
      onboardingStep: 1,
      businessDescription: "",
      onboardingAiReady: false,
      onboardingCatalogReady: false,
      aiSettings: { agentName: "New Workspace AI Assistant" },
    };

    await assertFails(
      commitRegistration(
        newTenantDb(),
        NEW_TENANT_OWNER,
        "new-owner@example.test",
        "workspace-new",
        baselineWorkspace,
      ),
    );
  });

  test("browser registration batches are denied in favor of trusted provisioning", async () => {
    const db = newTenantDb();

    await assertFails(
      commitRegistration(
        db,
        NEW_TENANT_OWNER,
        "new-owner@example.test",
        "workspace-first",
        validRegistrationWorkspace(
          "workspace-first",
          NEW_TENANT_OWNER,
          "new-owner@example.test",
        ),
      ),
    );
    await assertFails(
      commitRegistration(
        db,
        NEW_TENANT_OWNER,
        "new-owner@example.test",
        "workspace-second",
        validRegistrationWorkspace(
          "workspace-second",
          NEW_TENANT_OWNER,
          "new-owner@example.test",
        ),
      ),
    );
  });

  test("new tenant cannot self-provision paid or forged entitlements", async () => {
    await assertFails(
      commitRegistration(
        newTenantDb(),
        NEW_TENANT_OWNER,
        "new-owner@example.test",
        "workspace-forged",
        {
        id: "workspace-forged",
        ownerUid: NEW_TENANT_OWNER,
        ownerEmail: "new-owner@example.test",
        name: "Forged Workspace",
        industry: "Clinic",
        ownerName: "New Owner",
        phone: "+201000000000",
        status: "active",
        planId: "enterprise",
        subscriptionExpiresAt: "2099-12-31",
        entitlementExpiresAt: Timestamp.fromDate(new Date("2099-12-31T00:00:00Z")),
        aiConversationsUsed: 0,
        totalCustomers: 0,
        totalAppointments: 0,
        totalComplaints: 0,
        createdAt: "2026-08-26",
        registrationSource: "web_portal",
        onboardingStatus: "in_progress",
        onboardingCompleted: false,
        onboardingStep: 1,
        businessDescription: "",
        onboardingAiReady: false,
        onboardingCatalogReady: false,
        aiSettings: { agentName: "Forged" },
        extraConversationsLimit: 999999,
        extraPackages: [{ conversationsAdded: 999999 }],
      }),
    );
  });

  test("starter trial entitlement expiry is bounded", async () => {
    await assertFails(
      commitRegistration(
        newTenantDb(),
        NEW_TENANT_OWNER,
        "new-owner@example.test",
        "workspace-long-trial",
        {
        id: "workspace-long-trial",
        ownerUid: NEW_TENANT_OWNER,
        ownerEmail: "new-owner@example.test",
        name: "Long Trial Workspace",
        industry: "Clinic",
        ownerName: "New Owner",
        phone: "+201000000002",
        status: "active",
        planId: "starter",
        subscriptionExpiresAt: "2099-12-31",
        entitlementExpiresAt: Timestamp.fromDate(
          new Date("2099-12-31T00:00:00Z"),
        ),
        aiConversationsUsed: 0,
        totalCustomers: 0,
        totalAppointments: 0,
        totalComplaints: 0,
        createdAt: "2026-08-26",
        registrationSource: "web_portal",
        onboardingStatus: "in_progress",
        onboardingCompleted: false,
        onboardingStep: 1,
        businessDescription: "",
        onboardingAiReady: false,
        onboardingCatalogReady: false,
        aiSettings: { agentName: "Long Trial AI" },
      }),
    );
  });

  test("an existing user profile cannot create a second workspace", async () => {
    await assertFails(
      commitRegistration(
        tenantADb(),
        TENANT_A_OWNER,
        "owner-a@example.test",
        "workspace-second",
        {
        id: "workspace-second",
        ownerUid: TENANT_A_OWNER,
        ownerEmail: "owner-a@example.test",
        name: "Second Workspace",
        industry: "Clinic",
        ownerName: "Tenant A Owner",
        phone: "+201000000001",
        status: "active",
        planId: "starter",
        subscriptionExpiresAt: "2026-09-25",
        entitlementExpiresAt: Timestamp.fromMillis(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ),
        aiConversationsUsed: 0,
        totalCustomers: 0,
        totalAppointments: 0,
        totalComplaints: 0,
        createdAt: "2026-08-26",
        registrationSource: "web_portal",
        onboardingStatus: "in_progress",
        onboardingCompleted: false,
        onboardingStep: 1,
        businessDescription: "",
        onboardingAiReady: false,
        onboardingCatalogReady: false,
        aiSettings: { agentName: "Second Workspace AI" },
      }),
    );
  });

  test("workspace updates are owner-only and protect identity and entitlements", async () => {
    await seed("users/tenant-a-member", {
      role: "client_member",
      workspaceId: WORKSPACE_A,
    });
    const memberDb = authenticatedDb(
      "tenant-a-member",
      "member-a@example.test",
    );
    const ownerRef = doc(tenantADb(), "workspaces", WORKSPACE_A);
    const memberRef = doc(memberDb, "workspaces", WORKSPACE_A);

    await assertSucceeds(updateDoc(ownerRef, { name: "Renamed by owner" }));
    await assertFails(updateDoc(memberRef, { name: "Renamed by member" }));
    await assertFails(updateDoc(ownerRef, { ownerEmail: "forged@example.test" }));
    await assertFails(updateDoc(ownerRef, { planId: "enterprise" }));
    await assertFails(
      updateDoc(ownerRef, {
        googleSheetsAccessToken: "must-live-in-secret-vault",
      }),
    );
    await assertFails(
      updateDoc(ownerRef, {
        telegramBotToken: "must-live-in-secret-vault",
      }),
    );
    await assertFails(
      updateDoc(ownerRef, {
        externalCrmWebhookUrl: "https://webhook.example.test/secret",
      }),
    );
  });

  test("browser super admin cannot forge authoritative workspace state", async () => {
    const workspaceRef = doc(superDb(), "workspaces", WORKSPACE_A);

    await assertFails(updateDoc(workspaceRef, { planId: "enterprise" }));
    await assertFails(updateDoc(workspaceRef, { status: "active" }));
    await assertFails(updateDoc(workspaceRef, { ownerUid: SUPER_ADMIN }));
    await assertFails(
      updateDoc(workspaceRef, {
        entitlementExpiresAt: Timestamp.fromMillis(
          Date.now() + 365 * 86_400_000,
        ),
      }),
    );
    await assertFails(
      setDoc(doc(superDb(), "workspaces", "browser-created"), {
        id: "browser-created",
        ownerUid: SUPER_ADMIN,
        ownerEmail: "super@example.test",
        planId: "enterprise",
        status: "active",
      }),
    );
  });

  test("deleted workspace revokes tenant root and nested access", async () => {
    await seed(`workspaces/${WORKSPACE_A}`, {
      id: WORKSPACE_A,
      ownerUid: TENANT_A_OWNER,
      ownerEmail: "owner-a@example.test",
      status: "deleted",
    });
    await seed(`workspaces/${WORKSPACE_A}/crmLeads/deleted-lead`, {
      workspaceId: WORKSPACE_A,
    });

    await assertFails(getDoc(doc(tenantADb(), "workspaces", WORKSPACE_A)));
    await assertFails(
      getDoc(
        doc(
          tenantADb(),
          "workspaces",
          WORKSPACE_A,
          "crmLeads",
          "deleted-lead",
        ),
      ),
    );
  });

  test("Tenant B owner can read Tenant B data but not Tenant A data", async () => {
    await seed("crmLeads/tenant-a", {
      workspaceId: WORKSPACE_A,
      name: "A",
    });
    await seed("crmLeads/tenant-b", {
      workspaceId: WORKSPACE_B,
      name: "B",
    });
    const db = tenantBDb();

    await assertSucceeds(getDoc(doc(db, "crmLeads", "tenant-b")));
    await assertFails(getDoc(doc(db, "crmLeads", "tenant-a")));
  });

  test("super admin can read tenant-owned root records", async () => {
    await seed("crmLeads/tenant-a", {
      workspaceId: WORKSPACE_A,
      name: "A",
    });
    await seed("crmLeads/tenant-b", {
      workspaceId: WORKSPACE_B,
      name: "B",
    });
    const db = superDb();

    await assertSucceeds(getDoc(doc(db, "crmLeads", "tenant-a")));
    await assertSucceeds(getDoc(doc(db, "crmLeads", "tenant-b")));
  });

  test("browser payment submission and transition writes are server-only", async () => {
    const db = tenantADb();

    await assertFails(
      setDoc(doc(db, "payments", "payment-a"), {
        workspaceId: WORKSPACE_A,
        status: "pending",
        amountEGP: 100,
      }),
    );
    await assertFails(
      setDoc(doc(db, "paymentReferences", "reference-a"), {
        workspaceId: WORKSPACE_A,
        paymentId: "payment-a",
      }),
    );
    await assertFails(
      setDoc(doc(db, "payments", "payment-forged"), {
        workspaceId: WORKSPACE_B,
        status: "pending",
        amountEGP: 100,
      }),
    );
    await assertFails(
      setDoc(doc(db, "payments", "payment-approved"), {
        workspaceId: WORKSPACE_A,
        status: "approved",
        amountEGP: 100,
      }),
    );
  });

  test("browser clients cannot perform authoritative payment transitions", async () => {
    await seed("payments/payment-a", {
      workspaceId: WORKSPACE_A,
      status: "pending",
      amountEGP: 100,
    });
    const ref = doc(superDb(), "payments", "payment-a");

    await assertFails(updateDoc(ref, { status: "approved" }));
    await assertFails(updateDoc(ref, { status: "rejected" }));
    await assertFails(updateDoc(ref, { workspaceId: WORKSPACE_B }));
  });

  for (const collectionName of ["aiModelUsage", "aiModelHealth"] as const) {
    test(`${collectionName} is super-admin-readable and browser-write-denied`, async () => {
      await seed(`${collectionName}/record`, {
        workspaceId: WORKSPACE_A,
        model: "test-model",
      });

      await assertSucceeds(
        getDoc(doc(superDb(), collectionName, "record")),
      );
      await assertFails(
        getDoc(doc(tenantADb(), collectionName, "record")),
      );
      await assertFails(
        setDoc(doc(superDb(), collectionName, "browser-write"), {
          workspaceId: WORKSPACE_A,
          model: "test-model",
        }),
      );
    });
  }

  test("super admin audit creation cannot forge another actor UID", async () => {
    await assertFails(
      setDoc(doc(superDb(), "audit_logs", "forged-actor"), {
        id: "forged-actor",
        timestamp: serverTimestamp(),
        actorUid: TENANT_A_OWNER,
        actorName: "Super Admin",
        actorEmail: "admin@example.test",
        actorRole: "super_admin",
        action: "forged",
        category: "security",
        severity: "critical",
        target: "tenant-a",
        details: "forged actor",
      }),
    );
  });

  test("super admin audit creation cannot forge displayed identity", async () => {
    await assertFails(
      setDoc(doc(superDb(), "audit_logs", "forged-display"), {
        id: "forged-display",
        timestamp: serverTimestamp(),
        actorUid: SUPER_ADMIN,
        actorName: "Impersonated User",
        actorEmail: "victim@example.test",
        actorRole: "super_admin",
        action: "forged",
        category: "security",
        severity: "critical",
        target: "tenant-a",
        details: "forged display identity",
      }),
    );
  });

  test("tenant Gemini metric query must be workspace scoped", async () => {
    await seed(`gemini_metrics/${WORKSPACE_A}`, {
      workspaceId: WORKSPACE_A,
      totalCalls: 1,
    });
    await seed(`gemini_metrics/${WORKSPACE_B}`, {
      workspaceId: WORKSPACE_B,
      totalCalls: 1,
    });
    const db = tenantADb();
    const scoped = query(
      collection(db, "gemini_metrics"),
      where("workspaceId", "==", WORKSPACE_A),
    );
    const snapshot = await assertSucceeds(getDocs(scoped));

    assert.equal(snapshot.size, 1);
    await assertFails(getDocs(collection(db, "gemini_metrics")));
  });

  test("nested appointments enforce path and document ownership", async () => {
    await seed(`workspaces/${WORKSPACE_A}/appointments/appointment-a`, {
      workspaceId: WORKSPACE_A,
      status: "Scheduled",
    });
    const db = tenantADb();
    const ref = doc(
      db,
      "workspaces",
      WORKSPACE_A,
      "appointments",
      "appointment-a",
    );

    await assertSucceeds(getDoc(ref));
    await assertSucceeds(updateDoc(ref, { status: "Cancelled" }));
    await assertFails(updateDoc(ref, { workspaceId: WORKSPACE_B }));
    await assertFails(
      setDoc(
        doc(
          db,
          "workspaces",
          WORKSPACE_A,
          "appointments",
          "forged",
        ),
        { workspaceId: WORKSPACE_B, status: "Scheduled" },
      ),
    );
  });

  test("misplaced nested documents are never readable by path tenant", async () => {
    const misplaced = [
      ["crmLeads", "lead"],
      ["appointments", "appointment"],
      ["conversations", "conversation"],
      ["couponRedemptions", "redemption"],
      ["usage", "usage"],
    ];

    for (const [collectionName, documentId] of misplaced) {
      await seed(
        `workspaces/${WORKSPACE_A}/${collectionName}/${documentId}`,
        { workspaceId: WORKSPACE_B },
      );
      await assertFails(
        getDoc(
          doc(
            tenantADb(),
            "workspaces",
            WORKSPACE_A,
            collectionName,
            documentId,
          ),
        ),
      );
    }
  });

  test("actual browser nested collection queries remain authorized", async () => {
    await seed(`workspaces/${WORKSPACE_A}/crmLeads/lead-a`, {
      workspaceId: WORKSPACE_A,
      lastInteraction: "2026-08-26T17:00:00.000Z",
    });
    await seed(`workspaces/${WORKSPACE_A}/conversations/conversation-a`, {
      workspaceId: WORKSPACE_A,
      lastMessageAt: "2026-08-26T17:00:00.000Z",
    });
    await seed(
      `workspaces/${WORKSPACE_A}/conversations/conversation-a/messages/message-a`,
      {
        sender: "customer",
        text: "Hello",
        createdAt: "2026-08-26T17:00:00.000Z",
      },
    );
    await seed(`workspaces/${WORKSPACE_A}/appointments/appointment-a`, {
      workspaceId: WORKSPACE_A,
    });
    await seed(`workspaces/${WORKSPACE_A}/couponRedemptions/redemption-a`, {
      workspaceId: WORKSPACE_A,
    });
    const db = tenantADb();

    await assertSucceeds(
      getDocs(
        query(
          collection(db, "workspaces", WORKSPACE_A, "crmLeads"),
          where("workspaceId", "==", WORKSPACE_A),
          orderBy("lastInteraction", "desc"),
        ),
      ),
    );
    await assertSucceeds(
      getDocs(
        query(
          collection(db, "workspaces", WORKSPACE_A, "conversations"),
          where("workspaceId", "==", WORKSPACE_A),
          orderBy("lastMessageAt", "desc"),
        ),
      ),
    );
    await assertSucceeds(
      getDocs(
        query(
          collection(
            db,
            "workspaces",
            WORKSPACE_A,
            "conversations",
            "conversation-a",
            "messages",
          ),
          orderBy("createdAt", "asc"),
        ),
      ),
    );
    await assertSucceeds(
      getDocs(
        query(
          collection(db, "workspaces", WORKSPACE_A, "appointments"),
          where("workspaceId", "==", WORKSPACE_A),
        ),
      ),
    );
    await assertSucceeds(
      getDocs(
        query(
          collection(db, "workspaces", WORKSPACE_A, "couponRedemptions"),
          where("workspaceId", "==", WORKSPACE_A),
        ),
      ),
    );
  });

  test("messages and CRM events require correctly owned parents", async () => {
    await seed(`workspaces/${WORKSPACE_A}/conversations/misplaced`, {
      workspaceId: WORKSPACE_B,
    });
    await seed(
      `workspaces/${WORKSPACE_A}/conversations/misplaced/messages/message-a`,
      { sender: "customer", text: "misplaced" },
    );
    await seed(`workspaces/${WORKSPACE_A}/crmLeads/misplaced`, {
      workspaceId: WORKSPACE_B,
    });
    await seed(
      `workspaces/${WORKSPACE_A}/crmLeads/misplaced/events/event-a`,
      { workspaceId: WORKSPACE_B, type: "misplaced" },
    );
    const db = tenantADb();

    await assertFails(
      getDoc(
        doc(
          db,
          "workspaces",
          WORKSPACE_A,
          "conversations",
          "misplaced",
          "messages",
          "message-a",
        ),
      ),
    );
    await assertFails(
      getDoc(
        doc(
          db,
          "workspaces",
          WORKSPACE_A,
          "crmLeads",
          "misplaced",
          "events",
          "event-a",
        ),
      ),
    );
  });

  test("tenant can read own server reporting records, never Tenant B records", async () => {
    await seed(`workspaces/${WORKSPACE_A}/usage/usage-a`, {
      workspaceId: WORKSPACE_A,
      amount: 1,
    });
    await seed(`workspaces/${WORKSPACE_B}/usage/usage-b`, {
      workspaceId: WORKSPACE_B,
      amount: 1,
    });
    await seed(
      `workspaces/${WORKSPACE_A}/couponRedemptions/redemption-a`,
      { workspaceId: WORKSPACE_A, couponId: "coupon-a" },
    );
    const db = tenantADb();

    await assertSucceeds(
      getDoc(doc(db, "workspaces", WORKSPACE_A, "usage", "usage-a")),
    );
    await assertFails(
      getDoc(doc(db, "workspaces", WORKSPACE_B, "usage", "usage-b")),
    );
    await assertSucceeds(
      getDoc(
        doc(
          db,
          "workspaces",
          WORKSPACE_A,
          "couponRedemptions",
          "redemption-a",
        ),
      ),
    );
  });

  test("shared AI memory is browser-denied", async () => {
    await seed(`workspaces/${WORKSPACE_A}/shared_memory/session-a`, {
      workspaceId: WORKSPACE_A,
      messages: [],
    });

    await assertFails(
      getDoc(
        doc(
          tenantADb(),
          "workspaces",
          WORKSPACE_A,
          "shared_memory",
          "session-a",
        ),
      ),
    );
  });

  test("every known legacy credential makes workspace documents browser-inaccessible", async () => {
    const secretFields = [
      "googleSheetsAccessToken",
      "telegramBotToken",
      "externalCrmWebhookUrl",
      "whatsappAccessToken",
      "whatsappVerifyToken",
      "facebookPageAccessToken",
      "facebookVerifyToken",
      "password",
      "passwordHash",
      "apiKey",
      "encryptedSecret",
      "encryptedPayload",
      "ciphertext",
      "iv",
      "authTag",
    ];

    for (const [index, secretField] of secretFields.entries()) {
      const workspaceId = `workspace-with-legacy-secret-${index}`;
      await seed(`workspaces/${workspaceId}`, {
        id: workspaceId,
        ownerUid: TENANT_A_OWNER,
        ownerEmail: "owner-a@example.test",
        [secretField]: "legacy-secret-placeholder",
      });

      await assertFails(getDoc(doc(tenantADb(), "workspaces", workspaceId)));
      await assertFails(getDoc(doc(superDb(), "workspaces", workspaceId)));
    }
  });

  test("super admin browser cannot access workspace secrets", async () => {
    await seed(`workspaceSecrets/${WORKSPACE_A}/secrets/api`, {
      encrypted: "emulator-test-placeholder",
    });

    await assertFails(
      getDoc(
        doc(
          superDb(),
          "workspaceSecrets",
          WORKSPACE_A,
          "secrets",
          "api",
        ),
      ),
    );
  });
});
