#!/bin/bash

# android version

rm android-test-files.zip
rm run-tests.sh*
rm -rf android
rm -rf detox
cp run-tests-android.sh run-tests.sh
mkdir -p android/app/build/outputs
cp -R ../android/app/build/outputs/apk android/app/build/outputs
cp -R ../detox .
rm -rf detox/android_emulator
rm -rf detox/artifacts
rm -rf detox/detox_*
rm -rf detox/node_modules
sed -i.bu "s/mattermost-mobile-e2e/mattermost-bitbar-mobile-e2e/" detox/package.json
sed -i.bu "s/BITBAR=false/BITBAR=true/" run-tests.sh
zip -r android-test-files run-tests.sh android/app/build/outputs/apk detox