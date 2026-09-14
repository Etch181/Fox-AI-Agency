export interface LegacyEntitlementMigrationAdapter {
  loadWorkspace(workspaceId: string): Promise<Record<string, any> | null>;
  writeEntitlement(workspaceId: string, expiry: Date): Promise<void>;
}

export interface LegacyEntitlementMigrationResult {
  status: "migrated" | "already_authoritative" | "not_found";
  workspaceId: string;
  entitlementExpiresAtMillis?: number;
}

function parseLegacySubscriptionExpiry(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const expiry = new Date(`${value}T23:59:59.999Z`);
  return Number.isFinite(expiry.getTime()) ? expiry : null;
}

export async function migrateLegacyWorkspaceEntitlement(
  workspaceId: string,
  adapter: LegacyEntitlementMigrationAdapter,
): Promise<LegacyEntitlementMigrationResult> {
  const workspace = await adapter.loadWorkspace(workspaceId);

  if (!workspace) {
    return { status: "not_found", workspaceId };
  }

  if (
    workspace.entitlementExpiresAt &&
    typeof workspace.entitlementExpiresAt.toMillis === "function"
  ) {
    return {
      status: "already_authoritative",
      workspaceId,
      entitlementExpiresAtMillis: workspace.entitlementExpiresAt.toMillis(),
    };
  }

  const expiry = parseLegacySubscriptionExpiry(
    workspace.subscriptionExpiresAt,
  );

  if (!expiry) {
    throw new Error("Workspace does not have a valid legacy subscription expiry");
  }

  await adapter.writeEntitlement(workspaceId, expiry);

  return {
    status: "migrated",
    workspaceId,
    entitlementExpiresAtMillis: expiry.getTime(),
  };
}
