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
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

const PROJECT_ID = process.env.FOX_RULES_PROJECT_ID || "demo-fox-rules";
const WORKSPACE_A = "workspace-a";
const WORKSPACE_B = "workspace-b";
const TENANT_A_OWNER = "tenant-a-owner";
const TENANT_A_MEMBER = "tenant-a-member";
const TENANT_B_OWNER = "tenant-b-owner";
const SUPER_ADMIN = "super-admin";

const TENANT_ROOT_COLLECTIONS = [
  "crmLeads",
  "appointments",
  "menuItems",
  "medicines",
  "products",
  "productOrders",
  "complaints",
  "knowledgeFacts",
  "coupons",
  "supportTickets",
  "serviceRatings",
  "courses",
  "doctors",
  "clinicServices",
  "n8nWorkflows",
  "marketing_generated_posts",
] as const;

let testEnv: RulesTestEnvironment;

function firestoreHost() {
  const configured = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
  const separator = configured.lastIndexOf(":");

  return {
    host: configured.slice(0, separator),
    port: Number(configured.slice(separator + 1)),
  };
}

async function seedBaseData() {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await Promise.all([
      setDoc(doc(db, "users", TENANT_A_OWNER), {
        name: "Tenant A Owner",
        role: "client_owner",
        workspaceId: WORKSPACE_A,
      }),
      setDoc(doc(db, "users", TENANT_A_MEMBER), {
        name: "Tenant A Member",
        role: "client_member",
        workspaceId: WORKSPACE_A,
      }),
      setDoc(doc(db, "users", TENANT_B_OWNER), {
        name: "Tenant B Owner",
        role: "client_owner",
        workspaceId: WORKSPACE_B,
      }),
      setDoc(doc(db, "users", SUPER_ADMIN), {
        name: "Super Admin",
        role: "super_admin",
      }),
      setDoc(doc(db, "workspaces", WORKSPACE_A), {
        ownerUid: TENANT_A_OWNER,
        ownerEmail: "owner-a@example.test",
        name: "Workspace A",
        planId: "business",
        status: "active",
      }),
      setDoc(doc(db, "workspaces", WORKSPACE_B), {
        ownerUid: TENANT_B_OWNER,
        ownerEmail: "owner-b@example.test",
        name: "Workspace B",
        planId: "business",
        status: "active",
      }),
    ]);
  });
}

async function seedDocument(path: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), path), data);
  });
}

function tenantAOwnerDb() {
  return testEnv.authenticatedContext(TENANT_A_OWNER, {
    email: "owner-a@example.test",
  }).firestore();
}

function tenantAMemberDb() {
  return testEnv.authenticatedContext(TENANT_A_MEMBER, {
    email: "member-a@example.test",
  }).firestore();
}

function tenantBOwnerDb() {
  return testEnv.authenticatedContext(TENANT_B_OWNER, {
    email: "owner-b@example.test",
  }).firestore();
}

function superAdminDb() {
  return testEnv.authenticatedContext(SUPER_ADMIN, {
    email: "admin@example.test",
  }).firestore();
}

function unauthenticatedDb() {
  return testEnv.unauthenticatedContext().firestore();
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
  await seedBaseData();
});

after(async () => {
  await testEnv.cleanup();
});

