#!/usr/bin/env bash

function execute() {
    cd fastlane && NODE_ENV=production bundle exec fastlane $1 $2
}

function apk() {
  case $1 in
    unsigned)
      echo "Building Android unsigned app"
      setup android
      execute android unsigned
    ;;
    *)
      echo "Building Android app"
      setup android
      execute android build
  esac
}

function ipa() {
  case $1 in
    unsigned)
      echo "Building iOS unsigned app"
      setup ios
      execute ios unsigned
    ;;
    simulator)
      echo "Building unsigned x86_64 iOS app for iPhone simulator"
      setup ios
      execute ios simulator
    ;;
    *)
      echo "Building iOS app"
      setup ios
      execute ios build
  esac
}

function installGemsAndPods() {
    echo "Installing Gems"
    npm run ios-gems
    echo "Getting Cocoapods dependencies"
    npm run pod-install
}

function installGemsAndPodsM1() {
    echo "Installing Gems"
    npm run ios-gems-m1
    echo "Getting Cocoapods dependencies"
    npm run pod-install-m1
}

function setup() {
    if [[ -z "$SKIP_SETUP" ]]; then
        npm run clean || exit 1
        npm install --ignore-scripts || exit 1
        npx patch-package || exit 1
        node node_modules/\@sentry/cli/scripts/install.js || exit 1

        if [[ "$1" == "ios"* ]]; then
          if [[ $(uname -p) == 'arm' ]]; then
            installGemsAndPodsM1 || exit 1
          else
            installGemsAndPods || exit 1
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

        echo "Installing Fastane"
        if !gem list bundler -i --version 2.3.26 > /dev/null 2>&1; then
          gem install bundler --versio 2.3.26
        fi
        cd fastlane && bundle install && cd .. || exit 1
    fi

    if [ "$1" = "android" ]; then
      ./node_modules/.bin/jetify
    fi
}

case $1 in
  apk)
    apk $2
  ;;
  ipa)
    if [[ "$OSTYPE" == "darwin"* ]]; then
      ipa $2
    else
      echo "You need a MacOS to build the iOS mobile app"
      exit 1
    fi
  ;;
  *)
    echo "Build the mobile app for Android or iOS
    Usage: build.sh <type> [options]
    
    Type:
      apk   Builds Android APK(s)
      ipa   Builds iOS IPA
      
    Options:
      apk: unsigned
      ipa: unsigned or simulator"
  ;;
esac
