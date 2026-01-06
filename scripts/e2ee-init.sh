#!/bin/bash
# Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
# See LICENSE.txt for license information.

set -e

echo "🔐 Initializing E2EE development environment..."
echo ""

E2EE_DIR="libraries/@mattermost/e2ee"

# Determine mode: submodule (for e2ee developers) or binary (for app developers)
# Use submodule if E2EE_USE_SUBMODULE=1 or if submodule is already initialized
if [ "$E2EE_USE_SUBMODULE" = "1" ] || [ -e "$E2EE_DIR/.git" ]; then
    MODE="submodule"
else
    MODE="binary"
fi

echo "📋 Mode: $MODE"
echo ""

if [ "$MODE" = "submodule" ]; then
    # === SUBMODULE MODE ===
    # For E2EE developers who want to work on the e2ee library itself

    # Initialize submodule if not already
    if [ ! -e "$E2EE_DIR/.git" ]; then
        echo "📥 Initializing E2EE submodule..."
        git submodule update --init --recursive "$E2EE_DIR"
    else
        echo "✅ E2EE submodule already initialized"
    fi

    # Update submodule to tracked branch
    echo "🔄 Updating E2EE submodule..."
    git submodule update --remote "$E2EE_DIR"

    # Display submodule info
    cd "$E2EE_DIR"
    BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "detached")
    COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    echo "📦 E2EE submodule:"
    echo "   Branch: $BRANCH"
    echo "   Commit: $COMMIT"
    cd - > /dev/null

    # Build from source (submodule mode always builds)
    echo "🔨 Building E2EE from source..."
    cd "$E2EE_DIR"
    npm install
    npm run build
    cd - > /dev/null

    # Link to node_modules
    echo "🔗 Linking E2EE module to node_modules..."
    npm install --install-links --no-save "./$E2EE_DIR"

else
    # === BINARY MODE ===
    # For app developers who just want pre-built E2EE

    echo "📥 Downloading pre-built E2EE library..."
    if ./scripts/download-e2ee-binaries.sh; then
        echo "✅ Using pre-built binaries"
    else
        echo "❌ Failed to download pre-built binaries"
        echo ""
        echo "Options:"
        echo "  1. Check if releases exist at: https://github.com/mattermost/mattermost-mobile-e2ee/releases"
        echo "  2. Use submodule mode: E2EE_USE_SUBMODULE=1 npm run e2ee:init"
        exit 1
    fi

    # Link to node_modules
    echo "🔗 Linking E2EE module to node_modules..."
    npm install --install-links --no-save "./$E2EE_DIR"
fi

# Install pods with E2EE
echo ""
echo "📦 Installing iOS dependencies with E2EE..."
if [[ $(uname -m) == 'arm64' ]]; then
    E2EE_ENABLED=1 npm run pod-install-m1
else
    E2EE_ENABLED=1 npm run pod-install
fi

echo ""
echo "✅ E2EE development environment ready!"
echo ""
echo "⚠️  IMPORTANT: Your local Podfile.lock now includes E2EE pods."
echo "   Do NOT commit these changes. The pre-commit hook will block them."
echo ""
echo "To disable E2EE: npm run e2ee:disable"
echo "To check status: npm run e2ee:status"
echo ""
