#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const parsed = dotenv.config({
  path: path.join(root, ".env.staging"),
  override: true,
  quiet: true,
});

if (parsed.error) throw parsed.error;
assert.equal(process.env.GOOGLE_CLOUD_PROJECT, "fox-ai-agency-staging");
assert.equal(process.env.VITE_FIREBASE_PROJECT_ID, "fox-ai-agency-staging");
assert.equal(process.env.FOX_PUBLIC_BASE_URL, "https://staging.foxaiagency.online");
assert.equal(process.env.FIRESTORE_DATABASE_ID || "", "");

const result = spawnSync("npm", ["run", "build"], {
  cwd: root,
  env: process.env,
  stdio: "inherit",
});

if (result.error) throw result.error;
process.exit(result.status ?? 1);
