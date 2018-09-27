#!/bin/bash
# Copyright (c) 2015-present, Facebook, Inc.
# All rights reserved.
#
# This source code is licensed under the BSD-style license found in the
# LICENSE file in the root directory of this source tree. An additional grant
# of patent rights can be found in the PATENTS file in the same directory.

# Bundle React Native app's code and image assets.
# This script is supposed to be invoked as part of Xcode build process
# and relies on environment variables (including PWD) set by Xcode

# This scripts allows the app and app extension bundles to be shared or separated.
# Separating bundles allows for a minimal footprint for both app and app extension.
# The original script provided by RN does not bundle app extensions.

# This way we can set the BundleEntryFilename to index.js for the main app and
# the BundleEntryFilename to share.ios.js for the extension

DEST=$CONFIGURATION_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH
MAIN_BUNDLE="main.jsbundle"
BUNDLE_FILE="$DEST/$MAIN_BUNDLE"
TMP_PATH="/tmp"
PLISTBUDDY='/usr/libexec/PlistBuddy'
PLIST=$TARGET_BUILD_DIR/$INFOPLIST_PATH

[ -z "$SKIP_BUNDLING" ] && SKIP_BUNDLING=$($PLISTBUDDY -c "Print :BundleSkipped" "${PLIST}")
[ -z "$CP_BUNDLING" ] && CP_BUNDLING=$($PLISTBUDDY -c "Print :BundleCopied" "${PLIST}")

if [[ "$SKIP_BUNDLING" && $SKIP_BUNDLING == "true" ]]; then
  echo "SKIP_BUNDLING enabled; skipping."
  if [[ "$CP_BUNDLING" && $CP_BUNDLING == "true" ]]; then
    TMP_BUNDLE="$TMP_PATH/$MAIN_BUNDLE"
    echo "CP_BUNDLING enabled; copying $TMP_BUNDLE to $DEST/"
    if [ -f "$TMP_BUNDLE" ]; then
      cp "$TMP_PATH/$MAIN_BUNDLE"* "$DEST/"
    else
      echo "CP_BUNDLING $TMP_BUNDLE does not exist!"
    fi
  fi
  exit 0;
fi

[ -z "$IS_DEV" ] && IS_DEV=$($PLISTBUDDY -c "Print :BundleDev" "${PLIST}")
[ -z "$FORCE_BUNDLING" ] && FORCE_BUNDLING=$($PLISTBUDDY -c "Print :BundleForced" "${PLIST}")

if [ -z "$IS_DEV" ]; then
  case "$CONFIGURATION" in
    *Debug*)
      if [[ "$PLATFORM_NAME" == *simulator ]]; then
        if [[ "$FORCE_BUNDLING" && $FORCE_BUNDLING == "true" ]]; then
          echo "FORCE_BUNDLING enabled; continuing to bundle."
        else
          echo "Skipping bundling in Debug for the Simulator (since the packager bundles for you). Use the FORCE_BUNDLING env flag or BundleForced plist key to change this behavior."
          exit 0;
        fi
      else
        echo "Bundling for physical device. Use the SKIP_BUNDLING flag to change this behavior."
      fi

      DEV=true
      ;;
    "")
      echo "$0 must be invoked by Xcode"
      exit 1
      ;;
    *)
      DEV=false
      ;;
  esac
else
  if [[ "$PLATFORM_NAME" == *simulator ]]; then
    if [[ "$FORCE_BUNDLING" && $FORCE_BUNDLING == "true" ]]; then
      echo "FORCE_BUNDLING enabled; continuing to bundle."
    else
      echo "Skipping bundling in Debug for the Simulator (since the packager bundles for you). Use the FORCE_BUNDLING flag to change this behavior."
      exit 0;
    fi
  else
    echo "Bundling for physical device. Use the SKIP_BUNDLING flag to change this behavior."
  fi
  DEV=$IS_DEV
fi

# Path to react-native folder inside node_modules
# REACT_NATIVE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
# Path to react-native folder inside src/native/utils/bin
REACT_NATIVE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../node_modules/react-native" && pwd)"
echo "REACT_NATIVE_DIR: $REACT_NATIVE_DIR"

# Xcode project file for React Native apps is located in ios/ subfolder
cd "${REACT_NATIVE_DIR}"/../..

# Define NVM_DIR and source the nvm.sh setup script
[ -z "$NVM_DIR" ] && export NVM_DIR="$HOME/.nvm"

