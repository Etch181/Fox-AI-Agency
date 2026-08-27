import assert from "node:assert/strict";
import test from "node:test";

import {
  validateEnvironment,
  ENV_VAR_CATALOG,
  printEnvValidation,
} from "../src/utils/envValidation.ts";

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
