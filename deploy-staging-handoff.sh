#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

# FOX staging only — do not change these paths.
SOURCE="/docker/hermes-agent-6pb0/data/fox-ai-agency"
COMPOSE="/docker/fox-ai-staging/docker-compose.yml"
ENV_FILE="${SOURCE}/.env.staging"
CONTAINER="fox-ai-staging"
BASE_URL="https://staging.foxaiagency.online"
WORKSPACE_ID="ws_tg_924598"
EXPECTED_TELEGRAM_WEBHOOK="${BASE_URL}/api/telegram/webhook/${WORKSPACE_ID}"
BACKUP_ROOT="/docker/fox-ai-staging-backups"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="${BACKUP_ROOT}/${STAMP}"
STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
CONFIG_JSON="$(mktemp)"
PUBLIC_ENV="$(mktemp)"
SAFE_SMOKE="$(mktemp --suffix=.mjs)"
TELEGRAM_CHECK="$(mktemp --suffix=.mjs)"
# /tmp is writable by the non-root runtime user. Do not use /app here:
# previous handoffs failed closed with EACCES when creating verifier files.
HANDOFF_DIR="/tmp/fox-staging-handoff-${STAMP}"
SERVICE=""
PREVIOUS_IMAGE_REF=""
ROLLBACK_TAG=""
DEPLOY_RECREATED=0

cleanup() {
  rm -f \
    "$CONFIG_JSON" \
    "$PUBLIC_ENV" \
    "$SAFE_SMOKE" \
    "$TELEGRAM_CHECK" \
    2>/dev/null || true

  docker exec "$CONTAINER" rm -rf "$HANDOFF_DIR" \
    >/dev/null 2>&1 || true
}

show_relevant_errors() {
  printf '\n=== RELEVANT FOX STAGING ERRORS ===\n'

  docker logs --since "$STARTED_AT" "$CONTAINER" 2>&1 | python3 -c '
import re, sys

lines = sys.stdin.read().splitlines()
selected = [
    line for line in lines
    if re.search(
        r"(error|failed|failure|fatal|exception|unhandled|uncaught|unhealthy|denied|invalid)",
        line,
        re.I,
    )
]

for line in selected[-120:]:
    line = re.sub(
        r"(?i)(authorization|bearer|token|api[_ -]?key|secret|password|private[_ -]?key)(\s*[:=]\s*)(\S+)",
        r"\1\2<redacted>",
        line,
    )
    line = re.sub(
        r"(?i)(access_token=)[^&\s]+",
        r"\1<redacted>",
        line,
    )
    line = re.sub(
        r"AIza[0-9A-Za-z_-]{20,}",
        "<redacted-public-key>",
        line,
    )
    print(line[:1200])

if not selected:
    print("No matching error lines found in the current restart window.")
' || true

  printf '=== END RELEVANT ERRORS ===\n'
}

on_error() {
  rc=$?
  set +e

  printf '\nDEPLOYMENT FAILED at line %s (exit %s).\n' \
    "${BASH_LINENO[0]:-unknown}" \
    "$rc"

  docker ps -a \
    --filter "name=^/${CONTAINER}$" \
    --format 'container={{.Names}} status={{.Status}} image={{.Image}}' \
    || true

  show_relevant_errors

  if [ "$DEPLOY_RECREATED" -eq 1 ] && \
     [ -n "$ROLLBACK_TAG" ] && \
     [ -n "$PREVIOUS_IMAGE_REF" ] && \
     [ -n "$SERVICE" ]; then
    printf '\nAttempting automatic rollback to the pre-deploy staging image...\n'
    docker tag "$ROLLBACK_TAG" "$PREVIOUS_IMAGE_REF"
    docker compose \
      -f "$COMPOSE" \
      --env-file "$ENV_FILE" \
      up -d --no-deps --force-recreate "$SERVICE"
    rollback_healthy=0
    for _ in $(seq 1 30); do
      rollback_state="$(docker inspect --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$CONTAINER")"
      if [ "$rollback_state" = "running healthy" ]; then
        rollback_healthy=1
        break
      fi
      sleep 2
    done
    if [ "$rollback_healthy" -eq 1 ]; then
      printf 'Automatic staging image rollback completed and is healthy.\n'
    else
      printf 'WARNING: rollback container did not become healthy.\n'
    fi
  fi

  cleanup
  exit "$rc"
}

