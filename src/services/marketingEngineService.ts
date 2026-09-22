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
export type MarketingMediaType = 'text' | 'image' | 'video';

export interface MarketingMediaPlan {
  type: MarketingMediaType;
  purpose: string;
  prompt?: string;
  script?: string;
  durationSeconds?: number;
  status: 'planned' | 'ready' | 'failed';
  assetUrl?: string;
}

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
  mediaType?: MarketingMediaType;
  mediaPlan?: MarketingMediaPlan;
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
  bestDays?: string;
  sampleSize?: number;
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
const MEDIA_JOB_COLLECTION = 'marketingMediaJobs';

export function buildMediaPlan(
  mediaType: MarketingMediaType,
  topic: string,
  businessName: string,
  content: string,
): MarketingMediaPlan {
  if (mediaType === 'text') {
    return { type: 'text', purpose: 'Publish-ready text post', status: 'ready' };
  }
  if (mediaType === 'image') {
    return {
      type: 'image', purpose: 'Social visual matched to the campaign',
      prompt: `Create a branded social-media visual for ${businessName}. Topic: ${topic}. Use the approved brand identity, avoid invented claims, prices or medical promises. Visual concept: ${content.slice(0, 500)}`,
      status: 'planned',
    };
  }
  return {
    type: 'video', purpose: 'Short-form social video',
    script: content,
    prompt: `Create a vertical short-form video for ${businessName} about ${topic}. Use this approved script exactly as the source of truth; do not invent offers or facts.`,
    durationSeconds: 30,
    status: 'planned',
  };
}

