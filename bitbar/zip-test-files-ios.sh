#!/bin/bash

# ios version

rm ios-test-files.zip
rm run-tests.sh*
rm -rf ios
rm -rf detox
cp run-tests-ios.sh run-tests.sh
mkdir -p ios/Build/Products/Release-iphonesimulator
cp -R ../ios/Build/Products/Release-iphonesimulator/Mattermost.app ios/Build/Products/Release-iphonesimulator
cp -R ../detox .
rm -rf detox/android_emulator
rm -rf detox/artifacts
rm -rf detox/detox_*
rm -rf detox/node_modules
sed -i.bu "s/mattermost-mobile-e2e/mattermost-bitbar-mobile-e2e/" detox/package.json
sed -i.bu "s/BITBAR=false/BITBAR=true/" run-tests.sh
zip -r ios-test-files run-tests.sh ios/Build/Products/Release-iphonesimulator/Mattermost.app detox