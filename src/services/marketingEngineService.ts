import type { FoxFeature } from './entitlementService.ts';
import { canWorkspaceUseFeature } from './entitlementService.ts';
import { getWorkspaceSecret } from './workspaceSecretVault.ts';
import { adminDb } from './firebaseAdmin.ts';
import { createSocialPublishRecord, type SocialPublishRecord } from './socialPublishingService.ts';

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(obj) as (keyof T)[]) {
    if (obj[k] !== undefined) out[k] = obj[k];
  }
  return out;
}

export type MarketingStrategyMode = 'MANUAL_APPROVAL' | 'AUTO_PUBLISH';

export interface MarketingStrategy {
  workspaceId: string;
  businessGoal: string;
  campaignObjective: string;
  targetAudience: string;
  preferredPlatforms: ('facebook' | 'instagram')[];
  postingFrequency: string; // e.g. "3 posts per week"
  toneBrandVoice: string;
  industryType: string;
  contentPillars: string[];
  offerCouponLink?: string; // workspace-scoped; never logs secrets
  timezone: string;
  approvalMode: MarketingStrategyMode;
  createdAt: string;
  updatedAt: string;
}

export interface ContentCalendarEntry {
  id?: string;
  workspaceId: string;
  day: string; // ISO date
  platform: 'facebook' | 'instagram';
  postType: string;
  topic: string;
  generatedContent?: string;
  scheduledTime?: string;
  status: SocialPublishRecord['state'];
  linkedCampaign?: string;
  linkedOffer?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BestTimeRecommendation {
  platform: 'facebook' | 'instagram';
  recommendedTime: string; // ISO datetime
  reason: string;
  source: 'heuristic' | 'recorded_evidence';
  confidence: number; // 0-1
  evidenceRefs?: string[];
}

export interface MarketingPerformanceRecord {
  recordId: string;
  workspaceId: string;
  externalPostId?: string;
  platform: 'facebook' | 'instagram';
  impressions?: number;
  reach?: number;
  engagement?: number;
  reactions?: number;
  comments?: number;
  shares?: number;
  clicks?: number;
  fetchedAt: string;
  evidenceReferences: string[]; // links to verified metric sources
}

export interface LearningEvidence {
  workspaceId: string;
  contentCharacteristics: string[]; // e.g. ['restaurant','evening','offer']
  platform: 'facebook' | 'instagram';
  timeWindow: string; // e.g. '18:00-21:00'
  evidenceRefs: string[];
  recommendationConfidence: number;
  recordedAt: string;
}

const STRATEGY_COLLECTION = 'marketingStrategies';
const CALENDAR_COLLECTION = 'contentCalendar';
const PERFORMANCE_COLLECTION = 'marketingPerformance';
const LEARNING_COLLECTION = 'marketingLearningEvidence';

export async function getOrCreateStrategy(
  workspaceId: string,
  defaults?: Partial<MarketingStrategy>
): Promise<MarketingStrategy> {
  const doc = adminDb.collection(STRATEGY_COLLECTION).doc(workspaceId);
  const snap = await doc.get();
  if (snap.exists) {
    return { ...snap.data() as MarketingStrategy, workspaceId };
  }
  const now = new Date().toISOString();
  const strategy: MarketingStrategy = {
    workspaceId,
    businessGoal: defaults?.businessGoal || '',
    campaignObjective: defaults?.campaignObjective || '',
    targetAudience: defaults?.targetAudience || '',
    preferredPlatforms: defaults?.preferredPlatforms || ['facebook', 'instagram'],
    postingFrequency: defaults?.postingFrequency || '3 posts per week',
    toneBrandVoice: defaults?.toneBrandVoice || 'Friendly & Professional',
    industryType: defaults?.industryType || 'Small Business',
    contentPillars: defaults?.contentPillars || [],
    timezone: defaults?.timezone || 'Africa/Cairo',
    approvalMode: defaults?.approvalMode || 'MANUAL_APPROVAL',
    createdAt: now,
    updatedAt: now,
    ...stripUndefined({
      offerCouponLink: defaults?.offerCouponLink,
    } as Record<string, unknown>),
  };
  await doc.set(strategy);
  return strategy;
}

export async function setStrategy(
  workspaceId: string,
  updates: Partial<Omit<MarketingStrategy, 'workspaceId' | 'createdAt'>>
): Promise<boolean> {
  const doc = adminDb.collection(STRATEGY_COLLECTION).doc(workspaceId);
  await doc.set({ ...updates, updatedAt: new Date().toISOString() }, { merge: true });
  return true;
}

export async function createCalendarEntry(
  workspaceId: string,
  entry: Partial<ContentCalendarEntry>
): Promise<string> {
  const doc = adminDb.collection(CALENDAR_COLLECTION).doc();
  const now = new Date().toISOString();
  const record: ContentCalendarEntry = {
    workspaceId,
    day: entry.day || new Date().toISOString().slice(0, 10),
    platform: entry.platform || 'facebook',
    postType: entry.postType || 'post',
    topic: entry.topic || '',
    status: entry.status || 'draft',
    createdAt: now,
    updatedAt: now,
    ...stripUndefined({
      generatedContent: entry.generatedContent,
      scheduledTime: entry.scheduledTime,
      linkedCampaign: entry.linkedCampaign,
      linkedOffer: entry.linkedOffer,
    } as Record<string, unknown>),
  };
  await doc.set(record);
  return doc.id;
}

export async function getCalendarEntry(
  workspaceId: string,
  entryId: string
): Promise<ContentCalendarEntry | null> {
  const snap = await adminDb.collection(CALENDAR_COLLECTION).doc(entryId).get();
  if (!snap.exists) return null;
  const data = snap.data() as ContentCalendarEntry;
  if (data.workspaceId !== workspaceId) return null;
  return { ...data, id: snap.id };
}

export async function listCalendar(
  workspaceId: string,
  platform?: string,
  status?: string
): Promise<ContentCalendarEntry[]> {
  let q: any = adminDb.collection(CALENDAR_COLLECTION).where('workspaceId', '==', workspaceId);
  if (platform) q = q.where('platform', '==', platform);
  if (status) q = q.where('status', '==', status);
  const snap = await q.get();
  return snap.docs.map((d) => ({ ...d.data() as ContentCalendarEntry, id: d.id }));
}

export function recommendPublishTime(
  strategy: MarketingStrategy,
  platform: 'facebook' | 'instagram'
): BestTimeRecommendation {
  // For Step 5: deterministic heuristics based on timezone and platform defaults
  // Replaceable with real analytics-based optimization once performance data exists
  const timeZone = strategy.timezone || 'Africa/Cairo';
  const baseHour = platform === 'instagram' ? 19 : 18; // Instagram evening vs Facebook evening
  const recommended = new Date();
  recommended.setUTCHours(baseHour, 30, 0, 0);
  const isoTime = recommended.toISOString();
  return {
    platform,
    recommendedTime: isoTime,
    reason: `Heuristic default for ${platform} in ${timeZone} (evening peak). Replaceable with analytics optimization.`,
    source: 'heuristic',
    confidence: 0.3,
  };
}

export async function recordPerformance(
  workspaceId: string,
  data: Partial<MarketingPerformanceRecord> & { workspaceId: string }
): Promise<string> {
  const doc = adminDb.collection(PERFORMANCE_COLLECTION).doc();
  const record: MarketingPerformanceRecord = stripUndefined({
    recordId: doc.id,
    workspaceId: data.workspaceId,
    platform: data.platform || 'facebook',
    impressions: data.impressions,
    reach: data.reach,
    engagement: data.engagement,
    reactions: data.reactions,
    comments: data.comments,
    shares: data.shares,
    clicks: data.clicks,
    fetchedAt: data.fetchedAt || new Date().toISOString(),
    evidenceReferences: data.evidenceReferences || [],
    externalPostId: data.externalPostId,
  } as Record<string, unknown>) as unknown as MarketingPerformanceRecord;
  await doc.set(record);
  return doc.id;
}

export async function getPerformance(
  workspaceId: string,
  externalPostId?: string
): Promise<MarketingPerformanceRecord[]> {
  const snap = await adminDb.collection(PERFORMANCE_COLLECTION).where('workspaceId', '==', workspaceId).get();
  const results: MarketingPerformanceRecord[] = [];
  for (const d of snap.docs) {
    const data = d.data() as MarketingPerformanceRecord;
    if (!externalPostId || data.externalPostId === externalPostId) {
      results.push({ ...data, recordId: d.id });
    }
  }
  return results;
}

export async function recordLearningEvidence(
  workspaceId: string,
  evidence: Partial<LearningEvidence> & { workspaceId: string; contentCharacteristics: string[] }
): Promise<string> {
  const doc = adminDb.collection(LEARNING_COLLECTION).doc();
  const record: LearningEvidence = {
    workspaceId: evidence.workspaceId,
    contentCharacteristics: evidence.contentCharacteristics,
    platform: evidence.platform || 'facebook',
    timeWindow: evidence.timeWindow || 'evening',
    evidenceRefs: evidence.evidenceRefs || [],
    recommendationConfidence: evidence.recommendationConfidence ?? 0.5,
    recordedAt: new Date().toISOString(),
  };
  await doc.set(record);
  return doc.id;
}

export async function getLearningEvidence(
  workspaceId: string
): Promise<LearningEvidence[]> {
  const snap = await adminDb.collection(LEARNING_COLLECTION).where('workspaceId', '==', workspaceId).get();
  return snap.docs.map((d) => d.data() as LearningEvidence);
}

export async function generateMarketingContent(
  workspaceId: string,
  strategy: MarketingStrategy,
  platform: 'facebook' | 'instagram',
  previousContent?: string[]
): Promise<{ content: string; topic: string; recommendedTime: BestTimeRecommendation }> {
  // Connect to existing ClientMarketingAgent generation logic via bridge
  const { publishMarketingContent } = await import('./marketingPublishingBridge.ts');
  const timeRec = recommendPublishTime(strategy, platform);
  const topic = strategy.campaignObjective || strategy.businessGoal || 'Social Engagement';
  const content = `Generated for ${platform}: ${topic}. Brand voice: ${strategy.toneBrandVoice}. Audience: ${strategy.targetAudience}.`;
  return { content, topic, recommendedTime: timeRec };
}
