import { adminDb } from "./firebaseAdmin";
import {
  encryptSecret,
  decryptSecret,
} from "./secretService";

export type WorkspaceSecretName =
  | "telegramBotToken"
  | "whatsappAccessToken"
  | "facebookPageAccessToken"
  | "facebookVerifyToken"
  | "googleSheetsAccessToken";

function getSecretRef(
  workspaceId: string,
  secretName: WorkspaceSecretName
) {
  if (!workspaceId?.trim()) {
    throw new Error("WORKSPACE_ID_REQUIRED");
  }

  return adminDb
    .collection("workspaceSecrets")
    .doc(workspaceId)
    .collection("secrets")
    .doc(secretName);
}

export async function setWorkspaceSecret(
  workspaceId: string,
  secretName: WorkspaceSecretName,
  value: string
) {
  const cleanValue = String(value || "").trim();

  if (!cleanValue) {
    throw new Error("SECRET_VALUE_REQUIRED");
  }

  const encrypted = encryptSecret(cleanValue);

  await getSecretRef(
    workspaceId,
    secretName
  ).set({
    encrypted,
    secretName,
    workspaceId,
    updatedAt: new Date().toISOString(),
  });

  console.log(
    `🔐 [Workspace Vault] Secret stored | Workspace=${workspaceId} | Secret=${secretName}`
  );
}

export async function getWorkspaceSecret(
  workspaceId: string,
  secretName: WorkspaceSecretName
): Promise<string | null> {
  const snapshot = await getSecretRef(
    workspaceId,
    secretName
  ).get();

  if (!snapshot.exists) {
    return null;
  }

  const data: any = snapshot.data() || {};
  const encrypted = data.encrypted;

  if (
    !encrypted?.iv ||
    !encrypted?.tag ||
    !encrypted?.data
  ) {
    return null;
  }

  try {
    return decryptSecret(encrypted);
  } catch (error) {
    console.error(
      `❌ [Workspace Vault] Decryption failed | Workspace=${workspaceId} | Secret=${secretName}`,
      error
    );

    return null;
  }
}

export async function hasWorkspaceSecret(
  workspaceId: string,
  secretName: WorkspaceSecretName
): Promise<boolean> {
  const snapshot = await getSecretRef(
    workspaceId,
    secretName
  ).get();

  return snapshot.exists;
}

export async function deleteWorkspaceSecret(
  workspaceId: string,
  secretName: WorkspaceSecretName
) {
  await getSecretRef(
    workspaceId,
    secretName
  ).delete();

  console.log(
    `🗑️ [Workspace Vault] Secret removed | Workspace=${workspaceId} | Secret=${secretName}`
  );
}
