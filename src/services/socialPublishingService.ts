import { getWorkspaceSecret } from './workspaceSecretVault.ts';
import type { FoxFeature } from './entitlementService.ts';
import { canWorkspaceUseFeature, isWorkspaceEntitlementActive } from './entitlementService.ts';
import { adminDb } from './firebaseAdmin.ts';
import type { Workspace } from '../types.ts';

// Strip undefined values so Firestore (which rejects undefined) is never
// handed a "Cannot use undefined as a Firestore value" error from optional
// fields that the caller simply did not populate.
function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(obj) as (keyof T)[]) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

export type SocialPublishingState =
  | 'draft'
  | 'approved'
  | 'scheduled'
  | 'publishing'
  | 'published'
  | 'failed'
  | 'cancelled';

export type SocialPublishingPlatform = 'facebook' | 'instagram';

export type SocialPublishingMode = 'MANUAL_APPROVAL' | 'AUTO_PUBLISH';

export interface SocialPublishRecord {
  id?: string;
  workspaceId: string;
  platform: SocialPublishingPlatform;
  content: string;
  imageUrl?: string;
  scheduledAt?: string;
  publishedAt?: string;
  state: SocialPublishingState;
  externalPostId?: string;
  attempts: number;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
  mode: SocialPublishingMode;
  approvedBy?: string;
}

export interface SocialPublishResult {
  success: boolean;
  recordId?: string;
  externalPostId?: string;
  error?: string;
}

const COLLECTION = 'socialPublishingRecords';

function sanitizeError(err: any): string {
  const msg = err?.message || err?.toString?.() || 'Unknown error';
  // Never include potential secrets in error logs
  const cleaned = msg
    .replace(/token=[^&\s]+/gi, 'token=[REDACTED]')
    .replace(/access_token=[^&\s]+/gi, 'access_token=[REDACTED]')
    .replace(/secret[^=]*=[^&\s]+/gi, 'secret=[REDACTED]')
    .slice(0, 500);
  return cleaned;
}

export async function createSocialPublishRecord(
  workspaceId: string,
  data: Partial<SocialPublishRecord>
): Promise<string> {
  const doc = adminDb.collection(COLLECTION).doc();
  const now = new Date().toISOString();
  const record: SocialPublishRecord = {
    workspaceId,
    platform: data.platform || 'facebook',
    content: data.content || '',
    state: data.state || 'draft',
    attempts: data.attempts ?? 0,
    createdAt: now,
    updatedAt: now,
    mode: (data.mode as SocialPublishingMode) || 'MANUAL_APPROVAL',
    ...stripUndefined({
      imageUrl: data.imageUrl,
      scheduledAt: data.scheduledAt,
    } as Record<string, unknown>),
  };
  await doc.set(record);
  return doc.id;
}

export async function getSocialPublishRecord(
  workspaceId: string,
  recordId: string
): Promise<SocialPublishRecord | null> {
  const snap = await adminDb.collection(COLLECTION).doc(recordId).get();
  if (!snap.exists) return null;
  const data = snap.data() as SocialPublishRecord;
  if (data.workspaceId !== workspaceId) return null; // workspace isolation
  return { ...data, id: snap.id };
}

export async function transitionRecordState(
  workspaceId: string,
  recordId: string,
  newState: SocialPublishingState,
  updates?: Partial<SocialPublishRecord>
): Promise<boolean> {
  const current = await getSocialPublishRecord(workspaceId, recordId);
  if (!current) return false;
  const now = new Date().toISOString();
  await adminDb.collection(COLLECTION).doc(recordId).set(stripUndefined({
    ...(updates || {}),
    state: newState,
    updatedAt: now,
  } as Record<string, unknown>), { merge: true });
  return true;
}

export async function findDueScheduledPosts(
  workspaceId: string,
  now: Date = new Date()
): Promise<SocialPublishRecord[]> {
  const snapshot = await adminDb
    .collection(COLLECTION)
    .where('workspaceId', '==', workspaceId)
    .where('state', '==', 'scheduled')
    .get();
  const due: SocialPublishRecord[] = [];
  const nowStr = now.toISOString();
  for (const doc of snapshot.docs) {
    const data = doc.data() as SocialPublishRecord;
    if (data.scheduledAt && data.scheduledAt <= nowStr) {
      due.push({ ...data, id: doc.id });
    }
  }
  return due;
}

