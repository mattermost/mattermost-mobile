#!/usr/bin/env bash

echo Cleaning started

# Reset watchman watches for this project only
if command -v watchman &> /dev/null; then
  echo "Resetting watchman watches for this project"
  watchman watch-del . 2>/dev/null || echo "No watch found for this directory"
fi

rm -rf .tsbuildinfo.precommit
rm -rf ios/Pods
rm -rf node_modules
rm -rf dist
rm -rf ios/build
rm -rf android/app/build
rm assets/fonts/compass-icons.ttf
rm android/app/src/main/assets/fonts/compass-icons.ttf

# E2EE module cleanup
echo "Cleaning E2EE module..."
rm -rf libraries/@mattermost/e2ee/node_modules
rm -rf libraries/@mattermost/e2ee/rust/target
rm -rf libraries/@mattermost/e2ee/MattermostE2eeFramework.xcframework
rm -rf libraries/@mattermost/e2ee/android/src/main/jniLibs
rm -rf libraries/@mattermost/e2ee/src/generated
rm -rf libraries/@mattermost/e2ee/cpp/generated

echo Cleanup finished