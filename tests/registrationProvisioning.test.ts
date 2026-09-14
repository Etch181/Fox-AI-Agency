import assert from "node:assert/strict";
import test from "node:test";

import {
  RegistrationCoordinator,
  rollbackCreatedAuthIdentity,
  shouldRollbackRegistration,
} from "../src/security/registrationProvisioning.ts";
import {
  registrationClaimId,
  normalizeRegistrationEmail,
  normalizeRegistrationPhone,
} from "../src/security/registrationClaims.ts";

test("registration claims normalize equivalent email and phone identities", () => {
  assert.equal(
    normalizeRegistrationEmail(" Owner+Trial@Example.COM "),
    "owner+trial@example.com",
  );
  assert.equal(normalizeRegistrationPhone("+20 (100) 123-4567"), "201001234567");
  assert.equal(
    registrationClaimId("phone", "+20 (100) 123-4567"),
    registrationClaimId("phone", "201001234567"),
  );
  assert.equal(
    registrationClaimId("phone", "0100 123 4567"),
    registrationClaimId("phone", "+20 100 123 4567"),
  );
});

test("registration claims reject unusable trial identities", () => {
  assert.throws(() => normalizeRegistrationEmail("invalid"));
  assert.throws(() => normalizeRegistrationPhone("123"));
});

test("auth hydration waits for the exact provisioning UID to be bound and committed", async () => {
  const coordinator = new RegistrationCoordinator();
  const operation = coordinator.begin("owner@example.test");
  assert.ok(operation);

  let resolved = false;
  const matchPromise = coordinator
    .waitForAuthOperation("uid-a", "owner@example.test")
    .then((match) => {
      resolved = true;
      return match;
    });

  await Promise.resolve();
  assert.equal(resolved, false);

  coordinator.bindUid(operation, "uid-a");
  assert.equal(await matchPromise, operation);

  let profileReady = false;
  const profilePromise = operation.profileReady.then(() => {
    profileReady = true;
  });
  await Promise.resolve();
  assert.equal(profileReady, false);

  coordinator.settle(operation, "committed");
  await profilePromise;
  assert.equal(operation.outcome, "committed");
});

test("an unrelated authenticated identity never adopts another registration operation", async () => {
  const coordinator = new RegistrationCoordinator();
  const operation = coordinator.begin("a@example.test");
  assert.ok(operation);
  coordinator.bindUid(operation, "uid-a");

  assert.equal(
    await coordinator.waitForAuthOperation("uid-b", "b@example.test"),
    null,
  );
  assert.equal(
    await coordinator.waitForAuthOperation("uid-b", "a@example.test"),
    null,
  );
});

test("double registration is rejected until the first operation is finished", () => {
  const coordinator = new RegistrationCoordinator();
  const first = coordinator.begin("a@example.test");
  assert.ok(first);
  assert.equal(coordinator.begin("b@example.test"), null);

  coordinator.settle(first, "failed");
  assert.equal(coordinator.begin("b@example.test"), null);

  coordinator.finish(first);
  assert.ok(coordinator.begin("b@example.test"));
});

test("a stale operation cannot finish or clear a newer operation", () => {
  const coordinator = new RegistrationCoordinator();
  const first = coordinator.begin("a@example.test");
  assert.ok(first);
  coordinator.settle(first, "failed");
  coordinator.finish(first);

  const second = coordinator.begin("b@example.test");
  assert.ok(second);
  coordinator.finish(first);

  assert.equal(coordinator.isCurrent(second), true);
});

test("retry is allowed after a failed pre-commit operation is fully finished", () => {
  const coordinator = new RegistrationCoordinator();
  const first = coordinator.begin("owner@example.test");
  assert.ok(first);
  coordinator.bindUid(first, "uid-a");
  coordinator.settle(first, "failed");
  coordinator.finish(first);

  const retry = coordinator.begin("owner@example.test");
  assert.ok(retry);
  assert.notEqual(retry.id, first.id);
});

