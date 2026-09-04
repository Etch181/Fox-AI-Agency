import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from './firebaseAdmin.ts';
import { getWorkspaceSecret } from './workspaceSecretVault.ts';
import type { FoxFeature } from './entitlementService.ts';
import { canWorkspaceUseFeature } from './entitlementService.ts';

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(obj) as (keyof T)[]) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

export type CampaignType = 'offer' | 'discount' | 'coupon' | 'announcement' | 're_engagement';
export type CampaignStatus = 'draft' | 'approved' | 'scheduled' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';
export type RecipientStatus = 'queued' | 'claimed' | 'sent' | 'failed' | 'skipped' | 'cancelled';

export interface Campaign {
  id?: string;
  workspaceId: string;
  name: string;
  campaignType: CampaignType;
  objective: string;
  message: string;
  linkedCouponId?: string;
  audienceDefinition: string; // e.g. 'all_eligible', 'leads', 'previous_customers', 'tags:VIP'
  selectedChannels: ('whatsapp' | 'telegram' | 'messenger' | 'instagram')[];
  scheduledAt?: string;
  status: CampaignStatus;
  counters: {
    targeted: number;
    queued: number;
    sent: number;
    failed: number;
    skipped: number;
  };
  createdAt: string;
  updatedAt: string;
  startedAt?: string;
  completedAt?: string;
}

export interface CampaignRecipientRecord {
  id?: string;
  workspaceId: string;
  campaignId: string;
  customerId?: string;
  channel: string;
  destinationReference?: string; // external chat id / phone / handle
  status: RecipientStatus;
  attemptCount: number;
  maxAttempts: number;
  lastError?: string;
  sentAt?: string;
  externalMessageId?: string;
  idempotencyKey: string;
  suppressedReason?: string; // sanitized suppression reason
  createdAt: string;
  updatedAt: string;
}

const CAMPAIGN_COLLECTION = 'campaigns';
const RECIPIENT_COLLECTION = 'campaignRecipients';

export async function createCampaign(
  workspaceId: string,
  campaign: Partial<Campaign>
): Promise<string> {
  const doc = adminDb.collection(CAMPAIGN_COLLECTION).doc();
  const now = new Date().toISOString();
  const record: Campaign = {
    workspaceId,
    name: campaign.name || '',
    campaignType: campaign.campaignType || 'announcement',
    objective: campaign.objective || '',
    message: campaign.message || '',
    audienceDefinition: campaign.audienceDefinition || 'all_eligible',
    selectedChannels: campaign.selectedChannels || ['whatsapp'],
    status: campaign.status || 'draft',
    counters: { targeted: 0, queued: 0, sent: 0, failed: 0, skipped: 0 },
    createdAt: now,
    updatedAt: now,
    ...stripUndefined({
      linkedCouponId: campaign.linkedCouponId,
      scheduledAt: campaign.scheduledAt,
    } as Record<string, unknown>),
  };
  await doc.set(record);
  return doc.id;
}

export async function getCampaign(
  workspaceId: string,
  campaignId: string
): Promise<Campaign | null> {
  const snap = await adminDb.collection(CAMPAIGN_COLLECTION).doc(campaignId).get();
  if (!snap.exists) return null;
  const data = snap.data() as Campaign;
  if (data.workspaceId !== workspaceId) return null;
  return { ...data, id: snap.id };
}

export async function updateCampaignCounters(
  workspaceId: string,
  campaignId: string,
  delta: Partial<Campaign['counters']>
): Promise<boolean> {
  const current = await getCampaign(workspaceId, campaignId);
  if (!current) return false;
  const counters = { ...current.counters, ...delta };
  await adminDb.collection(CAMPAIGN_COLLECTION).doc(campaignId).set({ counters, updatedAt: new Date().toISOString() }, { merge: true });
  return true;
}