trap on_error ERR
trap cleanup EXIT

printf '=== 1. VERIFY STAGING PATHS AND FIX ARTIFACTS ===\n'

test -d "$SOURCE"
test -f "$COMPOSE"
test -f "$ENV_FILE"
test -f "${SOURCE}/Dockerfile"
test -f "${SOURCE}/src/services/bookingDateTimeParser.ts"
test -f "${SOURCE}/src/services/tenantBusinessInquiry.ts"
test -f "${SOURCE}/src/utils/metaWebhookSignature.ts"
test -f "${SOURCE}/src/utils/dateOnly.ts"
test -f "${SOURCE}/src/utils/workspaceHydration.ts"
test -f "${SOURCE}/tests/bookingDateTimeParser.test.ts"
test -f "${SOURCE}/tests/postBookingBusinessRouting.test.ts"
test -f "${SOURCE}/tests/appContextHydration.test.ts"
test -f "${SOURCE}/tests/dateOnlyCalendar.test.ts"
test -f "${SOURCE}/tests/metaWebhookSignature.test.ts"
test -f "${SOURCE}/tests/stagingIntegrationSecurity.test.ts"
test -f "${SOURCE}/tests/tenantNestedHydration.test.ts"
test -f "${SOURCE}/tests/workspaceDataCompatibility.test.ts"
test -f "${SOURCE}/scripts/build-staging.mjs"
test -f "${SOURCE}/scripts/staging-smoke.mjs"
test -f "${SOURCE}/scripts/staging-data-audit.mjs"
test -f "${SOURCE}/deploy/n8n-staging/docker-compose.yml"

python3 - "$SOURCE" "$ENV_FILE" <<'PY'
import pathlib
import re
import sys

source = pathlib.Path(sys.argv[1])
env_file = pathlib.Path(sys.argv[2])

required_source_checks = {
    "src/services/bookingDateTimeParser.ts": [
        "parseBookingDateTime",
        "hasBookingDateSignal",
        "hasBookingTimeSignal",
        "1–7 means PM",
        "8–12 means AM",
    ],
    "src/services/aiAgentService.ts": [
        "parseBookingDateTime",
        "parseBookingIdentity",
        "book\\s+appointment",
        "answerTenantBusinessInquiry",
        "BOOKING_STATE:COMPLETED",
    ],
    "src/services/tenantBusinessInquiry.ts": [
        "answerTenantBusinessInquiry",
        "eligibleCoupons",
        "لا توجد عروض متاحة حالياً",
    ],
    "src/context/AppContext.tsx": [
        "onAuthStateChanged",
        "authHydrated",
        "waitForAuthHydration",
        "RegistrationCoordinator",
        "waitForAuthOperation",
        "registrationBatchCommitted",
        "deleteUser",
        "workspacesLoading",
        "workspacesError",
        "resolveAuthorizedWorkspaceSelection",
        '"workspaces",',
        '"crmLeads",',
        '"appointments",',
        "crmLeadsLoading",
        "appointmentsLoading",
        "compatibility-only",
    ],
    "src/App.tsx": [
        'activeTab.startsWith("admin_")',
        "return isSuperAdmin ?",
        "Loading authorized workspaces",
    ],
    "src/utils/workspaceHydration.ts": [
        "resolveAuthorizedWorkspaceSelection",
        "userWorkspaceId",
        "isSuperAdmin",
    ],
    "src/utils/dateOnly.ts": [
        "formatLocalDateKey",
        "getFullYear",
        "getMonth",
        "getDate",
    ],
    "src/components/client/ClientCRM.tsx": [
        "workspacesLoading",
        "crmLeadsLoading",
        "crmSubscriptionError",
        "CRM data could not be loaded",
    ],
    "src/components/client/ClientAppointments.tsx": [
        "appointmentsLoading",
        "appointmentsError",
        "No appointments yet",
    ],
    "src/components/client/clinic/BookingCalendar.tsx": [
        "formatLocalDateKey",
        "a.date === selectedDateKey",
        "appointmentsLoading",
    ],
    "src/services/workspaceDataService.ts": [
        "syncRootCrmLeadCompatibility",
        "getClinicServices",
        "getKnowledgeFacts",
        "getCoupons",
    ],
    "src/utils/metaWebhookSignature.ts": [
        "verifyMetaWebhookSignature",
        "timingSafeEqual",
        "sha256=",
    ],
    "server.ts": [
        "N8N_WEBHOOK_URL",
        "N8N_WEBHOOK_SECRET",
        "verifyMetaWebhookSignature",
        "facebookPageAccessToken",
        "getWorkspaceByMetaPageId",
        '"/api/ai/reset-session"',
        "authenticateFirebaseRequest",
        "requireAuthenticatedWorkspace",
        '"getWebhookInfo"',
        "last_error_message",
    ],
    "scripts/staging-smoke.mjs": [
        "fox-ai-agency-staging",
        "Meta verification fails closed",
        "n8n endpoint fails closed without auth",
    ],
}

