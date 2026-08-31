import assert from "node:assert/strict";
import {
  chmodSync,
  mkdtempSync,
  readdirSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";
import test from "node:test";

const serverSource = readFileSync(new URL("../server.ts", import.meta.url), "utf8");
const deploymentSource = readFileSync(
  new URL("../deploy-staging-handoff.sh", import.meta.url),
  "utf8",
);

test("Meta webhook verification fails closed and never returns a challenge without an exact configured token", () => {
  const start = serverSource.indexOf("// Meta Webhook Verification (GET)");
  const end = serverSource.indexOf("// Meta Webhook Event Handler (POST)");
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const route = serverSource.slice(start, end);

  assert.match(route, /!EXPECTED_TOKEN/);
  assert.match(route, /mode\s*!==\s*["']subscribe["']/);
  assert.match(route, /!token\s*\|\|\s*token\s*!==\s*EXPECTED_TOKEN/);
  assert.doesNotMatch(route, /if\s*\(challenge\)\s*\{/);
  assert.doesNotMatch(route, /without challenge, returning OK/);
});

test("legacy Facebook webhook aliases are Meta-gated, token-checked, and signature-checked", () => {
  const start = serverSource.indexOf("// GET Facebook Webhook Verification");
  const end = serverSource.indexOf("// MANYCHAT INTEGRATION ENDPOINT", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const legacyRoutes = serverSource.slice(start, end);

  assert.match(legacyRoutes, /INTEGRATION_FLAGS\.meta/);
  assert.match(legacyRoutes, /activeFacebookVerifyToken/);
  assert.match(legacyRoutes, /token\s*!==\s*activeFacebookVerifyToken/);
  assert.doesNotMatch(legacyRoutes, /if \(challenge\) \{/);
  assert.match(legacyRoutes, /verifyMetaWebhookSignature/);

  const configStart = serverSource.indexOf("// Facebook Config API Endpoints");
  const configEnd = serverSource.indexOf("// Official Telegram Bot Simulation Endpoint", configStart);
  const configRoutes = serverSource.slice(configStart, configEnd);
  assert.match(configRoutes, /authenticateFirebaseRequest/);
  assert.match(configRoutes, /requireSuperAdmin/);
  assert.doesNotMatch(configRoutes, /verifyToken:\s*activeFacebookVerifyToken/);
  assert.doesNotMatch(configRoutes, /activeFacebookPageToken\s*=\s*pageToken/);
});

test("n8n webhook is authenticated, feature-gated, and uses only a server-configured target", () => {
  const start = serverSource.indexOf('"/api/n8n/webhook"');
  const end = serverSource.indexOf("// FOX RUNTIME READINESS", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const route = serverSource.slice(start, end);

  assert.match(route, /authenticateFirebaseRequest/);
  assert.match(route, /INTEGRATION_FLAGS\.n8n/);
  assert.match(route, /process\.env\.N8N_WEBHOOK_URL/);
  assert.match(route, /process\.env\.N8N_WEBHOOK_SECRET/);
  assert.match(route, /requireWorkspaceOwner/);
  assert.doesNotMatch(route, /customWebhookUrl/);
  assert.doesNotMatch(route, /Internal n8n simulation/);
  assert.doesNotMatch(route, /Math\.random/);
});

test("every staged n8n webhook rejects missing or empty shared-secret headers", () => {
  const workflowsDirectory = new URL(
    "../deploy/n8n-staging/workflows/",
    import.meta.url,
  );
  const workflows = readdirSync(workflowsDirectory)
    .filter((name) => name.endsWith(".json"));
  assert.equal(workflows.length, 10);

  for (const workflow of workflows) {
    const source = readFileSync(new URL(workflow, workflowsDirectory), "utf8");
    assert.doesNotMatch(
      source,
      /headers\?\.\['x-fox-n8n-secret'\]\s*\|\|\s*\$env\.FOX_N8N_SHARED_SECRET/,
      `${workflow} must not substitute the expected secret when the header is absent`,
    );
    assert.match(source, /:\s*'NO'/);
    assert.match(
      source,
      /\$env\.FOX_N8N_SHARED_SECRET\s*&&\s*\$json\.headers/,
    );
  }
});

test("Meta webhook resolves each Page to a workspace and reads only that tenant token from the secret vault", () => {
  const start = serverSource.indexOf("// Meta Webhook Event Handler (POST)");
  const end = serverSource.indexOf("// AI Agent System Prompt Builder Endpoint", start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const route = serverSource.slice(start, end);

  assert.match(route, /getWorkspaceByMetaPageId/);
  assert.match(route, /getWorkspaceSecret/);
  assert.match(route, /facebookPageAccessToken/);
  assert.doesNotMatch(route, /activeMetaPageAccessToken/);
  assert.doesNotMatch(route, /process\.env\.META_PAGE_ACCESS_TOKEN/);
});

test("Meta and WhatsApp POST webhooks verify sha256 signatures over preserved raw request bytes", () => {
  assert.match(serverSource, /rawBody/);
  assert.match(serverSource, /META_APP_SECRET/);
  const calls = serverSource.match(/verifyMetaWebhookSignature\(/g) || [];
  assert.equal(calls.length, 3, "Meta Page, deprecated Facebook alias, and WhatsApp handlers must verify signatures");
});

test("AI session reset is authenticated and restricted to the authoritative workspace owner", () => {
  const start = serverSource.indexOf('"/api/ai/reset-session"');
  const end = serverSource.indexOf('"/api/ai/extract-knowledge"', start);
  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  const route = serverSource.slice(start, end);
  assert.match(route, /authenticateFirebaseRequest/);
  assert.match(route, /requireAuthenticatedWorkspace/);
});

test("tenant Telegram webhooks require the derived Telegram secret and honor the feature flag", () => {
  const configureStart = serverSource.indexOf("async function configureWorkspaceTelegramWebhook");
  const routeStart = serverSource.indexOf('"/api/telegram/webhook/:workspaceId"');
  const routeEnd = serverSource.indexOf("// EXPLICIT LEGACY WORKSPACE SECRET MIGRATION", routeStart);
  const configure = serverSource.slice(configureStart, routeStart);
  const route = serverSource.slice(routeStart, routeEnd);

  assert.match(configure, /secret_token/);
  assert.match(configure, /getWorkspaceTelegramWebhookSecret/);
  assert.match(route, /INTEGRATION_FLAGS\.telegram/);
  assert.match(route, /x-telegram-bot-api-secret-token/);
  assert.match(serverSource, /function isValidWorkspaceTelegramWebhookSecret[\s\S]*?timingSafeEqual/);
});

test("tenant Telegram token management honors the global integration kill switch", () => {
  const start = serverSource.indexOf('"/api/telegram/workspace/:workspaceId/token"');
  const route = serverSource.slice(start, start + 7000);
  assert.match(route, /INTEGRATION_FLAGS\.telegram/);
});

test("staging handoff excludes env secrets, requires a clean tree, and verifies Node 24 without printing raw logs", () => {
  assert.match(deploymentSource, /--exclude='\.env'/);
  assert.match(deploymentSource, /--exclude='\.env\.\*'/);
  assert.match(deploymentSource, /FOX_STAGING_RELEASE_SOURCE/);
  assert.match(deploymentSource, /Verified release HEAD/);
  assert.doesNotMatch(deploymentSource, /git -C "\$SOURCE"/);
  assert.match(deploymentSource, /process\.versions\.node/);
  assert.match(deploymentSource, /error_marker_lines/);
  assert.doesNotMatch(deploymentSource, /for line in selected\[-120:\]/);
  assert.match(deploymentSource, /Automated deployment checks: PASS/);
  assert.doesNotMatch(deploymentSource, /Deployment result: PASS/);
  assert.match(deploymentSource, /verify_staging_preflight\.py/);
  assert.ok(
    (deploymentSource.match(/verify_release_identity/g) || []).length >= 4,
    "release identity must be rechecked before backup and before recreate",
  );
  assert.doesNotMatch(
    deploymentSource,
    /activeTab\s*\.\s*startsWith\s*\(\s*["']admin_["']\s*\)/,
  );
});

const preflightVerifier = new URL(
  "../scripts/verify_staging_preflight.py",
  import.meta.url,
);
const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");
const authorizationSource = readFileSync(
  new URL("../src/security/appAuthorization.ts", import.meta.url),
  "utf8",
);

function createPreflightFixture() {
  const root = mkdtempSync(join(tmpdir(), "fox-staging-preflight-"));
  const source = join(root, "source");
  const manifest = join(root, "release-manifest.env");
  mkdirSync(join(source, "src", "security"), { recursive: true });
  writeFileSync(join(source, "src", "App.tsx"), appSource);
  writeFileSync(
    join(source, "src", "security", "appAuthorization.ts"),
    authorizationSource,
  );
  writeFileSync(join(source, "README.md"), "fixture\n");
  execFileSync("git", ["init", "--quiet", source]);
  execFileSync("git", ["-C", source, "config", "user.email", "test@example.invalid"]);
  execFileSync("git", ["-C", source, "config", "user.name", "Test"]);
  execFileSync("git", ["-C", source, "add", "."]);
  execFileSync("git", ["-C", source, "commit", "--quiet", "-m", "fixture"]);
  return { root, source, manifest };
}

function runPreflight(
  source: string,
  manifest: string,
  expectedSourceRealpath = source,
) {
  return spawnSync(
    "python3",
    [
      preflightVerifier.pathname,
      "--source",
      source,
      "--expected-source-realpath",
      expectedSourceRealpath,
      "--manifest",
      manifest,
      "--manifest-uid",
      String(process.getuid?.() ?? 0),
    ],
    { encoding: "utf8" },
  );
}

function writeManifest(manifest: string, commit: string) {
  writeFileSync(manifest, `FOX_STAGING_EXPECTED_COMMIT=${commit}\n`);
  chmodSync(manifest, 0o600);
}

test("staging preflight fails closed for release-manifest, commit, dirty-tree, and authorization wiring failures", () => {
  const fixture = createPreflightFixture();
  try {
    const head = execFileSync("git", ["-C", fixture.source, "rev-parse", "HEAD"], {
      encoding: "utf8",
    }).trim();

    assert.notEqual(runPreflight(fixture.source, fixture.manifest).status, 0, "missing manifest must fail");

    writeManifest(fixture.manifest, "not-a-sha");
    assert.notEqual(runPreflight(fixture.source, fixture.manifest).status, 0, "malformed SHA must fail");

    writeManifest(fixture.manifest, head);
    const correct = runPreflight(fixture.source, fixture.manifest);
    assert.equal(correct.status, 0, `clean correct HEAD must pass: ${correct.stderr}`);

    writeManifest(fixture.manifest, "0".repeat(40));
    const wrongCommit = runPreflight(fixture.source, fixture.manifest);
    assert.notEqual(wrongCommit.status, 0, "wrong clean HEAD must fail");
    assert.equal(
      wrongCommit.stderr,
      `actual HEAD=${head}\nexpected HEAD=${"0".repeat(40)}\n`,
      "commit mismatch diagnostics must contain only safe commit SHAs",
    );

    writeManifest(fixture.manifest, head);
    writeFileSync(join(fixture.source, "README.md"), "dirty\n");
    assert.notEqual(runPreflight(fixture.source, fixture.manifest).status, 0, "dirty correct HEAD must fail");
    execFileSync("git", ["-C", fixture.source, "checkout", "--", "README.md"]);

    assert.notEqual(
      runPreflight(fixture.source, fixture.manifest, join(fixture.root, "wrong-source")).status,
      0,
      "unexpected repository real path must fail",
    );

    const appPath = join(fixture.source, "src", "App.tsx");
    writeFileSync(appPath, `${readFileSync(appPath, "utf8")}\nactiveTab.startsWith("admin_");\n`);
    execFileSync("git", ["-C", fixture.source, "add", "src/App.tsx"]);
    execFileSync("git", ["-C", fixture.source, "commit", "--quiet", "-m", "stale literal"]);
    writeManifest(fixture.manifest, execFileSync(
      "git", ["-C", fixture.source, "rev-parse", "HEAD"], { encoding: "utf8" },
    ).trim());
    assert.notEqual(runPreflight(fixture.source, fixture.manifest).status, 0, "stale double-quoted admin literal must fail");

    writeFileSync(appPath, `${appSource}\nactiveTab.startsWith('admin_');\n`);
    execFileSync("git", ["-C", fixture.source, "add", "src/App.tsx"]);
    execFileSync("git", ["-C", fixture.source, "commit", "--quiet", "-m", "single-quoted stale literal"]);
    writeManifest(fixture.manifest, execFileSync(
      "git", ["-C", fixture.source, "rev-parse", "HEAD"], { encoding: "utf8" },
    ).trim());
    assert.notEqual(runPreflight(fixture.source, fixture.manifest).status, 0, "stale single-quoted admin literal must fail");

    writeFileSync(appPath, appSource.replace(
      "? resolveAuthorizedView(currentUser.role, requestedView)",
      "? (requestedView as ViewTab)",
    ));
    execFileSync("git", ["-C", fixture.source, "add", "src/App.tsx"]);
    execFileSync("git", ["-C", fixture.source, "commit", "--quiet", "-m", "broken authorization wiring"]);
    writeManifest(fixture.manifest, execFileSync(
      "git", ["-C", fixture.source, "rev-parse", "HEAD"], { encoding: "utf8" },
    ).trim());
    assert.notEqual(runPreflight(fixture.source, fixture.manifest).status, 0, "broken active-tab authorization wiring must fail");

    writeFileSync(appPath, appSource.replace(
      "const authorized = resolveAuthorizedView(\n        currentUser.role,\n        requested,\n      );",
      "const authorized = requested as ViewTab;",
    ));
    execFileSync("git", ["-C", fixture.source, "add", "src/App.tsx"]);
    execFileSync("git", ["-C", fixture.source, "commit", "--quiet", "-m", "broken direct navigation wiring"]);
    writeManifest(fixture.manifest, execFileSync(
      "git", ["-C", fixture.source, "rev-parse", "HEAD"], { encoding: "utf8" },
    ).trim());
    assert.notEqual(runPreflight(fixture.source, fixture.manifest).status, 0, "broken direct-navigation authorization wiring must fail");

    writeFileSync(appPath, appSource.replace(
      "const authorized = resolveAuthorizedView(\n      currentUser.role,\n      requestedView,\n    );",
      "const authorized = requestedView as ViewTab;",
    ));
    execFileSync("git", ["-C", fixture.source, "add", "src/App.tsx"]);
    execFileSync("git", ["-C", fixture.source, "commit", "--quiet", "-m", "broken restored navigation wiring"]);
    writeManifest(fixture.manifest, execFileSync(
      "git", ["-C", fixture.source, "rev-parse", "HEAD"], { encoding: "utf8" },
    ).trim());
    assert.notEqual(runPreflight(fixture.source, fixture.manifest).status, 0, "broken restored-navigation authorization wiring must fail");
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});
