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

test("external trusted launcher acquires only the pinned remote tree and snapshots staging inputs", () => {
  const launcher = source(launcherPath);
  const handoff = source(handoffPath);

  assert.doesNotMatch(launcher, /APPROVED_COMMIT/);
  assert.doesNotMatch(launcher, /[0-9a-f]{40}/);
  assert.match(launcher, /FOX_STAGING_EXPECTED_COMMIT/);
  assert.match(launcher, /approved remote ref does not equal expected commit/);
  assert.match(launcher, /readonly ENV_SOURCE='\/docker\/fox-ai-staging\/\.env\.staging'/);
  assert.match(launcher, /readonly RELEASES='\/docker\/fox-ai-staging\/releases'/);
  assert.match(launcher, /FOX_STAGING_EXPECTED_COMMIT/);
  assert.match(launcher, /FOX_STAGING_HANDOFF_SHA256/);
  assert.match(launcher, /FOX_STAGING_PREFLIGHT_SHA256/);
  assert.match(launcher, /FOX_STAGING_COMPOSE_SHA256/);
  assert.match(launcher, /FOX_STAGING_ENV_SHA256/);
  assert.match(launcher, /FOX_STAGING_CREDENTIAL_SHA256/);
  assert.match(launcher, /CREDENTIAL_SOURCE='\/docker\/fox-ai-staging\/secrets\/firebase-admin\.json'/);
  assert.match(launcher, /acquire_remote_source/);
  assert.match(launcher, /validate_remote_tree/);
  assert.match(launcher, /archive --format=tar/);
  assert.match(launcher, /refs\/heads\/\$\{?APPROVED_REF\}?/);
  assert.match(launcher, /env -i PATH="\$PATH" HOME=\/root/);
  assert.match(launcher, /GIT_CONFIG_NOSYSTEM=1/);
  assert.match(launcher, /GIT_CONFIG_GLOBAL=\/dev\/null/);
  assert.match(launcher, /GIT_ALTERNATE_OBJECT_DIRECTORIES=/);
  assert.match(launcher, /core\.hooksPath=\/dev\/null/);
  assert.match(launcher, /\/usr\/bin\/git/);
  assert.match(launcher, /mode 120000 refused/);
  assert.match(launcher, /mode 160000 refused/);
  assert.match(launcher, /unexpected remote tree entry/);
  assert.match(launcher, /generate_snapshot_compose/);
  assert.match(launcher, /credentials\/firebase-admin\.json/);
  assert.match(launcher, /unknown manifest key/);
  assert.match(launcher, /duplicate manifest key/);
  assert.doesNotMatch(launcher, /\/docker\/hermes-agent-6pb0\/data\/fox-ai-agency/);
  assert.doesNotMatch(launcher, /\bsource\s+.*manifest/i);
  assert.doesNotMatch(launcher, /\beval\b/);
  assert.match(launcher, /copy_release_snapshot/);
  assert.match(launcher, /verify_snapshot/);
  assert.match(launcher, /env -i/);
  assert.doesNotMatch(launcher, /name: fox-ai-agency-staging/);
  assert.doesNotMatch(launcher, /compose project mismatch/);
  assert.match(handoff, /COMPOSE_PROJECT="fox-ai-staging"/);
  assert.match(handoff, /-p "\$COMPOSE_PROJECT"/);
  assert.match(handoff, /config\.get\("name"\) != expected_project/);
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
  assert.match(manifest, /^FOX_STAGING_EXPECTED_COMMIT=REPLACE_WITH_40_LOWERCASE_HEX_COMMIT$/m);
  assert.match(manifest, /^FOX_STAGING_HANDOFF_SHA256=REPLACE_WITH_64_LOWERCASE_HEX_SHA256$/m);
  assert.match(manifest, /^FOX_STAGING_PREFLIGHT_SHA256=REPLACE_WITH_64_LOWERCASE_HEX_SHA256$/m);
  assert.match(manifest, /^FOX_STAGING_COMPOSE_SHA256=REPLACE_WITH_64_LOWERCASE_HEX_SHA256$/m);
  assert.match(manifest, /^FOX_STAGING_ENV_SHA256=REPLACE_WITH_64_LOWERCASE_HEX_SHA256$/m);
  assert.match(manifest, /^FOX_STAGING_CREDENTIAL_SHA256=REPLACE_WITH_64_LOWERCASE_HEX_SHA256$/m);
  assert.doesNotMatch(manifest, /(?:TOKEN|PASSWORD|PRIVATE_KEY|API_KEY)\s*=/i);
});
