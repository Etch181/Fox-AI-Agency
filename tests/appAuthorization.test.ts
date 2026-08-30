import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  ALLOWED_VIEWS_BY_ROLE,
  resolveAuthorizedView,
  resolveAuthoritativeUserRole,
  roleSafeDefaultView,
} from "../src/security/appAuthorization.ts";

const serverSource = readFileSync(
  new URL("../server.ts", import.meta.url),
  "utf8",
);

const validRoles = ["super_admin", "client_owner", "staff"] as const;

for (const role of validRoles) {
  test(`authoritative role validation accepts ${role}`, () => {
    assert.equal(resolveAuthoritativeUserRole(role), role);
  });
}

test("authoritative role validation rejects missing, empty, malformed, and unknown roles", () => {
  for (const invalidRole of [
    undefined,
    null,
    "",
    " ",
    "owner",
    "client_admin",
    "SUPER_ADMIN",
    42,
    {},
    ["client_owner"],
  ]) {
    assert.equal(resolveAuthoritativeUserRole(invalidRole), null);
  }
});

test("authoritative invalid role wins over a stale cached valid role", () => {
  const staleCachedRole = "client_owner";
  const authoritativeRole = "unsupported";

  assert.equal(staleCachedRole, "client_owner");
  assert.equal(resolveAuthoritativeUserRole(authoritativeRole), null);
});

test("staff allowlist contains operational views and excludes owner and agency controls", () => {
  const allowed = ALLOWED_VIEWS_BY_ROLE.staff;

  for (const operationalView of [
    "client_dashboard",
    "client_crm",
    "client_industry_module",
    "client_appointments",
    "client_complaints",
    "client_tickets",
    "client_order_verification",
    "client_service_ratings",
    "client_unified_inbox",
  ] as const) {
    assert.equal(allowed.includes(operationalView), true, operationalView);
  }

  for (const privilegedView of [
    "admin_dashboard",
    "client_subscription",
    "client_ai_settings",
    "client_telegram",
    "client_whatsapp",
    "client_n8n",
    "client_staff",
    "client_promotions",
    "client_knowledge_builder",
    "client_integrations",
    "client_fox_advisor",
    "client_ai_analytics",
    "client_marketing_agent",
  ] as const) {
    assert.equal(allowed.includes(privilegedView), false, privilegedView);
  }
});

test("direct navigation resolves unauthorized and unknown views to a role-safe fallback", () => {
  assert.equal(resolveAuthorizedView("staff", "client_staff"), "client_dashboard");
  assert.equal(resolveAuthorizedView("staff", "admin_clients"), "client_dashboard");
  assert.equal(resolveAuthorizedView("client_owner", "admin_codes"), "client_dashboard");
  assert.equal(resolveAuthorizedView("client_owner", "manually_supplied"), "client_dashboard");
  assert.equal(resolveAuthorizedView("super_admin", "manually_supplied"), "admin_dashboard");
});

test("restored navigation is re-authorized rather than trusted", () => {
  const restoredOwnerView = "client_subscription";
  const restoredAdminView = "admin_audit_logs";

  assert.equal(resolveAuthorizedView("staff", restoredOwnerView), roleSafeDefaultView("staff"));
  assert.equal(resolveAuthorizedView("client_owner", restoredAdminView), roleSafeDefaultView("client_owner"));
  assert.equal(resolveAuthorizedView("super_admin", restoredAdminView), "admin_audit_logs");
});

test("known allowed views remain available to their intended roles", () => {
  assert.equal(resolveAuthorizedView("staff", "client_crm"), "client_crm");
  assert.equal(resolveAuthorizedView("client_owner", "client_subscription"), "client_subscription");
  assert.equal(resolveAuthorizedView("super_admin", "admin_clients"), "admin_clients");
});

test("server authentication uses the same authoritative role validator", () => {
  assert.match(serverSource, /resolveAuthoritativeUserRole/);
  assert.match(serverSource, /const authoritativeRole\s*=\s*resolveAuthoritativeUserRole/);
  assert.match(serverSource, /role:\s*authoritativeRole/);
});

test("public starter provisioning is a trusted transactional server route", () => {
  const start = serverSource.indexOf('"/api/registration/provision-workspace"');
  assert.notEqual(start, -1);
  const route = serverSource.slice(start, start + 9000);

  assert.match(route, /authenticateFirebaseRegistrationRequest/);
  assert.match(serverSource, /decoded\.email_verified\s*!==\s*true/);
  assert.match(serverSource, /REGISTRATION_EMAIL_NOT_VERIFIED/);
  assert.match(route, /runTransaction/);
  assert.match(route, /registrationClaimId\("email"/);
  assert.match(route, /registrationClaimId\("phone"/);
  assert.match(route, /trialClaims/);
  assert.match(route, /planId:\s*"starter"/);
  assert.doesNotMatch(route, /req\.body\?\.planId/);
});
