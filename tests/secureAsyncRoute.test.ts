import assert from "node:assert/strict";
import test from "node:test";

import { secureAsyncRoute } from "../src/utils/secureAsyncRoute.ts";

test("rejected async handler reaches Express error middleware once", async () => {
  let nextError: unknown;
  let responseSent = false;
  const originalError = console.error;
  console.error = () => undefined;
  const route = secureAsyncRoute("integration", async () => {
    throw new Error("sensitive internal failure");
  });

  try {
    route(
      {} as never,
      {
        headersSent: false,
        status() {
          responseSent = true;
          return this;
        },
        json() {
          responseSent = true;
          return this;
        },
      } as never,
      ((error: unknown) => {
        nextError = error;
      }) as never,
    );
    await new Promise((resolve) => setImmediate(resolve));

    assert.equal(nextError instanceof Error, true);
    assert.equal((nextError as Error).message, "sensitive internal failure");
    assert.equal(responseSent, false);
  } finally {
    console.error = originalError;
  }
});

test("successful async handler remains unchanged and does not call next", async () => {
  let nextCalled = false;
  let body: unknown;
  const response = {
    json(value: unknown) {
      body = value;
      return this;
    },
  };
  const route = secureAsyncRoute("integration", async (_request, res) => {
    res.json({ success: true });
  });

  route(
    {} as never,
    response as never,
    (() => {
      nextCalled = true;
    }) as never,
  );
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(body, { success: true });
  assert.equal(nextCalled, false);
});
