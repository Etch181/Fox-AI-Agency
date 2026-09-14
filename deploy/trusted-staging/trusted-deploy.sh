#!/usr/bin/env bash
# Install this reviewed file outside the repository as /docker/fox-ai-staging/trusted-deploy.sh.
# This launcher is STAGING ONLY and never executes a pathname from SOURCE.
set -Eeuo pipefail
IFS=$' \t\n'
PATH='/usr/sbin:/usr/bin:/sbin:/bin'
export PATH
umask 077

readonly ROOT='/docker/fox-ai-staging'
readonly RELEASES='/docker/fox-ai-staging/releases'
readonly MANIFEST='/docker/fox-ai-staging/release-manifest.env'
readonly EXTERNAL_COMPOSE='/docker/fox-ai-staging/docker-compose.yml'
readonly ENV_SOURCE='/docker/fox-ai-staging/.env.staging'
readonly CREDENTIAL_SOURCE='/docker/fox-ai-staging/secrets/firebase-admin.json'
readonly REMOTE='https://github.com/Etch181/Fox-AI-Agency.git'
readonly APPROVED_REF='safety/pre-vps-audit-2026-08-26'
readonly STAGING_PROJECT='fox-ai-agency-staging'
readonly STAGING_CONTAINER='fox-ai-staging'
readonly STAGING_DOMAIN='staging.foxaiagency.online'
readonly LOCK='/run/lock/fox-ai-staging-trusted-deploy.lock'

fail() { printf 'TRUSTED STAGING LAUNCHER REFUSED: %s\n' "$*" >&2; exit 1; }
sha256() { /usr/bin/sha256sum -- "$1" | /usr/bin/awk '{print $1}'; }
is_sha256() { [[ "$1" =~ ^[0-9a-f]{64}$ ]]; }
is_commit() { [[ "$1" =~ ^[0-9a-f]{40}$ ]]; }

require_root_regular() {
  local p=$1 m=$2 meta
  [ ! -L "$p" ] || fail "symlink refused: $p"
  [ -f "$p" ] || fail "regular file required: $p"
  meta=$(/usr/bin/stat -c '%u:%g:%a' -- "$p")
  [ "$meta" = "0:0:$m" ] || fail "root:root mode $m required: $p"
}

require_safe_dir() {
  local p=$1 meta
  [ ! -L "$p" ] || fail "directory symlink refused: $p"
  [ -d "$p" ] || fail "directory required: $p"
  meta=$(/usr/bin/stat -c '%u:%g:%a' -- "$p")
  case "$meta" in 0:0:700|0:0:750|0:0:755) ;; *) fail "unsafe directory: $p";; esac
}

require_trusted_external_chain() {
  local p=$1
  while :; do
    require_safe_dir "$p"
    [ "$p" = / ] && break
    p=$(/usr/bin/dirname -- "$p")
  done
}

# Strict data-only parser: no shell interpretation, expansion, whitespace, duplicates, or unknown keys.
load_manifest() {
  local line key value
  EXPECTED_COMMIT=''; HANDOFF_SHA=''; PREFLIGHT_SHA=''; COMPOSE_SHA=''; ENV_SHA=''; CREDENTIAL_SHA=''; TREE_SHA=''
  [ ! -L "$MANIFEST" ] || fail 'manifest symlink refused'
  require_root_regular "$MANIFEST" 600
  while IFS= read -r line || [ -n "$line" ]; do
    [ -n "$line" ] || continue
    [[ "$line" != \#* ]] || continue
    [[ "$line" =~ ^([A-Z0-9_]+)=([0-9a-fA-F_]+)$ ]] || fail 'malformed manifest line'
    key=${BASH_REMATCH[1]}; value=${BASH_REMATCH[2]}
    case "$key" in
      FOX_STAGING_EXPECTED_COMMIT) [ -z "$EXPECTED_COMMIT" ] || fail 'duplicate manifest key'; EXPECTED_COMMIT=$value ;;
      FOX_STAGING_HANDOFF_SHA256) [ -z "$HANDOFF_SHA" ] || fail 'duplicate manifest key'; HANDOFF_SHA=$value ;;
      FOX_STAGING_PREFLIGHT_SHA256) [ -z "$PREFLIGHT_SHA" ] || fail 'duplicate manifest key'; PREFLIGHT_SHA=$value ;;
      FOX_STAGING_COMPOSE_SHA256) [ -z "$COMPOSE_SHA" ] || fail 'duplicate manifest key'; COMPOSE_SHA=$value ;;
      FOX_STAGING_ENV_SHA256) [ -z "$ENV_SHA" ] || fail 'duplicate manifest key'; ENV_SHA=$value ;;
      FOX_STAGING_CREDENTIAL_SHA256) [ -z "$CREDENTIAL_SHA" ] || fail 'duplicate manifest key'; CREDENTIAL_SHA=$value ;;
      FOX_STAGING_TREE_SHA256) [ -z "$TREE_SHA" ] || fail 'duplicate manifest key'; TREE_SHA=$value ;;
      *) fail "unknown manifest key: $key" ;;
    esac
  done < "$MANIFEST"
  is_commit "$EXPECTED_COMMIT" || fail 'malformed expected commit'
  is_sha256 "$HANDOFF_SHA" || fail 'malformed handoff hash'
  is_sha256 "$PREFLIGHT_SHA" || fail 'malformed preflight hash'
  is_sha256 "$COMPOSE_SHA" || fail 'malformed compose hash'
  is_sha256 "$ENV_SHA" || fail 'malformed env hash'
  is_sha256 "$CREDENTIAL_SHA" || fail 'malformed credential hash'
  is_sha256 "$TREE_SHA" || fail 'malformed release tree hash'
}

