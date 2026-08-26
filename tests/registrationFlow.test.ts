import assert from "node:assert/strict";
import test from "node:test";

import { completeRegistration } from "../src/utils/registrationFlow.ts";

interface TestWorkspace {
  id: string;
}

const workspace: TestWorkspace = { id: "workspace-1" };

test("success work waits for registration to resolve", async () => {
  let resolveRegistration!: (value: TestWorkspace | null) => void;
  const registration = new Promise<TestWorkspace | null>((resolve) => {
    resolveRegistration = resolve;
  });
  const events: string[] = [];

  const flow = completeRegistration(
    () => registration,
    (createdWorkspace) => {
      events.push(`success:${createdWorkspace.id}`);
    },
  );

  await Promise.resolve();
  assert.deepEqual(events, []);

  resolveRegistration(workspace);

  assert.equal(await flow, workspace);
  assert.deepEqual(events, ["success:workspace-1"]);
});

test("null registration skips success work", async () => {
  let successCalls = 0;

  const result = await completeRegistration(
    async () => null,
    () => {
      successCalls += 1;
    },
  );

  assert.equal(result, null);
  assert.equal(successCalls, 0);
});

test("registration rejection propagates and skips success work", async () => {
  const registrationError = new Error("registration failed");
  let successCalls = 0;

  await assert.rejects(
    completeRegistration(
      async () => {
        throw registrationError;
      },
      () => {
        successCalls += 1;
      },
    ),
    registrationError,
  );

  assert.equal(successCalls, 0);
});
