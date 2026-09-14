import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";

import { verifyMetaWebhookSignature } from "../src/utils/metaWebhookSignature.ts";

test("Meta webhook signature accepts only an exact sha256 HMAC over raw bytes", () => {
  const body = Buffer.from('{"object":"page","entry":[]}');
  const secret = "staging-test-app-secret";
  const digest = createHmac("sha256", secret).update(body).digest("hex");
  assert.equal(verifyMetaWebhookSignature(body, `sha256=${digest}`, secret), true);
  assert.equal(verifyMetaWebhookSignature(body, `sha256=${"0".repeat(64)}`, secret), false);
  assert.equal(verifyMetaWebhookSignature(Buffer.from("changed"), `sha256=${digest}`, secret), false);
});

test("Meta webhook signature fails closed when bytes, signature, or app secret are missing", () => {
  assert.equal(verifyMetaWebhookSignature(undefined, "sha256=abc", "secret"), false);
  assert.equal(verifyMetaWebhookSignature(Buffer.from("{}"), "", "secret"), false);
  assert.equal(verifyMetaWebhookSignature(Buffer.from("{}"), "sha256=abc", ""), false);
  assert.equal(verifyMetaWebhookSignature(Buffer.from("{}"), "sha1=abc", "secret"), false);
});
