#!/usr/bin/env bash

E2EE_SISTER_DIR="../mattermost-mobile-e2ee"
E2EE_DEV_MARKER=".e2ee-dev-mode"

function restoreE2EEDevSymlink() {
    # If dev mode marker exists, restore the symlink (npm install removes it)
    if [[ -f "$E2EE_DEV_MARKER" ]] && [[ -d "$E2EE_SISTER_DIR" ]]; then
        echo "Restoring E2EE dev symlink..."
        rm -rf node_modules/@mattermost/e2ee
        mkdir -p node_modules/@mattermost
        ln -s "$(cd "$E2EE_SISTER_DIR" && pwd)" node_modules/@mattermost/e2ee
    fi
}

function installPods() {
    echo "Getting Cocoapods dependencies"
    npm run pod-install
}

function installPodsM1() {
    echo "Getting Cocoapods dependencies"
    npm run pod-install-m1
}

function buildE2EE() {
    # Check if E2EE module is present (OSS builds won't have it)
    if [[ ! -f "libraries/@mattermost/e2ee/package.json" ]]; then
        echo "E2EE module not present, skipping build..."
        return 0
    fi

    # Check if E2EE artifacts already exist
    local IOS_FRAMEWORK="libraries/@mattermost/e2ee/MattermostE2eeFramework.xcframework"
    local ANDROID_LIBS="libraries/@mattermost/e2ee/android/src/main/jniLibs"

    if [[ -d "$IOS_FRAMEWORK" ]] && [[ -d "$ANDROID_LIBS" ]]; then
        echo "E2EE artifacts already exist, skipping build..."
        return 0
    fi

    echo "Building Mattermost E2EE module"
    if ! npm run e2ee:build; then
        echo "Failed to build Mattermost E2EE module. See errors above for missing dependencies." >&2
        exit 1
    fi
}

# Restore E2EE dev symlink if in dev mode (npm install removes it)
restoreE2EEDevSymlink

# Setup Rust toolchain if needed (only installs missing deps, and only if e2ee or E2EE_RELEASE is set)
if [[ -f "libraries/@mattermost/e2ee/package.json" ]] || [[ "$E2EE_RELEASE" = "1" ]]; then
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    "${SCRIPT_DIR}/setup-rust.sh"
fi

buildE2EE

if [[ "$OSTYPE" == "darwin"* ]]; then
  if [ "$INTUNE_ENABLED" = "1" ]; then
    echo "🔐 INTUNE_ENABLED detected"
    npm run intune:init
  elif [[ $(uname -p) == 'arm' ]]; then
    installPodsM1
  else
    installPods
  fi
fi

COMPASS_ICONS="node_modules/@mattermost/compass-icons/font/compass-icons.ttf"
if [ -z "$COMPASS_ICONS" ]; then
    echo "Compass Icons font not found"
    exit 1
else
    echo "Configuring Compass Icons font"
    cp "$COMPASS_ICONS" "assets/fonts/"
    cp "$COMPASS_ICONS" "android/app/src/main/assets/fonts"
fi

ASSETS=$(node scripts/generate-assets.js)
if [ -z "$ASSETS" ]; then
    echo "Error Generating app assets"
    exit 1
else
    echo "Generating app assets"
fi

SOUNDS="assets/sounds"
if [ -z "$SOUNDS" ]; then
    echo "Sound assets not found"
    exit 1
else
    echo "Copying sound assets for bundling"
    mkdir -p "android/app/src/main/res/raw/"
    cp $SOUNDS/* "android/app/src/main/res/raw/"
fi
