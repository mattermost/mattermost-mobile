#!/usr/bin/env bash

if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "Installing Gems"
  npm run ios-gems &> /dev/null
  echo "Getting Cocoapods dependencies"
  npm run pod-install &> /dev/null
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