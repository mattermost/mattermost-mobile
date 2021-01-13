#!/usr/bin/env bash

if [[ "$OSTYPE" == "darwin"* ]]; then
  if !gem list bundler -i --version 2.1.4 > /dev/null 2>&1; then
    gem install bundler --version 2.1.4
  fi
  echo "Installing Gems"
  npm run ios-gems
  echo "Getting Cocoapods dependencies"
  npm run pod-install
fi

ASSETS=$(node scripts/generate-assets.js)
if [ -z "$ASSETS" ]; then
    echo "Error Generating app assets"
    exit 1
else
    echo "Generating app assets"
fi