export async function transitionCampaign(
  workspaceId: string,
  campaignId: string,
  status: CampaignStatus,
  updates?: Partial<Campaign>
): Promise<boolean> {
  const current = await getCampaign(workspaceId, campaignId);
  if (!current) return false;
  const now = new Date().toISOString();
  const payload: any = stripUndefined({
    status,
    updatedAt: now,
    ...(updates || {}),
  } as Record<string, unknown>);
  if (status === 'running' && !updates?.startedAt) payload.startedAt = now;
  if ((status === 'completed' || status === 'failed' || status === 'cancelled') && !updates?.completedAt) payload.completedAt = now;
  await adminDb.collection(CAMPAIGN_COLLECTION).doc(campaignId).set(payload, { merge: true });
  return true;
}

export async function createRecipientRecord(
  workspaceId: string,
  record: Partial<CampaignRecipientRecord>
): Promise<string> {
  const doc = adminDb.collection(RECIPIENT_COLLECTION).doc();
  const now = new Date().toISOString();
  const r: CampaignRecipientRecord = {
    workspaceId,
    campaignId: record.campaignId || '',
    channel: record.channel || 'whatsapp',
    status: record.status || 'queued',
    attemptCount: record.attemptCount ?? 0,
    maxAttempts: record.maxAttempts ?? 2,
    idempotencyKey: record.idempotencyKey || `${workspaceId}_${record.campaignId || ''}_${record.customerId || Math.random().toString(36)}`,
    createdAt: now,
    updatedAt: now,
    ...stripUndefined({
      customerId: record.customerId,
      destinationReference: record.destinationReference,
    } as Record<string, unknown>),
  };
  await doc.set(r);
  return doc.id;
}

export async function claimRecipient(
  workspaceId: string,
  recordId: string
): Promise<boolean> {
  const snap = await adminDb.collection(RECIPIENT_COLLECTION).doc(recordId).get();
  if (!snap.exists) return false;
  const data = snap.data() as CampaignRecipientRecord;
  if (data.workspaceId !== workspaceId || data.status !== 'queued') return false;
  await adminDb.collection(RECIPIENT_COLLECTION).doc(recordId).set({ status: 'claimed', updatedAt: new Date().toISOString() }, { merge: true });
  return true;
}

export async function updateRecipientStatus(
  workspaceId: string,
  recordId: string,
  newStatus: RecipientStatus,
  updates?: Partial<CampaignRecipientRecord>
): Promise<boolean> {
  const snap = await adminDb.collection(RECIPIENT_COLLECTION).doc(recordId).get();
  if (!snap.exists) return false;
  const data = snap.data() as CampaignRecipientRecord;
  if (data.workspaceId !== workspaceId) return false;
  await adminDb.collection(RECIPIENT_COLLECTION).doc(recordId).set(stripUndefined({
    status: newStatus,
    ...(updates || {}),
    updatedAt: new Date().toISOString(),
  } as Record<string, unknown>), { merge: true });
  return true;
}

export async function findQueuedRecipients(
  workspaceId: string,
  campaignId: string
): Promise<CampaignRecipientRecord[]> {
  const snapshot = await adminDb.collection(RECIPIENT_COLLECTION)
    .where('workspaceId', '==', workspaceId)
    .where('campaignId', '==', campaignId)
    .where('status', '==', 'queued')
    .get();
  return snapshot.docs.map((d) => ({ ...d.data() as CampaignRecipientRecord, id: d.id }));
}

export async function suppressDuplicateRecipients(
  workspaceId: string,
  campaignId: string,
  customerIds: string[]
): Promise<number> {
  // For simplicity: skip duplicates by checking existing queued/sent for same campaign + customer
  let skipped = 0;
  for (const cid of customerIds) {
    const snap = await adminDb.collection(RECIPIENT_COLLECTION)
      .where('workspaceId', '==', workspaceId)
      .where('campaignId', '==', campaignId)
      .where('customerId', '==', cid)
      .get();
    if (!snap.empty) skipped++;
  }
  return skipped;
}
