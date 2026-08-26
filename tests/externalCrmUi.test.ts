import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../src/components/client/ClientAISettings.tsx", import.meta.url),
  "utf8",
);

test("external CRM UI configures and disconnects through authenticated vault endpoint", () => {
  assert.match(
    source,
    /authenticatedFetch\(\s*`\/api\/integrations\/workspace\/\$\{currentWorkspace\.id\}\/external-crm`/s,
  );
  assert.match(
    source,
    /webhookUrl:\s*disconnect\s*\?\s*""\s*:\s*externalCrmWebhookUrl/,
  );
  assert.doesNotMatch(source, /updateWorkspaceField\([^)]*externalCrmWebhookUrl/s);
});
