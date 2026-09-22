import { getWorkspaceSecret, setWorkspaceSecret, deleteWorkspaceSecret } from './workspaceSecretVault.ts';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebaseAdmin.ts';
import { canWorkspaceUseFeature, type FoxFeature } from './entitlementService.ts';

export const INSTAGRAM_BUSINESS_ACCOUNT_ID_KEY = 'instagramBusinessAccountId';
export const INSTAGRAM_ACCESS_TOKEN_KEY = 'instagramAccessToken';

export async function setInstagramCredentials(workspaceId: string, businessAccountId: string, accessToken: string): Promise<void> {
  await setWorkspaceSecret(workspaceId, INSTAGRAM_BUSINESS_ACCOUNT_ID_KEY, businessAccountId);
  await setWorkspaceSecret(workspaceId, INSTAGRAM_ACCESS_TOKEN_KEY, accessToken);
}

export async function getInstagramCredentials(workspaceId: string): Promise<{ businessAccountId: string | null; accessToken: string | null }> {
  const [businessAccountId, accessToken] = await Promise.all([
    getWorkspaceSecret(workspaceId, INSTAGRAM_BUSINESS_ACCOUNT_ID_KEY),
    getWorkspaceSecret(workspaceId, INSTAGRAM_ACCESS_TOKEN_KEY)
  ]);
  return {
    businessAccountId: businessAccountId ?? null,
    accessToken: accessToken ?? null
  };
}

export async function deleteInstagramCredentials(workspaceId: string): Promise<void> {
  await deleteWorkspaceSecret(workspaceId, INSTAGRAM_BUSINESS_ACCOUNT_ID_KEY);
  await deleteWorkspaceSecret(workspaceId, INSTAGRAM_ACCESS_TOKEN_KEY);
}

export async function verifyInstagramConnection(workspaceId: string): Promise<{ success: boolean; error?: string }> {
  const credentials = await getInstagramCredentials(workspaceId);
  if (!credentials.accessToken || !credentials.businessAccountId) {
    return { success: false, error: 'Instagram credentials not configured' };
  }

  // Verify with Instagram Graph API
  const url = `https://graph.facebook.com/v19.0/${credentials.businessAccountId}?fields=id,username&access_token=${credentials.accessToken}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok || data.error) {
      return { success: false, error: data.error?.message || 'Failed to verify Instagram connection' };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function sendInstagramDirectMessage(workspaceId: string, recipientId: string, message: string): Promise<{ success: boolean; error?: string; data?: any }> {
  const credentials = await getInstagramCredentials(workspaceId);
  if (!credentials.accessToken || !credentials.businessAccountId) {
    return { success: false, error: 'Instagram credentials not configured' };
  }

  // Check entitlement
  const workspace = { id: workspaceId } as any; // In real usage, fetch workspace
  const hasEntitlement = canWorkspaceUseFeature(workspace, "instagram_messaging");
  if (!hasEntitlement) {
    return { success: false, error: 'Instagram messaging not allowed for your plan' };
  }

  const url = `https://graph.facebook.com/v19.0/me/messages`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        recipient: { id: recipientId },
        message: { text: message },
        access_token: credentials.accessToken
      })
    });
    const data = await response.json();
    if (!response.ok || data.error) {
      return { success: false, error: data.error?.message || 'Failed to send Instagram DM', data };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function sendInstagramCommentReply(workspaceId: string, commentId: string, message: string): Promise<{ success: boolean; error?: string; data?: any }> {
  const credentials = await getInstagramCredentials(workspaceId);
  if (!credentials.accessToken || !credentials.businessAccountId) {
    return { success: false, error: 'Instagram credentials not configured' };
  }

  // Check entitlement
  const workspace = { id: workspaceId } as any;
  const hasEntitlement = canWorkspaceUseFeature(workspace, "instagram_comments");
  if (!hasEntitlement) {
    return { success: false, error: 'Instagram comments not allowed for your plan' };
  }

  const url = `https://graph.facebook.com/v19.0/${commentId}/comments`;
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: message,
        access_token: credentials.accessToken
      })
    });
    const data = await response.json();
    if (!response.ok || data.error) {
      return { success: false, error: data.error?.message || 'Failed to send Instagram comment reply', data };
    }
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// Instagram uses the same FOX Brain as every other live customer channel.
export async function generateInstagramAIResponse(
  workspaceId: string,
  userMessage: string,
  senderName: string = 'عميل إنستغرام',
): Promise<string> {
  try {
    const { generateTenantBrainResponse } = await import('./foxBrainService.ts');
    const result = await generateTenantBrainResponse({
      workspaceId,
      message: userMessage,
      channel: 'instagram',
      sessionId: 'instagram:' + workspaceId + ':' + Date.now(),
      customPrompt:
        'You are the FOX live customer-service brain for this tenant. Use tenant data and tools when needed. Never invent prices, availability, appointments, policies, medical claims or completed actions. Match the customer language. Escalate when the answer is not grounded or the customer requests a human.',
    });
    const text = String(result?.response || result?.aiResponse || '').trim();
    if (!text) throw new Error('EMPTY_BRAIN_RESPONSE');
    return text;
  } catch (error: any) {
    console.warn('[FOX Instagram Brain] safe fallback:', error?.message || error);
    return senderName === 'عميل إنستغرام'
      ? 'أقدر أساعدك، لكن أحتاج أتأكد من بيانات المنشأة قبل ما أديك إجابة مؤكدة. سيتم تحويل استفسارك لموظف عند الحاجة.'
      : 'I need to verify the business data before giving you a confirmed answer. A human agent can take over when needed.';
  }
}