export async function processScheduledPost(
  workspaceId: string,
  recordId: string
): Promise<SocialPublishResult> {
  const record = await getSocialPublishRecord(workspaceId, recordId);
  if (!record) return { success: false, error: 'RECORD_NOT_FOUND' };
  if (record.state !== 'scheduled') return { success: false, error: 'NOT_SCHEDULED' };

  // Entitlement check (load real workspace from Firestore)
  const wsSnap = await adminDb.collection('workspaces').doc(workspaceId).get();
  const workspace = wsSnap.exists ? (wsSnap.data() as Workspace) : null;
  const feature: FoxFeature = 'marketing_engine';
  // For simplicity, both publishing and messaging require entitlement
  const allowed = !!workspace && isWorkspaceEntitlementActive(workspace) && canWorkspaceUseFeature(workspace, feature);
  if (!allowed) {
    await transitionRecordState(workspaceId, recordId, 'failed', { lastError: sanitizeError('ENTITLEMENT_DENIED') });
    return { success: false, error: 'ENTITLEMENT_DENIED' };
  }

  // Fail closed if credentials missing
  const token = await getWorkspaceSecret(workspaceId, 'facebookPageAccessToken');
  const instaToken = await getWorkspaceSecret(workspaceId, 'instagramAccessToken');
  if (record.platform === 'facebook' && !token) {
    await transitionRecordState(workspaceId, recordId, 'failed', { lastError: sanitizeError('FACEBOOK_TOKEN_MISSING') });
    return { success: false, error: 'FACEBOOK_TOKEN_MISSING' };
  }
  if (record.platform === 'instagram' && !instaToken) {
    await transitionRecordState(workspaceId, recordId, 'failed', { lastError: sanitizeError('INSTAGRAM_TOKEN_MISSING') });
    return { success: false, error: 'INSTAGRAM_TOKEN_MISSING' };
  }

  // Transition to publishing
  await transitionRecordState(workspaceId, recordId, 'publishing');

  // Idempotency / duplicate publish prevention: check attempts before retry logic
  // If we've exceeded bounded attempts, mark permanent failure.
  const nextAttempts = (record.attempts || 0) + 1;

  // Bounded retry: enforce max attempts
  if (nextAttempts > 3) {
    await transitionRecordState(workspaceId, recordId, 'failed', { lastError: sanitizeError('MAX_ATTEMPTS_EXCEEDED'), attempts: nextAttempts });
    return { success: false, error: 'MAX_ATTEMPTS_EXCEEDED' };
  }

  // Publish only after a real Meta Graph API response. Never synthesize an external ID.
  try {
    let publishResult: any = null;

    if (record.platform === 'facebook') {
      const pageId = String(workspace.metaPageId || '').trim();
      if (!pageId) throw new Error('FACEBOOK_PAGE_ID_MISSING');

      const endpoint = record.imageUrl
        ? `https://graph.facebook.com/v23.0/${encodeURIComponent(pageId)}/photos`
        : `https://graph.facebook.com/v23.0/${encodeURIComponent(pageId)}/feed`;
      const body = record.imageUrl
        ? { url: record.imageUrl, caption: record.content, published: true, access_token: token }
        : { message: record.content, published: true, access_token: token };
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      publishResult = await response.json().catch(() => null);
      if (!response.ok || publishResult?.error) throw new Error(publishResult?.error?.message || 'FACEBOOK_PUBLISH_FAILED');
    } else {
      const { getInstagramCredentials } = await import('./instagramService.ts');
      const credentials = await getInstagramCredentials(workspaceId);
      if (!credentials.businessAccountId || !credentials.accessToken) throw new Error('INSTAGRAM_CREDENTIALS_MISSING');
      if (!record.imageUrl) throw new Error('INSTAGRAM_IMAGE_REQUIRED');

      const mediaResponse = await fetch(`https://graph.facebook.com/v23.0/${encodeURIComponent(credentials.businessAccountId)}/media`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: record.imageUrl, caption: record.content, access_token: credentials.accessToken })
      });
      const media = await mediaResponse.json().catch(() => null);
      if (!mediaResponse.ok || media?.error || !media?.id) throw new Error(media?.error?.message || 'INSTAGRAM_MEDIA_CREATE_FAILED');

      const publishResponse = await fetch(`https://graph.facebook.com/v23.0/${encodeURIComponent(credentials.businessAccountId)}/media_publish`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: media.id, access_token: credentials.accessToken })
      });
      publishResult = await publishResponse.json().catch(() => null);
      if (!publishResponse.ok || publishResult?.error || !publishResult?.id) throw new Error(publishResult?.error?.message || 'INSTAGRAM_PUBLISH_FAILED');
    }

    const externalId = String(publishResult?.post_id || publishResult?.id || '').trim();
    if (!externalId) throw new Error('META_PUBLISH_ID_MISSING');

    await transitionRecordState(workspaceId, recordId, 'published', {
      externalPostId: externalId,
      publishedAt: new Date().toISOString(),
      attempts: nextAttempts,
    });
    return { success: true, recordId, externalPostId: externalId };
  } catch (e: any) {
    const attempts = nextAttempts;
    await transitionRecordState(workspaceId, recordId, attempts >= 3 ? 'failed' : 'scheduled', {
      lastError: sanitizeError(e),
      attempts,
    });
    return { success: false, error: sanitizeError(e), recordId };
  }
}
