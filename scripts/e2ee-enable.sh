#!/bin/bash
# Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
# See LICENSE.txt for license information.

set -e

# =============================================================================
# E2EE Configuration
# =============================================================================
# Default version for binary mode (update this when upgrading E2EE)
# Can be overridden with: E2EE_VERSION=v0.3.0 npm run e2ee:enable
E2EE_VERSION="${E2EE_VERSION:-v0.1.0}"

E2EE_DIR="libraries/@mattermost/e2ee"
E2EE_SISTER_DIR="../mattermost-mobile-e2ee"

# Parse arguments
MODE_ARG="${1:-}"

# Determine mode:
#   - `npm run e2ee:enable -- dev`: Use sister directory for active development
#   - (default): Download pre-built binaries
if [ "$MODE_ARG" = "dev" ]; then
    MODE="dev"
else
    MODE="binary"
fi

echo "Initializing E2EE development environment..."
echo ""

echo "Mode: $MODE"
echo ""

if [ "$MODE" = "dev" ]; then
    # === DEV MODE ===
    # For active E2EE development
    # This symlinks node_modules/@mattermost/e2ee to the sister directory

    if [ ! -d "$E2EE_SISTER_DIR" ]; then
        echo "[error] Directory not found: $E2EE_SISTER_DIR"
        echo ""
        echo "Dev mode expects mattermost-mobile-e2ee to be cloned alongside this repo:"
        echo "  cd .."
        echo "  git clone https://github.com/mattermost/mattermost-mobile-e2ee.git"
        echo ""
        echo "Or use binary mode (default): npm run e2ee:enable"
        exit 1
    fi

    # Display sister directory info
    cd "$E2EE_SISTER_DIR"
    BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "detached")
    COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    echo "Using directory: $E2EE_SISTER_DIR"
    echo "   Branch: $BRANCH"
    echo "   Commit: $COMMIT"
    cd - > /dev/null

    # Build if needed (npm run build includes npm install)
    if [ ! -d "$E2EE_SISTER_DIR/src/generated" ]; then
        echo "Building E2EE from source..."
        cd "$E2EE_SISTER_DIR"
        npm run build
        cd - > /dev/null
    else
        echo "[ok] E2EE already built (run 'npm run build' in sister dir to rebuild)"
    fi

    # Install e2ee's dependencies into main node_modules first
    # (must be before symlink creation since npm install can remove it)
    echo "Installing E2EE dependencies..."
    npm install --no-save uniffi-bindgen-react-native

    # Symlink to node_modules (so changes reflect immediately)
    echo "Symlinking E2EE module..."
    rm -rf node_modules/@mattermost/e2ee
    mkdir -p node_modules/@mattermost
    ln -s "$(cd "$E2EE_SISTER_DIR" && pwd)" node_modules/@mattermost/e2ee

    # Create marker file so postinstall can restore symlink after npm install
    touch .e2ee-dev-mode

    E2EE_SOURCE_DIR="$E2EE_SISTER_DIR"

else
    # === BINARY MODE ===
    # For CI, or mobile devs who aren't developing on E2EE
    # Use E2EE_VERSION above to pin to a specific release (e.g., E2EE_VERSION=v0.2.0)

    echo "Downloading pre-built E2EE library..."
    if ./scripts/download-e2ee-binaries.sh "$E2EE_VERSION"; then
        echo "[ok] Using pre-built binaries"
    else
        echo "[error] Failed to download pre-built binaries"
        echo ""
        echo "Options:"
        echo "  1. Check if releases exist at: https://github.com/mattermost/mattermost-mobile-e2ee/releases"
        echo "  2. Use dev mode: npm run e2ee:enable -- dev"
        exit 1
    fi

    # Link to node_modules
    echo "Linking E2EE module to node_modules..."
    npm install --install-links --no-save "./$E2EE_DIR"

    E2EE_SOURCE_DIR="$E2EE_DIR"
fi

# Clear Android caches (Gradle daemon caches settings evaluation)
cd android && ./gradlew --stop 2>/dev/null || true
cd ..
rm -rf android/.gradle android/build/generated/autolinking

# Install pods with E2EE
echo ""
echo "Installing iOS dependencies with E2EE..."
if [[ $(uname -m) == 'arm64' ]]; then
    E2EE_ENABLED=1 npm run pod-install-m1
else
    E2EE_ENABLED=1 npm run pod-install
fi

echo ""
echo "[ok] E2EE development environment ready! Don't forget to restart Metro with 'npm start -- --reset-cache'."
echo ""
if [ "$MODE" = "dev" ]; then
    echo "DEV MODE: Linked from directory ($E2EE_SISTER_DIR)"
    echo "   Changes in that directory will be reflected after Metro reload."
    echo "   Run 'npm run build' there after Rust changes."
fi
echo ""
echo "IMPORTANT: Your local Podfile.lock now includes E2EE pods."
echo "   Do NOT commit these changes. The pre-commit hook will block them."
echo ""
echo "To disable E2EE: npm run e2ee:disable"
echo "To check status: npm run e2ee:status"
echo ""
