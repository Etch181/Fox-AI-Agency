import { createHash } from "node:crypto";

export type RegistrationClaimKind = "email" | "phone";

export function normalizeRegistrationEmail(value: unknown): string {
  const normalized = String(value || "").trim().toLowerCase();
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ||
    normalized.length > 254
  ) {
    throw new Error("REGISTRATION_EMAIL_INVALID");
  }
  return normalized;
}

export function normalizeRegistrationPhone(value: unknown): string {
  let normalized = String(value || "").replace(/\D/g, "");
  if (normalized.startsWith("00")) {
    normalized = normalized.slice(2);
  }
  // FOX currently operates in Egypt. Canonicalize the common national and
  // country-code forms so one handset cannot claim multiple starter trials.
  if (/^01\d{9}$/.test(normalized)) {
    normalized = `20${normalized.slice(1)}`;
  } else if (/^1\d{9}$/.test(normalized)) {
    normalized = `20${normalized}`;
  }
  if (normalized.length < 8 || normalized.length > 15) {
    throw new Error("REGISTRATION_PHONE_INVALID");
  }
  return normalized;
}

export function registrationClaimId(
  kind: RegistrationClaimKind,
  value: unknown,
): string {
  const normalized = kind === "email"
    ? normalizeRegistrationEmail(value)
    : normalizeRegistrationPhone(value);

  return `${kind}_${createHash("sha256")
    .update(`${kind}:${normalized}`, "utf8")
    .digest("hex")}`;
}
