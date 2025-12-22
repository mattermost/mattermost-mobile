#!/bin/bash
# Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
# See LICENSE.txt for license information.

echo ""
echo "Intune Development Status"
echo "========================="
echo ""

# Check submodule
if [ -d "libraries/@mattermost/intune/.git" ]; then
    echo "✅ Intune submodule: initialized"
    cd libraries/@mattermost/intune
    BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
    COMMIT=$(git rev-parse --short HEAD 2>/dev/null)
    REMOTE=$(git remote get-url origin 2>/dev/null)
    echo "   Repository: $REMOTE"
    echo "   Branch: $BRANCH"
    echo "   Commit: $COMMIT"
    cd ../..
else
    echo "❌ Intune submodule: not initialized"
    echo "   Run: npm run intune:init"
fi

echo ""

# Check node_modules symlink
if [ -L "node_modules/@mattermost/intune" ] || [ -d "node_modules/@mattermost/intune" ]; then
    echo "✅ Intune module: linked"
    if [ -L "node_modules/@mattermost/intune" ]; then
        TARGET=$(readlink node_modules/@mattermost/intune)
        echo "   Target: $TARGET"
    fi
else
    echo "❌ Intune module: not linked"
    echo "   Run: npm run intune:link"
fi

echo ""

# Check Podfile.lock
if grep -q "mattermost-intune\|IntuneMAMSwift" ios/Podfile.lock 2>/dev/null; then
    echo "✅ Podfile.lock: includes Intune pods (local build)"
    echo "   ⚠️  Do NOT commit this file!"
else
    echo "📱 Podfile.lock: OSS version (no Intune)"
fi

echo ""

# Check for uncommitted Podfile.lock changes
if ! git diff --quiet ios/Podfile.lock 2>/dev/null; then
    echo "⚠️  WARNING: Podfile.lock has uncommitted changes"
    echo "   If these include Intune pods, run: npm run intune:disable"
else
    echo "✅ Podfile.lock: no uncommitted changes"
fi

echo ""