for relative, markers in required_source_checks.items():
    text = (source / relative).read_text(encoding="utf-8")
    for marker in markers:
        if marker not in text:
            raise SystemExit(
                f"Missing expected fix marker in {relative}: {marker}"
            )

workflows = sorted(
    (source / "deploy/n8n-staging/workflows").glob("*.json")
)

if len(workflows) != 10:
    raise SystemExit(
        f"Expected 10 n8n workflows, found {len(workflows)}"
    )

values = {}

for raw in env_file.read_text(encoding="utf-8").splitlines():
    line = raw.strip()

    if not line or line.startswith("#") or "=" not in line:
        continue

    key, value = line.split("=", 1)
    value = value.strip()

    if (
        len(value) >= 2
        and value[0] == value[-1]
        and value[0] in "\"'"
    ):
        value = value[1:-1]

    values[key.strip()] = value

if values.get("GOOGLE_CLOUD_PROJECT") != "fox-ai-agency-staging":
    raise SystemExit(
        "GOOGLE_CLOUD_PROJECT is not the staging project"
    )

if (
    values.get("VITE_FIREBASE_PROJECT_ID")
    != "fox-ai-agency-staging"
):
    raise SystemExit(
        "VITE_FIREBASE_PROJECT_ID is not the staging project"
    )

if (
    values.get("FOX_PUBLIC_BASE_URL")
    != "https://staging.foxaiagency.online"
):
    raise SystemExit(
        "FOX_PUBLIC_BASE_URL is not the staging URL"
    )

if values.get("FIRESTORE_DATABASE_ID", ""):
    raise SystemExit(
        "FIRESTORE_DATABASE_ID must be empty for the default database"
    )

dockerfile = (source / "Dockerfile").read_text(encoding="utf-8")

if not re.search(r"FROM\s+node:24(?:[-\s]|$)", dockerfile):
    raise SystemExit(
        "Dockerfile is not pinned to Node 24"
    )

print("Source fix markers: PASS")
print("Staging environment identity: PASS")
print("Node 24 Docker build requirement: PASS")
print("n8n workflow count: 10")
PY

printf '\n=== 2. CURRENT GIT/SOURCE STATE ===\n'

git -C "$SOURCE" status --short --branch

printf 'HEAD='
git -C "$SOURCE" rev-parse HEAD

printf '\nModified tracked files:\n'
git -C "$SOURCE" diff --name-only

printf '\nUntracked files:\n'
git -C "$SOURCE" ls-files --others --exclude-standard

printf '\n=== 3. IDENTIFY THE EXISTING STAGING COMPOSE SERVICE ===\n'

docker inspect "$CONTAINER" >/dev/null

SERVICE="$(
  docker inspect \
    --format '{{ index .Config.Labels "com.docker.compose.service" }}' \
    "$CONTAINER"
)"

test -n "$SERVICE"

printf 'Staging container=%s compose_service=%s\n' \
  "$CONTAINER" \
  "$SERVICE"

docker compose \
  -f "$COMPOSE" \
  --env-file "$ENV_FILE" \
  config --format json >"$CONFIG_JSON"

python3 - \
  "$CONFIG_JSON" \
  "$SERVICE" \
  "$SOURCE" \
  "$CONTAINER" <<'PY'
import json
import os
import sys

config_path, service_name, expected_source, expected_container = (
    sys.argv[1:]
)

with open(config_path, encoding="utf-8") as handle:
    config = json.load(handle)

service = config.get("services", {}).get(service_name)

if not service:
    raise SystemExit(
        f"Compose service not found: {service_name}"
    )

if service.get("container_name") != expected_container:
    raise SystemExit(
        "Compose service does not target fox-ai-staging"
    )

build = service.get("build")

if isinstance(build, str):
    context = build
elif isinstance(build, dict):
    context = build.get("context")
