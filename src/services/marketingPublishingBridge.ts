// Integration hook connecting ClientMarketingAgent generated content to social publishing
import { createSocialPublishRecord, processScheduledPost } from './socialPublishingService.ts';

export async function publishMarketingContent(
  workspaceId: string,
  platform: 'facebook' | 'instagram',
  content: string,
  mode: 'MANUAL_APPROVAL' | 'AUTO_PUBLISH' = 'MANUAL_APPROVAL',
  scheduleAt?: string
): Promise<{ recordId: string; state: string }> {
  const id = await createSocialPublishRecord(workspaceId, {
    platform,
    content,
    mode,
    state: scheduleAt ? 'scheduled' : 'draft',
    scheduledAt: scheduleAt,
  });
  return { recordId: id, state: scheduleAt ? 'scheduled' : 'draft' };
}
