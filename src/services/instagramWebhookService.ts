import { getWorkspaceSecret } from './workspaceSecretVault.ts';
import type { FoxFeature } from './entitlementService.ts';
import { canWorkspaceUseFeature, isWorkspaceEntitlementActive } from './entitlementService.ts';
import { conversationService } from './conversationService.ts';
import { workspaceCrmService } from './workspaceCrmService.ts';
import { adminDb } from './firebaseAdmin.ts';
import type { Workspace } from '../types.ts';

// Dedup store for incoming Instagram message events (message id -> workspaceId -> timestamp)
const processedInstagramEvents = new Map<string, number>();

// Look up the real workspace document for entitlement checks. Falls back to
// a partial workspace when the document doesn't exist (e.g. test workspaces
// without persisted docs) — the entitlement service then returns false and
// the webhook fails closed.
async function loadWorkspaceForEntitlement(workspaceId: string): Promise<Workspace | null> {
  try {
    const snap = await adminDb.collection('workspaces').doc(workspaceId).get();
    if (!snap.exists) return null;
    return snap.data() as Workspace;
  } catch {
    return null;
  }
}

function isInstagramEventDuplicate(messageId: string): boolean {
  const lastTime = processedInstagramEvents.get(messageId);
  if (!lastTime) return false;
  const ageMs = Date.now() - lastTime;
  // Deduplicate events within a 5-minute window
  return ageMs < 5 * 60 * 1000;
}

function recordInstagramEvent(messageId: string) {
  processedInstagramEvents.set(messageId, Date.now());
  // Prevent unbounded growth
  if (processedInstagramEvents.size > 10000) {
    const oldest = Math.min(...Array.from(processedInstagramEvents.values()));
    for (const [k, v] of processedInstagramEvents.entries()) {
      if (v === oldest) {
        processedInstagramEvents.delete(k);
        break;
      }
    }
  }
}

export async function handleInstagramWebhooks(
  workspaceId: string,
  instagramBusinessAccountId: string,
  events: any[]
): Promise<{ processed: number; duplicates: number; errors: number }> {
  const stats = { processed: 0, duplicates: 0, errors: 0 };
  if (!workspaceId) {
    console.warn('[Instagram Webhook] Missing workspaceId — fail closed');
    return stats;
  }

  const accountToken = await getWorkspaceSecret(workspaceId, 'instagramAccessToken');
  if (!accountToken || !instagramBusinessAccountId) {
    console.warn(`[Instagram Webhook] Missing Instagram token or account ID for workspace=${workspaceId}`);
    return stats;
  }

  const workspace = await loadWorkspaceForEntitlement(workspaceId);
  if (!workspace || !isWorkspaceEntitlementActive(workspace)) {
    console.warn(`[Instagram Webhook] Workspace not found or not active for workspace=${workspaceId}`);
    return stats;
  }
  if (!canWorkspaceUseFeature(workspace, "instagram_messaging")) {
    console.warn(`[Instagram Webhook] Instagram messaging entitlement denied for workspace=${workspaceId}`);
    return stats;
  }

  for (const evt of events) {
    try {
      const senderId = evt.sender?.id || evt.from?.id || evt.entry?.[0]?.messaging?.[0]?.sender?.id;
      const messageId = evt.message?.mid || evt.entry?.[0]?.messaging?.[0]?.message?.mid || evt.id;
      const messageText = evt.message?.text || evt.entry?.[0]?.messaging?.[0]?.message?.text || '';

      if (!messageId) continue; // Cannot process without message id

      if (isInstagramEventDuplicate(String(messageId))) {
        stats.duplicates++;
        continue;
      }

      if (messageText && senderId) {
        recordInstagramEvent(String(messageId));
        await conversationService.getOrCreateConversation(workspaceId, {
          sessionId: `ig-${senderId}`,
          channel: 'instagram',
          externalChatId: String(senderId),
          customerName: senderId,
        });
        await conversationService.appendMessage(workspaceId, `instagram_${senderId}`, {
          sessionId: `ig-${senderId}`,
          channel: 'instagram',
          sender: 'customer',
          text: messageText,
          externalMessageId: String(messageId),
        });
        await workspaceCrmService.upsertChannelCustomer(workspaceId, {
          channel: 'instagram',
          externalCustomerId: String(senderId),
        });
        stats.processed++;
      }
    } catch (err: any) {
      console.error('[Instagram Webhook] Processing error:', err.message || err);
      stats.errors++;
    }
  }
  return stats;
}

export async function sendInstagramAIReply(
  workspaceId: string,
  recipientId: string,
  userMessage: string
): Promise<{ success: boolean; error?: string }> {
  // Fail-closed authorization checks
  const workspace = { id: workspaceId } as any;
  if (!workspaceId) {
    return { success: false, error: 'WORKSPACE_REQUIRED' };
  }

  const hasEntitlement = canWorkspaceUseFeature(workspace, "instagram_messaging");
  if (!hasEntitlement) {
    return { success: false, error: 'INSTAGRAM_ENTITLEMENT_DENIED' };
  }

  const accountToken = await getWorkspaceSecret(workspaceId, 'instagramAccessToken');
  const businessAccountId = await getWorkspaceSecret(workspaceId, 'instagramBusinessAccountId');
  if (!accountToken || !businessAccountId) {
    return { success: false, error: 'INSTAGRAM_CREDENTIALS_MISSING' };
  }

  // Use existing AI response helper from instagramService
  const { generateInstagramAIResponse } = await import('./instagramService.ts');
  const replyText = await generateInstagramAIResponse(workspaceId, userMessage, 'عميل إنستغرام');

  // Persist reply to Unified Inbox conversation
  await conversationService.getOrCreateConversation(workspaceId, {
    sessionId: `ig-${recipientId}`,
    channel: 'instagram',
    externalChatId: String(recipientId),
    customerName: recipientId,
  });
  await conversationService.appendMessage(workspaceId, `instagram_${recipientId}`, {
    sessionId: `ig-${recipientId}`,
    channel: 'instagram',
    sender: 'ai',
    text: replyText,
    externalMessageId: `ai_reply_${Date.now()}`,
  });

  return { success: true };
}
