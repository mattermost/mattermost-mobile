#!/usr/bin/env bash

echo Cleaning started

# Reset watchman watches
if command -v watchman &> /dev/null; then
  echo "Resetting watchman watches"
  watchman watch-del-all
fi

rm -rf ios/Pods
rm -rf node_modules
rm -rf dist
rm -rf ios/build
rm -rf android/app/build
rm assets/fonts/compass-icons.ttf
rm android/app/src/main/assets/fonts/compass-icons.ttf

echo Cleanup finished