import { adminDb } from "./firebaseAdmin.ts";
import { getWorkspaceSecret } from "./workspaceSecretVault.ts";
import { workspaceDataService } from "./workspaceDataService.ts";
import { aiAgentService } from "./aiAgentService.ts";
import type { Workspace } from "../types.ts";

export async function getTenantRuntimeWorkspace(workspaceId: string): Promise<any | null> {
  const id = String(workspaceId || "").trim();
  if (!id) return null;

  const snap = await adminDb.collection("workspaces").doc(id).get();
  if (!snap.exists) return null;

  const workspace: any = { id, ...(snap.data() || {}) };
  const [
    sheetsToken,
    crmWebhookUrl,
    geminiApiKey,
    clinicServices,
    doctors,
    knowledgeBase,
    coupons,
    menu,
    medicines,
    products,
    courses,
  ] = await Promise.all([
    getWorkspaceSecret(id, "googleSheetsAccessToken"),
    getWorkspaceSecret(id, "externalCrmWebhookUrl"),
    getWorkspaceSecret(id, "geminiApiKey"),
    workspaceDataService.getClinicServices(id),
    workspaceDataService.getDoctors(id),
    workspaceDataService.getKnowledgeFacts(id),
    workspaceDataService.getCoupons(id),
    workspaceDataService.getMenuItems(id),
    workspaceDataService.getMedicines(id),
    workspaceDataService.getProducts(id),
    workspaceDataService.getCourses(id),
  ]);

  workspace.clinicServices = clinicServices;
  workspace.doctors = doctors;
  workspace.knowledgeBase = knowledgeBase;
  workspace.coupons = coupons;
  workspace.menu = menu;
  workspace.medicines = medicines;
  workspace.products = products;
  workspace.courses = courses;

  if (sheetsToken) workspace.googleSheetsAccessToken = sheetsToken;
  if (crmWebhookUrl) workspace.externalCrmWebhookUrl = crmWebhookUrl;
  if (geminiApiKey) workspace.geminiApiKey = geminiApiKey;

  return workspace as Workspace & Record<string, any>;
}

export async function generateTenantBrainResponse(params: {
  workspaceId: string;
  message: string;
  channel: string;
  sessionId: string;
  chatHistory?: Array<{ role?: string; sender?: string; text?: string }>;
  customPrompt?: string;
}) {
  const workspace = await getTenantRuntimeWorkspace(params.workspaceId);
  if (!workspace) {
    throw new Error("WORKSPACE_NOT_FOUND");
  }

  return aiAgentService.generateChatResponse({
    workspace,
    message: params.message,
    channel: params.channel,
    sessionId: params.sessionId,
    chatHistory: params.chatHistory || [],
    overrideConfig: params.customPrompt
      ? { customPrompt: params.customPrompt }
      : undefined,
  });
}
