import assert from "node:assert/strict";
import test from "node:test";

import { serverTimestamp, Timestamp } from "firebase/firestore";
import { sanitizeForFirestore } from "../src/utils/firestoreSanitize.ts";

test("Firestore sentinel and timestamp values survive sanitization", () => {
  const timestamp = Timestamp.fromMillis(Date.now());
  const sentinel = serverTimestamp();
  const sanitized = sanitizeForFirestore({
    timestamp,
    sentinel,
    nested: { keep: true, remove: undefined },
  });

  assert.equal(sanitized.timestamp, timestamp);
  assert.equal(sanitized.sentinel, sentinel);
  assert.deepEqual(sanitized.nested, { keep: true });
});
