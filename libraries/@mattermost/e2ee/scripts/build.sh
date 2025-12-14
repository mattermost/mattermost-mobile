#!/usr/bin/env bash

set -euo pipefail

ANDROID_TARGETS=(aarch64-linux-android armv7-linux-androideabi x86_64-linux-android i686-linux-android)
IOS_TARGETS=(aarch64-apple-ios aarch64-apple-ios-sim)

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

  echo "==> Building MattermostE2ee (iOS)"
  rm -rf "${PACKAGE_DIR}/MattermostE2eeFramework.xcframework"
  (
    cd "${PACKAGE_DIR}"
    npx --no-install ubrn build ios ${RELEASE_FLAG} --and-generate
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
  rm -rf "${PACKAGE_DIR}/android/src/main/jniLibs"
  (
    cd "${PACKAGE_DIR}"
    npx --no-install ubrn build android ${RELEASE_FLAG} --and-generate
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
