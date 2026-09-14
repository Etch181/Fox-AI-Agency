import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dockerfile = readFileSync(new URL("../Dockerfile", import.meta.url), "utf8");

test("builder has Git for preflight security fixtures while runtime stays Git-free", () => {
  const builder = dockerfile.slice(0, dockerfile.indexOf("# ---- Stage 2: Runtime ----"));
  const runtime = dockerfile.slice(dockerfile.indexOf("# ---- Stage 2: Runtime ----"));

  assert.match(builder, /apk add --no-cache ca-certificates python3 git/);
  assert.doesNotMatch(runtime, /\bgit\b/);
});

test("builder verification gate runs lint, tests, and build in that order", () => {
  const builder = dockerfile.slice(0, dockerfile.indexOf("# ---- Stage 2: Runtime ----"));
  // The gate must (a) run lint, (b) run the test command, (c) run build.
  // It must NOT be a "skip lint" or "skip test" hack like:
  //   `RUN true && npm test && npm run build`
  //   `RUN npm test; npm run build`
  //   `RUN npm run build`   (omits tests)
  // The test command is intentionally allowed to be either the plain
  // `npm test` (no emulator) or the emulator-backed `npm run test:integration`
  // or any `npm run test:*` alias that actually executes the test suite.
  assert.match(
    builder,
    /RUN\s+npm run lint\s*&&(?:\s*\S+\s*&&)?\s*npm run (?:test(?::[a-zA-Z0-9_-]+)?|test:integration)\s*&&\s*npm run build/,
  );
  // The gate must not be a no-op (e.g. `RUN true && ...`).
  assert.doesNotMatch(builder, /RUN\s+true\s*&&/);
  assert.doesNotMatch(builder, /RUN\s+\/bin\/true\s*&&/);
});

test("builder installs Java for the Firestore emulator (test-only, builder-only)", () => {
  const builder = dockerfile.slice(0, dockerfile.indexOf("# ---- Stage 2: Runtime ----"));
  const runtime = dockerfile.slice(dockerfile.indexOf("# ---- Stage 2: Runtime ----"));

  // The builder must include a JRE to run the Firestore emulator during
  // `npm run test:integration`. The runtime must not ship Java.
  assert.match(builder, /openjdk[0-9]+-jre(-headless)?/);
  assert.doesNotMatch(runtime, /\b(openjdk|java|jdk|jre)\b/);
  // JAVA_HOME must be exported in the builder so the integration test
  // runner script can locate the JRE deterministically.
  assert.match(builder, /ENV\s+JAVA_HOME=/);
});
