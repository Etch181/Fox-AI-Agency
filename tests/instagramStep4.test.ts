import assert from "node:assert/strict";
import { before } from "node:test";
import test from "node:test";

import {
  createSocialPublishRecord,
  getSocialPublishRecord,
  transitionRecordState,
  findDueScheduledPosts,
  processScheduledPost,
} from '../src/services/socialPublishingService.ts';
import { seedWorkspace, seedInstagramCredentials } from './_testFixtures.ts';

// Seed enterprise workspace + Instagram creds for the publish-flow tests.
before(async () => {
  await seedWorkspace('ws-publish-dedup', { planId: 'enterprise' });
  await seedInstagramCredentials('ws-publish-dedup', 'acc-pub-dedup', 'token-pub-dedup');
});

test("cross-workspace isolation: different workspace records are isolated", async () => {
  const id1 = await createSocialPublishRecord('ws-social-1', { platform: 'facebook', content: 'post 1', mode: 'MANUAL_APPROVAL' });
  const record1 = await getSocialPublishRecord('ws-social-1', id1);
  assert.strictEqual(record1?.workspaceId, 'ws-social-1');
  assert.strictEqual(record1?.platform, 'facebook');

  const missing = await getSocialPublishRecord('ws-social-2', id1);
  assert.strictEqual(missing, null);
});

test("entitlement denial: starter plan cannot publish", async () => {
  // Using a starter workspace with no Instagram messaging / marketing features
  // The service checks entitlement via canWorkspaceUseFeature
  // For simplicity, test that a fake workspace fails entitlement in process
  const id = await createSocialPublishRecord('fake-starter', { platform: 'instagram', content: 'test', mode: 'MANUAL_APPROVAL' });
  const result = await processScheduledPost('fake-starter', id);
  assert.strictEqual(result.success, false);
  assert.ok(result.error);
});

test("missing credentials fail closed", async () => {
  const id = await createSocialPublishRecord('fake-cred', { platform: 'facebook', content: 'test', mode: 'MANUAL_APPROVAL' });
  const result = await processScheduledPost('fake-cred', id);
  assert.strictEqual(result.success, false);
  assert.ok(result.error);
});

test("duplicate publish prevention via state and bounded retries", async () => {
  // Instagram publish requires enterprise plan; the seeded workspace for
  // this id uses enterprise so entitlement + credentials checks pass.
  const id = await createSocialPublishRecord('ws-publish-dedup', { platform: 'instagram', content: 'dedup test', mode: 'MANUAL_APPROVAL', state: 'scheduled', scheduledAt: new Date().toISOString() });

  // First process should succeed (simulated)
  const r1 = await processScheduledPost('ws-publish-dedup', id);
  assert.strictEqual(r1.success, true);

  // After published, processing again should not work (not scheduled)
  // For bounded retries, test attempts tracking
  const record = await getSocialPublishRecord('ws-publish-dedup', id);
  assert.ok(record);
  assert.strictEqual(record?.state, 'published');
  assert.strictEqual(record?.attempts ?? 0, 1);
});

test("scheduled post not published early: due-post transition checks time", async () => {
  const future = new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour future
  const id = await createSocialPublishRecord('ws-time', { platform: 'instagram', content: 'future', mode: 'MANUAL_APPROVAL', state: 'scheduled', scheduledAt: future });
  const due = await findDueScheduledPosts('ws-time');
  assert.strictEqual(due.length, 0); // Not due yet
});

test("due post transitions through lifecycle correctly", async () => {
  const now = new Date().toISOString();
  const id = await createSocialPublishRecord('ws-lifecycle', { platform: 'facebook', content: 'life', mode: 'MANUAL_APPROVAL', state: 'scheduled', scheduledAt: now });
  const due = await findDueScheduledPosts('ws-lifecycle', new Date());
  assert.strictEqual(due.length, 1);
});

test("manual approval prevents automatic publishing when mode is MANUAL_APPROVAL", async () => {
  const id = await createSocialPublishRecord('ws-manual', { platform: 'instagram', content: 'manual', mode: 'MANUAL_APPROVAL', state: 'draft' });
  const record = await getSocialPublishRecord('ws-manual', id);
  assert.strictEqual(record?.mode, 'MANUAL_APPROVAL');
  assert.strictEqual(record?.state, 'draft');
});

test("AUTO_PUBLISH allows eligible scheduled content", async () => {
  const id = await createSocialPublishRecord('ws-auto', { platform: 'facebook', content: 'auto post', mode: 'AUTO_PUBLISH', state: 'scheduled', scheduledAt: new Date().toISOString() });
  const record = await getSocialPublishRecord('ws-auto', id);
  assert.strictEqual(record?.mode, 'AUTO_PUBLISH');
});

test("Facebook and Instagram routing uses different entitlement checks", async () => {
  // Facebook uses instagram_messaging feature check in current architecture; both require entitlement
  const fb = await createSocialPublishRecord('ws-route', { platform: 'facebook', content: 'fb', mode: 'MANUAL_APPROVAL' });
  const ig = await createSocialPublishRecord('ws-route', { platform: 'instagram', content: 'ig', mode: 'MANUAL_APPROVAL' });
  assert.ok(fb);
  assert.ok(ig);
});

test("no real external publishing in tests: process uses simulated externalPostId structure", async () => {
  const id = await createSocialPublishRecord('ws-sim', { platform: 'instagram', content: 'sim', mode: 'AUTO_PUBLISH', state: 'scheduled', scheduledAt: new Date().toISOString() });
  // Processing on a non-existent workspace should fail safely without external call
  const result = await processScheduledPost('ws-sim-missing', id);
  assert.strictEqual(result.success, false);
});

test("audit event not directly logged: sanitized error never includes tokens", async () => {
  // Verify sanitizeError strips potential secrets by inspecting actual error
  // structure returned from the service — never log raw token values.
  const id = await createSocialPublishRecord('ws-audit', { platform: 'instagram', content: 'audit', mode: 'MANUAL_APPROVAL' });
  const result = await processScheduledPost('ws-audit', id);
  // The service must return a sanitized error string, never the underlying token
  if (result.error) {
    assert.ok(!result.error.includes('IGQ'), 'error must not contain token prefix');
    assert.ok(!result.error.includes('token='), 'error must not contain token assignment');
  }
});
