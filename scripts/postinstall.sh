#!/usr/bin/env bash

function ios() {
    echo "Getting Cocoapods dependencies"
    npm run pod-install &> /dev/null
}

function iosM1() {
    echo "Getting Cocoapods dependencies"
    npm run pod-install-m1 &> /dev/null
}

if [[ "$OSTYPE" == "darwin"* ]]; then
  if [[ $(uname -p) == 'arm' ]]; then
    iosM1
  else
    ios
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