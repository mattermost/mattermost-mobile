#!/bin/bash
# Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
# See LICENSE.txt for license information.

echo ""
echo "E2EE Status"
echo "==========="

# Check via node_modules (works for both symlink/dev and installed/binary modes)
E2EE_MODULE="node_modules/@mattermost/e2ee"

# Check mode and E2EE library
if [ -L "$E2EE_MODULE" ]; then
    TARGET=$(readlink "$E2EE_MODULE")
    VERSION=$(node -p "require('./$E2EE_MODULE/package.json').version" 2>/dev/null || echo "?")
    echo "[ok] Module: symlinked to $TARGET (v$VERSION)"
elif [ -f "$E2EE_MODULE/package.json" ]; then
    VERSION=$(node -p "require('./$E2EE_MODULE/package.json').version" 2>/dev/null || echo "?")
    echo "[ok] Module: installed (v$VERSION)"
else
    echo "[no] Module: not installed"
    echo ""
    echo "To enable:"
    echo "   npm run e2ee:enable         - Download pre-built binaries"
    echo "   npm run e2ee:enable -- dev  - Symlink sister directory"
    echo "   npm run e2ee:enable -- ci   - For CI use; download skip pod install"
    echo ""
    exit 0
fi

# Check iOS build artifacts
if [ -d "$E2EE_MODULE/MattermostE2eeFramework.xcframework" ]; then
    echo "[ok] iOS: XCFramework present"
else
    echo "[no] iOS: XCFramework missing"
fi

# Check Android build artifacts
ANDROID_ABIS=("arm64-v8a" "armeabi-v7a" "x86_64" "x86")
ANDROID_OK=true
for ABI in "${ANDROID_ABIS[@]}"; do
    if [ ! -d "$E2EE_MODULE/android/src/main/jniLibs/$ABI" ]; then
        ANDROID_OK=false
        break
    fi
done

if [ "$ANDROID_OK" = true ]; then
    echo "[ok] Android: JNI libraries present"
else
    echo "[no] Android: JNI libraries missing"
fi

# Check Podfile.lock - combine status and git warning
if grep -q "MattermostE2ee" ios/Podfile.lock 2>/dev/null; then
    if ! git diff --quiet ios/Podfile.lock 2>/dev/null; then
        echo "[!!] Podfile.lock: has E2EE pods (don't commit - run e2ee:disable first)"
    else
        echo "[ok] Podfile.lock: has E2EE pods"
    fi
else
    echo "[ok] Podfile.lock: clean (no E2EE)"
fi

echo ""
