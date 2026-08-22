import { IndustryType, PlanId, Workspace } from "../types";

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
  | "api_access";

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

export function hasWorkspaceFeature(
  workspace: Workspace | null | undefined,
  feature: FoxFeature
): boolean {
  if (!workspace) return false;

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
  if (!workspace) return false;

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
  if (!workspace) {
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
