export type LegacyWorkspaceSecretName =
  | "telegramBotToken"
  | "googleSheetsAccessToken"
  | "externalCrmWebhookUrl"
  | "whatsappAccessToken"
  | "whatsappVerifyToken"
  | "facebookPageAccessToken"
  | "facebookVerifyToken";

const LEGACY_SECRET_FIELDS: LegacyWorkspaceSecretName[] = [
  "telegramBotToken",
  "googleSheetsAccessToken",
  "externalCrmWebhookUrl",
  "whatsappAccessToken",
  "whatsappVerifyToken",
  "facebookPageAccessToken",
  "facebookVerifyToken",
];

export interface LegacySecretMigrationAdapter {
  loadWorkspace(workspaceId: string): Promise<Record<string, unknown> | null>;
  readSecret(
    workspaceId: string,
    name: LegacyWorkspaceSecretName,
  ): Promise<string | null>;
  writeSecret(
    workspaceId: string,
    name: LegacyWorkspaceSecretName,
    value: string,
  ): Promise<void>;
  validateSecret?(
    name: LegacyWorkspaceSecretName,
    value: string,
  ): Promise<void>;
  removeLegacyFields(workspaceId: string, fields: string[]): Promise<void>;
}

export interface LegacySecretMigrationResult {
  migrated: LegacyWorkspaceSecretName[];
  alreadyPresent: LegacyWorkspaceSecretName[];
  removedLegacyFields: LegacyWorkspaceSecretName[];
}

export async function migrateLegacyWorkspaceSecrets(
  workspaceId: string,
  adapter: LegacySecretMigrationAdapter,
): Promise<LegacySecretMigrationResult> {
  const workspace = await adapter.loadWorkspace(workspaceId);
  const result: LegacySecretMigrationResult = {
    migrated: [],
    alreadyPresent: [],
    removedLegacyFields: [],
  };

  if (!workspace) {
    return result;
  }

  const legacyNames = LEGACY_SECRET_FIELDS.filter((name) => {
    const value = workspace[name];
    return typeof value === "string" && value.trim().length > 0;
  });

  for (const name of legacyNames) {
    const existing = await adapter.readSecret(workspaceId, name);

    if (existing) {
      result.alreadyPresent.push(name);
      continue;
    }

    if (adapter.validateSecret) {
      await adapter.validateSecret(name, String(workspace[name]));
    }

    await adapter.writeSecret(
      workspaceId,
      name,
      String(workspace[name]),
    );
    result.migrated.push(name);
  }

  if (legacyNames.length) {
    await adapter.removeLegacyFields(workspaceId, legacyNames);
    result.removedLegacyFields.push(...legacyNames);
  }

  return result;
}