safe_git() {
  env -i PATH="$PATH" HOME=/root GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_SYSTEM=/dev/null \
    GIT_CONFIG_GLOBAL=/dev/null GIT_ALTERNATE_OBJECT_DIRECTORIES= \
    /usr/bin/git -c core.hooksPath=/dev/null -c core.fsmonitor=false \
    -c alias.init= -c alias.ls-remote= -c alias.fetch= -c alias.rev-parse= \
    -c alias.ls-tree= -c alias.archive= "$@"
}

tree_hash() {
  # Hashes every regular file below its argument using stable relative names and bytes.
  # Symlinks and special files are rejected before this is called.
  local root=$1
  (
    cd "$root"
    /usr/bin/find . -xdev -type f ! -name '.release-identity' -print0 | /usr/bin/sort -z |
      while IFS= read -r -d '' p; do
        printf '%s  %s\n' "$(/usr/bin/sha256sum -- "$p" | /usr/bin/awk '{print $1}')" "$p"
      done | /usr/bin/sha256sum | /usr/bin/awk '{print $1}'
  )
}

reject_links_or_special_files() {
  local root=$1 bad
  bad=$(/usr/bin/find "$root" -xdev \( -type l -o -type b -o -type c -o -type p -o -type s \) -print -quit)
  [ -z "$bad" ] || fail "unexpected link or special file: $bad"
}

require_snapshot_tree() {
  local root=$1 unsafe
  unsafe=$(/usr/bin/find "$root" -xdev ! -path "$root/credentials/firebase-admin.json" \( -not -user root -o -not -group root -o -perm /022 \) -print -quit)
  [ -z "$unsafe" ] || fail "snapshot ownership/mode violation: $unsafe"
  [ "$([ -L "$root/credentials/firebase-admin.json" ] && printf symlink || printf regular)" = 'regular' ] || fail 'snapshot credential symlink refused'
  [ "$(/usr/bin/stat -c '%u:%g:%a' "$root/credentials/firebase-admin.json")" = '1001:1001:400' ] || fail 'snapshot credential runtime mode violation'
}

validate_inputs() {
  local actual
  [ "$(id -u)" -eq 0 ] || fail 'root required'
  require_trusted_external_chain /docker
  require_trusted_external_chain "$ROOT"
  require_root_regular "$EXTERNAL_COMPOSE" 644
  [ "$(sha256 "$EXTERNAL_COMPOSE")" = "$COMPOSE_SHA" ] || fail 'compose hash mismatch'
  [ ! -L "$ENV_SOURCE" ] || fail 'staging env symlink refused'
  [ -f "$ENV_SOURCE" ] || fail 'staging env input missing'
  actual=$(/usr/bin/realpath -e -- "$ENV_SOURCE") || fail 'staging env unavailable'
  [ "$actual" = "$ENV_SOURCE" ] || fail 'staging env path traversal refused'
  [ "$(sha256 "$ENV_SOURCE")" = "$ENV_SHA" ] || fail 'staging env hash mismatch'
  [ ! -L "$CREDENTIAL_SOURCE" ] || fail 'credential symlink refused'
  [ -f "$CREDENTIAL_SOURCE" ] || fail 'credential input missing'
  [ "$(/usr/bin/realpath -e -- "$CREDENTIAL_SOURCE")" = "$CREDENTIAL_SOURCE" ] || fail 'credential path traversal refused'
  [ "$(sha256 "$CREDENTIAL_SOURCE")" = "$CREDENTIAL_SHA" ] || fail 'credential hash mismatch'
}

