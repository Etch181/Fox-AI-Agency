export type EnvValidationResult = {
  valid: boolean;
  isProduction: boolean;
  isStaging: boolean;
  isDevelopment: boolean;
  missing: string[];
  warnings: { name: string; detail: string }[];
};

export function metaStagingFatalDecision(
  result: EnvValidationResult,
  enableMeta: string | undefined
): boolean {
  return (
    result.isStaging &&
    enableMeta === "true" &&
    (result.missing || []).some(
      (m: string) => m === "META_APP_SECRET" || m === "META_WEBHOOK_VERIFY_TOKEN"
    )
  );
}
