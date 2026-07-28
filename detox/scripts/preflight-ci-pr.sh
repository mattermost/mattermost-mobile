#!/usr/bin/env bash
# Local checks to run before opening a PR that touches E2E CI (.github/workflows,
# .github/actions, detox/utils). Catches the classes of bug that only surface as a
# silent no-op in a real CI run — see detox/CLAUDE.md "Preflight for CI PRs".
#
# Usage:
#   detox/scripts/preflight-ci-pr.sh            # everything
#   detox/scripts/preflight-ci-pr.sh --fast     # skip detox lint + tsc (the slow part)
set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT" || exit 1

FAST=0
[ "${1:-}" = "--fast" ] && FAST=1

FAILED=0
pass() { printf '  \033[32m✓\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1"; FAILED=1; }
skip() { printf '  \033[33m–\033[0m %s\n' "$1"; }
section() { printf '\n\033[1m%s\033[0m\n' "$1"; }

# Fixed /tmp names can be pre-created as symlinks, so this script would truncate
# whatever they point at.
TESTS_LOG="$(mktemp "${TMPDIR:-/tmp}/preflight-tests.XXXXXX")" || exit 1
CHECK_LOG="$(mktemp "${TMPDIR:-/tmp}/preflight-check.XXXXXX")" || exit 1
trap 'rm -f "$TESTS_LOG" "$CHECK_LOG"' EXIT

# 1. Undeclared secrets / bad expressions in reusable workflows.
# A `secrets.FOO` that is not declared in the callee's on.workflow_call.secrets
# resolves to an empty string at runtime: the step "succeeds" and the notify or
# upload it guards silently never happens. actionlint is the only reliable catch.
section "Workflow expressions (actionlint)"
if command -v actionlint >/dev/null 2>&1; then
    # Embedded-script style findings in these workflows are pre-existing noise, so
    # the linter runs with that pass disabled; expression/type errors are the signal.
    OUT=$(actionlint -shellcheck= .github/workflows/*.yml 2>&1)
    if [ -n "$OUT" ]; then
        echo "$OUT"
        fail "actionlint reported workflow errors"
    else
        pass "no expression/type errors"
    fi
else
    skip "actionlint not installed — brew install actionlint (or go install github.com/rhysd/actionlint/cmd/actionlint@latest)"
fi

# 2. Exit-code capture broken by a trailing backslash.
# `node foo.js \` followed by `RC=$?` makes RC=$? an *argument* to node, so the
# exit code is never captured and the failure gate below it always passes.
section "Shell footguns in workflow run: blocks"
FOOTGUN=$(
    for f in .github/workflows/*.yml .github/actions/*/action.yml; do
        [ -f "$f" ] || continue
        awk -v F="$f" '
            prev ~ /\\[[:space:]]*$/ && $0 ~ /^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*=\$\?/ {
                printf "%s:%d: exit code never captured — previous line ends with a backslash\n", F, NR
            }
            { prev = $0 }
        ' "$f"
    done
)
if [ -n "$FOOTGUN" ]; then
    echo "$FOOTGUN"
    fail "found broken exit-code capture"
else
    pass "no trailing-backslash exit-code capture"
fi

# 3. OIDC permission missing on jobs that mint a TSIO token.
# tsio-report-status.js / tsio-channel-notify-rollup.js call mintOidcToken(), which
# needs permissions.id-token: write. Without it they log a warning and exit 0, so the
# commit status or channel post is silently skipped.
section "TSIO OIDC permissions"
if python3 -c "import yaml" >/dev/null 2>&1; then
    if python3 "$REPO_ROOT/detox/scripts/check_tsio_oidc_permissions.py"; then
        pass "every TSIO job declares id-token: write"
    else
        fail "missing id-token: write"
    fi
else
    skip "PyYAML not available — pip3 install pyyaml"
fi

# 4. Unit tests for the CI utilities.
section "CI utility unit tests"
if (cd detox && node --test utils/*.test.js >"$TESTS_LOG" 2>&1); then
    pass "$(rg -o 'pass [0-9]+' "$TESTS_LOG" | tail -1) in detox/utils"
else
    tail -30 "$TESTS_LOG"
    fail "detox/utils unit tests failed"
fi

# 5. Lint + types.
section "Detox lint + types"
if [ "$FAST" = "1" ]; then
    skip "skipped (--fast)"
elif (cd detox && npm run check >"$CHECK_LOG" 2>&1); then
    pass "npm run check"
else
    tail -40 "$CHECK_LOG"
    fail "detox npm run check failed"
fi

section "Optional: AI review before pushing"
if command -v coderabbit >/dev/null 2>&1; then
    skip "coderabbit --plain --type uncommitted   (reviews local changes; needs a CodeRabbit login)"
else
    skip "CodeRabbit CLI not installed — see https://docs.coderabbit.ai/cli"
fi

if [ "$FAILED" = "1" ]; then
    printf '\n\033[31mPreflight failed.\033[0m Fix the above before opening a CI PR.\n'
    exit 1
fi
printf '\n\033[32mPreflight passed.\033[0m\n'
