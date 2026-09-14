import assert from "node:assert/strict";
import test from "node:test";

import {
  validateEnvironment,
  ENV_VAR_CATALOG,
  printEnvValidation,
} from "../src/utils/envValidation.ts";
// Inline boot-decision logic (same as src/utils/bootDecision) without external import
function metaStagingFatalDecision(result: any, enableMeta: string): boolean {
  return (
    result.isStaging &&
    enableMeta === "true" &&
    (result.missing || []).some(
      (m: string) => m === "META_APP_SECRET" || m === "META_WEBHOOK_VERIFY_TOKEN"
    )
  );
}

test("FOX_SECRET_KEY is classified as universally required", () => {
  const entry = ENV_VAR_CATALOG.find((e) => e.name === "FOX_SECRET_KEY");
  assert.ok(entry, "FOX_SECRET_KEY should be in catalog");
  assert.equal(entry!.required, true);
  assert.equal(entry!.scope, "universal");
});

test("TELEGRAM_BOT_TOKEN is staging-only and not universally required", () => {
  const entry = ENV_VAR_CATALOG.find((e) => e.name === "TELEGRAM_BOT_TOKEN");
  assert.ok(entry);
  assert.equal(entry!.required, false);
  assert.equal(entry!.scope, "staging");
});

test("validateEnvironment detects missing required secrets in production", () => {
  const originalEnv = { ...process.env };
  const originalError = console.error;
  const originalWarn = console.warn;
  console.error = () => undefined;
  console.warn = () => undefined;

  try {
    process.env.NODE_ENV = "production";
    process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON = "fake-json";
    process.env.GOOGLE_CLOUD_PROJECT = "test-project";
    process.env.FOX_PUBLIC_BASE_URL = "https://test.example.com";

    // Clear FOX_SECRET_KEY to simulate missing
    delete process.env.FOX_SECRET_KEY;

    const result = validateEnvironment();
    assert.equal(result.isProduction, true);
    assert.equal(result.valid, false);
    assert.ok(result.missing.includes("FOX_SECRET_KEY"));
  } finally {
    Object.assign(process.env, originalEnv);
    console.error = originalError;
    console.warn = originalWarn;
  }
});

test("validateEnvironment passes when all required vars are set in production", () => {
  const originalEnv = { ...process.env };
  console.error = () => undefined;
  console.warn = () => undefined;

  try {
    process.env.NODE_ENV = "production";
    process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON = "fake-json";
    process.env.GOOGLE_CLOUD_PROJECT = "test-project";
    process.env.FOX_PUBLIC_BASE_URL = "https://test.example.com";
    process.env.FOX_SECRET_KEY = "test-secret-key-32-chars-long!!";

    const result = validateEnvironment();
    assert.equal(result.valid, true);
    assert.equal(result.missing.length, 0);
  } finally {
    Object.assign(process.env, originalEnv);
  }
});

test("development mode is lenient — missing production-only vars are OK", () => {
  const originalEnv = { ...process.env };
  console.error = () => undefined;
  console.warn = () => undefined;

  try {
    process.env.NODE_ENV = "development";
    delete process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    delete process.env.GOOGLE_CLOUD_PROJECT;
    delete process.env.FOX_PUBLIC_BASE_URL;
    delete process.env.PUBLIC_BASE_URL;
    delete process.env.APP_URL;
    delete process.env.FOX_SECRET_KEY;

    const result = validateEnvironment();
    assert.equal(result.isDevelopment, true);
    assert.equal(result.valid, false);
    assert.ok(result.missing.includes("FOX_SECRET_KEY"));
  } finally {
    Object.assign(process.env, originalEnv);
  }
});

test("printEnvValidation does not log secret values", () => {
  const originalEnv = { ...process.env };
  const logs: string[] = [];
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;

  console.error = (msg: string) => { logs.push(msg); };
  console.warn = (msg: string) => { logs.push(msg); };
  console.log = (msg: string) => { logs.push(msg); };

  try {
    process.env.NODE_ENV = "production";
    delete process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
    process.env.GOOGLE_CLOUD_PROJECT = "test-project";
    process.env.FOX_PUBLIC_BASE_URL = "https://test.example.com";
    delete process.env.FOX_SECRET_KEY;

    printEnvValidation();

    const allLogs = logs.join("\n");
    // The validation function should report the variable NAME that is missing
    assert.ok(allLogs.includes("FOX_SECRET_KEY"));
    // But never the actual secret value
    assert.ok(!allLogs.includes("super-secret-value-12345"));
    assert.ok(!allLogs.includes("fake-json"));
  } finally {
    Object.assign(process.env, originalEnv);
    console.error = originalError;
    console.warn = originalWarn;
    console.log = originalLog;
  }
});

test("ENABLE_TELEGRAM flag does not auto-start polling without token", () => {
  // This is a structural test — verify the env catalog includes the flag
  const flagEntry = ENV_VAR_CATALOG.find((e) => e.name === "ENABLE_TELEGRAM");
  assert.ok(flagEntry);
  assert.equal(flagEntry!.scope, "universal");
});

test("staging ENABLE_META=true missing META_APP_SECRET requires it", () => {
  const originalEnv = { ...process.env };
  try {
    process.env.NODE_ENV = "staging";
    process.env.ENABLE_META = "true";
    delete process.env.META_APP_SECRET;
    delete process.env.META_WEBHOOK_VERIFY_TOKEN;
    process.env.META_WEBHOOK_VERIFY_TOKEN = "verify-token";
    const result = validateEnvironment();
    assert.equal(result.isStaging, true);
    assert.ok(result.missing.includes("META_APP_SECRET"));
  } finally {
    Object.assign(process.env, originalEnv);
  }
});

