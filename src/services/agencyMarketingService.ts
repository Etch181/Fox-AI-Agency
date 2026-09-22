import { adminDb } from "./firebaseAdmin.ts";
import { aiAgentService } from "./aiAgentService.ts";

export type AgencyMarketingPlatform = "facebook" | "instagram" | "both";
export type AgencyMarketingFormat = "text" | "image" | "video";

const AGENCY_BRAIN_WORKSPACE: any = {
  id: "",
  name: "FOX AI Agency",
  industry: "Small Business",
  status: "active",
  planId: "enterprise",
  aiSettings: { languageMode: "arabic" },
  businessProfile: { brandName: "FOX AI Agency", country: "Egypt", timezone: "Africa/Cairo" },
};

const BASE_CONTEXT = [
  "You are the internal marketing brain for FOX AI Agency itself, not for any client or tenant.",
  "FOX is an AI agency/SaaS providing AI-powered customer service, bookings, complaints handling, sales assistance, CRM/Unified Inbox, business-specific agents and automation for clinics, pharmacies, retail/stores, restaurants and course centers.",
  "FOX brand: premium, modern, intelligent, trustworthy, practical, dark/orange visual identity. Audience: Egyptian business owners and decision makers.",
  "Never invent client results, revenue, customers, partnerships, Meta approvals, product capabilities or live metrics. Separate existing capabilities from future ideas.",
  "Prefer useful educational content, product demonstrations, pain-point content, practical automation examples, feature explainers, behind-the-scenes AI workflows, objections/FAQ, and clear non-spammy CTAs.",
].join("\\n");

function clean(value: unknown, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

export async function runAgencyBrain(message: string, language: "ar" | "en" = "ar") {
  const prompt = BASE_CONTEXT + "\\n\\n" +
    (language === "ar" ? "Respond in Arabic." : "Respond in English.") +
    "\\n\\n" + message;

  return aiAgentService.generateChatResponse({
    workspace: AGENCY_BRAIN_WORKSPACE,
    message: prompt,
    channel: "agency_marketing",
    sessionId: "fox-agency-marketing-" + Date.now(),
  });
}

export async function suggestAgencyTopics(input: { platform: AgencyMarketingPlatform; language: "ar" | "en"; campaignType?: string }) {
  const result = await runAgencyBrain([
    "Generate 8 original social-media topic ideas for FOX AI Agency itself.",
    "Platform: " + input.platform + ".",
    "Campaign type: " + clean(input.campaignType, "always-on agency growth") + ".",
    'Return JSON only: {"ideas":[{"title":"","angle":"","audience":"","cta":"","format":"text|image|video"}]}',
    "Ideas must be specific to FOX AI Agency and not generic advice for a random business.",
  ].join("\\n"), input.language);

  const raw = clean(result?.response || result?.aiResponse);
  const json = raw.match(/\\{[\\s\\S]*\\}/)?.[0];
  if (!json) throw new Error("AGENCY_MARKETING_IDEAS_INVALID");
  const parsed = JSON.parse(json);
  return Array.isArray(parsed?.ideas) ? parsed.ideas.slice(0, 8) : [];
}

export async function generateAgencyPost(input: {
  topic: string;
  platform: "facebook" | "instagram";
  format: AgencyMarketingFormat;
  audience: string;
  tone: string;
  language: "ar" | "en";
}) {
  const result = await runAgencyBrain([
    "Create a publish-ready FOX AI Agency social post.",
    "Topic: " + input.topic + ".",
    "Platform: " + input.platform + ".",
    "Format: " + input.format + ".",
    "Target audience: " + input.audience + ".",
    "Tone: " + input.tone + ".",
    'Return JSON only with: {"headline":"","caption":"","cta":"","hashtags":[""],"visualConcept":"","videoHook":"","videoScript":""}.',
    "For image format, visualConcept must be a production-ready prompt for a branded FOX visual.",
    "For video format, videoHook and videoScript must be ready for a short social video.",
    "Do not claim that a post, asset, customer result or publishing action already happened.",
  ].join("\\n"), input.language);

  const raw = clean(result?.response || result?.aiResponse);
  const json = raw.match(/\\{[\\s\\S]*\\}/)?.[0];
  if (!json) throw new Error("AGENCY_MARKETING_POST_INVALID");
  const parsed = JSON.parse(json);
  return { ...parsed, generatedAt: new Date().toISOString(), platform: input.platform, format: input.format, topic: input.topic, audience: input.audience };
}

export async function recommendAgencyPublishTime(platform: "facebook" | "instagram") {
  const snap = await adminDb.collection("foxAgencyMarketingPosts")
    .where("platform", "==", platform)
    .where("status", "==", "published")
    .limit(100).get();

  const sampleSize = snap.size;
  if (sampleSize < 3) {
    return {
      recommendedTime: platform === "instagram" ? "19:30" : "18:30",
      bestDays: platform === "instagram" ? ["Thursday", "Saturday"] : ["Wednesday", "Sunday"],
      source: "heuristic",
      confidence: 0.3,
      sampleSize,
      reason: "No verified FOX publishing-performance sample is available yet; using a conservative Cairo-local evening starting point.",
    };
  }

  const byHour = new Map<number, number>();
  const byDay = new Map<string, number>();
  for (const doc of snap.docs) {
    const item: any = doc.data() || {};
    const date = new Date(String(item.publishedAt || item.scheduledAt || ""));
    if (Number.isNaN(date.getTime())) continue;
    const parts = new Intl.DateTimeFormat("en-US", { timeZone: "Africa/Cairo", weekday: "long", hour: "2-digit", hourCycle: "h23" }).formatToParts(date);
    const hour = Number(parts.find((p) => p.type === "hour")?.value || 18);
    const weekday = String(parts.find((p) => p.type === "weekday")?.value || "Wednesday");
    const score = Number(item.engagementScore || 1);
    byHour.set(hour, (byHour.get(hour) || 0) + score);
    byDay.set(weekday, (byDay.get(weekday) || 0) + score);
  }

  const topHour = [...byHour.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 18;
  const topDays = [...byDay.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([day]) => day);

  return {
    recommendedTime: String(topHour).padStart(2, "0") + ":30",
    bestDays: topDays,
    source: "recorded_evidence",
    confidence: Math.min(0.9, 0.45 + sampleSize / 100),
    sampleSize,
    reason: "Recommendation derived from " + sampleSize + " FOX " + platform + " publishing records stored in Cairo time.",
  };
}

export async function saveAgencyPost(input: {
  topic: string;
  platform: "facebook" | "instagram";
  format: AgencyMarketingFormat;
  payload: Record<string, unknown>;
  scheduledAt?: string;
}) {
  const ref = adminDb.collection("foxAgencyMarketingPosts").doc();
  await ref.set({
    id: ref.id,
    brand: "FOX AI Agency",
    ownerScope: "agency",
    topic: input.topic,
    platform: input.platform,
    format: input.format,
    ...input.payload,
    status: input.scheduledAt ? "scheduled" : "draft",
    scheduledAt: input.scheduledAt || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function listAgencyPosts(limit = 20) {
  const snap = await adminDb.collection("foxAgencyMarketingPosts").orderBy("createdAt", "desc").limit(limit).get();
  return snap.docs.map((doc) => ({ id: doc.id, ...(doc.data() || {}) }));
}
