#!/bin/bash
# Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
# See LICENSE.txt for license information.

# Validates that the OSS repository is clean of E2EE artifacts.
#
# Usage:
#   ./scripts/validate-e2ee-clean.sh          # Check all files (for CI)
#   ./scripts/validate-e2ee-clean.sh --staged # Only check staged files (for pre-commit hook)

set -e

STAGED_ONLY=false
if [[ "$1" == "--staged" ]]; then
    STAGED_ONLY=true
fi

ERRORS=0

# Get list of files to check
if [[ "$STAGED_ONLY" == "true" ]]; then
    # Only added/copied/modified files (not deletions)
    FILES_TO_CHECK=$(git diff --cached --name-only --diff-filter=ACM)
else
    # Check all tracked files
    FILES_TO_CHECK=$(git ls-files)
fi

# Helper: check if a file should be validated
should_check() {
    echo "$FILES_TO_CHECK" | grep -q "^$1$"
}

echo "Validating E2EE clean state..."
[[ "$STAGED_ONLY" == "true" ]] && echo "(checking staged files only)"
echo ""

# Check for E2EE dependency in package.json
if should_check "package.json"; then
    echo "Checking package.json..."
    if grep -qE '"@mattermost/e2ee":\s*"file:' package.json 2>/dev/null; then
        echo "  [error] Contains @mattermost/e2ee as a static dependency"
        echo "     Remove it from dependencies (use 'npm run e2ee:enable' for dynamic linking)"
        ERRORS=$((ERRORS + 1))
    else
        echo "  [ok]"
    fi
fi

# Check for E2EE pods being ADDED to Podfile.lock (not just present)
# This allows committing other Podfile.lock changes while e2ee is locally enabled
if should_check "ios/Podfile.lock"; then
    echo "Checking ios/Podfile.lock..."
    if git diff --cached ios/Podfile.lock 2>/dev/null | grep -q "^+.*MattermostE2ee"; then
        echo "  [error] Staged changes add MattermostE2ee pods"
        echo "     Run: git checkout -- ios/Podfile.lock"
        ERRORS=$((ERRORS + 1))
    else
        echo "  [ok]"
    fi
fi

# Check for E2EE files in library path
e2ee_files=$(echo "$FILES_TO_CHECK" | grep "^libraries/@mattermost/e2ee/" || true)
if [[ -n "$e2ee_files" ]]; then
    echo "Checking libraries/@mattermost/e2ee/..."
    echo "  [error] Contains files that should not be committed:"
    echo "$e2ee_files" | sed 's/^/     /'
    echo "     The E2EE library should only be modified in its own repository"
    ERRORS=$((ERRORS + 1))
fi

echo ""
if [ $ERRORS -gt 0 ]; then
    echo "============================================"
    echo "VALIDATION FAILED: $ERRORS issue(s) found"
    echo ""
    echo "Run 'npm run e2ee:disable' to restore clean state."
    echo "============================================"
    exit 1
else
    echo "[ok] Validation passed: Repository is clean of E2EE artifacts"
fi
