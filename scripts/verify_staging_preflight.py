#!/usr/bin/env python3
"""Fail-closed staging release and authorization preflight verifier."""

from __future__ import annotations

import argparse
import re
import stat
import subprocess
import sys
from pathlib import Path

SHA_RE = re.compile(r"^[0-9a-f]{40}$")
OBSOLETE_ADMIN_RE = re.compile(
    r"activeTab\s*\.\s*startsWith\s*\(\s*['\"]admin_['\"]\s*\)"
)


def fail(message: str) -> None:
    print(f"Preflight refused: {message}", file=sys.stderr)
    raise SystemExit(1)


def run_git(source: Path, *args: str) -> str:
    try:
        return subprocess.check_output(
            ["git", "-C", str(source), *args],
            text=True,
            stderr=subprocess.DEVNULL,
        ).strip()
    except subprocess.CalledProcessError:
        fail("unable to resolve repository state")


def expected_commit_from_manifest(manifest: Path, required_uid: int) -> str:
    if manifest.is_symlink() or not manifest.is_file():
        fail("release manifest is missing or is not a regular file")

    metadata = manifest.stat()
    if metadata.st_uid != required_uid:
        fail("release manifest ownership is invalid")
    if stat.S_IMODE(metadata.st_mode) != 0o600:
        fail("release manifest mode must be 0600")

    try:
        lines = manifest.read_text(encoding="utf-8").splitlines()
    except OSError:
        fail("release manifest cannot be read")

    values: dict[str, str] = {}
    allowed_keys = {
        "FOX_STAGING_EXPECTED_COMMIT",
        "FOX_STAGING_HANDOFF_SHA256",
        "FOX_STAGING_PREFLIGHT_SHA256",
        "FOX_STAGING_COMPOSE_SHA256",
        "FOX_STAGING_ENV_SHA256",
        "FOX_STAGING_CREDENTIAL_SHA256",
        "FOX_STAGING_TREE_SHA256",
    }
    for raw in lines:
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            fail("release manifest contains a malformed line")
        key, value = line.split("=", 1)
        if key not in allowed_keys or key in values:
            fail("release manifest contains an unknown or duplicate key")
        values[key] = value

    expected = values.get("FOX_STAGING_EXPECTED_COMMIT", "")
    if not SHA_RE.fullmatch(expected):
        fail("release manifest expected commit is missing or malformed")
    return expected


def require_match(label: str, text: str, pattern: str) -> None:
    if not re.search(pattern, text, re.DOTALL):
        fail(f"authorization relationship check failed: {label}")


def verify_authorization(source: Path) -> None:
    app_path = source / "src/App.tsx"
    auth_path = source / "src/security/appAuthorization.ts"
    try:
        app = app_path.read_text(encoding="utf-8")
        authorization = auth_path.read_text(encoding="utf-8")
    except OSError:
        fail("authorization source files are missing")

    if OBSOLETE_ADMIN_RE.search(app):
        fail("obsolete activeTab admin-prefix authorization is present")

    require_match(
        "active tab resolves through centralized authorization",
        app,
        r"const\s+activeTab\s*:\s*ViewTab\s*=\s*currentUser\s*\?\s*"
        r"resolveAuthorizedView\(\s*currentUser\.role\s*,\s*requestedView\s*\)"
        r"\s*:\s*['\"]client_dashboard['\"]",
    )
    require_match(
        "direct navigation resolves before state and storage writes",
        app,
        r"const\s+navigateTo\s*=\s*React\.useCallback\(\s*\(requested:\s*unknown\)\s*=>\s*\{"
        r".*?if\s*\(!currentUser\)\s*return;.*?"
        r"const\s+authorized\s*=\s*resolveAuthorizedView\(\s*currentUser\.role\s*,\s*requested\s*,?\s*\)\s*;"
        r"\s*setRequestedView\(\s*authorized\s*\)\s*;"
        r"\s*localStorage\.setItem\(\s*['\"]fox_active_view['\"]\s*,\s*authorized\s*\)",
    )
    require_match(
        "restored navigation re-authorizes before state and storage writes",
        app,
        r"React\.useEffect\(\(\)\s*=>\s*\{\s*if\s*\(!currentUser\)\s*return;"
        r".*?const\s+authorized\s*=\s*resolveAuthorizedView\(\s*currentUser\.role\s*,\s*requestedView\s*,?\s*\)\s*;"
        r".*?if\s*\(authorized\s*!==\s*requestedView\)\s*\{\s*setRequestedView\(\s*authorized\s*\)\s*;\s*\}"
        r"\s*localStorage\.setItem\(\s*['\"]fox_active_view['\"]\s*,\s*authorized\s*\)",
    )
    require_match(
        "unknown and unauthorized views use role-safe fallback",
        authorization,
        r"function\s+resolveAuthorizedView\([^)]*\)\s*:\s*ViewTab\s*\{"
        r"\s*return\s+isViewAllowedForRole\(\s*role\s*,\s*requestedView\s*\)"
        r"\s*\?\s*requestedView\s*:\s*roleSafeDefaultView\(\s*role\s*\)",
    )
    require_match(
        "allowlist rejects unknown views",
        authorization,
        r"function\s+isViewAllowedForRole\([^)]*\)\s*:\s*view\s+is\s+ViewTab\s*\{"
        r"\s*return\s+isKnownView\(\s*view\s*\)\s*&&\s*ALLOWED_VIEWS_BY_ROLE\[role\]\.includes\(view\)",
    )


def main() -> None:
    parser = argparse.ArgumentParser(add_help=True)
    parser.add_argument("--source", required=True)
    parser.add_argument("--expected-source-realpath", required=True)
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--manifest-uid", type=int, default=0)
    parser.add_argument(
        "--snapshot-commit",
        help="required full commit for an immutable snapshot without .git",
    )
    args = parser.parse_args()

    source = Path(args.source)
    expected_source = Path(args.expected_source_realpath)
    manifest = Path(args.manifest)

    if not source.is_dir() or source.resolve() != expected_source.resolve():
        fail("repository real path does not match the staging source path")

    expected_commit = expected_commit_from_manifest(manifest, args.manifest_uid)
    if args.snapshot_commit:
        if not SHA_RE.fullmatch(args.snapshot_commit):
            fail("snapshot commit is malformed")
        if args.snapshot_commit != expected_commit:
            fail("snapshot commit does not equal release manifest commit")
        identity_path = source / ".release-identity"
        if identity_path.is_symlink() or not identity_path.is_file():
            fail("immutable snapshot release identity is missing")
        if identity_path.read_text(encoding="utf-8").strip() != expected_commit:
            fail("immutable snapshot release identity mismatch")
        actual_commit = expected_commit
    else:
        if not (source / ".git").exists():
            fail("staging source is not a Git repository")
        actual_commit = run_git(source, "rev-parse", "HEAD")
        if actual_commit != expected_commit:
            print(f"actual HEAD={actual_commit}", file=sys.stderr)
            print(f"expected HEAD={expected_commit}", file=sys.stderr)
            raise SystemExit(1)
        if run_git(source, "status", "--porcelain"):
            fail("staging source tree is not clean")

    verify_authorization(source)
    print(f"Staging release commit: {actual_commit}")
    print("Clean source tree: PASS")
    print("Centralized authorization relationships: PASS")


if __name__ == "__main__":
    main()
