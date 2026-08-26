import assert from "node:assert/strict";
import test from "node:test";

import {
  submitPayment,
  type PaymentSubmissionDependencies,
  type PaymentSubmissionTransaction,
} from "../src/services/paymentSubmissionService.ts";

function createStore() {
  const documents = new Map<string, any>([
    ["workspaces/workspace-a", { id: "workspace-a", name: "A" }],
    ["plans/business", { id: "business", priceEGP: 1000 }],
  ]);
  let queue = Promise.resolve();
  let paymentCounter = 0;

  const dependencies: PaymentSubmissionDependencies = {
    now: () => new Date("2026-08-26T20:00:00.000Z"),
    nextPaymentId: () => `payment-${++paymentCounter}`,
    referenceId: (normalized) => `ref-${normalized}`,
    async runTransaction(operation) {
      const previous = queue;
      let release!: () => void;
      queue = new Promise<void>((resolve) => { release = resolve; });
      await previous;
      const staged = new Map(documents);
      const transaction: PaymentSubmissionTransaction = {
        async get(path) { return staged.get(path) || null; },
        create(path, data) {
          if (staged.has(path)) throw new Error("DOCUMENT_EXISTS");
          staged.set(path, { ...data });
        },
      };
      try {
        const result = await operation(transaction);
        documents.clear();
        for (const entry of staged) documents.set(...entry);
        return result;
      } finally {
        release();
      }
    },
  };

  return { documents, dependencies };
}

const request = {
  workspaceId: "workspace-a",
  paymentType: "plan" as const,
  planId: "business",
  transactionRef: "  abc 123 ",
  screenshotUrl: "https://proof.example.test/payment.png",
};

test("trusted payment submission claims normalized reference and authoritative price", async () => {
  const { documents, dependencies } = createStore();
  const result = await submitPayment(request, dependencies);

  assert.equal(result.payment.amountEGP, 1000);
  assert.equal(result.payment.transactionRef, "ABC123");
  assert.equal(result.payment.status, "pending");
  assert.equal(documents.has("paymentReferences/ref-ABC123"), true);
});

test("concurrent duplicate references create only one pending payment", async () => {
  const { documents, dependencies } = createStore();
  const results = await Promise.allSettled([
    submitPayment(request, dependencies),
    submitPayment({ ...request, transactionRef: "ABC123" }, dependencies),
  ]);

  assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(
    [...documents.keys()].filter((path) => path.startsWith("payments/")).length,
    1,
  );
});

test("submission rejects invalid proof URLs", async () => {
  const { dependencies } = createStore();
  await assert.rejects(
    submitPayment({ ...request, screenshotUrl: "javascript:alert(1)" }, dependencies),
    /proof url/i,
  );
});
