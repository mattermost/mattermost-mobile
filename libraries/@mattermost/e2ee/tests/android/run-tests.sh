#!/usr/bin/env bash
#
# Android Native Library Verification Tests
#
# Unlike the iOS tests (which compile Swift code and run it on a simulator),
# Android tests verify the libraries at the symbol level. This is because:
#
# 1. The Android Rust libraries (.a files) are linked into a JNI shared library
#    during the Gradle build, not used directly like iOS xcframeworks.
#
# 2. Running actual code would require either:
#    - A full Android emulator with the React Native app running
#    - A standalone Android test app with JNI bindings
#    Both add significant CI complexity and time.
#
# 3. Symbol verification gives us confidence that:
#    - The Rust code compiled successfully for all Android architectures
#    - The FFI functions are exported with correct names
#    - The libraries are valid static archives
#

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
JNILIBS_DIR="${PACKAGE_DIR}/android/src/main/jniLibs"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

passed=0
failed=0

# Find the NDK llvm-nm tool
find_llvm_nm() {
    local ndk_home="${ANDROID_NDK_HOME:-${ANDROID_HOME:-/dev/null}/ndk}"

    # Try to find llvm-nm in NDK
    local llvm_nm=$(find ${ndk_home} -name "llvm-nm" -type f 2>/dev/null | head -1)

    if [[ -n "${llvm_nm}" ]]; then
        echo "${llvm_nm}"
    else
        # Fallback to system nm (may not work for all architectures)
        echo "nm"
    fi
}

NM_TOOL=$(find_llvm_nm)
echo "Using nm tool: ${NM_TOOL}"

check_symbol() {
    local lib="$1"
    local symbol="$2"
    local description="$3"

    # Look for the symbol as a Text (T) symbol - Android doesn't use _ prefix like iOS
    if "${NM_TOOL}" "${lib}" 2>/dev/null | grep -E "^[0-9a-f]+ T ${symbol}$" > /dev/null; then
        echo -e "${GREEN}✓${NC} ${description}"
        passed=$((passed + 1))
    else
        echo -e "${RED}✗${NC} ${description} - Symbol not found: ${symbol}"
        failed=$((failed + 1))
    fi
}

check_lib_format() {
    local lib="$1"
    local arch="$2"

    # Check it's a valid static library
    if file "${lib}" | grep -q "ar archive"; then
        echo -e "${GREEN}✓${NC} ${arch}: Valid static library format"
        passed=$((passed + 1))
    else
        echo -e "${RED}✗${NC} ${arch}: Invalid library format"
        failed=$((failed + 1))
    fi
}

echo "==> Running E2EE Android Native Library Tests"
echo ""

# Check each architecture
for arch in arm64-v8a armeabi-v7a x86_64 x86; do
    LIB="${JNILIBS_DIR}/${arch}/libmattermost_e2ee.a"

    if [[ ! -f "${LIB}" ]]; then
        echo -e "${RED}✗${NC} ${arch}: Library not found"
        ((failed++))
        continue
    fi

    echo "${arch}:"
    check_lib_format "${LIB}" "${arch}"
    check_symbol "${LIB}" "uniffi_mattermost_e2ee_fn_func_greet" "${arch}: greet() FFI function"
    check_symbol "${LIB}" "uniffi_mattermost_e2ee_fn_func_hello_from_rust" "${arch}: hello_from_rust() FFI function"
    check_symbol "${LIB}" "ffi_mattermost_e2ee_uniffi_contract_version" "${arch}: contract version function"
    echo ""
done

# Summary
echo "Results: ${passed} passed, ${failed} failed"

if [[ ${failed} -eq 0 ]]; then
    echo -e "${GREEN}All Android native library tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed${NC}"
    exit 1
fi
