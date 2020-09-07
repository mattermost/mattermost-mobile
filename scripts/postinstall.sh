#!/bin/sh

if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "Installing Gems"
  npm run ios-gems &> /dev/null
  echo "Getting Cocoapods dependencies"
  npm run pod-install &> /dev/null
fi

ASSETS=$(node scripts/generate-assets.js)
if [ -z "$ASSETS" ]; then
    echo "Error Generating app assets"
    exit 1
else
    echo "Generating app assets"
fi