#!/bin/bash
# Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
# See LICENSE.txt for license information.

set -e

# Download pre-built E2EE library from GitHub Releases
# This is faster than building from source and doesn't require Rust toolchain
#
# The release contains the complete library:
# - Source files (src/, ios/, android/, cpp/)
# - Generated TypeScript/C++ bindings
# - Pre-built iOS XCFramework
# - Pre-built Android JNI libraries

REPO="mattermost/mattermost-mobile-e2ee"
E2EE_DIR="libraries/@mattermost/e2ee"

# Get version from argument or default to latest
VERSION="${1:-latest}"

echo "Downloading E2EE library (version: $VERSION)..."

# Determine release URL
if [ "$VERSION" = "latest" ]; then
    RELEASE_URL="https://api.github.com/repos/$REPO/releases/latest"
else
    RELEASE_URL="https://api.github.com/repos/$REPO/releases/tags/$VERSION"
fi

# Get download URL from release
echo "Fetching release information..."
RELEASE_INFO=$(curl -sf "$RELEASE_URL" 2>/dev/null || echo "")

if [ -z "$RELEASE_INFO" ]; then
    echo "[error] Could not fetch release info for version: $VERSION"
    exit 1
fi

# Extract the release archive URL (mattermost-e2ee-v*.zip)
ARCHIVE_URL=$(echo "$RELEASE_INFO" | grep -o '"browser_download_url": "[^"]*mattermost-e2ee-v[^"]*\.zip"' | head -1 | cut -d'"' -f4)

if [ -z "$ARCHIVE_URL" ]; then
    echo "[error] Could not find release archive in release"
    exit 1
fi

echo "Downloading from: $ARCHIVE_URL"
curl -sL "$ARCHIVE_URL" -o /tmp/e2ee-release.zip

# Clean and recreate directory
echo "Preparing E2EE directory..."
rm -rf "$E2EE_DIR"
mkdir -p "$E2EE_DIR"

# Extract the release archive
echo "Extracting to $E2EE_DIR/..."
unzip -q /tmp/e2ee-release.zip -d "$E2EE_DIR"
rm /tmp/e2ee-release.zip

# Verify extraction
if [ ! -f "$E2EE_DIR/package.json" ]; then
    echo "[error] Extraction failed - package.json not found"
    exit 1
fi

echo ""
echo "[ok] E2EE library downloaded successfully"
echo "   Version: $(node -p "require('./$E2EE_DIR/package.json').version" 2>/dev/null || echo 'unknown')"
