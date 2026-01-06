#!/bin/bash
# Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
# See LICENSE.txt for license information.

echo ""
echo "E2EE Development Status"
echo "======================="
echo ""

E2EE_DIR="libraries/@mattermost/e2ee"

# Check submodule
if [ -d "$E2EE_DIR/.git" ]; then
    echo "✅ E2EE submodule: initialized"
    cd "$E2EE_DIR"
    BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "detached")
    COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    REMOTE=$(git remote get-url origin 2>/dev/null || echo "unknown")
    echo "   Repository: $REMOTE"
    echo "   Branch: $BRANCH"
    echo "   Commit: $COMMIT"
    cd ../../..
else
    echo "❌ E2EE submodule: not initialized"
    echo "   Run: npm run e2ee:init (or to compile from source, use: E2EE_USE_SUBMODULE=1 npm run e2ee:init)"
fi

echo ""

# Check node_modules symlink
if [ -L "node_modules/@mattermost/e2ee" ] || [ -d "node_modules/@mattermost/e2ee" ]; then
    echo "✅ E2EE module: linked"
    if [ -L "node_modules/@mattermost/e2ee" ]; then
        TARGET=$(readlink node_modules/@mattermost/e2ee)
        echo "   Target: $TARGET"
    fi
else
    echo "❌ E2EE module: not linked"
    echo "   Run: npm run e2ee:init"
fi

echo ""

# Check iOS build artifacts
if [ -d "$E2EE_DIR/MattermostE2eeFramework.xcframework" ]; then
    echo "✅ iOS XCFramework: present"
else
    echo "❌ iOS XCFramework: missing"
    echo "   Run: npm run e2ee:init"
fi

# Check Android build artifacts
ANDROID_ABIS=("arm64-v8a" "armeabi-v7a" "x86_64" "x86")
ANDROID_OK=true
for ABI in "${ANDROID_ABIS[@]}"; do
    if [ ! -d "$E2EE_DIR/android/src/main/jniLibs/$ABI" ]; then
        ANDROID_OK=false
        break
    fi
done

if [ "$ANDROID_OK" = true ]; then
    echo "✅ Android JNI libraries: present"
else
    echo "❌ Android JNI libraries: missing or incomplete"
    echo "   Run: npm run e2ee:init"
fi

echo ""

# Check Podfile.lock
if grep -q "MattermostE2ee" ios/Podfile.lock 2>/dev/null; then
    echo "✅ Podfile.lock: includes E2EE pods (local build)"
    echo "   ⚠️  Do NOT commit this file!"
else
    echo "📱 Podfile.lock: OSS version (no E2EE)"
fi

echo ""

# Check for uncommitted Podfile.lock changes
if ! git diff --quiet ios/Podfile.lock 2>/dev/null; then
    echo "⚠️  WARNING: Podfile.lock has uncommitted changes"
    echo "   If these include E2EE pods, run: npm run e2ee:disable"
else
    echo "✅ Podfile.lock: no uncommitted changes"
fi

echo ""

# Check environment
echo "Environment:"
if [ "$E2EE_USE_SUBMODULE" = "1" ]; then
    echo "   E2EE_USE_SUBMODULE=1 (will use submodule and build from source)"
else
    echo "   E2EE_USE_SUBMODULE is not set (will use pre-built binaries)"
fi

echo ""
