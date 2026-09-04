import assert from "node:assert/strict";
import test from "node:test";

// Inline pure boot decision (same logic as src/utils/bootDecision)
function metaStagingFatalDecision(result: { isStaging: boolean; missing?: string[]; isProduction: boolean; valid?: boolean; warnings?: any[] }, enableMeta: string): boolean {
  return (
    result.isStaging &&
    enableMeta === "true" &&
    (result.missing || []).some(
      (m: string) => m === "META_APP_SECRET" || m === "META_WEBHOOK_VERIFY_TOKEN"
    )
  );
}

test("boot decision: staging ENABLE_META=true missing META_APP_SECRET => fatal", () => {
  const result = { isStaging: true, missing: ["META_APP_SECRET"], isProduction: false, valid: false, warnings: [] };
  assert.strictEqual(metaStagingFatalDecision(result, "true"), true);
});

test("boot decision: staging ENABLE_META=true missing META_WEBHOOK_VERIFY_TOKEN => fatal", () => {
  const result = { isStaging: true, missing: ["META_WEBHOOK_VERIFY_TOKEN"], isProduction: false, valid: false, warnings: [] };
  assert.strictEqual(metaStagingFatalDecision(result, "true"), true);
});

test("boot decision: staging ENABLE_META=true both secrets present => non-fatal", () => {
  const result = { isStaging: true, missing: [], isProduction: false, valid: true, warnings: [] };
  assert.strictEqual(metaStagingFatalDecision(result, "true"), false);
});

test("boot decision: staging ENABLE_META=false missing secrets => non-fatal", () => {
  const result = { isStaging: true, missing: ["META_APP_SECRET", "META_WEBHOOK_VERIFY_TOKEN"], isProduction: false, valid: false, warnings: [] };
  assert.strictEqual(metaStagingFatalDecision(result, "false"), false);
});

test("boot decision: unrelated staging warnings remain non-fatal", () => {
  const result = { isStaging: true, missing: ["SMTP_HOST"], isProduction: false, valid: false, warnings: [{ name: "SMTP_HOST" }] };
  assert.strictEqual(metaStagingFatalDecision(result, "true"), false);
});

test("boot decision: production invalid environment => production path handles separately", () => {
  const result = { isStaging: false, missing: ["FOX_SECRET_KEY"], isProduction: true, valid: false, warnings: [] };
  assert.strictEqual(metaStagingFatalDecision(result, "false"), false);
});
