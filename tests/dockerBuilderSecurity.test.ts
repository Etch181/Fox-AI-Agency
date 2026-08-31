import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const dockerfile = readFileSync(new URL("../Dockerfile", import.meta.url), "utf8");

test("builder has Git for preflight security fixtures while runtime stays Git-free", () => {
  const builder = dockerfile.slice(0, dockerfile.indexOf("# ---- Stage 2: Runtime ----"));
  const runtime = dockerfile.slice(dockerfile.indexOf("# ---- Stage 2: Runtime ----"));

  assert.match(builder, /apk add --no-cache ca-certificates python3 git/);
  assert.match(builder, /npm run lint && npm test && npm run build/);
  assert.doesNotMatch(runtime, /\bgit\b/);
});
