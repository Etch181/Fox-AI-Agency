#!/usr/bin/env bash
# Install this reviewed file outside the repository as /docker/fox-ai-staging/trusted-deploy.sh.
# This launcher is STAGING ONLY and never executes a pathname from SOURCE.
set -Eeuo pipefail
IFS=$' \t\n'
PATH='/usr/sbin:/usr/bin:/sbin:/bin'
export PATH
umask 077

readonly SOURCE='/docker/hermes-agent-6pb0/data/fox-ai-agency'
readonly SOURCE_REALPATH='/docker/hermes-agent-6pb0/data/fox-ai-agency'
readonly ROOT='/docker/fox-ai-staging'
readonly RELEASES='/docker/fox-ai-staging/releases'
readonly MANIFEST='/docker/fox-ai-staging/release-manifest.env'
readonly EXTERNAL_COMPOSE='/docker/fox-ai-staging/docker-compose.yml'
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

require_ancestors() {
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
  EXPECTED_COMMIT=''; HANDOFF_SHA=''; PREFLIGHT_SHA=''; COMPOSE_SHA=''; ENV_SHA=''; TREE_SHA=''
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
      FOX_STAGING_TREE_SHA256) [ -z "$TREE_SHA" ] || fail 'duplicate manifest key'; TREE_SHA=$value ;;
      *) fail "unknown manifest key: $key" ;;
    esac
  done < "$MANIFEST"
  is_commit "$EXPECTED_COMMIT" || fail 'malformed expected commit'
  is_sha256 "$HANDOFF_SHA" || fail 'malformed handoff hash'
  is_sha256 "$PREFLIGHT_SHA" || fail 'malformed preflight hash'
  is_sha256 "$COMPOSE_SHA" || fail 'malformed compose hash'
  is_sha256 "$ENV_SHA" || fail 'malformed env hash'
  is_sha256 "$TREE_SHA" || fail 'malformed release tree hash'
}

safe_git() {
  env -i PATH="$PATH" HOME=/root GIT_CONFIG_NOSYSTEM=1 GIT_CONFIG_GLOBAL=/dev/null \
    /usr/bin/git -c core.hooksPath=/dev/null -c core.fsmonitor=false -C "$SOURCE" "$@"
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
  unsafe=$(/usr/bin/find "$root" -xdev \( -not -user root -o -not -group root -o -perm /022 \) -print -quit)
  [ -z "$unsafe" ] || fail "snapshot ownership/mode violation: $unsafe"
}

validate_source() {
  local actual status
  [ "$(id -u)" -eq 0 ] || fail 'root required'
  require_ancestors /docker
  require_ancestors "$ROOT"
  require_ancestors /docker/hermes-agent-6pb0
  require_ancestors /docker/hermes-agent-6pb0/data
  [ ! -L "$SOURCE" ] || fail 'source symlink refused'
  actual=$(/usr/bin/realpath -e -- "$SOURCE") || fail 'source unavailable'
  [ "$actual" = "$SOURCE_REALPATH" ] || fail 'source realpath mismatch'
  [ -d "$SOURCE/.git" ] || fail 'source is not a repository'
  reject_links_or_special_files "$SOURCE"
  [ "$(safe_git rev-parse HEAD)" = "$EXPECTED_COMMIT" ] || fail 'source HEAD mismatch'
  status=$(safe_git status --porcelain=v1 --untracked-files=all)
  [ -z "$status" ] || fail 'source working tree is not clean'
  [ "$(sha256 "$SOURCE/deploy-staging-handoff.sh")" = "$HANDOFF_SHA" ] || fail 'handoff hash mismatch'
  [ "$(sha256 "$SOURCE/scripts/verify_staging_preflight.py")" = "$PREFLIGHT_SHA" ] || fail 'preflight hash mismatch'
  [ "$(sha256 "$EXTERNAL_COMPOSE")" = "$COMPOSE_SHA" ] || fail 'compose hash mismatch'
  [ "$(sha256 "$SOURCE/.env.staging")" = "$ENV_SHA" ] || fail 'staging env hash mismatch'
}

copy_release_snapshot() {
  local release=$1 tmp
  require_root_regular "$EXTERNAL_COMPOSE" 644
  tmp="${RELEASES}/.${EXPECTED_COMMIT}.$$.partial"
  [ ! -e "$tmp" ] || fail 'snapshot temporary path exists'
  /usr/bin/install -d -o root -g root -m 0700 "$tmp"
  # cp preserves bytes without following the source; links were rejected before copy.
  /bin/cp -a --no-dereference "$SOURCE/." "$tmp/source"
  printf '%s\n' "$EXPECTED_COMMIT" > "$tmp/source/.release-identity"
  /bin/cp -a --no-dereference "$EXTERNAL_COMPOSE" "$tmp/docker-compose.yml"
  /bin/cp -a --no-dereference "$SOURCE/.env.staging" "$tmp/.env.staging"
  /bin/rm -rf -- "$tmp/source/.git"
  /usr/bin/chown -R root:root "$tmp"
  /usr/bin/find "$tmp" -type d -exec /bin/chmod 0700 {} +
  /usr/bin/find "$tmp" -type f -exec /bin/chmod 0600 {} +
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
  [ "$(sha256 "$release/docker-compose.yml")" = "$COMPOSE_SHA" ] || fail 'snapshot compose hash mismatch'
  [ "$(sha256 "$release/.env.staging")" = "$ENV_SHA" ] || fail 'snapshot env hash mismatch'
  [ "$(tree_hash "$release/source")" = "$TREE_SHA" ] || fail 'snapshot tree hash mismatch'
  /usr/bin/grep -Fqx 'name: fox-ai-agency-staging' "$release/docker-compose.yml" || fail 'compose project mismatch'
  /usr/bin/grep -Fq 'context: .' "$release/docker-compose.yml" || fail 'compose build context is not snapshot-local'
  /usr/bin/grep -Fq 'fox-ai-agency-staging' "$release/.env.staging" || fail 'staging project marker absent'
  ! /usr/bin/grep -Eqi 'fox-ai-agency-(prod|production)' "$release/.env.staging" || fail 'production marker found'
}

main() {
  [ "$#" -eq 0 ] || fail 'arguments refused'
  load_manifest
  /usr/bin/install -d -o root -g root -m 0700 "$RELEASES"
  exec 9>"$LOCK"; /usr/bin/flock -n 9 || fail 'deployment lock held'
  validate_source                    # initial validation
  validate_source                    # validation immediately before copy
  local release="${RELEASES}/${EXPECTED_COMMIT}"
  copy_release_snapshot "$release"
  verify_snapshot "$release"         # verify copied immutable bytes
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