else:
    context = None

if not context:
    raise SystemExit(
        "Staging service has no source build context"
    )

if os.path.realpath(context) != os.path.realpath(expected_source):
    raise SystemExit(
        "Compose build context mismatch: expected the shared FOX staging source"
    )

environment = service.get("environment") or {}
if not isinstance(environment, dict):
    raise SystemExit("Resolved Compose service environment is not a mapping")

required_environment = {
    "GOOGLE_CLOUD_PROJECT": "fox-ai-agency-staging",
    "VITE_FIREBASE_PROJECT_ID": "fox-ai-agency-staging",
    "FOX_PUBLIC_BASE_URL": "https://staging.foxaiagency.online",
    "FIRESTORE_DATABASE_ID": "",
    "ENABLE_TELEGRAM": "true",
    "ENABLE_META": "false",
    "ENABLE_SMTP": "false",
    "ENABLE_N8N": "false",
    "ENABLE_EXTERNAL_CRM": "false",
}
for key, expected in required_environment.items():
    actual = str(environment.get(key) or "")
    if actual != expected:
        raise SystemExit(
            f"Resolved Compose environment is not staging-safe: {key}"
        )

credential_target = str(
    environment.get("GOOGLE_APPLICATION_CREDENTIALS") or ""
)
if not credential_target or "staging" not in credential_target.lower():
    raise SystemExit(
        "Resolved staging credential target is missing or ambiguous"
    )

credential_source = None
for volume in service.get("volumes") or []:
    if not isinstance(volume, dict):
        continue
    if str(volume.get("target") or "") == credential_target:
        credential_source = str(volume.get("source") or "")
        break

if not credential_source or not os.path.isfile(credential_source):
    raise SystemExit("Staging credential volume source was not found")

with open(credential_source, encoding="utf-8") as handle:
    credential = json.load(handle)
if credential.get("project_id") != "fox-ai-agency-staging":
    raise SystemExit("Resolved credential is not for the staging project")

print("Compose container target: PASS")
print("Compose build context matches shared source: PASS")
print("Resolved Compose runtime environment: STAGING PASS")
print("Resolved credential project: STAGING PASS")
PY

PREVIOUS_IMAGE_ID="$(docker inspect --format '{{.Image}}' "$CONTAINER")"
PREVIOUS_IMAGE_REF="$(docker inspect --format '{{.Config.Image}}' "$CONTAINER")"
test -n "$PREVIOUS_IMAGE_ID"
test -n "$PREVIOUS_IMAGE_REF"
ROLLBACK_TAG="fox-ai-staging-rollback:${STAMP}"
docker tag "$PREVIOUS_IMAGE_ID" "$ROLLBACK_TAG"
printf 'Pre-deploy rollback image prepared: %s\n' "$ROLLBACK_TAG"

printf '\n=== 4. CREATE SECURE TIMESTAMPED BACKUP OUTSIDE REPOSITORY ===\n'

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_ROOT" "$BACKUP_DIR"

tar \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='.cache' \
  --exclude='.firebase' \
  -C "$SOURCE" \
  -czf "${BACKUP_DIR}/fox-ai-agency-source.tgz" \
  .

chmod 600 "${BACKUP_DIR}/fox-ai-agency-source.tgz"

git -C "$SOURCE" status --porcelain=v1 \
  >"${BACKUP_DIR}/git-status.txt"

git -C "$SOURCE" rev-parse HEAD \
  >"${BACKUP_DIR}/git-head.txt"

chmod 600 \
  "${BACKUP_DIR}/git-status.txt" \
  "${BACKUP_DIR}/git-head.txt"

printf 'Backup created: %s\n' "$BACKUP_DIR"

printf '\n=== 5. LOAD ONLY PUBLIC BUILD VARIABLES WITHOUT PRINTING VALUES ===\n'

python3 - "$ENV_FILE" "$PUBLIC_ENV" <<'PY'
import pathlib
import shlex
import sys

env_path = pathlib.Path(sys.argv[1])
output_path = pathlib.Path(sys.argv[2])

allowed = [
    "VITE_FIREBASE_API_KEY",
    "VITE_FIREBASE_AUTH_DOMAIN",
    "VITE_FIREBASE_PROJECT_ID",
    "VITE_FIREBASE_STORAGE_BUCKET",
    "VITE_FIREBASE_MESSAGING_SENDER_ID",
    "VITE_FIREBASE_APP_ID",
]

