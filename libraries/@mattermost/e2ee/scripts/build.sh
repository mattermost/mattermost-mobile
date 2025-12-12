#!/usr/bin/env bash

set -euo pipefail

REQUIRED_RUST_VERSION="1.90.0"
ANDROID_TARGETS=(aarch64-linux-android armv7-linux-androideabi x86_64-linux-android i686-linux-android)
IOS_TARGETS=(aarch64-apple-ios aarch64-apple-ios-sim x86_64-apple-ios)

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

command_exists() {
  command -v "$1" >/dev/null 2>&1
}

ensure_command() {
  local cmd="$1"
  local install_hint="$2"
  if ! command_exists "${cmd}"; then
    echo "error: ${cmd} is required but was not found. ${install_hint}" >&2
    exit 1
  fi
}

ensure_rust_version() {
  ensure_command "rustc" "Install Rust via rustup: https://rustup.rs/"
  ensure_command "rustup" "Install Rust via rustup: https://rustup.rs/"
  ensure_command "cargo" "Install Rust via rustup: https://rustup.rs/"

  local rust_version
  rust_version="$(rustc --version | awk '{print $2}')"
  if [[ "${rust_version}" != "${REQUIRED_RUST_VERSION}" ]]; then
    echo "error: Rust ${REQUIRED_RUST_VERSION} is required (found ${rust_version})." >&2
    echo "       Run 'rustup default ${REQUIRED_RUST_VERSION}' or 'rustup override set ${REQUIRED_RUST_VERSION}' in this repo." >&2
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
    # Override generated file with old architecture support
    echo "==> Applying old architecture overrides..."
    cp "${PACKAGE_DIR}/overrides/MattermostE2ee.mm" "${PACKAGE_DIR}/ios/MattermostE2ee.mm"
    # Patch index.tsx to use wrapper
    node "${SCRIPT_DIR}/patch-generated.js"
  )
}

ensure_rust_version
build_ios
build_android
