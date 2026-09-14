import { getWorkspaceSecret, setWorkspaceSecret, deleteWorkspaceSecret } from './workspaceSecretVault.ts';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebaseAdmin.ts';
import { canWorkspaceUseFeature, type FoxFeature } from './entitlementService.ts';
import { GoogleGenAI } from '@google/genai';

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

// Helper to generate AI response for Instagram (similar to meta auto reply)
export async function generateInstagramAIResponse(workspaceId: string, userMessage: string, senderName: string = 'عميل إنستغرام'): Promise<string> {
  const aiKey = process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY : "";
  const ai = aiKey ? new GoogleGenAI({ apiKey: aiKey }) : null;
  if (!ai) {
    return senderName === 'عميل إنستغرام'
      ? `أهلاً بك! 🌸 نحن في FOX AI Agency. نقدر تواصلكم عبر إنستغرام وسنرد على استفساركم: "${userMessage}" قريباً عبر الرسائل الخاصة.`
      : `Hello! 🌸 This is FOX AI Agency. We appreciate your Instagram message regarding: "${userMessage}". We'll respond via direct message shortly.`;
  }

  try {
    const prompt = `أنت بوت المبيعات والخدمات التلقائي لشركة FOX AI Agency. رسالة عميل على إنستغرام: "${userMessage}". اكتب رد احترافي وودود وسريع باللغة العربية يلبي طلب العميل ويشرح خدمات الذكاء الاصطناعي ويدعوه لبدء الاستفادة.`;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });
    return response.text || '';
  } catch (e) {
    console.warn('[Instagram AI Gen Fallback]:', e);
    return senderName === 'عميل إنستغرام'
      ? `أهلاً بك! 🌸 نحن في FOX AI Agency. نقدر تواصلكم عبر إنستغرام. كيف يمكننا مساعدتك اليوم؟ ✨`
      : `Hello! 🌸 This is FOX AI Agency. Thanks for your Instagram message. How can we help you today? ✨`;
  }
}