values = {}

for raw in env_path.read_text(encoding="utf-8").splitlines():
    line = raw.strip()

    if not line or line.startswith("#") or "=" not in line:
        continue

    key, value = line.split("=", 1)
    key = key.strip()
    value = value.strip()

    if (
        len(value) >= 2
        and value[0] == value[-1]
        and value[0] in "\"'"
    ):
        value = value[1:-1]

    if key in allowed:
        values[key] = value

missing = [
    key for key in allowed
    if not values.get(key)
]

if missing:
    raise SystemExit(
        "Missing required public staging build variables: "
        + ", ".join(missing)
    )

if (
    values["VITE_FIREBASE_PROJECT_ID"]
    != "fox-ai-agency-staging"
):
    raise SystemExit(
        "Refusing build: public Firebase project is not staging"
    )

output_path.write_text(
    "".join(
        f"export {key}={shlex.quote(values[key])}\n"
        for key in allowed
    ),
    encoding="utf-8",
)

output_path.chmod(0o600)
PY

# shellcheck disable=SC1090
. "$PUBLIC_ENV"

printf '\n=== 6. BUILD UPDATED STAGING IMAGE FROM SHARED SOURCE ===\n'

docker compose \
  -f "$COMPOSE" \
  --env-file "$ENV_FILE" \
  build \
  --no-cache \
  --build-arg VITE_FIREBASE_API_KEY \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN \
  --build-arg VITE_FIREBASE_PROJECT_ID \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID \
  --build-arg VITE_FIREBASE_APP_ID \
  "$SERVICE"

printf '\n=== 7. RECREATE ONLY THE FOX STAGING SERVICE ===\n'

STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

DEPLOY_RECREATED=1
docker compose \
  -f "$COMPOSE" \
  --env-file "$ENV_FILE" \
  up -d \
  --no-deps \
  --force-recreate \
  "$SERVICE"

printf '\n=== 8. WAIT FOR CONTAINER HEALTH ===\n'

healthy=0

for _ in $(seq 1 60); do
  state="$(
    docker inspect \
      --format '{{.State.Status}} {{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' \
      "$CONTAINER"
  )"

  if [ "$state" = "running healthy" ]; then
    healthy=1
    break
  fi

  sleep 2
done

test "$healthy" -eq 1

docker inspect \
  --format 'container={{.Name}} status={{.State.Status}} health={{.State.Health.Status}} image={{.Config.Image}}' \
  "$CONTAINER"

printf '\n=== 9. VERIFY PUBLIC HEALTH AND READINESS ===\n'

python3 - "$BASE_URL" <<'PY'
import json
import sys
import urllib.request

base = sys.argv[1]

for path, expected in [
    ("/api/health", ("status", "ok")),
    ("/api/ready", ("ready", True)),
]:
    with urllib.request.urlopen(
        base + path,
        timeout=30,
    ) as response:
        if response.status != 200:
            raise SystemExit(
                f"{path}: HTTP {response.status}"
            )

        body = json.load(response)

    key, value = expected

    if body.get(key) != value:
        raise SystemExit(
            f"{path}: expected {key}={value!r}"
        )

    print(f"{path}: PASS")
PY

printf '\n=== 10. VERIFY BUILT FRONTEND FIREBASE ISOLATION ===\n'

python3 - "$BASE_URL" "$CONTAINER" <<'PY'
import hashlib
import re
import subprocess
import sys
import urllib.parse
import urllib.request

base, container = sys.argv[1:]

with urllib.request.urlopen(
    base + "/",
    timeout=30,
) as response:
    html = response.read().decode(
        "utf-8",
        "replace",
    )

assets = sorted(set(
    match.group(1)
    for match in re.finditer(
        r'(?:src|href)=["\x27]([^"\x27]+\.js)["\x27]',
        html,
    )
))

if not assets:
    raise SystemExit(
        "No frontend JavaScript asset found"
    )

bundle_parts = []

