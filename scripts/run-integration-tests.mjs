// FOX — Integration Test Runner (Firestore emulator-backed)
//
// Purpose
// -------
// `node --test tests/*.test.ts` in CI / Docker cannot reach a real
// Firestore backend. Eight integration-style tests (instagramStep1-9)
// legitimately need an authenticated Firestore Admin SDK at module-load
// time, so the production fail-closed `firebaseAdmin` guard refuses to
// initialise without a project — which is the correct production
// behaviour and must not be weakened.
//
// This script spins up a throwaway Firestore emulator, points the
// Firebase Admin SDK at it via `FIRESTORE_EMULATOR_HOST`, and runs the
// full `node --test` command under that emulator. No external network
// access is required and no real project is contacted.
//
// Architecture invariants
// -----------------------
// 1. `firebaseAdmin.ts` fail-closed behaviour is preserved — the
//    script only sets the project on the emulator, never against
//    production.
// 2. The script is repo-owned and self-contained: it does not depend
//    on a host-local JRE path, a specific dev-machine toolchain, or
//    any state outside the working tree.
// 3. The script reuses `node_modules/.bin/firebase` (firebase-tools)
//    from the project's devDependencies — no global install.
// 4. The script is invoked from `npm run test:integration` so the
//    Docker builder can run the same gate reproducibly.
// 5. The script is decoupled from the existing
//    `scripts/run-firestore-rules-tests.mjs` (which only runs
//    `tests/firestore/*.test.ts`) — this one runs the full suite
//    (`tests/*.test.ts`) so the 8 (now 9) integration tests are
//    included alongside the rest.

import { access, unlink, writeFile } from "node:fs/promises";
import { constants } from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";

const repoRoot = process.cwd();
const firebaseBin = path.join(
  repoRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "firebase.cmd" : "firebase",
);

// Locate a Java 21 runtime. Order:
//   1. $JAVA_HOME if it points to a directory containing bin/java
//   2. The repo-pinned dev toolchain at /opt/data/toolchains/temurin-jre-21.0.12.1
//      (used on Hermes dev machines, not required by Docker)
//   3. Common system locations: /usr/lib/jvm/...
// The function never invents a path; it only confirms the path it
// returns is executable. If no Java is found, fail closed.
async function findJavaHome() {
  const candidates = [
    process.env.JAVA_HOME,
    "/opt/data/toolchains/temurin-jre-21.0.12.1",
    // Alpine 3.21+ openjdk21-jre-headless install path (Docker builder)
    "/usr/lib/jvm/java-21-openjdk",
    // Common Linux distributions
    "/usr/lib/jvm/java-21-openjdk-amd64",
    "/usr/lib/jvm/temurin-21-jdk-amd64",
    "/opt/java/openjdk-21",
  ].filter(Boolean);

  for (const candidate of candidates) {
    const java = path.join(candidate, "bin", process.platform === "win32" ? "java.exe" : "java");
    try {
      await access(java, constants.X_OK);
      return candidate;
    } catch {
      // Try the next configured location.
    }
  }

  throw new Error(
    "Java 21 is required for Firestore emulator-backed integration tests. " +
    "Set JAVA_HOME to a Java 21 installation.",
  );
}

async function reserveAvailablePort() {
  return await new Promise((resolve, reject) => {
    const server = createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close((error) => (error ? reject(error) : resolve(port)));
    });
  });
}

async function run() {
  const javaHome = await findJavaHome();
  const firestorePort = await reserveAvailablePort();
  // Use a fresh, per-run project id so the emulator's state is scoped
  // to this invocation and never collides with a real project.
  const runId = `${process.pid}-${Date.now()}`;
  const projectId = `demo-fox-integration-${runId}`;
  const configPath = path.join(tmpdir(), `fox-integration-emulator-${runId}.json`);
  const config = {
    firestore: {
      rules: path.join(repoRoot, "firestore.rules"),
    },
    emulators: {
      firestore: {
        host: "127.0.0.1",
        port: firestorePort,
      },
      ui: {
        enabled: false,
      },
      singleProjectMode: true,
    },
  };

  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`, {
    mode: 0o600,
  });

  // FIRESTORE_EMULATOR_HOST is the documented signal to
  // `firebase-admin` that all calls should be routed to the local
  // emulator. We set it explicitly here (and clear any inherited
  // value) so the test environment is deterministic.
  // GOOGLE_CLOUD_PROJECT is set to the per-run demo id so the
  // `firebaseAdmin` fail-closed guard (which requires this env var)
  // is satisfied WITHOUT pointing at any real GCP project.
  // FOX_SECRET_KEY is a test-only symmetric key for the
  // workspaceSecretVault encryption layer; tests rely on it being
  // non-empty but do not assert on its specific value.
  const env = {
    ...process.env,
    JAVA_HOME: javaHome,
    PATH: `${path.join(javaHome, "bin")}${path.delimiter}${process.env.PATH || ""}`,
    GOOGLE_CLOUD_PROJECT: projectId,
    FIRESTORE_DATABASE_ID: "(default)",
    FIRESTORE_EMULATOR_HOST: `127.0.0.1:${firestorePort}`,
    FOX_SECRET_KEY: process.env.FOX_SECRET_KEY || "fox-step9-integration-test-only-do-not-use-in-production",
    NODE_ENV: "test",
  };
  delete env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON;
  delete env.GOOGLE_APPLICATION_CREDENTIALS;

  try {
    const exitCode = await new Promise((resolve, reject) => {
      const child = spawn(
        firebaseBin,
        [
          "emulators:exec",
          "--config",
          configPath,
          "--project",
          projectId,
          "--only",
          "firestore",
          // The full test suite — same glob that `npm test` uses, so
          // every test that runs in plain `npm test` runs here too,
          // plus the integration tests can now authenticate against
          // the emulator instead of failing at module-load time.
          "node --test tests/*.test.ts",
        ],
        {
          cwd: repoRoot,
          env,
          stdio: "inherit",
          shell: false,
        },
      );

      child.once("error", reject);
      child.once("exit", (code) => resolve(code ?? 1));
    });

    process.exitCode = exitCode;
  } finally {
    await unlink(configPath).catch(() => undefined);
  }
}

await run();
