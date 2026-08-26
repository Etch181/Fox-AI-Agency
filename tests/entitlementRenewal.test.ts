import assert from "node:assert/strict";
import test from "node:test";

import { calculateEntitlementRenewal } from "../src/utils/entitlementRenewal.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

test("renewal extends from an unexpired authoritative entitlement", () => {
  const now = Date.parse("2026-08-26T12:00:00Z");
  const existing = { toMillis: () => now + 10 * DAY_MS };

  assert.equal(
    calculateEntitlementRenewal(existing, now).getTime(),
    now + 40 * DAY_MS,
  );
});

test("renewal starts from now when authoritative entitlement is absent", () => {
  const now = Date.parse("2026-08-26T12:00:00Z");

  assert.equal(
    calculateEntitlementRenewal(undefined, now).getTime(),
    now + 30 * DAY_MS,
  );
});