for asset in assets:
    url = urllib.parse.urljoin(
        base + "/",
        asset,
    )

    with urllib.request.urlopen(
        url,
        timeout=60,
    ) as response:
        public_bytes = response.read()
        bundle_parts.append(
            public_bytes.decode("utf-8", "replace")
        )

    parsed_asset = urllib.parse.urlparse(asset).path
    if not parsed_asset.startswith("/assets/") or ".." in parsed_asset:
        raise SystemExit("Unsafe frontend asset path")
    container_path = "/app/dist" + parsed_asset
    container_hash = subprocess.check_output(
        ["docker", "exec", container, "sha256sum", container_path],
        text=True,
    ).split()[0]
    if hashlib.sha256(public_bytes).hexdigest() != container_hash:
        raise SystemExit(
            "Public staging asset does not match the recreated container"
        )

bundle = "\n".join(bundle_parts)

if "fox-ai-agency-staging" not in bundle:
    raise SystemExit(
        "Staging Firebase project reference is absent"
    )

if re.search(
    r"fox-ai-agency-(?:prod|production)",
    bundle,
    re.I,
):
    raise SystemExit(
        "Production Firebase marker found in frontend"
    )

firebase_projects = set(
    match.group(1)
    for match in re.finditer(
        r"([a-z0-9-]+)\.firebaseapp\.com",
        bundle,
        re.I,
    )
)

unexpected = sorted(
    project
    for project in firebase_projects
    if project != "fox-ai-agency-staging"
)

if unexpected:
    raise SystemExit(
        "Unexpected Firebase project reference found"
    )

for forbidden in [
    r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----",
    r'"private_key"\s*:',
    r"(?:ghp|xoxb|sk_live)_[0-9A-Za-z_-]{20,}",
]:
    if re.search(forbidden, bundle):
        raise SystemExit(
            "Private secret marker found in frontend bundle"
        )

print(f"Frontend assets checked: {len(assets)}")
print("Public route matches recreated container assets: PASS")
print("Staging Firebase reference: PASS")
print("Production Firebase reference: ABSENT")
print("Private secret marker scan: PASS")
PY

printf '\n=== 11. VERIFY STARTUP AND TELEGRAM RUNTIME LOGS ===\n'

docker logs --since "$STARTED_AT" "$CONTAINER" 2>&1 \
  >"${BACKUP_DIR}/restart.log"

chmod 600 "${BACKUP_DIR}/restart.log"

python3 - \
  "${BACKUP_DIR}/restart.log" \
  "$WORKSPACE_ID" \
  "$BASE_URL" <<'PY'
import pathlib
import sys

log_path, workspace, base = sys.argv[1:]

text = pathlib.Path(log_path).read_text(
    encoding="utf-8",
    errors="replace",
)

required = [
    "[Firebase Admin] Initialized | Project=fox-ai-agency-staging | Database=(default)",
    "[Workspace Telegram Webhook Connected]",
    "[FOX Telegram Runtime] Tenant mode=webhook",
    base,
]

missing = [
    marker
    for marker in required
    if marker not in text
]

if missing:
    raise SystemExit(
        "Missing Telegram/runtime startup evidence: "
        + ", ".join(missing)
    )

error_markers = [
    "UnhandledPromiseRejection",
    "uncaughtException",
    "EADDRINUSE",
    "Firebase Admin initialization failed",
]

found = [
    marker
    for marker in error_markers
    if marker in text
]

if found:
    raise SystemExit(
        "Startup error marker found: "
        + ", ".join(found)
    )

print("Firebase Admin staging/default database boot: PASS")
print("Telegram webhook automatic restoration log: PASS")
print("Telegram tenant webhook runtime log: PASS")
print("Startup fatal-error scan: PASS")
PY

printf '\n=== 12. PREPARE SAFE NON-DESTRUCTIVE TELEGRAM getWebhookInfo CHECK ===\n'

cat >"$TELEGRAM_CHECK" <<'NODE'
import {
  applicationDefault,
  getApps,
  initializeApp,
} from "firebase-admin/app";

import {
  getFirestore,
} from "firebase-admin/firestore";

import {
  createDecipheriv,
  createHash,
} from "node:crypto";

const workspaceId =
  process.env.FOX_TELEGRAM_WORKSPACE_ID || "";

const expectedWebhook =
  process.env.FOX_EXPECTED_TELEGRAM_WEBHOOK || "";

const projectId =
  process.env.GOOGLE_CLOUD_PROJECT || "";

function fail(message) {
  console.error(
    `Telegram getWebhookInfo verification failed: ${message}`
  );
  process.exit(1);
}

