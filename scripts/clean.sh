#!/usr/bin/env bash

echo Cleaning started

# Reset watchman watches for this project only
if command -v watchman &> /dev/null; then
  echo "Resetting watchman watches for this project"
  watchman watch-del . 2>/dev/null || echo "No watch found for this directory"
fi

rm -rf ios/Pods
rm -rf node_modules
rm -rf dist
rm -rf ios/build
rm -rf android/app/build
rm assets/fonts/compass-icons.ttf
rm android/app/src/main/assets/fonts/compass-icons.ttf

echo Cleanup finished