import assert from "node:assert/strict";
import test from "node:test";

import { triggerExternalCRM } from "../src/services/crmService.ts";

test("external CRM delivery rejects loopback destinations before fetch", async () => {
  const originalFetch = globalThis.fetch;
  let called = false;

  globalThis.fetch = async () => {
    called = true;
    return new Response(null, { status: 204 });
  };

  try {
    await assert.rejects(
      triggerExternalCRM(
        "workspace-a",
        "lead",
        { id: "lead-a" },
        "http://127.0.0.1:8080/internal",
      ),
      /webhook/i,
    );
    assert.equal(called, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