export async function createMediaJob(
  workspaceId: string,
  plan: MarketingMediaPlan,
  linkedPostId?: string,
): Promise<string> {
  const doc = adminDb.collection(MEDIA_JOB_COLLECTION).doc();
  await doc.set(stripUndefined({
    workspaceId, linkedPostId, ...plan,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as Record<string, unknown>));
  return doc.id;
}

export async function getMediaJob(workspaceId: string, jobId: string): Promise<Record<string, unknown> | null> {
  const snap = await adminDb.collection(MEDIA_JOB_COLLECTION).doc(jobId).get();
  if (!snap.exists || String(snap.data()?.workspaceId || '') !== workspaceId) return null;
  return { id: snap.id, ...(snap.data() || {}) };
}

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
      mediaType: entry.mediaType,
      mediaPlan: entry.mediaPlan,
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

export async function analyzeBestPublishTime(
  workspaceId: string,
  platform: 'facebook' | 'instagram'
): Promise<BestTimeRecommendation> {
  const timezone = 'Africa/Cairo';
  const snap = await adminDb
    .collection('socialPublishingRecords')
    .where('workspaceId', '==', workspaceId)
    .where('platform', '==', platform)
    .where('state', '==', 'published')
    .limit(100)
    .get();

  const performanceSnap = await adminDb
    .collection(PERFORMANCE_COLLECTION)
    .where('workspaceId', '==', workspaceId)
    .limit(100)
    .get();

  const performanceByPost = new Map<string, number>();
  for (const docSnap of performanceSnap.docs) {
    const data: any = docSnap.data() || {};
    const engagement = Number(data.engagement || 0) + Number(data.shares || 0) * 2 + Number(data.comments || 0) * 2 + Number(data.clicks || 0);
    if (data.externalPostId) performanceByPost.set(String(data.externalPostId), Math.max(1, engagement));
  }

  const samples = snap.docs
    .map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as any) }))
    .filter((post: any) => post.publishedAt || post.scheduledAt);

  if (samples.length < 3) {
    return recommendPublishTime({
      workspaceId,
      businessGoal: '',
      campaignObjective: '',
      targetAudience: '',
      preferredPlatforms: [platform],
      postingFrequency: '',
      toneBrandVoice: '',
      industryType: '',
      contentPillars: [],
      timezone,
      approvalMode: 'MANUAL_APPROVAL',
      createdAt: '',
      updatedAt: '',
    }, platform);
  }

  const byHour = new Map<number, { score: number; count: number }>();
  const byDay = new Map<string, number>();
  for (const post of samples) {
    const timestamp = String(post.publishedAt || post.scheduledAt || '');
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) continue;
    const local = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'long',
      hour: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const hour = Number(local.find((p) => p.type === 'hour')?.value || 18);
    const weekday = String(local.find((p) => p.type === 'weekday')?.value || 'weekday');
    const score = performanceByPost.get(String(post.externalPostId || '')) || 1;
    const currentHour = byHour.get(hour) || { score: 0, count: 0 };
    currentHour.score += score;
    currentHour.count += 1;
    byHour.set(hour, currentHour);
    byDay.set(weekday, (byDay.get(weekday) || 0) + score);
  }

  const hourWinner = [...byHour.entries()].sort((a, b) => {
    const aRate = a[1].score / Math.max(1, a[1].count);
    const bRate = b[1].score / Math.max(1, b[1].count);
    return bRate - aRate;
  })[0];
  const dayWinners = [...byDay.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([day]) => day);
  const hour = hourWinner?.[0] ?? (platform === 'instagram' ? 19 : 18);
  const confidence = Math.min(0.92, 0.45 + Math.min(0.35, samples.length / 40));

  const today = new Date();
  const dayParts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(today);
  const year = Number(dayParts.find((p) => p.type === 'year')?.value || today.getUTCFullYear());
  const month = Number(dayParts.find((p) => p.type === 'month')?.value || today.getUTCMonth() + 1);
  const day = Number(dayParts.find((p) => p.type === 'day')?.value || today.getUTCDate());
  const localNoonProbe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const offsetParts = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(localNoonProbe);
  const localNoonAsUtc = Date.UTC(
    Number(offsetParts.find((p) => p.type === 'year')?.value || year),
    Number(offsetParts.find((p) => p.type === 'month')?.value || month) - 1,
    Number(offsetParts.find((p) => p.type === 'day')?.value || day),
    Number(offsetParts.find((p) => p.type === 'hour')?.value || 12),
    Number(offsetParts.find((p) => p.type === 'minute')?.value || 0),
  );
  const timezoneOffsetMs = localNoonAsUtc - localNoonProbe.getTime();
  const recommended = new Date(Date.UTC(year, month - 1, day, hour, 30, 0) - timezoneOffsetMs);
  return {
    platform,
    recommendedTime: recommended.toISOString(),
    reason: `Based on ${samples.length} published ${platform} posts in ${timezone}, the strongest observed engagement window is around ${String(hour).padStart(2, '0')}:30.`,
    source: 'recorded_evidence',
    confidence,
    bestDays: dayWinners.join(' + ') || undefined,
    sampleSize: samples.length,
  };
}