describe("top-level tenant-owned collections", () => {
  for (const collectionName of TENANT_ROOT_COLLECTIONS) {
    test(`${collectionName}: Tenant A can read its own document`, async () => {
      await seedDocument(`${collectionName}/a-record`, {
        workspaceId: WORKSPACE_A,
        name: "Tenant A record",
      });

      await assertSucceeds(
        getDoc(doc(tenantAOwnerDb(), collectionName, "a-record")),
      );
    });

    test(`${collectionName}: Tenant A cannot read Tenant B's document`, async () => {
      await seedDocument(`${collectionName}/b-record`, {
        workspaceId: WORKSPACE_B,
        name: "Tenant B record",
      });

      await assertFails(
        getDoc(doc(tenantAOwnerDb(), collectionName, "b-record")),
      );
    });

    test(`${collectionName}: Tenant A can create only for Tenant A`, async () => {
      const db = tenantAOwnerDb();

      await assertSucceeds(
        setDoc(doc(db, collectionName, "valid-create"), {
          workspaceId: WORKSPACE_A,
          name: "Valid Tenant A record",
        }),
      );

      await assertFails(
        setDoc(doc(db, collectionName, "forged-create"), {
          workspaceId: WORKSPACE_B,
          name: "Forged Tenant B record",
        }),
      );
    });

    test(`${collectionName}: workspaceId is immutable on update`, async () => {
      await seedDocument(`${collectionName}/immutable-record`, {
        workspaceId: WORKSPACE_A,
        name: "Original",
      });

      await assertFails(
        updateDoc(doc(tenantAOwnerDb(), collectionName, "immutable-record"), {
          workspaceId: WORKSPACE_B,
        }),
      );
    });

    test(`${collectionName}: Tenant A cannot delete Tenant B's document`, async () => {
      await seedDocument(`${collectionName}/b-delete`, {
        workspaceId: WORKSPACE_B,
        name: "Tenant B record",
      });

      await assertFails(
        deleteDoc(doc(tenantAOwnerDb(), collectionName, "b-delete")),
      );
    });

    test(`${collectionName}: unauthenticated access fails`, async () => {
      await seedDocument(`${collectionName}/protected-record`, {
        workspaceId: WORKSPACE_A,
        name: "Protected",
      });

      await assertFails(
        getDoc(doc(unauthenticatedDb(), collectionName, "protected-record")),
      );
    });
  }

  test("Tenant A can query only its own scoped records", async () => {
    await seedDocument("crmLeads/query-a", {
      workspaceId: WORKSPACE_A,
      name: "A",
    });
    await seedDocument("crmLeads/query-b", {
      workspaceId: WORKSPACE_B,
      name: "B",
    });

    const scopedQuery = query(
      collection(tenantAOwnerDb(), "crmLeads"),
      where("workspaceId", "==", WORKSPACE_A),
    );
    const snapshot = await assertSucceeds(getDocs(scopedQuery));

    assert.equal(snapshot.size, 1);
    assert.equal(snapshot.docs[0]?.data().workspaceId, WORKSPACE_A);
  });

  test("Tenant A cannot run an unscoped cross-tenant query", async () => {
    await seedDocument("crmLeads/query-a", {
      workspaceId: WORKSPACE_A,
      name: "A",
    });
    await seedDocument("crmLeads/query-b", {
      workspaceId: WORKSPACE_B,
      name: "B",
    });

    await assertFails(getDocs(collection(tenantAOwnerDb(), "crmLeads")));
  });
});

describe("user profile privilege boundaries", () => {
  test("normal user cannot elevate its own role", async () => {
    await assertFails(
      updateDoc(doc(tenantAOwnerDb(), "users", TENANT_A_OWNER), {
        role: "super_admin",
      }),
    );
  });

  test("normal user cannot change its own workspaceId", async () => {
    await assertFails(
      updateDoc(doc(tenantAOwnerDb(), "users", TENANT_A_OWNER), {
        workspaceId: WORKSPACE_B,
      }),
    );
  });

  test("normal user can update a non-privileged profile field", async () => {
    await assertSucceeds(
      updateDoc(doc(tenantAOwnerDb(), "users", TENANT_A_OWNER), {
        name: "Updated Tenant A Owner",
      }),
    );
  });
});

