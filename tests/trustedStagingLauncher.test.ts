import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const launcherPath = resolve("deploy/trusted-staging/trusted-deploy.sh");
const manifestPath = resolve("deploy/trusted-staging/release-manifest.env.template");
const handoffPath = resolve("deploy-staging-handoff.sh");

function source(path: string) {
  assert.ok(existsSync(path), `missing required file: ${path}`);
  return readFileSync(path, "utf8");
}

test("external trusted launcher is snapshot-only and staging-pinned", () => {
  const launcher = source(launcherPath);

  assert.match(launcher, /readonly SOURCE='\/docker\/hermes-agent-6pb0\/data\/fox-ai-agency'/);
  assert.match(launcher, /readonly RELEASES='\/docker\/fox-ai-staging\/releases'/);
  assert.match(launcher, /FOX_STAGING_EXPECTED_COMMIT/);
  assert.match(launcher, /FOX_STAGING_HANDOFF_SHA256/);
  assert.match(launcher, /FOX_STAGING_PREFLIGHT_SHA256/);
  assert.match(launcher, /FOX_STAGING_COMPOSE_SHA256/);
  assert.match(launcher, /FOX_STAGING_ENV_SHA256/);
  assert.match(launcher, /FOX_STAGING_CREDENTIAL_SHA256/);
  assert.match(launcher, /CREDENTIAL_SOURCE='\/docker\/fox-ai-staging\/secrets\/firebase-admin\.json'/);
  assert.match(launcher, /require_trusted_external_chain/);
  assert.match(launcher, /require_mutable_source_chain/);
  assert.match(launcher, /generate_snapshot_compose/);
  assert.match(launcher, /credentials\/firebase-admin\.json/);
  assert.match(launcher, /unknown manifest key/);
  assert.match(launcher, /duplicate manifest key/);
  assert.doesNotMatch(launcher, /\bsource\s+.*manifest/i);
  assert.doesNotMatch(launcher, /\beval\b/);
  assert.match(launcher, /copy_release_snapshot/);
  assert.match(launcher, /verify_snapshot/);
  assert.match(launcher, /env -i/);
  assert.match(launcher, /fox-ai-agency-staging/);
  assert.match(launcher, /fox-ai-staging/);
  assert.match(launcher, /staging\.foxaiagency\.online/);
});

test("snapshot-aware handoff accepts only an immutable release root", () => {
  const handoff = source(handoffPath);

  assert.match(handoff, /FOX_STAGING_RELEASE_SOURCE/);
  assert.match(handoff, /FOX_STAGING_RELEASE_COMPOSE/);
  assert.match(handoff, /FOX_STAGING_RELEASE_ENV_FILE/);
  assert.match(handoff, /FOX_STAGING_RELEASE_ROOT/);
  assert.match(handoff, /release snapshot/);
  assert.doesNotMatch(handoff, /SOURCE="\/docker\/hermes-agent-6pb0\/data\/fox-ai-agency"/);
});

test("manifest template contains only strict non-secret release policy keys", () => {
  const manifest = source(manifestPath);
  assert.match(manifest, /^FOX_STAGING_EXPECTED_COMMIT=[0-9a-f]{40}$/m);
  assert.match(manifest, /^FOX_STAGING_HANDOFF_SHA256=REPLACE_WITH_64_LOWERCASE_HEX_SHA256$/m);
  assert.match(manifest, /^FOX_STAGING_PREFLIGHT_SHA256=REPLACE_WITH_64_LOWERCASE_HEX_SHA256$/m);
  assert.match(manifest, /^FOX_STAGING_COMPOSE_SHA256=REPLACE_WITH_64_LOWERCASE_HEX_SHA256$/m);
  assert.match(manifest, /^FOX_STAGING_ENV_SHA256=REPLACE_WITH_64_LOWERCASE_HEX_SHA256$/m);
  assert.match(manifest, /^FOX_STAGING_CREDENTIAL_SHA256=REPLACE_WITH_64_LOWERCASE_HEX_SHA256$/m);
  assert.doesNotMatch(manifest, /(?:TOKEN|PASSWORD|PRIVATE_KEY|API_KEY)\s*=/i);
});