validate_remote_tree() {
  local git_dir=$1 entry metadata path mode type object
  while IFS= read -r -d '' entry; do
    metadata=${entry%%$'\t'*}
    path=${entry#*$'\t'}
    read -r mode type object <<<"$metadata"
    case "$mode:$type" in
      100644:blob|100755:blob) ;;
      120000:blob) fail "mode 120000 refused: $path" ;;
      160000:commit) fail "mode 160000 refused: $path" ;;
      *) fail "unexpected remote tree entry: $mode:$type $path" ;;
    esac
    [ "$path" != .git ] && [[ "$path" != .git/* ]] || fail 'remote tree contains .git path'
  done < <(safe_git -C "$git_dir" ls-tree -r -z "$EXPECTED_COMMIT")
}

acquire_remote_source() {
  local tmp=$1 git_dir source_dir advertised
  git_dir="$tmp/repository.git"
  source_dir="$tmp/source"
  safe_git init --bare "$git_dir" >/dev/null
  advertised=$(safe_git ls-remote --exit-code "$REMOTE" "refs/heads/$APPROVED_REF") || fail 'approved remote ref unavailable'
  [[ "$advertised" == "$EXPECTED_COMMIT"$'\t'refs/heads/$APPROVED_REF ]] || fail 'approved remote ref does not equal expected commit'
  safe_git -C "$git_dir" fetch --no-tags "$REMOTE" "refs/heads/$APPROVED_REF:refs/heads/$APPROVED_REF" >/dev/null
  [ "$(safe_git -C "$git_dir" rev-parse "refs/heads/$APPROVED_REF")" = "$EXPECTED_COMMIT" ] || fail 'fetched remote ref mismatch'
  validate_remote_tree "$git_dir"
  /usr/bin/install -d -o root -g root -m 0700 "$source_dir"
  safe_git -C "$git_dir" archive --format=tar "$EXPECTED_COMMIT" | /bin/tar -x -f - -C "$source_dir"
  [ ! -e "$source_dir/.git" ] || fail 'materialized source contains .git'
  reject_links_or_special_files "$source_dir"
  printf '%s\n' "$EXPECTED_COMMIT" > "$source_dir/.release-identity"
}

generate_snapshot_compose() {
  local root=$1
  {
    printf '%s\n' 'name: fox-ai-staging'
    /usr/bin/sed \
      -e 's#\(ENABLE_TELEGRAM:[[:space:]]*\)false#\1true#' \
      -e 's#\(ENABLE_TELEGRAM:[[:space:]]*\)"false"#\1"true"#' \
      -e '/ENABLE_TELEGRAM:/a\      ENABLE_AGENCY_TELEGRAM_POLLING: "false"' \
      -e 's#^\([[:space:]]*context:[[:space:]]*\).*#\1./source#' \
      -e 's#^\([[:space:]]*env_file:[[:space:]]*\).*\.env\.staging.*#\1./.env.staging#' \
      -e 's#^\([[:space:]]*-[[:space:]]*\).*\.env\.staging.*#\1./.env.staging#' \
      -e 's#/docker/fox-ai-staging/secrets/firebase-admin.json#./credentials/firebase-admin.json#g' \
      "$root/docker-compose.source.yml"
  } > "$root/docker-compose.yml"
  /usr/bin/grep -Fqx 'name: fox-ai-staging' "$root/docker-compose.yml" || fail 'snapshot compose project identity missing'
  /usr/bin/grep -Fqx '      context: ./source' "$root/docker-compose.yml" || fail 'snapshot compose context rewrite failed'
  /usr/bin/grep -Fq './.env.staging' "$root/docker-compose.yml" || fail 'snapshot env rewrite failed'
  /usr/bin/grep -Fq './credentials/firebase-admin.json' "$root/docker-compose.yml" || fail 'snapshot credential rewrite failed'
  ! /usr/bin/grep -Fq "$ENV_SOURCE" "$root/docker-compose.yml" || fail 'mutable env path remains in snapshot compose'
  ! /usr/bin/grep -Fq "$CREDENTIAL_SOURCE" "$root/docker-compose.yml" || fail 'mutable credential path remains in snapshot compose'
}

copy_release_snapshot() {
  local release=$1 tmp
  tmp="${RELEASES}/.${EXPECTED_COMMIT}.$$.partial"
  [ ! -e "$tmp" ] || fail 'snapshot temporary path exists'
  /usr/bin/install -d -o root -g root -m 0700 "$tmp"
  acquire_remote_source "$tmp"
  /bin/rm -rf -- "$tmp/repository.git"
  [ "$(sha256 "$tmp/source/deploy-staging-handoff.sh")" = "$HANDOFF_SHA" ] || fail 'remote handoff hash mismatch'
  [ "$(sha256 "$tmp/source/scripts/verify_staging_preflight.py")" = "$PREFLIGHT_SHA" ] || fail 'remote preflight hash mismatch'
  # Runtime inputs are copied only after their immutable hashes were checked.
  /bin/cp -a --no-dereference "$EXTERNAL_COMPOSE" "$tmp/docker-compose.source.yml"
  /bin/cp -a --no-dereference "$ENV_SOURCE" "$tmp/.env.staging"
  /usr/bin/install -d -o root -g root -m 0700 "$tmp/credentials"
  /bin/cp -a --no-dereference "$CREDENTIAL_SOURCE" "$tmp/credentials/firebase-admin.json"
  generate_snapshot_compose "$tmp"
  [ ! -e "$tmp/source/.git" ] || fail 'release source contains .git'
  /usr/bin/chown -R root:root "$tmp"
  /usr/bin/find "$tmp" -type d -exec /bin/chmod 0700 {} +
  /usr/bin/find "$tmp" -type f -exec /bin/chmod 0600 {} +
  # Docker bind-mount setup is performed by the host daemon; inside the mount,
  # only foxapp (uid/gid 1001) may read this immutable credential.
  /usr/bin/chown 1001:1001 "$tmp/credentials/firebase-admin.json"
  /bin/chmod 0400 "$tmp/credentials/firebase-admin.json"
  /bin/chmod 0700 "$tmp/source/deploy-staging-handoff.sh"
  /bin/chmod 0700 "$tmp/source/scripts/verify_staging_preflight.py"
  [ ! -e "$release" ] || fail 'release snapshot already exists'
  /bin/mv -- "$tmp" "$release"
}

verify_snapshot() {
  local release=$1
  require_safe_dir "$release"
  require_snapshot_tree "$release"
  reject_links_or_special_files "$release"
  [ "$(sha256 "$release/source/deploy-staging-handoff.sh")" = "$HANDOFF_SHA" ] || fail 'snapshot handoff hash mismatch'
  [ "$(sha256 "$release/source/scripts/verify_staging_preflight.py")" = "$PREFLIGHT_SHA" ] || fail 'snapshot preflight hash mismatch'
  [ "$(sha256 "$release/docker-compose.source.yml")" = "$COMPOSE_SHA" ] || fail 'snapshot source compose hash mismatch'
  [ "$(sha256 "$release/.env.staging")" = "$ENV_SHA" ] || fail 'snapshot env hash mismatch'
  [ "$(sha256 "$release/credentials/firebase-admin.json")" = "$CREDENTIAL_SHA" ] || fail 'snapshot credential hash mismatch'
  [ "$(tree_hash "$release/source")" = "$TREE_SHA" ] || fail 'snapshot tree hash mismatch'
  # Compose project identity is validated from Docker Compose resolved JSON in the handoff.
  /usr/bin/grep -Fq 'context: ./source' "$release/docker-compose.yml" || fail 'compose build context is not snapshot-local'
  /usr/bin/grep -Fq './credentials/firebase-admin.json' "$release/docker-compose.yml" || fail 'compose credential is not snapshot-local'
  ! /usr/bin/grep -Fq "$ENV_SOURCE" "$release/docker-compose.yml" || fail 'mutable env remains in snapshot compose'
  /usr/bin/grep -Fq 'fox-ai-agency-staging' "$release/.env.staging" || fail 'staging project marker absent'
  ! /usr/bin/grep -Eqi 'fox-ai-agency-(prod|production)' "$release/.env.staging" || fail 'production marker found'
}

main() {
  [ "$#" -eq 0 ] || fail 'arguments refused'
  load_manifest
  /usr/bin/install -d -o root -g root -m 0700 "$RELEASES"
  exec 9>"$LOCK"; /usr/bin/flock -n 9 || fail 'deployment lock held'
  validate_inputs                    # validate external runtime inputs before acquisition
  local release="${RELEASES}/${EXPECTED_COMMIT}"
  if [ -e "$release" ]; then
    printf 'Existing immutable release snapshot found; verifying for safe reuse.\n'
    verify_snapshot "$release"
  else
    copy_release_snapshot "$release"
    verify_snapshot "$release"
  fi
  # No repository pathname is used after this point.
  exec /usr/bin/env -i PATH="$PATH" HOME=/root LANG=C LC_ALL=C \
    FOX_STAGING_RELEASE_ROOT="$release" \
    FOX_STAGING_RELEASE_SOURCE="$release/source" \
    FOX_STAGING_RELEASE_COMPOSE="$release/docker-compose.yml" \
    FOX_STAGING_RELEASE_ENV_FILE="$release/.env.staging" \
    FOX_STAGING_RELEASE_MANIFEST="$MANIFEST" \
    FOX_STAGING_EXPECTED_COMMIT="$EXPECTED_COMMIT" \
    /bin/bash "$release/source/deploy-staging-handoff.sh"
}
main "$@"