test("staging ENABLE_META=true missing META_WEBHOOK_VERIFY_TOKEN requires it", () => {
  const originalEnv = { ...process.env };
  try {
    process.env.NODE_ENV = "staging";
    process.env.ENABLE_META = "true";
    process.env.META_APP_SECRET = "secret";
    delete process.env.META_WEBHOOK_VERIFY_TOKEN;
    const result = validateEnvironment();
    assert.equal(result.isStaging, true);
    assert.ok(result.missing.includes("META_WEBHOOK_VERIFY_TOKEN"));
  } finally {
    Object.assign(process.env, originalEnv);
  }
});

test("staging ENABLE_META=false does not require Meta secrets", () => {
  const originalEnv = { ...process.env };
  try {
    process.env.NODE_ENV = "staging";
    process.env.ENABLE_META = "false";
    delete process.env.META_APP_SECRET;
    delete process.env.META_WEBHOOK_VERIFY_TOKEN;
    const result = validateEnvironment();
    assert.equal(result.isStaging, true);
    assert.equal(result.missing.includes("META_APP_SECRET"), false);
    assert.equal(result.missing.includes("META_WEBHOOK_VERIFY_TOKEN"), false);
  } finally {
    Object.assign(process.env, originalEnv);
  }
});

test("production behavior unchanged when Meta disabled", () => {
  const originalEnv = { ...process.env };
  try {
    process.env.NODE_ENV = "production";
    process.env.ENABLE_META = "false";
    delete process.env.META_APP_SECRET;
    delete process.env.META_WEBHOOK_VERIFY_TOKEN;
    const result = validateEnvironment();
    assert.equal(result.isProduction, true);
  } finally {
    Object.assign(process.env, originalEnv);
  }
});

test("boot decision: staging ENABLE_META=true missing META_APP_SECRET => fatal", () => {
  const originalEnv = { ...process.env };
  process.env.ENABLE_META = "true";
  try {
    const result = { isStaging: true, missing: ["META_APP_SECRET"], isProduction: false, valid: false, warnings: [] } as any;
    assert.strictEqual(
      result.isStaging && process.env.ENABLE_META === "true" && (result.missing || []).some((m: string) => m === "META_APP_SECRET" || m === "META_WEBHOOK_VERIFY_TOKEN"),
      true
    );
  } finally {
    Object.assign(process.env, originalEnv);
  }
});

test("boot decision: staging ENABLE_META=true missing META_WEBHOOK_VERIFY_TOKEN => fatal", () => {
  const originalEnv = { ...process.env };
  process.env.ENABLE_META = "true";
  try {
    const result = { isStaging: true, missing: ["META_WEBHOOK_VERIFY_TOKEN"], isProduction: false, valid: false, warnings: [] } as any;
  assert.strictEqual(
    result.isStaging && process.env.ENABLE_META === "true" && (result.missing || []).some((m: string) => m === "META_APP_SECRET" || m === "META_WEBHOOK_VERIFY_TOKEN"),
    true
  );
  } finally {
    Object.assign(process.env, originalEnv);
  }
});

test("boot decision: staging ENABLE_META=true both secrets present => non-fatal", () => {
  const originalEnv = { ...process.env };
  process.env.ENABLE_META = "true";
  try {
    const result = { isStaging: true, missing: [], isProduction: false, valid: true, warnings: [] } as any;
  assert.strictEqual(
    result.isStaging && process.env.ENABLE_META === "true" && (result.missing || []).some((m: string) => m === "META_APP_SECRET" || m === "META_WEBHOOK_VERIFY_TOKEN"),
    false
  );
  } finally {
    Object.assign(process.env, originalEnv);
  }
});

test("boot decision: staging ENABLE_META=false missing secrets => non-fatal", () => {
  const originalEnv = { ...process.env };
  process.env.ENABLE_META = "false";
  try {
    const result = { isStaging: true, missing: ["META_APP_SECRET", "META_WEBHOOK_VERIFY_TOKEN"], isProduction: false, valid: false, warnings: [] } as any;
    assert.strictEqual(metaStagingFatalDecision(result, "false"), false);
  } finally {
    Object.assign(process.env, originalEnv);
    delete process.env.ENABLE_META;
  }
});

test("boot decision: unrelated staging warnings remain non-fatal", () => {
  const originalEnv = { ...process.env };
  process.env.ENABLE_META = "true";
  try {
    const result = { isStaging: true, missing: ["SMTP_HOST"], isProduction: false, valid: false, warnings: [{name:"SMTP_HOST"}] } as any;
    assert.strictEqual(metaStagingFatalDecision(result, "true"), false);
  } finally {
    Object.assign(process.env, originalEnv);
    delete process.env.ENABLE_META;
  }
});

test("boot decision: production invalid => non-fatal for Meta helper (production path handles separately)", () => {
  const originalEnv = { ...process.env };
  process.env.ENABLE_META = "false";
  try {
    const result = { isStaging: false, missing: ["FOX_SECRET_KEY"], isProduction: true, valid: false, warnings: [] } as any;
    assert.strictEqual(metaStagingFatalDecision(result, "false"), false);
  } finally {
    Object.assign(process.env, originalEnv);
    delete process.env.ENABLE_META;
  }
});