test("pre-commit rollback does nothing when a newer identity is already current", async () => {
  let deletes = 0;
  let signOuts = 0;

  const result = await rollbackCreatedAuthIdentity({
    createdUser: { uid: "uid-a" },
    createdUid: "uid-a",
    getCurrentUid: () => "uid-b",
    deleteCreatedUser: async () => {
      deletes += 1;
    },
    signOutCurrentIdentity: async () => {
      signOuts += 1;
    },
  });

  assert.equal(result, "stale_identity");
  assert.equal(deletes, 0);
  assert.equal(signOuts, 0);
});

test("late delete failure from registration A cannot sign out successful login B", async () => {
  let currentUid = "uid-a";
  let signOuts = 0;

  const result = await rollbackCreatedAuthIdentity({
    createdUser: { uid: "uid-a" },
    createdUid: "uid-a",
    getCurrentUid: () => currentUid,
    deleteCreatedUser: async () => {
      currentUid = "uid-b";
      throw new Error("late delete failure");
    },
    signOutCurrentIdentity: async () => {
      signOuts += 1;
    },
  });

  assert.equal(result, "stale_identity");
  assert.equal(signOuts, 0);
  assert.equal(currentUid, "uid-b");
});

test("pre-commit delete failure signs out only while the created identity is still current", async () => {
  let signOuts = 0;

  const result = await rollbackCreatedAuthIdentity({
    createdUser: { uid: "uid-a" },
    createdUid: "uid-a",
    getCurrentUid: () => "uid-a",
    deleteCreatedUser: async () => {
      throw new Error("delete failed");
    },
    signOutCurrentIdentity: async () => {
      signOuts += 1;
    },
  });

  assert.equal(result, "signed_out");
  assert.equal(signOuts, 1);
});

test("successful pre-commit rollback deletes only the captured created user", async () => {
  const deleted: string[] = [];
  const createdUser = { uid: "uid-a" };

  const result = await rollbackCreatedAuthIdentity({
    createdUser,
    createdUid: "uid-a",
    getCurrentUid: () => "uid-a",
    deleteCreatedUser: async (user) => {
      deleted.push(user.uid);
    },
    signOutCurrentIdentity: async () => {
      throw new Error("must not sign out after delete succeeds");
    },
  });

  assert.equal(result, "deleted");
  assert.deepEqual(deleted, ["uid-a"]);
});

test("post-commit interruption is recoverable and never enters destructive rollback", () => {
  assert.equal(shouldRollbackRegistration("pending"), true);
  assert.equal(shouldRollbackRegistration("failed"), true);
  assert.equal(shouldRollbackRegistration("committed"), false);
});

test("ambiguous commit transport failure remains recoverable instead of deleting Auth", () => {
  assert.equal(
    shouldRollbackRegistration("failed", {
      commitAttempted: true,
      failureCode: "unavailable",
    }),
    false,
  );
  assert.equal(
    shouldRollbackRegistration("failed", {
      commitAttempted: true,
      failureCode: "deadline-exceeded",
    }),
    false,
  );
});

test("definitive pre-commit rejection still rolls back the newly created Auth identity", () => {
  assert.equal(
    shouldRollbackRegistration("failed", {
      commitAttempted: false,
    }),
    true,
  );
  assert.equal(
    shouldRollbackRegistration("failed", {
      commitAttempted: true,
      failureCode: "permission-denied",
    }),
    true,
  );
  assert.equal(
    shouldRollbackRegistration("failed", {
      commitAttempted: true,
      failureCode: "REGISTRATION_TRIAL_ALREADY_CLAIMED",
    }),
    true,
  );
});

test("component unmount and identity changes prevent stale UI mutation", () => {
  const coordinator = new RegistrationCoordinator();
  const operation = coordinator.begin("owner@example.test");
  assert.ok(operation);
  coordinator.bindUid(operation, "uid-a");
  coordinator.settle(operation, "committed");

  assert.equal(coordinator.canApplyUi(operation, false, "uid-a"), false);
  assert.equal(coordinator.canApplyUi(operation, true, "uid-b"), false);
  assert.equal(coordinator.canApplyUi(operation, true, "uid-a"), true);
});