async function main() {
  if (
    workspaceId !== "ws_tg_924598" ||
    projectId !== "fox-ai-agency-staging" ||
    expectedWebhook !==
      "https://staging.foxaiagency.online/api/telegram/webhook/ws_tg_924598"
  ) {
    fail("staging identity assertion failed");
  }

  const encryptionSecret =
    String(process.env.FOX_SECRET_KEY || "");

  if (!encryptionSecret) {
    fail("workspace vault decryption key is unavailable");
  }

  const app =
    getApps()[0] ||
    initializeApp({
      credential: applicationDefault(),
      projectId,
    });

  const db = getFirestore(app);

  const snapshot = await db
    .collection("workspaceSecrets")
    .doc(workspaceId)
    .collection("secrets")
    .doc("telegramBotToken")
    .get();

  if (!snapshot.exists) {
    fail("tenant Telegram vault secret is missing");
  }

  const encrypted =
    snapshot.data()?.encrypted || {};

  if (
    !encrypted.iv ||
    !encrypted.tag ||
    !encrypted.data
  ) {
    fail("tenant Telegram vault record is invalid");
  }

  let token = "";

  try {
    const key = createHash("sha256")
      .update(encryptionSecret)
      .digest();

    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(encrypted.iv, "base64"),
    );

    decipher.setAuthTag(
      Buffer.from(encrypted.tag, "base64"),
    );

    token = Buffer.concat([
      decipher.update(
        Buffer.from(encrypted.data, "base64"),
      ),
      decipher.final(),
    ]).toString("utf8");
  } catch {
    fail("tenant Telegram vault secret could not be decrypted");
  }

  if (!token.trim()) {
    fail("tenant Telegram token is empty");
  }

  let payload;

  try {
    const response = await fetch(
      `https://api.telegram.org/bot${token.trim()}/getWebhookInfo`,
      {
        method: "GET",
        signal: AbortSignal.timeout(20000),
      },
    );

    payload = await response.json();

    if (!response.ok || payload?.ok !== true) {
      fail("Telegram API rejected getWebhookInfo");
    }
  } catch {
    fail("Telegram getWebhookInfo request failed");
  } finally {
    token = "";
  }

  const actualWebhook =
    String(payload?.result?.url || "").trim();

  const lastErrorMessage =
    String(
      payload?.result?.last_error_message || ""
    ).trim();

  if (actualWebhook !== expectedWebhook) {
    fail("configured webhook URL does not match staging");
  }

  if (lastErrorMessage) {
    fail("Telegram reports a webhook last_error_message");
  }

  const pendingUpdates = Number(
    payload?.result?.pending_update_count || 0
  );

  console.log("Telegram getWebhookInfo: PASS");
  console.log(
    `Webhook URL: ${actualWebhook}`
  );
  console.log(
    "Webhook last_error_message: absent"
  );
  console.log(
    `Pending update count: ${pendingUpdates}`
  );
}

main().catch(() => {
  fail("unexpected verification failure");
});
NODE

chmod 600 "$TELEGRAM_CHECK"

printf '\n=== 13. PREPARE SAFETY-ADJUSTED SMOKE COPY ===\n'

python3 - \
  "${SOURCE}/scripts/staging-smoke.mjs" \
  "$SAFE_SMOKE" <<'PY'
import pathlib
import sys

source_path = pathlib.Path(sys.argv[1])
output_path = pathlib.Path(sys.argv[2])

text = source_path.read_text(encoding="utf-8")

start_marker = 'await check("Telegram webhook route"'
end_marker = 'await check("n8n endpoint fails closed without auth"'

start = text.find(start_marker)
end = text.find(end_marker, start)

if start < 0 or end < 0:
    raise SystemExit(
        "Could not isolate the destructive Telegram route probe"
    )

safe_text = (
    text[:start]
    + 'pass("Telegram webhook verification", '
      '"covered separately through Telegram getWebhookInfo");\n\n'
    + text[end:]
)

if "/api/telegram/webhook/" in safe_text:
    raise SystemExit(
        "Safety-adjusted smoke copy still contains a Telegram webhook POST"
    )

output_path.write_text(
    safe_text,
    encoding="utf-8",
)

output_path.chmod(0o600)

print(
    "Temporary smoke copy created without the empty Telegram webhook POST"
)
PY

printf '\n=== 14. COPY TEMPORARY VERIFIERS INTO NODE 24 STAGING CONTAINER ===\n'

docker exec "$CONTAINER" mkdir -p \
  "$HANDOFF_DIR/scripts" \
  "$HANDOFF_DIR/src/services"

