const BILLING_CYCLE_MS = 30 * 24 * 60 * 60 * 1000;

export interface EntitlementTimestampLike {
  toMillis(): number;
}

export function calculateEntitlementRenewal(
  existing: EntitlementTimestampLike | null | undefined,
  nowMs: number = Date.now(),
  durationDays: number = 30,
): Date {
  const existingMs = existing?.toMillis();
  const baseMs =
    typeof existingMs === "number" &&
    Number.isFinite(existingMs) &&
    existingMs > nowMs
      ? existingMs
      : nowMs;

  const durationMs =
    Number.isFinite(durationDays) && durationDays > 0
      ? durationDays * 24 * 60 * 60 * 1000
      : BILLING_CYCLE_MS;

  return new Date(baseMs + durationMs);
}
