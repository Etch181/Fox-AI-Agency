import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/context/AppContext.tsx", import.meta.url),
  "utf8",
);

test("workspace hydration uses tenant document listeners and admin DTO API", () => {
  const start = source.indexOf("// Tenant workspaces use a direct document listener");
  const end = source.indexOf('collection(db, "plans")', start);
  const hydration = source.slice(start, end);

  assert.notEqual(start, -1);
  assert.notEqual(end, -1);
  assert.match(
    hydration,
    /doc\(\s*db,\s*"workspaces",\s*currentUser\.workspaceId,?\s*\)/,
  );
  assert.match(hydration, /authenticatedFetch\("\/api\/agency\/clients"/);
  assert.doesNotMatch(hydration, /query\(workspacesRef/);
  assert.doesNotMatch(hydration, /onSnapshot\(\s*q/);
});
