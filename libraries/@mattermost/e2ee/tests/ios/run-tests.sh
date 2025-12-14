#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"
XCFRAMEWORK="${PACKAGE_DIR}/MattermostE2eeFramework.xcframework"

# We only build ARM simulator - Intel Macs can run via Rosetta
ARCH="arm64"
FRAMEWORK_PATH="${XCFRAMEWORK}/ios-arm64-simulator"

# Check if xcframework exists
if [[ ! -d "${XCFRAMEWORK}" ]]; then
    echo "Error: xcframework not found at ${XCFRAMEWORK}"
    echo "Run 'npm run e2ee:build' first"
    exit 1
fi

echo "==> Compiling iOS Rust FFI tests..."

# Create temp directory for build
BUILD_DIR=$(mktemp -d)
trap "rm -rf ${BUILD_DIR}" EXIT

# Compile the test
swiftc \
    -o "${BUILD_DIR}/E2EERustTests" \
    -target "${ARCH}-apple-ios17.0-simulator" \
    -sdk "$(xcrun --sdk iphonesimulator --show-sdk-path)" \
    -L "${FRAMEWORK_PATH}" \
    -lmattermost_e2ee \
    "${SCRIPT_DIR}/E2EERustTests.swift"

echo "==> Running tests on iOS Simulator..."

# NOTE: after we have e2e tests testing running e2ee code, we can
# remove simulator validation tests and move to verifying the symbol
# bindings are exported (much quicker)

# Find an available iPhone simulator
SIMULATOR_ID=$(xcrun simctl list devices available | grep "iPhone" | head -1 | sed -E 's/.*\(([A-F0-9-]+)\).*/\1/')

if [[ -z "${SIMULATOR_ID}" ]]; then
    echo "Error: No available iPhone simulator found"
    exit 1
fi

echo "Using simulator: ${SIMULATOR_ID}"

# Boot the simulator if not already booted
BOOT_STATUS=$(xcrun simctl list devices | grep "${SIMULATOR_ID}" | grep -o "(Booted)" || true)
if [[ -z "${BOOT_STATUS}" ]]; then
    echo "Booting simulator..."
    xcrun simctl boot "${SIMULATOR_ID}" || true
    sleep 3
fi

# Run the test binary on the simulator
xcrun simctl spawn "${SIMULATOR_ID}" "${BUILD_DIR}/E2EERustTests"

# Shutdown the simulator if we booted it
if [[ -z "${BOOT_STATUS}" ]]; then
    echo "Shutting down simulator..."
    xcrun simctl shutdown "${SIMULATOR_ID}" || true
fi
