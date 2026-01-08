#!/bin/bash
# Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
# See LICENSE.txt for license information.

set -e

echo "Disabling E2EE..."
echo ""

E2EE_DIR="libraries/@mattermost/e2ee"

# Remove node_modules e2ee (symlink in dev mode, directory in binary mode)
if [ -L "node_modules/@mattermost/e2ee" ]; then
    rm -f node_modules/@mattermost/e2ee
    echo "[ok] Removed E2EE module symlink"
elif [ -d "node_modules/@mattermost/e2ee" ]; then
    rm -rf node_modules/@mattermost/e2ee
    echo "[ok] Removed E2EE module directory"
fi

# Remove dev mode marker
rm -f .e2ee-dev-mode

# Clean up downloaded E2EE library (binary mode)
if [ -d "$E2EE_DIR" ]; then
    rm -rf "$E2EE_DIR"
    echo "[ok] Removed E2EE library directory"
fi

# Clear Android caches (Gradle daemon caches settings evaluation)
cd android && ./gradlew --stop 2>/dev/null || true
cd ..
rm -rf android/.gradle android/build/generated/autolinking

# Restore OSS Podfile.lock from git
if git diff --quiet ios/Podfile.lock 2>/dev/null; then
    echo "[ok] Podfile.lock is already clean"
else
    echo "Restoring OSS Podfile.lock from git..."
    git checkout -- ios/Podfile.lock
fi

# Restore OSS project.pbxproj from git
if git diff --quiet ios/Mattermost.xcodeproj/project.pbxproj 2>/dev/null; then
    echo "[ok] project.pbxproj is already clean"
else
    echo "Restoring OSS project.pbxproj from git..."
    git checkout -- ios/Mattermost.xcodeproj/project.pbxproj
fi

# Reinstall pods without E2EE
echo "Reinstalling iOS dependencies (OSS mode)..."
if [[ $(uname -m) == 'arm64' ]]; then
    npm run pod-install-m1
else
    npm run pod-install
fi

echo ""
echo "[ok] E2EE disabled. Don't forget to restart Metro with 'npm start -- --reset-cache'."
echo ""