export function recommendPublishTime(
  strategy: MarketingStrategy,
  platform: 'facebook' | 'instagram'
): BestTimeRecommendation {
  // For Step 5: deterministic heuristics based on timezone and platform defaults
  // Replaceable with real analytics-based optimization once performance data exists
  const timeZone = strategy.timezone || 'Africa/Cairo';
  const baseHour = platform === 'instagram' ? 19 : 18; // Instagram evening vs Facebook evening
  const today = new Date();
  const dayParts = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(today);
  const year = Number(dayParts.find((p) => p.type === 'year')?.value || today.getUTCFullYear());
  const month = Number(dayParts.find((p) => p.type === 'month')?.value || today.getUTCMonth() + 1);
  const day = Number(dayParts.find((p) => p.type === 'day')?.value || today.getUTCDate());
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(probe);
  const localAsUtc = Date.UTC(
    Number(parts.find((p) => p.type === 'year')?.value || year),
    Number(parts.find((p) => p.type === 'month')?.value || month) - 1,
    Number(parts.find((p) => p.type === 'day')?.value || day),
    Number(parts.find((p) => p.type === 'hour')?.value || 12),
    Number(parts.find((p) => p.type === 'minute')?.value || 0),
  );
  const offsetMs = localAsUtc - probe.getTime();
  const recommended = new Date(Date.UTC(year, month - 1, day, baseHour, 30, 0) - offsetMs);
  const isoTime = recommended.toISOString();
  return {
    platform,
    recommendedTime: isoTime,
    reason: `Heuristic default for ${platform} in ${timeZone} (evening peak). Replaceable with analytics optimization.`,
    source: 'heuristic',
    confidence: 0.3,
    bestDays: platform === 'instagram' ? 'Thursday + Saturday' : 'Wednesday + Sunday',
    sampleSize: 0,
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
  // Never fabricate marketing copy. Real generation will come from the configured
  // AI provider or the n8n Marketing FOX workflow.
  const topic = strategy.campaignObjective || strategy.businessGoal || '';
  if (!topic.trim()) {
    throw new Error('MARKETING_STRATEGY_TOPIC_REQUIRED');
  }
  throw new Error('MARKETING_AI_PROVIDER_UNAVAILABLE');
}

export interface MarketingAutomationStatus {
  strategySet: boolean;
  approvalMode: 'MANUAL_APPROVAL' | 'AUTO_PUBLISH' | 'not_configured';
  platforms: {
    facebook: { connected: boolean; accountId?: string };
    instagram: { connected: boolean; accountId?: string };
  };
  recentPosts: {
    total: number;
    published: number;
    failed: number;
    lastPublishedAt?: string;
  };
}

/** Returns the real automation status for a workspace's Marketing FOX module.
 *  Reads strategy settings + recent publish records from Firestore.
 *  Never returns simulated / fake data. */
export async function getMarketingAutomationStatus(
  workspaceId: string
): Promise<MarketingAutomationStatus> {
  // 1. Fetch strategy
  let strategySet = false;
  let approvalMode: 'MANUAL_APPROVAL' | 'AUTO_PUBLISH' | 'not_configured' = 'not_configured';
  let platforms: MarketingAutomationStatus['platforms'] = {
    facebook: { connected: false },
    instagram: { connected: false },
  };
  try {
    const doc = adminDb.collection(STRATEGY_COLLECTION).doc(workspaceId);
    const snap = await doc.get();
    if (snap.exists) {
      const data = snap.data() as MarketingStrategy;
      strategySet = true;
      approvalMode = (data.approvalMode === 'AUTO_PUBLISH' ? 'AUTO_PUBLISH' : 'MANUAL_APPROVAL') as MarketingAutomationStatus['approvalMode'];
      // A preferred platform is NOT a connection. Report connected only when
      // the workspace has the real Meta identity + secret-vault credential.
      const [facebookToken, instagramToken] = await Promise.all([
        getWorkspaceSecret(workspaceId, 'facebookPageAccessToken'),
        getWorkspaceSecret(workspaceId, 'instagramAccessToken'),
      ]);
      platforms = {
        facebook: {
          connected: Boolean(String(data.preferredPlatforms || []).includes('facebook') && facebookToken && (data as any).metaPageId),
          accountId: (data as any).metaPageId ? String((data as any).metaPageId) : undefined,
        },
        instagram: {
          connected: Boolean(String(data.preferredPlatforms || []).includes('instagram') && instagramToken && (data as any).instagramBusinessAccountId),
          accountId: (data as any).instagramBusinessAccountId ? String((data as any).instagramBusinessAccountId) : undefined,
        },
      };
    }
  } catch (e) {
    // Non-fatal: return defaults
  }

  // 2. Fetch recent publish records from socialPublishingService collection
  let recentPosts: MarketingAutomationStatus['recentPosts'] = {
    total: 0, published: 0, failed: 0,
  };
  try {
    const recordsSnap = await adminDb
      .collection('socialPublishingRecords')
      .where('workspaceId', '==', workspaceId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    const docs = recordsSnap.docs;
    recentPosts = {
      total: docs.length,
      published: docs.filter(d => d.data().state === 'published').length,
      failed: docs.filter(d => ['failed', 'error'].includes(d.data().state)).length,
      lastPublishedAt: docs.find(d => d.data().state === 'published')?.data().publishedAt,
    };
  } catch (e) {
    // socialPublishingRecords may not exist yet — non-fatal
  }

  return { strategySet, approvalMode, platforms, recentPosts };
}
