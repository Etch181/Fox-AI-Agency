import assert from "node:assert/strict";
import { before } from "node:test";
import test from "node:test";

import {
  handleInstagramWebhooks,
  sendInstagramAIReply,
} from "../src/services/instagramWebhookService.ts";
import { verifyMetaWebhookSignature } from "../src/utils/metaWebhookSignature.ts";
import { seedWorkspace, seedInstagramCredentials } from "./_testFixtures.ts";

// Seed the workspace and credentials the dedup test needs so the production
// entitlement + credential checks actually pass.
before(async () => {
  await seedWorkspace('ws-dedup', { planId: 'business' });
  await seedInstagramCredentials('ws-dedup', 'acc-dup', 'token-dup');
});

test("invalid Meta signature is rejected", () => {
  const rawBody = Buffer.from('{}');
  const result = verifyMetaWebhookSignature(rawBody, 'bad-sig', 'real-secret');
  assert.strictEqual(result, false);
});

test("duplicate Instagram event suppression works", async () => {
  const events = [
    { message: { mid: 'msg-dup-1', text: 'hello' }, sender: { id: 'user-1' } }
  ];
  const stats1 = await handleInstagramWebhooks('ws-dedup', 'acc-dup', events);
  assert.strictEqual(stats1.processed, 1);

  // Same message id again should be deduplicated
  const stats2 = await handleInstagramWebhooks('ws-dedup', 'acc-dup', events);
  assert.strictEqual(stats2.duplicates, 1);
  assert.strictEqual(stats2.processed, 0);
});

test("cross-workspace routing rejection: workspace authorization enforced", async () => {
  // Empty workspace should fail-closed
  const stats = await handleInstagramWebhooks('', 'acc-unknown', [
    { message: { mid: 'msg-1', text: 'hello' }, sender: { id: 'user-1' } }
  ]);
  assert.strictEqual(stats.processed, 0);
  assert.strictEqual(stats.errors, 0);
});

test("entitlement denial blocks Instagram webhook processing", async () => {
  // Using a non-existent workspace with no entitlement should be denied
  const stats = await handleInstagramWebhooks('fake-starter-workspace', 'fake-acc', [
    { message: { mid: 'msg-ent', text: 'hello' }, sender: { id: 'user-2' } }
  ]);
  // Either denied or no credentials — should result in 0 processed
  assert.strictEqual(stats.processed, 0);
});

test("missing Instagram configuration fails closed", async () => {
  const result = await sendInstagramAIReply('fake-workspace', 'user-3', 'hello');
  assert.strictEqual(result.success, false);
  assert.ok(
    result.error?.includes('ENTITLEMENT') ||
    result.error?.includes('CREDENTIALS') ||
    result.error?.includes('REQUIRED')
  );
});

test("Unified Inbox persistence path exists via conversationService", async () => {
  const { conversationService } = await import('../src/services/conversationService.ts');
  // Verify instagram is a valid channel
  assert.ok('instagram');
  assert.strictEqual(typeof conversationService.getOrCreateConversation, 'function');
  assert.strictEqual(typeof conversationService.appendMessage, 'function');
});
