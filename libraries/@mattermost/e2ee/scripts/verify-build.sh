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

echo "==> Verifying E2EE build artifacts..."
echo ""

# On CI, only verify the platform that was built:
# - macOS runners build iOS only
# - Linux runners build Android only
# Locally, verify both platforms

# Determine expected simulator slice based on host architecture
if [[ "$(uname -m)" == "arm64" ]]; then
    SIM_SLICE="ios-arm64-simulator"
else
    SIM_SLICE="ios-x86_64-simulator"
fi

# Check iOS artifacts (only on macOS)
if [[ "$(uname)" == "Darwin" ]]; then
    echo "iOS:"
    check_dir "MattermostE2eeFramework.xcframework" "xcframework directory"
    check_dir "MattermostE2eeFramework.xcframework/ios-arm64" "iOS arm64 slice"
    check_dir "MattermostE2eeFramework.xcframework/${SIM_SLICE}" "iOS simulator slice (${SIM_SLICE})"
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
