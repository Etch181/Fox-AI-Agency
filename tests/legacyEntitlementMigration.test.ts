import assert from "node:assert/strict";
import test from "node:test";

import {
  migrateLegacyWorkspaceEntitlement,
  type LegacyEntitlementMigrationAdapter,
} from "../src/services/legacyEntitlementMigration.ts";

const legacyWorkspace = {
  id: "workspace-a",
  status: "active",
  subscriptionExpiresAt: "2026-09-30",
};

function createAdapter(workspace: Record<string, any> | null) {
  const writes: Date[] = [];
  const adapter: LegacyEntitlementMigrationAdapter = {
    async loadWorkspace() {
      return workspace;
    },
    async writeEntitlement(_workspaceId, expiry) {
      writes.push(expiry);
      if (workspace) {
        workspace.entitlementExpiresAt = { toMillis: () => expiry.getTime() };
      }
    },
  };
  return { adapter, writes };
}

test("legacy subscription expiry migrates once to authoritative entitlement", async () => {
  const { adapter, writes } = createAdapter({ ...legacyWorkspace });

  const first = await migrateLegacyWorkspaceEntitlement("workspace-a", adapter);
  const second = await migrateLegacyWorkspaceEntitlement("workspace-a", adapter);

  assert.equal(first.status, "migrated");
  assert.equal(second.status, "already_authoritative");
  assert.equal(writes.length, 1);
  assert.equal(writes[0].toISOString(), "2026-09-30T23:59:59.999Z");
});

test("invalid legacy expiry fails closed without writing", async () => {
  const { adapter, writes } = createAdapter({
    ...legacyWorkspace,
    subscriptionExpiresAt: "not-a-date",
  });

  await assert.rejects(
    migrateLegacyWorkspaceEntitlement("workspace-a", adapter),
    /valid legacy subscription expiry/i,
  );
  assert.equal(writes.length, 0);
});
