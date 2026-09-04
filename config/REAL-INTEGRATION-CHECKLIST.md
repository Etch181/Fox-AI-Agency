# FOX AI AGENCY — Final Launch Integration Checklist (Step 8 Complete)
# Source of truth: workspace /opt/data/fox-ai-agency (branch fox-launch/completion-v1)
# All architecture and tests verified. Real-world integration pending owner action.

# A. META / FACEBOOK (current: NOT CONFIGURED)
# Required variables: META_APP_ID, META_APP_SECRET, META_PAGE_ID
# Per-workspace vault secrets: facebookPageAccessToken, facebookVerifyToken
# Webhook endpoint: deployed URL + /api/webhook/verification + /api/webhooks/meta-social
# Webhook events: page feed, messages, comments
# App review permissions: pages_read_engagement, pages_messaging, instagram_content_publish
# Note: server.ts meta webhook handler verifies sha256 (verifyMetaWebhookSignature) and uses workspace mapping (getWorkspaceByMetaPageId)

# B. MESSENGER (current: covered by Meta App; not independently configured)
# Required: same Meta App; pages_messaging permission; Messenger webhook events processed in same meta handler (entry.messaging)
# Note: handleMessengerDirectReply exists in server.ts; not rebuilt in this phase

# C. INSTAGRAM BUSINESS (current: Step 1-4 architecture complete; external config required)
# Required: linked Facebook Page; instagramBusinessAccountId; workspace secret instagramAccessToken
# Note: instagramService.ts + instagramCommentService.ts + instagramWebhookService.ts implement architecture; external publish/reply/path simulated safely

# D. WHATSAPP CLOUD API (current: workspace secret vault keys exist; external WABA not configured)
# Required: whatsappAccessToken, whatsappVerifyToken, whatsappBusinessAccountId, whatsappPhoneNumberId
# Note: whatsapp token keys exist in workspaceSecretVault WorkspaceSecretName type; real WABA required for production inbound/outbound

# E. SMTP / OFFICIAL DOMAIN MAILBOX (current: ENABLE_SMTP=false; no SMTP_HOST/PORT/USER/PASS set)
# Environment variables supported: SMTP_HOST, SMTP_PORT (default 587), SMTP_USER, SMTP_PASS, SMTP_FROM, ENABLE_SMTP
# Required action: official mailbox domain, SMTP account, DNS (SPF, DKIM, DMARC), then set ENABLE_SMTP=true
# Note: smtp-readiness.md (new file) documents safe readiness path; no invented values; emailService uses real SMTP when configured; falls back to ethereal/simulation when disabled

# F. FEATURE FLAGS / ENTITLEMENTS (current: no artificial feature-lock; entitlementService manages access)
# Verified keys in entitlementService: telegram, whatsapp, analytics, instagram_messaging, instagram_comments, instagram_publish, marketing_engine, appointment_reminder, marketing_campaign, email_otp
# No redundant parallel entitlement mechanism created; workspace isolation enforced; entitlement gate present before delivery in reminder service, campaign service, social publishing service, otp service
# Note: social_auto_publish covered by marketing_engine + Meta architecture; facebook_messenger covered by Meta/integration; no duplicate feature key needed

# G. REAL ACCEPTANCE TEST PLAN (before production deployment)
# 1. Deploy endpoint to reachable URL with webhook verification endpoint available
# 2. Configure Meta webhook subscription; verify webhook challenge succeeds
# 3. Create workspace with business/enterprise plan entitlement active
# 4. Set workspace secrets (facebookPageAccessToken, instagramAccessToken, whatsappAccessToken, telegramBotToken) from authorized manifest
# 5. Verify Facebook feed/comment webhook events process correctly (comment event creates conversation; AI reply preserved via existing meta handler)
# 6. Verify Instagram webhook events (messaging/comment) process through instagramWebhookService; conversation/inbox persistence verified; AI reply preserved
# 7. Verify scheduled social publish due-time: processScheduledPost creates state transition; external post ID simulated; never sends before scheduled time; bounded retry enforced
# 8. Verify reminder scheduling/reschedule/cancel: create reminder, claim/suppress, cancel suppresses, past-date suppression enforced, entitlement denied on starter plan
# 9. Verify campaign creation/delivery tracking: audience isolation, suppression, coupon workspace isolation, counter consistency, bounded retry, recipient status tracking
# 10. Verify OTP flow with real SMTP configured (ENABLE_SMTP=true + SMTP_HOST set): issue creates record; real email delivered; verify validates; activation allowed after verification; cross-workspace isolation maintained; replay/used tracking enforced; max attempts/bounded attempts enforced
# 11. Verify marketing engine generation + scheduling connects ClientMarketingAgent to engine; best-time recommendation returns heuristic; manual/auto modes respected
# 12. Confirm no secrets in logs; workspace isolation enforced; entitlement gates verified; no cross-workspace calendar/strategy access; no fabricated outputs; no real broadcasts sent before approval

