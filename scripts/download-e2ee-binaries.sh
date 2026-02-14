#!/bin/bash
# Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
# See LICENSE.txt for license information.

set -e

# Download pre-built E2EE library from GitHub Releases
# This is faster than building from source and doesn't require the Rust toolchain
#
# The release contains the complete library:
# - Source files (src/, ios/, android/, cpp/)
# - Generated TypeScript/C++ bindings
# - Pre-built iOS XCFramework
# - Pre-built Android JNI libraries

REPO="mattermost/mattermost-mobile-e2ee"
E2EE_DIR="libraries/@mattermost/e2ee"
VERSION_FILE=".e2ee-version"

# Get version from argument, or read from .e2ee-version file
if [ -n "$1" ]; then
    VERSION="$1"
elif [ -f "$VERSION_FILE" ]; then
    VERSION=$(cat "$VERSION_FILE" | tr -d '[:space:]')
else
    echo "[error] No version specified and $VERSION_FILE not found"
    exit 1
fi

echo "Downloading E2EE library (version: $VERSION)..."

# =============================================================================
# Authentication (repo is private):
#   - Local: Use `gh` CLI (requires `gh auth login`)
#   - CI: Use curl with MATTERMOST_BUILD_GH_TOKEN
# =============================================================================

# Download using gh CLI (for local development)
download_with_gh() {
    if ! command -v gh &> /dev/null; then
        echo "[error] gh CLI not installed. Install from: https://cli.github.com"
        return 1
    fi

    if ! gh auth status &> /dev/null; then
        echo "[error] gh CLI not authenticated. Run: gh auth login"
        return 1
    fi

    local tag_arg=""
    if [ "$VERSION" != "latest" ]; then
        tag_arg="$VERSION"
    fi

    gh release download $tag_arg --repo "$REPO" --pattern "mattermost-e2ee-*.zip" --dir /tmp --clobber
}

# Download using curl with token (for CI)
download_with_curl() {
    if [ -z "$MATTERMOST_BUILD_GH_TOKEN" ]; then
        echo "[error] MATTERMOST_BUILD_GH_TOKEN not set"
        return 1
    fi

    local release_url
    if [ "$VERSION" = "latest" ]; then
        release_url="https://api.github.com/repos/$REPO/releases/latest"
    else
        release_url="https://api.github.com/repos/$REPO/releases/tags/$VERSION"
    fi

    # Fetch release info
    local release_info
    release_info=$(curl -sf \
        -H "Accept: application/vnd.github+json" \
        -H "Authorization: Bearer $MATTERMOST_BUILD_GH_TOKEN" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        "$release_url") || {
        echo "[error] Could not fetch release info"
        return 1
    }

    # Extract asset URL (use API URL, not browser_download_url for private repos)
    local asset_url
    asset_url=$(echo "$release_info" | grep -o '"url": "https://api.github.com/repos/[^"]*assets/[0-9]*"' | head -1 | cut -d'"' -f4)

    if [ -z "$asset_url" ]; then
        echo "[error] Could not find asset URL in release"
        return 1
    fi

    # Download the asset
    curl -sfL \
        -H "Accept: application/octet-stream" \
        -H "Authorization: Bearer $MATTERMOST_BUILD_GH_TOKEN" \
        -H "X-GitHub-Api-Version: 2022-11-28" \
        "$asset_url" \
        -o /tmp/e2ee-release.zip
}

# Download based on environment
if [ "$CI" = "true" ] || [ "$CI" = "1" ]; then
    echo "Downloading via curl (CI)..."
    download_with_curl || exit 1
    ZIP_FILE="/tmp/e2ee-release.zip"
else
    echo "Downloading via gh CLI..."
    download_with_gh || exit 1
    ZIP_FILE=$(ls /tmp/mattermost-e2ee-*.zip 2>/dev/null | head -1)
fi

if [ -z "$ZIP_FILE" ] || [ ! -f "$ZIP_FILE" ]; then
    echo "[error] Download failed - zip file not found"
    exit 1
fi

# Clean and recreate directory
echo "Preparing E2EE directory..."
rm -rf "$E2EE_DIR"
mkdir -p "$E2EE_DIR"

# Extract the release archive
echo "Extracting to $E2EE_DIR/..."
unzip -q "$ZIP_FILE" -d "$E2EE_DIR"
rm "$ZIP_FILE"

# Verify extraction
if [ ! -f "$E2EE_DIR/package.json" ]; then
    echo "[error] Extraction failed - package.json not found"
    exit 1
fi

echo ""
echo "[ok] E2EE library downloaded successfully"
echo "     Version: $(node -p "require('./$E2EE_DIR/package.json').version" 2>/dev/null || echo 'unknown')"
