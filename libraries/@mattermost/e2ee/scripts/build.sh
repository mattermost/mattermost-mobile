#!/usr/bin/env bash

set -euo pipefail

# Ensure cargo is in PATH - needed for CI where PATH updates may not propagate correctly
if [[ -f "$HOME/.cargo/env" ]]; then
  # shellcheck source=/dev/null
  source "$HOME/.cargo/env"
fi

ANDROID_TARGETS=(aarch64-linux-android armv7-linux-androideabi x86_64-linux-android i686-linux-android)

# iOS targets can be overridden via IOS_TARGETS env var for CI (space-separated string)
# Default: device + host-arch simulator (faster for local dev)
# CI sets: device + both simulators for universal XCFramework
if [[ -n "${IOS_TARGETS:-}" ]]; then
  # Convert space-separated string to array
  read -ra IOS_TARGETS <<< "${IOS_TARGETS}"
else
  if [[ "$(uname -m)" == "arm64" ]]; then
    IOS_TARGETS=(aarch64-apple-ios aarch64-apple-ios-sim)
  else
    IOS_TARGETS=(aarch64-apple-ios x86_64-apple-ios)
  fi
fi

# Use --release flag if E2EE_RELEASE=1 (set by CI)
# Local dev builds use debug mode for faster builds and better debugging
if [[ "${E2EE_RELEASE:-0}" == "1" ]]; then
    RELEASE_FLAG="--release"
    echo "==> Building in RELEASE mode"
else
    RELEASE_FLAG=""
    echo "==> Building in DEBUG mode (set E2EE_RELEASE=1 for release)"
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

ensure_command() {
  local cmd="$1"
  local install_hint="$2"
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "error: ${cmd} is required but was not found. ${install_hint}" >&2
    exit 1
  fi
}

ensure_targets() {
  local required_targets=("$@")
  local missing=()

  local installed
  installed="$(rustup target list --installed)"

  for target in "${required_targets[@]}"; do
    if ! grep -q "^${target}$" <<< "${installed}"; then
      missing+=("${target}")
    fi
  done

  if (( ${#missing[@]} )); then
    echo "error: Missing Rust targets: ${missing[*]}" >&2
    echo "       Install them with: rustup target add ${missing[*]}" >&2
    exit 1
  fi
}

prepare_cargo_ndk() {
  ensure_command "cargo-ndk" "Install with 'cargo install cargo-ndk'."

  local original
  original="$(command -v cargo-ndk || true)"

  if [[ -z "${original}" ]]; then
    echo "error: unable to locate the real cargo-ndk binary." >&2
    exit 1
  fi

  export UBRN_CARGO_NDK_REAL="${original}"

  if [[ ":${PATH}:" != *":${SCRIPT_DIR}:"* ]]; then
    export PATH="${SCRIPT_DIR}:${PATH}"
  fi
}

build_ios() {
  if [[ "$(uname)" != "Darwin" ]]; then
    echo "==> Skipping MattermostE2ee (iOS) build on non-macOS host"
    return
  fi

  ensure_targets "${IOS_TARGETS[@]}"

  # Join targets with comma for CLI
  local targets_csv
  targets_csv=$(IFS=,; echo "${IOS_TARGETS[*]}")

  echo "==> Building MattermostE2ee (iOS) with targets: ${targets_csv}"
  rm -rf "${PACKAGE_DIR}/MattermostE2eeFramework.xcframework"
  (
    cd "${PACKAGE_DIR}"
    npx --no-install ubrn build ios ${RELEASE_FLAG} --and-generate --targets "${targets_csv}"
    # Override generated file with old architecture support
    echo "==> Applying old architecture overrides..."
    cp "${PACKAGE_DIR}/overrides/MattermostE2ee.mm" "${PACKAGE_DIR}/ios/MattermostE2ee.mm"
    # Patch index.tsx to use wrapper
    node "${SCRIPT_DIR}/patch-generated.js"
  )
}

build_android() {
  ensure_targets "${ANDROID_TARGETS[@]}"
  prepare_cargo_ndk

  echo "==> Building MattermostE2ee (Android)"
  # Clean Gradle build cache and any cached libc++_shared.so to avoid stale/duplicate native libs
  rm -rf "${PACKAGE_DIR}/android/build"
  rm -rf "${PACKAGE_DIR}/android/src/main/jniLibs"
  echo "==> Pre-build cleanup: removing any cached libc++_shared.so..."
  find "${PACKAGE_DIR}" -name "libc++_shared.so" -print -delete 2>/dev/null || true
  (
    cd "${PACKAGE_DIR}"
    # Tell cargo-ndk to not bundle libc++_shared.so - React Native provides it
    export ANDROID_NDK_CLANG_NO_LIBCXX=1
    npx --no-install ubrn build android ${RELEASE_FLAG} --and-generate

    # Remove libc++_shared.so from everywhere - React Native provides this, and duplicates cause build failures
    echo "==> Post-build cleanup: removing any libc++_shared.so..."
    find "${PACKAGE_DIR}" -name "libc++_shared.so" -print -delete 2>/dev/null || true
    echo "==> Remaining native libs:"
    find "${PACKAGE_DIR}/android" -name "*.so" -print 2>/dev/null || true

    # Override generated files with old architecture support
    echo "==> Applying overrides..."
    cp "${PACKAGE_DIR}/overrides/MattermostE2eeModule.kt" "${PACKAGE_DIR}/android/src/main/java/com/mattermost/e2ee/MattermostE2eeModule.kt"
    cp "${PACKAGE_DIR}/overrides/MattermostE2eePackage.kt" "${PACKAGE_DIR}/android/src/main/java/com/mattermost/e2ee/MattermostE2eePackage.kt"
    # Append custom Gradle code to fix libc++_shared.so duplicates during androidTest builds
    # We append rather than replace to preserve ubrn-generated configuration
    cat "${PACKAGE_DIR}/overrides/build.gradle.append" >> "${PACKAGE_DIR}/android/build.gradle"
    echo "==> Overrides applied (appended libc++_shared.so fix to build.gradle)"
    # Patch index.tsx to use wrapper
    node "${SCRIPT_DIR}/patch-generated.js"
  )
}

# On CI, only build for the current platform:
# - macOS runners build iOS only
# - Linux runners build Android only
# Locally, build both platforms
if [[ "${CI:-}" == "true" ]]; then
  if [[ "$(uname)" == "Darwin" ]]; then
    build_ios
  else
    build_android
  fi
else
  build_ios
  build_android
fi
