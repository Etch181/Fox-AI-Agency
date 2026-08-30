type WorkspaceRecord = Record<string, any>;

const SAFE_WORKSPACE_FIELDS = [
  "id",
  "ownerUid",
  "name",
  "industry",
  "ownerName",
  "ownerEmail",
  "phone",
  "status",
  "planId",
  "subscriptionExpiresAt",
  "entitlementExpiresAt",
  "aiConversationsUsed",
  "extraConversationsLimit",
  "extraPackages",
  "creditBalance",
  "totalCustomers",
  "totalAppointments",
  "totalComplaints",
  "createdAt",
  "aiSettings",
  "telegramBotName",
  "telegramBotStatus",
  "telegramBotId",
  "telegramConnectedAt",
  "whatsappBotStatus",
  "whatsappPhoneNumber",
  "whatsappPhoneNumberId",
  "whatsappBusinessAccountId",
  "whatsappConnectedAt",
  "registrationSource",
  "telegramChatId",
  "telegramUsername",
  "onboardingStatus",
  "onboardingCompleted",
  "onboardingCompletedAt",
  "onboardingStep",
  "businessDescription",
  "onboardingAiReady",
  "onboardingCatalogReady",
  "crmSpreadsheetId",
  "googleSheetsConnectedAt",
  "externalCrmWebhookConfigured",
  "externalCrmWebhookUpdatedAt",
  "updatedAt",
] as const;

const STAFF_WORKSPACE_FIELDS = [
  "id",
  "name",
  "industry",
  "status",
  "planId",
] as const;

const SENSITIVE_KEY =
  /(?:token|secret|password|credential|private.?key|api.?key|cipher|encrypted|auth.?tag|^iv$|webhook|callback)/i;

function sanitizeNested(value: any): any {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeNested);
  }

  if (typeof value !== "object") {
    return value;
  }

  const prototype = Object.getPrototypeOf(value);

  if (prototype !== Object.prototype && prototype !== null) {
    return value;
  }

  const sanitized: WorkspaceRecord = {};

  for (const [key, nestedValue] of Object.entries(value)) {
    if (!SENSITIVE_KEY.test(key)) {
      sanitized[key] = sanitizeNested(nestedValue);
    }
  }

  return sanitized;
}

function pickSafeWorkspaceFields(workspace: WorkspaceRecord): WorkspaceRecord {
  const safe: WorkspaceRecord = {};

  for (const field of SAFE_WORKSPACE_FIELDS) {
    if (workspace[field] !== undefined) {
      safe[field] = sanitizeNested(workspace[field]);
    }
  }

  // Preserve authoritative Firestore Timestamp semantics in server memory.
  if (workspace.entitlementExpiresAt !== undefined) {
    safe.entitlementExpiresAt = workspace.entitlementExpiresAt;
  }

  return safe;
}

export function sanitizeAuthoritativeWorkspaceForRuntime(
  workspace: WorkspaceRecord,
): WorkspaceRecord {
  return pickSafeWorkspaceFields(workspace);
}

export function authoritativeWorkspaceFromDocument(
  documentId: string,
  data: WorkspaceRecord,
): WorkspaceRecord {
  return sanitizeAuthoritativeWorkspaceForRuntime({
    ...data,
    id: documentId,
  });
}

function authoritativeWorkspaceToDto(
  workspace: WorkspaceRecord,
): WorkspaceRecord {
  const dto = pickSafeWorkspaceFields(workspace);
  const entitlement = workspace.entitlementExpiresAt;

  delete dto.entitlementExpiresAt;

  if (entitlement && typeof entitlement.toMillis === "function") {
    dto.entitlementExpiresAtMillis = entitlement.toMillis();
  }

  return dto;
}

export function authoritativeWorkspaceToClientDto(
  workspace: WorkspaceRecord,
): WorkspaceRecord {
  return authoritativeWorkspaceToDto(workspace);
}

export function authoritativeWorkspaceToAdminDto(
  workspace: WorkspaceRecord,
): WorkspaceRecord {
  return authoritativeWorkspaceToDto(workspace);
}

export function authoritativeWorkspaceToStaffDto(
  workspace: WorkspaceRecord,
): WorkspaceRecord {
  const dto: WorkspaceRecord = {};
  for (const field of STAFF_WORKSPACE_FIELDS) {
    if (workspace[field] !== undefined) {
      dto[field] = sanitizeNested(workspace[field]);
    }
  }

  const entitlement = workspace.entitlementExpiresAt;
  if (entitlement && typeof entitlement.toMillis === "function") {
    dto.entitlementExpiresAtMillis = entitlement.toMillis();
  }
  return dto;
}

export async function refreshAuthoritativeWorkspaceCache(
  currentCache: WorkspaceRecord[],
  workspaceIds: string[],
  loadWorkspace: (workspaceId: string) => Promise<WorkspaceRecord | null>,
): Promise<WorkspaceRecord[]> {
  const uniqueIds = [...new Set(workspaceIds.map(String).filter(Boolean))];
  const refreshedById = new Map<string, WorkspaceRecord | null>();

  for (const workspaceId of uniqueIds) {
    const authoritative = await loadWorkspace(workspaceId);
    refreshedById.set(
      workspaceId,
      authoritative
        ? sanitizeAuthoritativeWorkspaceForRuntime(authoritative)
        : null,
    );
  }

  const next = currentCache
    .filter((workspace) => !refreshedById.has(String(workspace.id)))
    .map(sanitizeAuthoritativeWorkspaceForRuntime);

  for (const workspaceId of uniqueIds) {
    const authoritative = refreshedById.get(workspaceId);

    if (authoritative) {
      next.push(authoritative);
    }
  }

  return next;
}