# H. SECURITY REVIEW STATUS (completed)
# Critical findings: 0
# High findings: 0
# Medium findings: 0
# Workspace isolation: verified
# Entitlement: verified
# Idempotency/suppression/bounded retry: verified
# Secret/token leakage: verified none
# Fake SMTP/credentials: none used; ENABLE_SMTP=false safe
# No real external broadcasts/publishes/reminders/post events: preserved safely

# I. ARCHITECTURE STATUS (all 8 steps complete)
# Step 1: Instagram config/service (workspace-scoped config, encrypted vault secrets, entitlement, fail-closed, no secret logging)
# Step 2: Instagram webhooks/runtime (Meta webhook reuse, workspace authorization, entitlement gate, conversation/inbox persistence, CRM events, AI routing, no token logging)
# Step 3: Instagram comments/reply (Meta webhook reuse, event dedup, entitlement gate, workspace isolation, public/private reply routing, conversation persistence)
# Step 4: Social Publishing / Marketing (workspace-scoped publishing service, lifecycle states, schedule/approval/auto, bounded retry, duplicate prevention, entitlement gate, Facebook/Instagram routing via Meta architecture)
# Step 5: Marketing Engine (MarketingStrategy, ContentCalendarEntry, generateMarketingContent, recommendPublishTime heuristics, performance model, evidence-based learning model, manual/auto modes, marketingPublishingBridge)
# Step 6: Appointment Reminders (AppointmentReminder model, scheduling, timezone, reschedule, cancel suppression, idempotency, bounded retry, entitlement gate, workspace isolation, channel abstraction, CRM/audit tracking, ClientReminderSettings adapter)
# Step 7: Campaigns/Broadcast (Campaign model, audience isolation, suppression, coupon isolation, scheduling, recipient delivery records, bounded retry, idempotency, WhatsApp policy path preserved, workspace isolation, entitlement gate, ClientReminderSettings adapter preserved)
# Step 8: OTP + Final Gating (otpService secure generation/hash/comparison/expiry/used/max-attempts/bounded-retry/workspace-isolation, SMTP readiness documentation, entitlement architecture verified, feature keys verified, ClientReminderSettings adapter preserved, security review complete)

# J. NEXT OWNER ACTIONS (in order)
# 1: Confirm workspace isolation verified across all services; confirm entitlement gate present in reminder, campaign, social, marketing services.
# 2: Configure SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS and SMTP_FROM (official domain mailbox only); set ENABLE_SMTP=true; verify emailService delivers real email.
# 3: Configure official domain DNS (SPF, DKIM, DMARC records) for SMTP mailbox.
# 4: Create Meta App; configure App ID / Secret / Page ID; set webhook verification endpoint; submit app review for pages_read_engagement, pages_messaging, instagram_content_publish.
# 5: Link Instagram Business Account to Facebook Page; configure instagramBusinessAccountId and instagramAccessToken.
# 6: Configure workspace token secrets (facebookPageAccessToken, whatsappAccessToken, instagramAccessToken, telegramBotToken) through authorized remote manifest (not invented).
# 7: Configure WhatsApp Cloud Business Account; link phone number; configure webhook; approve templates for marketing/reminders.
# 8: Deploy endpoint with webhook verification endpoint accessible; enable Meta webhook subscriptions; verify event delivery; verify no secret/token exposure in logs; confirm bounded retries and suppression working.
# 9: Verify entitlementService features cover all launched features; confirm manual/auto modes working; confirm no fabricated outputs or fabricated performance/learning results.
# 10: Confirm no real broadcasts/reminders/post events sent to production users; confirm simulated paths preserved; confirm real-world external configurations completed before production.
