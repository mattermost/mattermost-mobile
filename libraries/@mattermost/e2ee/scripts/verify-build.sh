#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

errors=0

check_file() {
    local file="$1"
    local description="$2"
    if [[ -f "${PACKAGE_DIR}/${file}" ]]; then
        echo -e "${GREEN}✓${NC} ${description}"
    else
        echo -e "${RED}✗${NC} ${description} - Missing: ${file}"
        ((errors++))
    fi
}

check_dir() {
    local dir="$1"
    local description="$2"
    if [[ -d "${PACKAGE_DIR}/${dir}" ]]; then
        echo -e "${GREEN}✓${NC} ${description}"
    else
        echo -e "${RED}✗${NC} ${description} - Missing: ${dir}"
        ((errors++))
    fi
}

# Check if a directory matching a glob pattern exists
check_dir_pattern() {
    local pattern="$1"
    local description="$2"
    local found
    # Use find to locate directories matching the pattern
    found=$(find "${PACKAGE_DIR}" -maxdepth 2 -type d -name "${pattern}" 2>/dev/null | head -1)
    if [[ -n "${found}" ]]; then
        local dirname
        dirname=$(basename "${found}")
        echo -e "${GREEN}✓${NC} ${description} (${dirname})"
    else
        echo -e "${RED}✗${NC} ${description} - No directory matching: ${pattern}"
        ((errors++))
    fi
}

echo "==> Verifying E2EE build artifacts..."
echo ""

# On CI, only verify the platform that was built:
# - macOS runners build iOS only
# - Linux runners build Android only
# Locally, verify both platforms

# Check iOS artifacts (only on macOS)
# Note: When building multiple simulator architectures, they get combined via lipo
# into a single fat library, and xcodebuild creates a combined directory like
# "ios-arm64_x86_64-simulator" instead of separate directories
if [[ "$(uname)" == "Darwin" ]]; then
    echo "iOS:"
    check_dir "MattermostE2eeFramework.xcframework" "xcframework directory"
    check_dir "MattermostE2eeFramework.xcframework/ios-arm64" "iOS arm64 device slice"
    # Check for any simulator slice (could be ios-arm64-simulator, ios-x86_64-simulator,
    # or ios-arm64_x86_64-simulator depending on build config)
    check_dir_pattern "ios-*-simulator" "iOS simulator slice"
    check_file "MattermostE2eeFramework.xcframework/ios-arm64/libmattermost_e2ee.a" "iOS arm64 static library"
    echo ""
fi

# Check Android artifacts -- run always locally, or on CI on linux only
if [[ "${CI:-}" != "true" ]] || [[ "$(uname)" != "Darwin" ]]; then
    echo "Android:"
    check_dir "android/src/main/jniLibs" "jniLibs directory"
    check_file "android/src/main/jniLibs/arm64-v8a/libmattermost_e2ee.a" "arm64-v8a library"
    check_file "android/src/main/jniLibs/armeabi-v7a/libmattermost_e2ee.a" "armeabi-v7a library"
    check_file "android/src/main/jniLibs/x86_64/libmattermost_e2ee.a" "x86_64 library"
    check_file "android/src/main/jniLibs/x86/libmattermost_e2ee.a" "x86 library"
    echo ""
fi

# Check generated bindings
echo "Generated bindings:"
check_file "src/generated/mattermost_e2ee.ts" "TypeScript bindings"
check_file "src/generated/mattermost_e2ee-ffi.ts" "TypeScript FFI bindings"
check_file "cpp/generated/mattermost_e2ee.cpp" "C++ bindings"
check_file "cpp/generated/mattermost_e2ee.hpp" "C++ header"
echo ""

# Summary
if [[ ${errors} -eq 0 ]]; then
    echo -e "${GREEN}All build artifacts verified successfully!${NC}"
    exit 0
else
    echo -e "${RED}${errors} verification(s) failed${NC}"
    exit 1
fi
