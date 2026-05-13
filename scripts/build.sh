#!/usr/bin/env bash

function execute() {
    cd fastlane && NODE_ENV=production bundle exec fastlane $1 $2
}

function cleanupAndroid16kbPagesizePatch() {
  # Only cleanup if we ran setup (SKIP_SETUP not set)
  if [[ -z "$SKIP_SETUP" ]]; then
    echo "Reverting 16KB page size patch changes..."
    # Get the git root directory to ensure we're in the right place
    local git_root=$(git rev-parse --show-toplevel)
    cd "$git_root" || return
    git checkout -- package.json package-lock.json app.json app/components/expo_image/index.tsx android/buildscript-gradle.lockfile patches/
    git clean -fd patches/
    echo "✓ Patch changes reverted"
  fi
}

function apk() {
  case $1 in
    unsigned)
      echo "Building Android unsigned app"
      setup android
      execute android unsigned
      cleanupAndroid16kbPagesizePatch
    ;;
    *)
      echo "Building Android app"
      setup android
      execute android build
      cleanupAndroid16kbPagesizePatch
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
        
        # Apply 16KB page size patch for Android builds (includes npx patch-package)
        if [[ "$1" == "android"* ]]; then
          echo "Applying 16KB page size compatibility patch for Android"
          npm run apply-16kb-pagesize-patch || exit 1
        else
          # For non-Android builds, just apply regular patches
          npx patch-package || exit 1
        fi
        
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

        echo "Installing Fastlane"
        if !gem list bundler -i --version 2.5.11 > /dev/null 2>&1; then
          gem install bundler --version 2.5.11
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
