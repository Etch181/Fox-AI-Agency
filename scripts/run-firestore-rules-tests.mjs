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

async function findJavaHome() {
  const candidates = [
    process.env.JAVA_HOME,
    "/opt/data/toolchains/temurin-jre-21.0.12.1",
  ].filter(Boolean);

  for (const candidate of candidates) {
    const java = path.join(candidate, "bin", process.platform === "win32" ? "java.exe" : "java");

    try {
      await access(java, constants.X_OK);
      return candidate;
    } catch {
      // Try the next configured JDK/JRE location.
    }
  }

  throw new Error(
    "Java 21 is required for Firestore emulator tests. Set JAVA_HOME to a Java 21 installation.",
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
  const runId = `${process.pid}-${Date.now()}`;
  const projectId = `demo-fox-rules-${runId}`;
  const configPath = path.join(tmpdir(), `fox-firestore-emulator-${runId}.json`);
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

  const env = {
    ...process.env,
    JAVA_HOME: javaHome,
    FOX_RULES_PROJECT_ID: projectId,
    PATH: `${path.join(javaHome, "bin")}${path.delimiter}${process.env.PATH || ""}`,
  };
  delete env.FIRESTORE_EMULATOR_HOST;

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
          "node --test --test-concurrency=1 tests/firestore/*.test.ts",
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
