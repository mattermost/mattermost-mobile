#!/bin/bash
# Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
# See LICENSE.txt for license information.

set -e

echo "📱 Disabling E2EE and restoring OSS state..."
echo ""

E2EE_DIR="libraries/@mattermost/e2ee"

# Remove node_modules symlink
if [ -L "node_modules/@mattermost/e2ee" ] || [ -d "node_modules/@mattermost/e2ee" ]; then
    rm -rf node_modules/@mattermost/e2ee
    echo "✅ Removed E2EE module symlink"
fi

# Deinitialize the E2EE submodule (properly removes content but preserves Git tracking)
if [ -e "$E2EE_DIR/.git" ]; then
    echo "🔄 Deinitializing E2EE submodule..."
    git submodule deinit -f "$E2EE_DIR"
    echo "✅ E2EE submodule deinitialized"
else
    echo "ℹ️  E2EE submodule already deinitialized"
fi

# Clean up E2EE build artifacts
if [ -d "$E2EE_DIR/MattermostE2eeFramework.xcframework" ]; then
    rm -rf "$E2EE_DIR/MattermostE2eeFramework.xcframework"
    echo "✅ Removed iOS XCFramework"
fi

if [ -d "$E2EE_DIR/android/src/main/jniLibs" ]; then
    rm -rf "$E2EE_DIR/android/src/main/jniLibs"
    echo "✅ Removed Android JNI libraries"
fi

# Restore OSS Podfile.lock from git
if git diff --quiet ios/Podfile.lock 2>/dev/null; then
    echo "✅ Podfile.lock is already clean"
else
    echo "🔄 Restoring OSS Podfile.lock from git..."
    git checkout -- ios/Podfile.lock
fi

# Restore OSS project.pbxproj from git
if git diff --quiet ios/Mattermost.xcodeproj/project.pbxproj 2>/dev/null; then
    echo "✅ project.pbxproj is already clean"
else
    echo "🔄 Restoring OSS project.pbxproj from git..."
    git checkout -- ios/Mattermost.xcodeproj/project.pbxproj
fi

# Reinstall pods without E2EE
echo "📦 Reinstalling iOS dependencies (OSS mode)..."
if [[ $(uname -m) == 'arm64' ]]; then
    npm run pod-install-m1
else
    npm run pod-install
fi

echo ""
echo "✅ E2EE disabled. You're now in OSS build mode."
echo ""