# Verifiers live under /tmp to avoid /app EACCES, while this symlink keeps
# Node's normal upward bare-package resolution anchored to runtime deps.
docker exec "$CONTAINER" ln -s /app/node_modules "$HANDOFF_DIR/node_modules"

docker cp \
  "$SAFE_SMOKE" \
  "${CONTAINER}:${HANDOFF_DIR}/scripts/staging-smoke.mjs"

docker cp \
  "$TELEGRAM_CHECK" \
  "${CONTAINER}:${HANDOFF_DIR}/scripts/telegram-webhook-check.mjs"

docker cp \
  "${SOURCE}/scripts/staging-data-audit.mjs" \
  "${CONTAINER}:${HANDOFF_DIR}/scripts/staging-data-audit.mjs"

docker cp \
  "${SOURCE}/src/services/entitlementService.ts" \
  "${CONTAINER}:${HANDOFF_DIR}/src/services/entitlementService.ts"

docker cp \
  "${SOURCE}/src/types.ts" \
  "${CONTAINER}:${HANDOFF_DIR}/src/types.ts"

# docker cp creates root-owned destinations. Reassign only the temporary
# handoff tree to the runtime UID so Node can read 0600 verifier files.
docker exec -u 0 "$CONTAINER" chown -R 1001:1001 "$HANDOFF_DIR"

printf '\n=== 15. VERIFY TELEGRAM DIRECTLY THROUGH getWebhookInfo ===\n'

docker exec \
  -e FOX_TELEGRAM_WORKSPACE_ID="$WORKSPACE_ID" \
  -e FOX_EXPECTED_TELEGRAM_WEBHOOK="$EXPECTED_TELEGRAM_WEBHOOK" \
  "$CONTAINER" \
  node \
  "${HANDOFF_DIR}/scripts/telegram-webhook-check.mjs"

printf '\n=== 16. RUN STAGING SMOKE AND DATA AUDIT ===\n'

docker exec \
  -e FOX_SMOKE_BASE_URL="$BASE_URL" \
  -e FOX_SMOKE_WORKSPACE_ID="$WORKSPACE_ID" \
  "$CONTAINER" \
  node \
  "${HANDOFF_DIR}/scripts/staging-smoke.mjs"

docker exec \
  -e FOX_SMOKE_WORKSPACE_ID="$WORKSPACE_ID" \
  "$CONTAINER" \
  node \
  "${HANDOFF_DIR}/scripts/staging-data-audit.mjs"

docker exec "$CONTAINER" rm -rf "$HANDOFF_DIR"

printf '\n=== 17. FINAL SAFE STATUS ===\n'

docker ps \
  --filter "name=^/${CONTAINER}$" \
  --format 'container={{.Names}} status={{.Status}} image={{.Image}}'

printf 'Public URL: %s\n' "$BASE_URL"
printf 'Backup: %s\n' "$BACKUP_DIR"
printf 'Deployment result: PASS\n'

printf '\n=== REQUIRED SUPER ADMIN / CRM / CALENDAR BROWSER CHECK ===\n'
printf '%s\n' \
  '1) Sign in as the existing Super Admin and confirm the authorized workspace list appears.' \
  '2) Select عيادة دكتور حسام (ws_tg_924598), refresh the browser, and confirm the workspace list and selection survive without logout/login.' \
  '3) Open CRM and confirm hesham / 01555193491 is visible; refresh and confirm it remains visible.' \
  '4) Open Patient Appointments Schedule and confirm 2026-08-30 at 05:00 PM exists.' \
  '5) Open العيادة والأطباء والحجوزات: Aug 30 must show hesham at 05:00 PM; Aug 31 must not show that Aug 30 booking.'

printf '\n=== MANUAL TELEGRAM BOOKING TEST ===\n'

printf '%s\n' \
  'Open the existing tenant Telegram bot for عيادة دكتور حسام and send these as two consecutive messages from the SAME Telegram chat:' \
  '' \
  '1) عاوز أحجز كشف بكرة الساعة 5' \
  '2) hesham 01555193491' \
  '' \
  'Expected result: FOX must retain the original request and confirm or check the appointment for tomorrow at 05:00 PM. It must NOT ask for the date/time again.' \
  '' \
  'Then refresh the staging dashboard and verify the lead and appointment appear under workspace ws_tg_924598.'

trap - ERR
cleanup
trap - EXIT
