import assert from "node:assert/strict";
import test from "node:test";

import {
  transitionPayment,
  type PaymentTransitionDependencies,
  type PaymentTransitionTransaction,
} from "../src/services/paymentTransitionService.ts";

const NOW = Date.parse("2026-08-26T12:00:00Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function timestamp(milliseconds: number) {
  return { toMillis: () => milliseconds };
}

function cloneValue<T>(value: T): T {
  if (
    value &&
    typeof value === "object" &&
    typeof (value as any).toMillis === "function"
  ) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(cloneValue) as T;
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [key, cloneValue(nested)]),
    ) as T;
  }
  return value;
}

function createStore() {
  const documents = new Map<string, Record<string, any>>([
    ["payments/payment-a", {
      id: "payment-a",
      workspaceId: "workspace-a",
      paymentType: "plan",
      planId: "business",
      status: "pending",
      amountEGP: 1000,
    }],
    ["workspaces/workspace-a", {
      id: "workspace-a",
      ownerUid: "owner-a",
      planId: "starter",
      status: "active",
      entitlementExpiresAt: timestamp(NOW + 10 * DAY_MS),
      subscriptionExpiresAt: "2026-09-05",
      aiConversationsUsed: 7,
    }],
    ["plans/business", {
      id: "business",
      priceEGP: 1000,
    }],
  ]);
  let queue = Promise.resolve();
  let auditCounter = 0;

  const dependencies: PaymentTransitionDependencies = {
    now: () => new Date(NOW),
    timestampFromDate: (date) => timestamp(date.getTime()),
    nextAuditId: () => `audit-${++auditCounter}`,
    runTransaction(operation) {
      const result = queue.then(async () => {
        const staged = new Map(
          [...documents].map(([key, value]) => [key, cloneValue(value)]),
        );
        const transaction: PaymentTransitionTransaction = {
          async get(path) {
            const value = staged.get(path);
            return value ? cloneValue(value) : null;
          },
          update(path, updates) {
            const current = staged.get(path);
            if (!current) throw new Error(`missing ${path}`);
            staged.set(path, { ...current, ...cloneValue(updates) });
          },
          create(path, value) {
            if (staged.has(path)) throw new Error(`exists ${path}`);
            staged.set(path, cloneValue(value));
          },
        };
        const output = await operation(transaction);
        documents.clear();
        for (const [key, value] of staged) documents.set(key, value);
        return output;
      });
      queue = result.then(() => undefined, () => undefined);
      return result;
    },
  };

  return { documents, dependencies };
}

const admin = {
  uid: "admin-a",
  email: "admin@example.test",
  name: "Admin A",
  role: "super_admin" as const,
};

test("pending payment approves once from authoritative workspace entitlement", async () => {
  const { documents, dependencies } = createStore();

  const result = await transitionPayment(
    { paymentId: "payment-a", action: "approve" },
    admin,
    dependencies,
  );

  assert.equal(result.status, "approved");
  assert.equal(
    documents.get("workspaces/workspace-a")?.entitlementExpiresAt.toMillis(),
    NOW + 40 * DAY_MS,
  );
  assert.equal(documents.get("workspaces/workspace-a")?.planId, "business");
  assert.equal(documents.get("payments/payment-a")?.status, "approved");
});

test("pending payment rejects once", async () => {
  const { documents, dependencies } = createStore();

  const result = await transitionPayment(
    { paymentId: "payment-a", action: "reject", reason: "Invalid receipt" },
    admin,
    dependencies,
  );

  assert.equal(result.status, "rejected");
  assert.equal(documents.get("payments/payment-a")?.status, "rejected");
});

for (const [first, second] of [
  ["approve", "approve"],
  ["reject", "approve"],
  ["approve", "reject"],
] as const) {
  test(`${first} prevents a later ${second}`, async () => {
    const { dependencies } = createStore();
    await transitionPayment(
      {
        paymentId: "payment-a",
        action: first,
        reason: first === "reject" ? "Rejected" : undefined,
      },
      admin,
      dependencies,
    );

    await assert.rejects(
      transitionPayment(
        {
          paymentId: "payment-a",
          action: second,
          reason: second === "reject" ? "Rejected" : undefined,
        },
        admin,
        dependencies,
      ),
      /already processed/i,
    );
  });
}

test("stale browser entitlement input cannot affect renewal", async () => {
  const { documents, dependencies } = createStore();

  await transitionPayment(
    {
      paymentId: "payment-a",
      action: "approve",
      staleBrowserEntitlement: timestamp(NOW + 500 * DAY_MS),
    } as any,
    admin,
    dependencies,
  );

  assert.equal(
    documents.get("workspaces/workspace-a")?.entitlementExpiresAt.toMillis(),
    NOW + 40 * DAY_MS,
  );
});

test("tampered browser payment amount cannot activate a plan", async () => {
  const { documents, dependencies } = createStore();
  documents.get("payments/payment-a")!.amountEGP = 1;

  await assert.rejects(
    transitionPayment(
      { paymentId: "payment-a", action: "approve" },
      admin,
      dependencies,
    ),
    /amount/i,
  );
});

test("concurrent approvals renew entitlement only once", async () => {
  const { documents, dependencies } = createStore();
  const results = await Promise.allSettled([
    transitionPayment(
      { paymentId: "payment-a", action: "approve" },
      admin,
      dependencies,
    ),
    transitionPayment(
      { paymentId: "payment-a", action: "approve" },
      admin,
      dependencies,
    ),
  ]);

  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(
    documents.get("workspaces/workspace-a")?.entitlementExpiresAt.toMillis(),
    NOW + 40 * DAY_MS,
  );
});

test("approve/reject race produces exactly one final state", async () => {
  const { documents, dependencies } = createStore();
  const results = await Promise.allSettled([
    transitionPayment(
      { paymentId: "payment-a", action: "approve" },
      admin,
      dependencies,
    ),
    transitionPayment(
      { paymentId: "payment-a", action: "reject", reason: "Rejected" },
      admin,
      dependencies,
    ),
  ]);

  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.match(documents.get("payments/payment-a")?.status, /approved|rejected/);
});

test("non-super-admin actor cannot transition payments", async () => {
  const { dependencies } = createStore();

  await assert.rejects(
    transitionPayment(
      { paymentId: "payment-a", action: "approve" },
      { ...admin, role: "client_owner" as any },
      dependencies,
    ),
    /super admin/i,
  );
});
