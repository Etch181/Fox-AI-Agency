import type { IndustryType, PlanId, Workspace } from "../types.ts";

export type FoxFeature =
  | "crm"
  | "appointments"
  | "complaints"
  | "knowledge_base"
  | "telegram"
  | "whatsapp"
  | "analytics"
  | "industry_module"
  | "google_sheets"
  | "n8n"
  | "multiple_agents"
  | "custom_prompt"
  | "staff_accounts"
  | "api_access"
  | "instagram_messaging"   // For Instagram Direct Messages
  | "instagram_comments"    // For Instagram Comment replies
  | "instagram_publish"     // For Instagram publishing (when supported)
  | "marketing_engine"      // For the real Marketing Engine (auto-publish)
  | "appointment_reminder"  // For the Appointment Reminder Engine
  | "marketing_campaign"    // For the Marketing Campaign/Broadcast Engine (Phase 2)
  | "email_otp";             // For Email OTP (Phase 2)

const PLAN_FEATURES: Record<PlanId, FoxFeature[]> = {
  starter: [
    "crm",
    "appointments",
    "complaints",
    "knowledge_base",
    "telegram",
    "industry_module",
  ],

  business: [
    "crm",
    "appointments",
    "complaints",
    "knowledge_base",
    "telegram",
    "whatsapp",
    "analytics",
    "industry_module",
    "google_sheets",
    "custom_prompt",
    "instagram_messaging",   // Business plan gets Instagram Messaging
    "instagram_comments",    // Business plan gets Instagram Comments
    "marketing_engine",      // Business plan gets Marketing Engine
    "appointment_reminder",  // Business plan gets Appointment Reminder
  ],

  enterprise: [
    "crm",
    "appointments",
    "complaints",
    "knowledge_base",
    "telegram",
    "whatsapp",
    "analytics",
    "industry_module",
    "google_sheets",
    "n8n",
    "multiple_agents",
    "custom_prompt",
    "staff_accounts",
    "api_access",
    "instagram_messaging",   // Enterprise plan gets all Instagram features
    "instagram_comments",
    "instagram_publish",     // Enterprise gets publishing (when supported)
    "marketing_engine",
    "appointment_reminder",
    "marketing_campaign",    // Enterprise gets Campaign Engine
    "email_otp",             // Enterprise gets Email OTP
  ],
};

const INDUSTRY_FEATURES: Partial<
  Record<IndustryType, FoxFeature[]>
> = {
  Clinic: [
    "crm",
    "appointments",
    "complaints",
    "knowledge_base",
    "industry_module",
  ],

  Pharmacy: [
    "crm",
    "complaints",
    "knowledge_base",
    "industry_module",
  ],

  Restaurant: [
    "crm",
    "appointments",
    "complaints",
    "knowledge_base",
    "industry_module",
  ],

  Retail: [
    "crm",
    "complaints",
    "knowledge_base",
    "industry_module",
  ],

  "Course Center": [
    "crm",
    "appointments",
    "complaints",
    "knowledge_base",
    "industry_module",
  ],

  "Small Business": [
    "crm",
    "complaints",
    "knowledge_base",
    "industry_module",
  ],
};

export function hasPlanFeature(
  planId: PlanId | undefined,
  feature: FoxFeature
): boolean {
  if (!planId) return false;

  return PLAN_FEATURES[planId]?.includes(feature) ?? false;
}

export function isWorkspaceEntitlementActive(
  workspace: Workspace | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (!workspace || workspace.status !== "active") {
    return false;
  }

  const expiresAt = workspace.entitlementExpiresAt;

  if (!expiresAt || typeof expiresAt.toMillis !== "function") {
    return false;
  }

  return expiresAt.toMillis() > nowMs;
}

export function hasWorkspaceFeature(
  workspace: Workspace | null | undefined,
  feature: FoxFeature
): boolean {
  if (!isWorkspaceEntitlementActive(workspace)) return false;

  return hasPlanFeature(workspace.planId, feature);
}

export function hasIndustryFeature(
  industry: IndustryType | undefined,
  feature: FoxFeature
): boolean {
  if (!industry) return false;

  return INDUSTRY_FEATURES[industry]?.includes(feature) ?? false;
}

export function canWorkspaceUseFeature(
  workspace: Workspace | null | undefined,
  feature: FoxFeature
): boolean {
  if (!isWorkspaceEntitlementActive(workspace)) return false;

  /*
   * Channel / subscription features are controlled by the plan.
   * Industry-specific modules additionally respect industry.
   */
  if (feature === "industry_module") {
    return (
      hasPlanFeature(workspace.planId, feature) &&
      hasIndustryFeature(workspace.industry, feature)
    );
  }

  return hasPlanFeature(workspace.planId, feature);
}

export function getWorkspaceEntitlements(
  workspace: Workspace | null | undefined
) {
  if (!workspace || !isWorkspaceEntitlementActive(workspace)) {
    return {
      planId: null,
      industry: null,
      features: [] as FoxFeature[],
    };
  }

  return {
    planId: workspace.planId,
    industry: workspace.industry,
    features: PLAN_FEATURES[workspace.planId] || [],
  };
}

export function getIndustryModuleName(
  industry?: IndustryType
): string {
  switch (industry) {
    case "Clinic":
      return "Clinic & Doctors";

    case "Pharmacy":
      return "Pharmacy & Medicines";

    case "Restaurant":
      return "Restaurant & Menu";

    case "Retail":
      return "Products & Inventory";

    case "Course Center":
      return "Courses & Students";

    case "Small Business":
    default:
      return "Business Catalog";
  }
}