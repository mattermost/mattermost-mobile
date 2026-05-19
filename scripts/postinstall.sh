#!/usr/bin/env bash

function installPods() {
    echo "Getting Cocoapods dependencies"
    npm run pod-install
}

function installPodsM1() {
    echo "Getting Cocoapods dependencies"
    npm run pod-install-m1
}

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

GENERATE_GLYPH_MAP_SCRIPT="scripts/generate-compass-glyph-map.mjs"

if [ ! -f "$GENERATE_GLYPH_MAP_SCRIPT" ]; then
    echo "Compass glyph map script not found at: $GENERATE_GLYPH_MAP_SCRIPT"
    exit 1
fi

echo "Generating Compass Icons glyph map"
node "$GENERATE_GLYPH_MAP_SCRIPT"

SOUNDS="assets/sounds"
if [ -z "$SOUNDS" ]; then
    echo "Sound assets not found"
    exit 1
else
    echo "Copying sound assets for bundling"
    mkdir -p "android/app/src/main/res/raw/"
    cp $SOUNDS/* "android/app/src/main/res/raw/"
fi
