export const SUPPORTED_USER_ROLES = [
  "super_admin",
  "client_owner",
  "staff",
] as const;

export type UserRole = (typeof SUPPORTED_USER_ROLES)[number];

export const ALL_VIEWS = [
  "admin_dashboard",
  "admin_clients",
  "admin_plans",
  "admin_payments",
  "admin_codes",
  "admin_telegram",
  "admin_n8n",
  "admin_tickets",
  "admin_audit_logs",
  "admin_gemini_status",
  "admin_ratings",
  "client_dashboard",
  "client_crm",
  "client_industry_module",
  "client_appointments",
  "client_complaints",
  "client_ai_settings",
  "client_telegram",
  "client_whatsapp",
  "client_live_simulator",
  "client_subscription",
  "client_n8n",
  "client_staff",
  "client_tickets",
  "client_promotions",
  "client_order_verification",
  "client_service_ratings",
  "client_unified_inbox",
  "client_knowledge_builder",
  "client_integrations",
  "client_fox_advisor",
  "client_ai_analytics",
  "client_marketing_agent",
] as const;

export type ViewTab = (typeof ALL_VIEWS)[number];

const CLIENT_OWNER_VIEWS = ALL_VIEWS.filter(
  (view): view is ViewTab =>
    view.startsWith("client_") &&
    view !== "client_ai_analytics" &&
    view !== "client_marketing_agent",
);

const STAFF_VIEWS = [
  "client_dashboard",
  "client_crm",
  "client_industry_module",
  "client_appointments",
  "client_complaints",
  "client_tickets",
  "client_order_verification",
  "client_service_ratings",
  "client_unified_inbox",
] as const satisfies readonly ViewTab[];

export const ALLOWED_VIEWS_BY_ROLE: Readonly<
  Record<UserRole, readonly ViewTab[]>
> = Object.freeze({
  // Super Admin intentionally retains tenant inspection views because the
  // existing agency console exposes a selected-workspace inspection context.
  super_admin: Object.freeze([...ALL_VIEWS]),
  client_owner: Object.freeze([...CLIENT_OWNER_VIEWS]),
  // Staff has only common operational workspace views. Owner configuration,
  // billing, integration credentials, staff administration, and agency views
  // are deliberately excluded.
  staff: Object.freeze([...STAFF_VIEWS]),
});

export function resolveAuthoritativeUserRole(value: unknown): UserRole | null {
  return typeof value === "string" &&
    (SUPPORTED_USER_ROLES as readonly string[]).includes(value)
    ? (value as UserRole)
    : null;
}

export function isKnownView(value: unknown): value is ViewTab {
  return typeof value === "string" &&
    (ALL_VIEWS as readonly string[]).includes(value);
}

export function roleSafeDefaultView(role: UserRole): ViewTab {
  return role === "super_admin" ? "admin_dashboard" : "client_dashboard";
}

export function isViewAllowedForRole(
  role: UserRole,
  view: unknown,
): view is ViewTab {
  return isKnownView(view) && ALLOWED_VIEWS_BY_ROLE[role].includes(view);
}

export function resolveAuthorizedView(
  role: UserRole,
  requestedView: unknown,
): ViewTab {
  return isViewAllowedForRole(role, requestedView)
    ? requestedView
    : roleSafeDefaultView(role);
}
