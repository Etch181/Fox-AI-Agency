# Official FOX AI AGENCY Email / SMTP Readiness
# Source of truth for Step 8.
# These values must be provided by the real domain owner before production activation.

# Required (must not be invented in code):
# SMTP_HOST=mail.foxaiagency.com
# SMTP_PORT=587
# SMTP_USER=noreply@foxaiagency.com
# SMTP_PASS=<provided-via-secure-vault>
# SMTP_FROM="FOX AI AGENCY <noreply@foxaiagency.com>"
# SMTP_SECURE=false (for port 587 STARTTLS) or true (for 465 TLS)

# Current safe state (staging):
ENABLE_SMTP=false
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="FOX AI AGENCY <noreply@foxaiagency.com>"

# Notes:
# - Do not set SMTP_HOST/USER/PASS to invented or fake values.
# - emailService.ts uses these only when ENABLE_SMTP=true and all values are non-empty.
# - When SMTP is disabled, service falls back safely to ethereal/simulation (never sends real email to production users).
# - OTP activation is blocked (fail-closed) when SMTP is unavailable and real delivery is required.
# - Official domain mailbox (mail.foxaiagency.com or equivalent) will provide real SMTP_HOST, PORT, USER, PASS.
# - All secrets (SMTP_PASS, workspace tokens) remain in workspaceSecretVault or environment vault only.