# Define default ENTRY_FILENAME
[ -z "$ENTRY_FILENAME" ] && ENTRY_FILENAME=$($PLISTBUDDY -c "Print :BundleEntryFilename" "${PLIST}")
[ -z "$ENTRY_FILENAME" ] && ENTRY_FILENAME="index.js"
echo "ENTRY_FILENAME: $ENTRY_FILENAME"

js_file_type=.js
ios_file_type=.ios.js
ios_file_name="${ENTRY_FILENAME/$js_file_type/$ios_file_type}"

# Define entry file
if [[ -s $ios_file_name ]]; then
  ENTRY_FILE=${1:-$ios_file_name}
else
  ENTRY_FILE=${1:-$ENTRY_FILENAME}
fi

if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  . "$HOME/.nvm/nvm.sh"
elif [[ -x "$(command -v brew)" && -s "$(brew --prefix nvm)/nvm.sh" ]]; then
  . "$(brew --prefix nvm)/nvm.sh"
fi

# Set up the nodenv node version manager if present
if [[ -x "$HOME/.nodenv/bin/nodenv" ]]; then
  eval "$("$HOME/.nodenv/bin/nodenv" init -)"
fi

[ -z "$NODE_BINARY" ] && export NODE_BINARY="node"

[ -z "$CLI_PATH" ] && export CLI_PATH="$REACT_NATIVE_DIR/local-cli/cli.js"

nodejs_not_found()
{
  echo "error: Can't find '$NODE_BINARY' binary to build React Native bundle" >&2
  echo "If you have non-standard nodejs installation, select your project in Xcode," >&2
  echo "find 'Build Phases' - 'Bundle React Native code and images'" >&2
  echo "and change NODE_BINARY to absolute path to your node executable" >&2
  echo "(you can find it by invoking 'which node' in the terminal)" >&2
  exit 2
}

type $NODE_BINARY >/dev/null 2>&1 || nodejs_not_found

# Print commands before executing them (useful for troubleshooting)
set -x
# DEST=$CONFIGURATION_BUILD_DIR/$UNLOCALIZED_RESOURCES_FOLDER_PATH

if [[ "$CONFIGURATION" = "Debug" && ! "$PLATFORM_NAME" == *simulator ]]; then
  BUNDLE_SERVER=$($PLISTBUDDY -c "Print :BundleServer" "${PLIST}")
  echo "BUNDLE_SERVER: ${BUNDLE_SERVER}"
  if [ -z "$BUNDLE_SERVER" ]; then
    IP=$(ipconfig getifaddr en0)
    if [ -z "$IP" ]; then
      IP=$(ifconfig | grep 'inet ' | grep -v ' 127.' | cut -d\   -f2  | awk 'NR==1{print $1}')
    fi
  else
    IP=$BUNDLE_SERVER
  fi

  if [ -z ${DISABLE_XIP+x} ]; then
    IP="$IP.xip.io"
  fi

  $PLISTBUDDY -c "Add NSAppTransportSecurity:NSExceptionDomains:localhost:NSTemporaryExceptionAllowsInsecureHTTPLoads bool true" "$PLIST"
  $PLISTBUDDY -c "Add NSAppTransportSecurity:NSExceptionDomains:$IP:NSTemporaryExceptionAllowsInsecureHTTPLoads bool true" "$PLIST"
  echo "$IP" > "$DEST/ip.txt"
fi

$NODE_BINARY "$CLI_PATH" bundle \
  --entry-file "$ENTRY_FILE" \
  --platform ios \
  --dev $DEV \
  --reset-cache \
  --bundle-output "$BUNDLE_FILE" \
  --assets-dest "$DEST"

if [[ $DEV != true && ! -f "$BUNDLE_FILE" ]]; then
  echo "error: File $BUNDLE_FILE does not exist. This must be a bug with" >&2
  echo "React Native, please report it here: https://github.com/facebook/react-native/issues"
  exit 2
else
  cp "$BUNDLE_FILE"* $TMP_PATH
  if [[ $DEV == "true" ]]; then
    if nc -w 5 -z localhost 8081 ; then
      if ! curl -s "http://localhost:8081/status" | grep -q "packager-status:running"; then
        echo "Port 8081 already in use, packager is either not running or not running correctly"
        exit 0
      fi
    else
      open "$REACT_NATIVE_DIR/scripts/launchPackager.command" || echo "Can't start packager automatically"
    fi
  fi
fi
