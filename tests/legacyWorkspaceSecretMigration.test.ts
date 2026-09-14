import assert from "node:assert/strict";
import test from "node:test";

import {
  migrateLegacyWorkspaceSecrets,
  type LegacySecretMigrationAdapter,
} from "../src/services/legacyWorkspaceSecretMigration.ts";

test("legacy secret migration is explicit, secret-safe, and idempotent", async () => {
  const workspace: Record<string, unknown> = {
    id: "workspace-a",
    telegramBotToken: "telegram-secret",
    googleSheetsAccessToken: "google-secret",
    externalCrmWebhookUrl: "https://hooks.example.test/private-path",
    name: "Workspace A",
  };
  const vault = new Map<string, string>();
  const writes: string[] = [];
  const cleanups: string[][] = [];

  const adapter: LegacySecretMigrationAdapter = {
    async loadWorkspace() {
      return { ...workspace };
    },
    async readSecret(_workspaceId, name) {
      return vault.get(name) || null;
    },
    async writeSecret(_workspaceId, name, value) {
      writes.push(name);
      vault.set(name, value);
    },
    async removeLegacyFields(_workspaceId, fields) {
      cleanups.push([...fields]);
      for (const field of fields) delete workspace[field];
    },
  };

  const first = await migrateLegacyWorkspaceSecrets("workspace-a", adapter);
  const second = await migrateLegacyWorkspaceSecrets("workspace-a", adapter);

  assert.deepEqual(first.migrated.sort(), [
    "externalCrmWebhookUrl",
    "googleSheetsAccessToken",
    "telegramBotToken",
  ]);
  assert.deepEqual(first.removedLegacyFields.sort(), first.migrated.sort());
  assert.deepEqual(second, {
    migrated: [],
    alreadyPresent: [],
    removedLegacyFields: [],
  });
  assert.equal(writes.length, 3);
  assert.equal(cleanups.length, 1);
  assert.equal(JSON.stringify(first).includes("secret"), false);
});

test("existing vault values are not overwritten", async () => {
  let wrote = false;
  let removed: string[] = [];
  const adapter: LegacySecretMigrationAdapter = {
    async loadWorkspace() {
      return { id: "workspace-a", telegramBotToken: "legacy-value" };
    },
    async readSecret() {
      return "authoritative-vault-value";
    },
    async writeSecret() {
      wrote = true;
    },
    async removeLegacyFields(_workspaceId, fields) {
      removed = fields;
    },
  };

  const result = await migrateLegacyWorkspaceSecrets("workspace-a", adapter);

  assert.equal(wrote, false);
  assert.deepEqual(result.alreadyPresent, ["telegramBotToken"]);
  assert.deepEqual(removed, ["telegramBotToken"]);
});
