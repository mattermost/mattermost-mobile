#!/usr/bin/env bash

# Setup Rust toolchain and dependencies for E2EE module
# Only installs what's missing

set -euo pipefail

ANDROID_TARGETS=(aarch64-linux-android armv7-linux-androideabi x86_64-linux-android i686-linux-android)
IOS_TARGETS=(aarch64-apple-ios aarch64-apple-ios-sim)

check_rustup() {
    command -v rustup >/dev/null 2>&1
}

check_cargo() {
    command -v cargo >/dev/null 2>&1
}

check_cargo_ndk() {
    command -v cargo-ndk >/dev/null 2>&1
}

get_missing_targets() {
    local required_targets=("$@")
    local missing=()
    local installed

    installed="$(rustup target list --installed)"

    for target in "${required_targets[@]}"; do
        if ! grep -q "^${target}$" <<< "${installed}"; then
            missing+=("${target}")
        fi
    done

    if [[ ${#missing[@]} -gt 0 ]]; then
        echo "${missing[@]}"
    fi
}

main() {
    local needs_setup=false

    # Check for rustup/cargo
    if ! check_rustup || ! check_cargo; then
        needs_setup=true
        echo "==> Rust not found. Installing via rustup..."
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        source "$HOME/.cargo/env"
    fi

    # Check for missing targets
    local all_targets=("${IOS_TARGETS[@]}" "${ANDROID_TARGETS[@]}")
    local missing_targets
    missing_targets=$(get_missing_targets "${all_targets[@]}")

    if [[ -n "$missing_targets" ]]; then
        needs_setup=true
        echo "==> Installing missing Rust targets: $missing_targets"
        # shellcheck disable=SC2086
        rustup target add $missing_targets
    fi

    # Check for cargo-ndk
    if ! check_cargo_ndk; then
        needs_setup=true
        echo "==> Installing cargo-ndk..."
        cargo install cargo-ndk
    fi

    if [[ "$needs_setup" == "false" ]]; then
        echo "==> Rust toolchain already configured"
    else
        echo "==> Rust setup complete"
    fi
}

main