describe("audit_logs", () => {
  const validAuditLog = {
    id: "audit-super",
    timestamp: serverTimestamp(),
    actorUid: SUPER_ADMIN,
    actorName: "Super Admin",
    actorEmail: "admin@example.test",
    actorRole: "super_admin",
    action: "security_review",
    category: "security",
    severity: "info",
    target: "firestore.rules",
    details: "Local emulator security review",
  };

  test("super admin can create a well-formed audit record", async () => {
    await assertSucceeds(
      setDoc(doc(superAdminDb(), "audit_logs", validAuditLog.id), validAuditLog),
    );
  });

  test("tenant user cannot forge a cross-tenant audit record", async () => {
    await assertFails(
      setDoc(doc(tenantAOwnerDb(), "audit_logs", "forged-audit"), {
        ...validAuditLog,
        id: "forged-audit",
        actorUid: TENANT_A_OWNER,
        actorRole: "client_owner",
        workspaceId: WORKSPACE_B,
      }),
    );
  });

  test("client cannot update an audit record", async () => {
    await seedDocument("audit_logs/existing-audit", {
      ...validAuditLog,
      id: "existing-audit",
    });

    await assertFails(
      updateDoc(doc(tenantAOwnerDb(), "audit_logs", "existing-audit"), {
        details: "tampered",
      }),
    );
  });

  test("client cannot delete an audit record", async () => {
    await seedDocument("audit_logs/existing-audit", {
      ...validAuditLog,
      id: "existing-audit",
    });

    await assertFails(
      deleteDoc(doc(tenantAOwnerDb(), "audit_logs", "existing-audit")),
    );
  });

  test("even super admin cannot update or delete immutable audit records", async () => {
    await seedDocument("audit_logs/immutable-audit", {
      ...validAuditLog,
      id: "immutable-audit",
    });

    await assertFails(
      updateDoc(doc(superAdminDb(), "audit_logs", "immutable-audit"), {
        details: "changed",
      }),
    );
    await assertFails(
      deleteDoc(doc(superAdminDb(), "audit_logs", "immutable-audit")),
    );
  });

  test("only super admin can read audit records", async () => {
    await seedDocument("audit_logs/readable-audit", {
      ...validAuditLog,
      id: "readable-audit",
    });

    await assertSucceeds(
      getDoc(doc(superAdminDb(), "audit_logs", "readable-audit")),
    );
    await assertFails(
      getDoc(doc(tenantAOwnerDb(), "audit_logs", "readable-audit")),
    );
  });
});

describe("gemini_metrics", () => {
  const metricA = {
    workspaceId: WORKSPACE_A,
    workspaceName: "Workspace A",
    totalCalls: 10,
    successfulCalls: 9,
    errorCalls: 1,
  };

  beforeEach(async () => {
    await seedDocument(`gemini_metrics/${WORKSPACE_A}`, metricA);
    await seedDocument(`gemini_metrics/${WORKSPACE_B}`, {
      ...metricA,
      workspaceId: WORKSPACE_B,
      workspaceName: "Workspace B",
    });
  });

  test("tenant can read only its own metric", async () => {
    await assertSucceeds(
      getDoc(doc(tenantAOwnerDb(), "gemini_metrics", WORKSPACE_A)),
    );
    await assertFails(
      getDoc(doc(tenantAOwnerDb(), "gemini_metrics", WORKSPACE_B)),
    );
  });

  test("tenant cannot manipulate metrics", async () => {
    const db = tenantAOwnerDb();

    await assertFails(
      setDoc(doc(db, "gemini_metrics", "tenant-created"), {
        ...metricA,
        totalCalls: 999999,
      }),
    );
    await assertFails(
      updateDoc(doc(db, "gemini_metrics", WORKSPACE_A), {
        totalCalls: 999999,
      }),
    );
    await assertFails(
      deleteDoc(doc(db, "gemini_metrics", WORKSPACE_A)),
    );
  });

  test("super admin can read global metrics", async () => {
    await assertSucceeds(
      getDoc(doc(superAdminDb(), "gemini_metrics", WORKSPACE_A)),
    );
    await assertSucceeds(
      getDoc(doc(superAdminDb(), "gemini_metrics", WORKSPACE_B)),
    );
  });

  test("super admin can create and update a workspace metric without moving it", async () => {
    const db = superAdminDb();

    await assertSucceeds(
      setDoc(doc(db, "gemini_metrics", "workspace-new"), {
        ...metricA,
        workspaceId: "workspace-new",
        workspaceName: "Workspace New",
      }),
    );
    await assertSucceeds(
      updateDoc(doc(db, "gemini_metrics", WORKSPACE_A), {
        totalCalls: 11,
      }),
    );
    await assertFails(
      updateDoc(doc(db, "gemini_metrics", WORKSPACE_A), {
        workspaceId: WORKSPACE_B,
      }),
    );
  });

  test("super admin cannot delete authoritative metrics", async () => {
    await assertFails(
      deleteDoc(doc(superAdminDb(), "gemini_metrics", WORKSPACE_A)),
    );
  });
});

