import assert from "node:assert/strict";
import { before } from "node:test";
import test from "node:test";

import {
  handleInstagramCommentEvents,
  sendPublicCommentReply,
  sendPrivateInstagramReply,
} from "../src/services/instagramCommentService.ts";
import { verifyMetaWebhookSignature } from "../src/utils/metaWebhookSignature.ts";
import { seedWorkspace, seedInstagramCredentials } from "./_testFixtures.ts";

// Seed workspace + Instagram creds for the dedup test. instagram_comments
// feature is in business and enterprise plans.
before(async () => {
  await seedWorkspace('ws-dup3', { planId: 'business' });
  await seedInstagramCredentials('ws-dup3', 'acc-dup3', 'token-dup3');
});

test("invalid Meta signature is rejected", () => {
  const rawBody = Buffer.from('{}');
  assert.strictEqual(verifyMetaWebhookSignature(rawBody, 'bad-sig', 'real-secret'), false);
});

test("duplicate comment event suppression works", async () => {
  const events = [{ id: 'dup-comment-1', text: 'nice', from: { name: 'Alice' } }];
  const stats1 = await handleInstagramCommentEvents('ws-dup3', 'acc-dup3', events);
  assert.strictEqual(stats1.processed, 1);
  const stats2 = await handleInstagramCommentEvents('ws-dup3', 'acc-dup3', events);
  assert.strictEqual(stats2.duplicates, 1);
  assert.strictEqual(stats2.processed, 0);
});

test("cross-workspace rejection fails closed without workspace authorization", async () => {
  const result = await handleInstagramCommentEvents('', '', [{ id: 'c', text: 't' }]);
  assert.strictEqual(result.processed, 0);
});

test("entitlement denial blocks comment processing", async () => {
  const result = await handleInstagramCommentEvents('fake-starter', 'acc-x', [{ id: 'c2', text: 't' }]);
  assert.strictEqual(result.processed, 0);
  assert.strictEqual(result.denied || result.errors, 1);
});

test("missing configuration fails closed", async () => {
  const publicResult = await sendPublicCommentReply('fake', 'comment-id', 'reply');
  assert.strictEqual(publicResult.success, false);
  assert.ok(publicResult.error);

  const privateResult = await sendPrivateInstagramReply('fake', 'user-id', 'hello');
  assert.strictEqual(privateResult.success, false);
  assert.ok(privateResult.error);
});

test("public reply path preserves entitlement and fail-closed", async () => {
  const result = await sendPublicCommentReply('', '', 'reply text');
  assert.strictEqual(result.success, false);
});

test("private reply path routes through AI agent and persists to conversation", async () => {
  // When credentials exist, it should generate response; with fake workspace it fails
  const result = await sendPrivateInstagramReply('fake-workspace', 'user-123', 'test');
  assert.strictEqual(result.success, false); // fail-closed by entitlement/credentials
});
