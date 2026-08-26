import assert from "node:assert/strict";
import test from "node:test";

import { createAuditLogId } from "../src/utils/auditLog.ts";

test("audit log IDs retain a collision-resistant UUID", () => {
  const first = createAuditLogId(
    () => "11111111-1111-4111-8111-111111111111",
  );
  const second = createAuditLogId(
    () => "22222222-2222-4222-8222-222222222222",
  );

  assert.equal(first, "LOG-11111111-1111-4111-8111-111111111111");
  assert.equal(second, "LOG-22222222-2222-4222-8222-222222222222");
  assert.notEqual(first, second);
});
