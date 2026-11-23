#!/bin/bash
# Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
# See LICENSE.txt for license information.

set -e

echo "📱 Disabling Intune and restoring OSS state..."
echo ""

# Remove node_modules symlink
if [ -L "node_modules/@mattermost/intune" ] || [ -d "node_modules/@mattermost/intune" ]; then
    rm -rf node_modules/@mattermost/intune
    echo "✅ Removed Intune module symlink"
fi

# Deinitialize the Intune submodule (properly removes content but preserves Git tracking)
if [ -e "libraries/@mattermost/intune/.git" ]; then
    echo "🔄 Deinitializing Intune submodule..."
    git submodule deinit -f libraries/@mattermost/intune
    echo "✅ Intune submodule deinitialized"
else
    echo "ℹ️  Intune submodule already deinitialized"
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

# Android autolinking is cached independently of INTUNE_ENABLED
rm -rf android/build/generated/autolinking

# Reinstall pods without Intune
echo "📦 Reinstalling iOS dependencies (OSS mode)..."
npm run pod-install

echo ""
echo "✅ Intune disabled. You're now in OSS build mode."
echo ""
