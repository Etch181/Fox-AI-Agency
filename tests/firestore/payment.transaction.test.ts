import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { after, before, test } from "node:test";

import { cert, deleteApp, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import {
  transitionPayment,
  type PaymentTransitionDependencies,
} from "../../src/services/paymentTransitionService.ts";
import {
  submitPayment,
  type PaymentSubmissionDependencies,
} from "../../src/services/paymentSubmissionService.ts";

const PROJECT_ID = process.env.FOX_RULES_PROJECT_ID || "demo-fox-rules";
const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const app = initializeApp(
  {
    projectId: PROJECT_ID,
    credential: cert({
      projectId: PROJECT_ID,
      clientEmail: "firestore-emulator@example.test",
      privateKey,
    }),
  },
  `payment-transactions-${process.pid}`,
);
const db = getFirestore(app);
let auditCounter = 0;

function dependencies(now: Date): PaymentTransitionDependencies {
  return {
    now: () => new Date(now),
    timestampFromDate: (date) => Timestamp.fromDate(date),
    nextAuditId: () => `payment-audit-${process.pid}-${++auditCounter}`,
    runTransaction: (operation) =>
      db.runTransaction(async (transaction) =>
        operation({
          async get(path) {
            const snapshot = await transaction.get(db.doc(path));
            return snapshot.exists
              ? { id: snapshot.id, ...snapshot.data() }
              : null;
          },
          update(path, updates) {
            transaction.update(db.doc(path), updates);
          },
          create(path, value) {
            transaction.create(db.doc(path), value);
          },
        }),
      ),
  };
}

const admin = {
  uid: "admin-a",
  email: "admin@example.test",
  name: "Admin A",
  role: "super_admin" as const,
};

before(async () => {
  await db.doc("plans/business").set({ id: "business", priceEGP: 1000 });
  await db.doc("plans/enterprise").set({ id: "enterprise", priceEGP: 2000 });
  await db.doc("workspaces/payment-workspace").set({
    id: "payment-workspace",
    ownerUid: "owner-a",
    planId: "starter",
    status: "active",
    entitlementExpiresAt: Timestamp.fromMillis(1_777_000_000_000),
    subscriptionExpiresAt: "2026-04-25",
    aiConversationsUsed: 5,
  });
});

after(async () => {
  await deleteApp(app);
});

test("real Firestore transaction permits only one concurrent approval", async () => {
  const paymentId = `payment-race-${process.pid}`;
  const now = new Date(1_776_000_000_000);
  await db.doc(`payments/${paymentId}`).set({
    id: paymentId,
    workspaceId: "payment-workspace",
    paymentType: "plan",
    planId: "business",
    status: "pending",
    amountEGP: 1000,
  });

  const results = await Promise.allSettled([
    transitionPayment(
      { paymentId, action: "approve" },
      admin,
      dependencies(now),
    ),
    transitionPayment(
      { paymentId, action: "approve" },
      admin,
      dependencies(now),
    ),
  ]);

  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const payment = (await db.doc(`payments/${paymentId}`).get()).data();
  const workspace = (await db.doc("workspaces/payment-workspace").get()).data();
  assert.equal(payment?.status, "approved");
  assert.equal(
    workspace?.entitlementExpiresAt.toMillis(),
    1_777_000_000_000 + 30 * 24 * 60 * 60 * 1000,
  );
});

test("real Firestore approve/reject race commits one terminal state", async () => {
  const paymentId = `payment-race-mixed-${process.pid}`;
  await db.doc(`payments/${paymentId}`).set({
    id: paymentId,
    workspaceId: "payment-workspace",
    paymentType: "plan",
    planId: "enterprise",
    status: "pending",
    amountEGP: 2000,
  });

  const results = await Promise.allSettled([
    transitionPayment(
      { paymentId, action: "approve" },
      admin,
      dependencies(new Date(1_778_000_000_000)),
    ),
    transitionPayment(
      { paymentId, action: "reject", reason: "Rejected" },
      admin,
      dependencies(new Date(1_778_000_000_000)),
    ),
  ]);

  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  const payment = (await db.doc(`payments/${paymentId}`).get()).data();
  assert.match(payment?.status, /approved|rejected/);
});

test("real Firestore transaction claims a payment reference once", async () => {
  let paymentId = 0;
  const submissionDependencies: PaymentSubmissionDependencies = {
    now: () => new Date("2026-08-26T20:00:00.000Z"),
    nextPaymentId: () => `real-submission-${++paymentId}`,
    referenceId: (reference) => `real-${reference}`,
    runTransaction: (operation) =>
      db.runTransaction(async (transaction) =>
        operation({
          async get(path) {
            const snapshot = await transaction.get(db.doc(path));
            return snapshot.exists ? snapshot.data() || null : null;
          },
          create(path, data) {
            transaction.create(db.doc(path), data);
          },
        }),
      ),
  };
  const submission = {
    workspaceId: "payment-workspace",
    paymentType: "plan" as const,
    planId: "business",
    transactionRef: "real reference 1",
    screenshotUrl: "https://proof.example.test/payment.png",
  };

  const results = await Promise.allSettled([
    submitPayment(submission, submissionDependencies),
    submitPayment(submission, submissionDependencies),
  ]);

  const fulfilled = results.filter((result) => result.status === "fulfilled");
  assert.equal(
    fulfilled.length,
    1,
    results
      .map((result) =>
        result.status === "rejected"
          ? String(result.reason?.stack || result.reason)
          : "fulfilled",
      )
      .join("\n---\n"),
  );
  const claim = await db.doc("paymentReferences/real-REALREFERENCE1").get();
  assert.equal(claim.exists, true);
});
