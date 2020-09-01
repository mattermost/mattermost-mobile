#!/bin/sh

if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "Installing gems"
  bundle install &> /dev/null
  echo "Getting Cocoapods dependencies"
  cd ios && bundle exec pod install && cd .. &> /dev/null
fi

ASSETS=$(node scripts/generate-assets.js)
if [ -z "$ASSETS" ]; then
    echo "Error Generating app assets"
    exit 1
else
    echo "Generating app assets"
fi