describe("explicit workspace nested collections", () => {
  test("Tenant A member can read and create a valid Tenant A CRM lead", async () => {
    await seedDocument(`workspaces/${WORKSPACE_A}/crmLeads/lead-a`, {
      workspaceId: WORKSPACE_A,
      name: "Lead A",
    });
    const db = tenantAMemberDb();

    await assertSucceeds(
      getDoc(doc(db, "workspaces", WORKSPACE_A, "crmLeads", "lead-a")),
    );
    await assertSucceeds(
      setDoc(doc(db, "workspaces", WORKSPACE_A, "crmLeads", "lead-new"), {
        workspaceId: WORKSPACE_A,
        name: "Lead New",
      }),
    );
  });

  test("Tenant A cannot access Tenant B nested CRM records", async () => {
    await seedDocument(`workspaces/${WORKSPACE_B}/crmLeads/lead-b`, {
      workspaceId: WORKSPACE_B,
      name: "Lead B",
    });

    await assertFails(
      getDoc(
        doc(
          tenantAOwnerDb(),
          "workspaces",
          WORKSPACE_B,
          "crmLeads",
          "lead-b",
        ),
      ),
    );
    await assertFails(
      deleteDoc(
        doc(
          tenantAOwnerDb(),
          "workspaces",
          WORKSPACE_B,
          "crmLeads",
          "lead-b",
        ),
      ),
    );
  });

  test("nested tenant ownership cannot be forged or moved", async () => {
    await seedDocument(`workspaces/${WORKSPACE_A}/crmLeads/immutable-lead`, {
      workspaceId: WORKSPACE_A,
      name: "Immutable Lead",
    });
    const db = tenantAOwnerDb();

    await assertFails(
      setDoc(doc(db, "workspaces", WORKSPACE_A, "crmLeads", "forged-lead"), {
        workspaceId: WORKSPACE_B,
        name: "Forged Lead",
      }),
    );
    await assertFails(
      updateDoc(
        doc(db, "workspaces", WORKSPACE_A, "crmLeads", "immutable-lead"),
        { workspaceId: WORKSPACE_B },
      ),
    );
  });

  test("Tenant A can read its conversations and messages", async () => {
    await seedDocument(`workspaces/${WORKSPACE_A}/conversations/conversation-a`, {
      workspaceId: WORKSPACE_A,
      unreadCount: 1,
    });
    await seedDocument(
      `workspaces/${WORKSPACE_A}/conversations/conversation-a/messages/message-a`,
      { sender: "customer", text: "Hello" },
    );
    const db = tenantAOwnerDb();

    await assertSucceeds(
      getDoc(
        doc(
          db,
          "workspaces",
          WORKSPACE_A,
          "conversations",
          "conversation-a",
        ),
      ),
    );
    await assertSucceeds(
      getDoc(
        doc(
          db,
          "workspaces",
          WORKSPACE_A,
          "conversations",
          "conversation-a",
          "messages",
          "message-a",
        ),
      ),
    );
  });

  test("conversation client update is limited to read-state fields", async () => {
    await seedDocument(`workspaces/${WORKSPACE_A}/conversations/conversation-a`, {
      workspaceId: WORKSPACE_A,
      unreadCount: 2,
      status: "open",
    });
    const ref = doc(
      tenantAOwnerDb(),
      "workspaces",
      WORKSPACE_A,
      "conversations",
      "conversation-a",
    );

    await assertSucceeds(
      updateDoc(ref, {
        unreadCount: 0,
        updatedAt: "2026-08-26T17:00:00.000Z",
      }),
    );
    await assertFails(updateDoc(ref, { status: "resolved" }));
    await assertFails(updateDoc(ref, { workspaceId: WORKSPACE_B }));
  });

  test("clients cannot write server-owned messages, usage, or CRM events", async () => {
    const db = tenantAOwnerDb();

    await assertFails(
      setDoc(
        doc(
          db,
          "workspaces",
          WORKSPACE_A,
          "conversations",
          "conversation-a",
          "messages",
          "message-new",
        ),
        { sender: "human", text: "Injected" },
      ),
    );
    await assertFails(
      setDoc(doc(db, "workspaces", WORKSPACE_A, "usage", "usage-new"), {
        workspaceId: WORKSPACE_A,
        amount: 999,
      }),
    );
    await assertFails(
      setDoc(
        doc(
          db,
          "workspaces",
          WORKSPACE_A,
          "crmLeads",
          "lead-a",
          "events",
          "event-new",
        ),
        { workspaceId: WORKSPACE_A, type: "forged" },
      ),
    );
  });

  test("unknown future nested collections default to deny", async () => {
    await seedDocument(`workspaces/${WORKSPACE_A}/futureCollection/document-a`, {
      workspaceId: WORKSPACE_A,
      value: "future",
    });
    const db = tenantAOwnerDb();

    await assertFails(
      getDoc(
        doc(
          db,
          "workspaces",
          WORKSPACE_A,
          "futureCollection",
          "document-a",
        ),
      ),
    );
    await assertFails(
      setDoc(
        doc(
          db,
          "workspaces",
          WORKSPACE_A,
          "futureCollection",
          "document-new",
        ),
        { workspaceId: WORKSPACE_A },
      ),
    );
  });

  test("super admin nested access works only for explicitly known collections", async () => {
    await seedDocument(`workspaces/${WORKSPACE_B}/crmLeads/lead-b`, {
      workspaceId: WORKSPACE_B,
      name: "Lead B",
    });
    await seedDocument(`workspaces/${WORKSPACE_B}/unknown/data-b`, {
      workspaceId: WORKSPACE_B,
    });
    const db = superAdminDb();

    await assertSucceeds(
      getDoc(doc(db, "workspaces", WORKSPACE_B, "crmLeads", "lead-b")),
    );
    await assertFails(
      getDoc(doc(db, "workspaces", WORKSPACE_B, "unknown", "data-b")),
    );
  });
});

describe("workspaceSecrets", () => {
  test("client cannot read or write workspace secret documents", async () => {
    await seedDocument(`workspaceSecrets/${WORKSPACE_A}`, {
      workspaceId: WORKSPACE_A,
      metadataOnly: true,
    });
    const db = tenantAOwnerDb();

    await assertFails(getDoc(doc(db, "workspaceSecrets", WORKSPACE_A)));
    await assertFails(
      setDoc(doc(db, "workspaceSecrets", WORKSPACE_A), {
        workspaceId: WORKSPACE_A,
      }),
    );
  });

  test("client cannot read or write descendant secret paths", async () => {
    await seedDocument(`workspaceSecrets/${WORKSPACE_A}/secrets/api`, {
      encrypted: "emulator-test-placeholder",
    });
    const db = tenantAOwnerDb();

    await assertFails(
      getDoc(
        doc(db, "workspaceSecrets", WORKSPACE_A, "secrets", "api"),
      ),
    );
    await assertFails(
      setDoc(
        doc(db, "workspaceSecrets", WORKSPACE_A, "secrets", "new-secret"),
        { encrypted: "emulator-test-placeholder" },
      ),
    );
  });
});
