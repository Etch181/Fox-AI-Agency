export interface WorkspaceSelectionRecord {
  id: string;
}

export interface WorkspaceSelectionAuthority {
  isSuperAdmin: boolean;
  userWorkspaceId?: string;
}

export function resolveAuthorizedWorkspaceSelection(
  workspaces: WorkspaceSelectionRecord[],
  preferredWorkspaceId: string,
  authority: WorkspaceSelectionAuthority,
): string {
  if (!workspaces.length) return "";

  if (!authority.isSuperAdmin) {
    const boundWorkspaceId = String(
      authority.userWorkspaceId || "",
    ).trim();

    return workspaces.some(
      (workspace) => workspace.id === boundWorkspaceId,
    )
      ? boundWorkspaceId
      : "";
  }

  const preferred = String(preferredWorkspaceId || "").trim();
  if (
    preferred &&
    workspaces.some((workspace) => workspace.id === preferred)
  ) {
    return preferred;
  }

  return workspaces[0].id;
}
