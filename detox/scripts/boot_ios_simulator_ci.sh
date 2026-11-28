#!/bin/bash
# Boot the iOS simulator, install the app, and leave it running for a later
# Detox step. Mirrors the pre-boot step in e2e-ios-template.yml. v2 cannot
# boot inside dispatch-run, which only executes npx detox test.

set -eu

: "${DEVICE_NAME:?DEVICE_NAME is required}"
: "${DEVICE_OS_VERSION:?DEVICE_OS_VERSION is required}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
cd "$REPO_ROOT"

echo "Looking for simulator: ${DEVICE_NAME} with ${DEVICE_OS_VERSION}"

SIMULATOR_ID=$(xcrun simctl list devices | grep "${DEVICE_NAME}" | grep "${DEVICE_OS_VERSION}" | head -1 | grep -oE '([0-9A-F-]{36})' || true)

if [ -z "$SIMULATOR_ID" ]; then
  echo "Simulator not found. Creating simulator ${DEVICE_NAME} with ${DEVICE_OS_VERSION}"

  DEVICE_TYPE=$(xcrun simctl list devicetypes | grep "${DEVICE_NAME} (" | head -1 | awk -F'[()]' '{print $(NF-1)}')
  if [ -z "$DEVICE_TYPE" ]; then
    echo "Error: Could not find device type for ${DEVICE_NAME}"
    exit 1
  fi
  echo "Found device type: $DEVICE_TYPE"

  RUNTIME=$(xcrun simctl list runtimes | grep "${DEVICE_OS_VERSION}" | head -1 | sed 's/.* - \(.*\)/\1/')
  if [ -z "$RUNTIME" ]; then
    echo "Error: Could not find runtime for ${DEVICE_OS_VERSION}"
    exit 1
  fi
  echo "Found runtime: $RUNTIME"

  SIMULATOR_ID=$(xcrun simctl create "CI-${DEVICE_NAME}" "$DEVICE_TYPE" "$RUNTIME")
  echo "Created simulator with ID: $SIMULATOR_ID"
else
  echo "Found existing simulator: $SIMULATOR_ID"
fi

echo "Initializing simulator directories (first boot)..."
xcrun simctl boot "$SIMULATOR_ID"
xcrun simctl bootstatus "$SIMULATOR_ID"

echo "Shutting down to apply password autofill restrictions..."
xcrun simctl shutdown "$SIMULATOR_ID"
for i in 1 2 3 4 5 6; do
  state=$(xcrun simctl list devices | grep "$SIMULATOR_ID" | sed -E 's/.*\(([^)]+)\)$/\1/')
  if [ "$state" = "Shutdown" ]; then break; fi
  sleep 0.5
done

echo "Disabling password autofill (simulator is shut down)"

SETTINGS_DIR="$HOME/Library/Developer/CoreSimulator/Devices/$SIMULATOR_ID/data/Containers/Shared/SystemGroup/systemgroup.com.apple.configurationprofiles/Library/ConfigurationProfiles"
mkdir -p "$SETTINGS_DIR"

node "$REPO_ROOT/detox/utils/disable_ios_autofill.js" --simulator-id "$SIMULATOR_ID"

echo "Booting simulator with password autofill disabled..."
xcrun simctl boot "$SIMULATOR_ID"
xcrun simctl bootstatus "$SIMULATOR_ID"

echo "Seeding Passwords.app defaults to suppress credential-save prompt..."
xcrun simctl spawn "${SIMULATOR_ID}" defaults write com.apple.Passwords AutoFill -bool NO 2>/dev/null || true
xcrun simctl spawn "${SIMULATOR_ID}" defaults write com.apple.Passwords AutoSave -bool NO 2>/dev/null || true
xcrun simctl spawn "${SIMULATOR_ID}" defaults write com.apple.Passwords credentialSaveNotificationsEnabled -bool NO 2>/dev/null || true
xcrun simctl spawn "${SIMULATOR_ID}" defaults write com.apple.springboard AutoFillPasswords -bool NO 2>/dev/null || true
echo "Passwords defaults seeded (keys are best-effort; dialog is also handled programmatically)"

echo "Password-related launchd services (diagnostic only):"
xcrun simctl spawn "${SIMULATOR_ID}" launchctl list 2>/dev/null | grep -i "password\|credential\|SharedWebCred" || echo "  (none found)"

APP_PATH=$(find "$REPO_ROOT/mobile-artifacts" -maxdepth 1 -name '*.app' -print -quit 2>/dev/null || true)
if [ -z "$APP_PATH" ]; then
  echo "❌ Error: No .app bundle found in mobile-artifacts/"
  ls -la "$REPO_ROOT/mobile-artifacts"
  exit 1
fi
echo "Installing $APP_PATH in simulator $SIMULATOR_ID..."
xcrun simctl install "$SIMULATOR_ID" "$APP_PATH"
echo "✅ App installed: $APP_PATH"

echo "Pre-granting app permissions..."
xcrun simctl privacy "$SIMULATOR_ID" grant notifications com.mattermost.rnbeta || true
echo "✅ Permissions pre-granted"

echo "Pre-warming app to create data container..."

prewarm_app() {
  local attempt=$1
  local sleep_time=$2
  echo "Pre-warm attempt $attempt (waiting ${sleep_time}s)..."
  xcrun simctl launch "$SIMULATOR_ID" com.mattermost.rnbeta 2>/dev/null &
  local LAUNCH_PID=$!
  sleep "$sleep_time"
  kill "$LAUNCH_PID" 2>/dev/null || true
  wait "$LAUNCH_PID" 2>/dev/null || true

  local APP_PID
  APP_PID=$(xcrun simctl spawn "$SIMULATOR_ID" launchctl list 2>/dev/null | \
    grep "com.mattermost.rnbeta" | awk '{print $1}' | grep -E '^[0-9]+$' || true)
  if [ -n "$APP_PID" ]; then
    xcrun simctl spawn "$SIMULATOR_ID" kill -9 "$APP_PID" 2>/dev/null || true
    for i in 1 2 3 4; do
      if ! xcrun simctl spawn "$SIMULATOR_ID" launchctl list 2>/dev/null | grep -q "com.mattermost.rnbeta"; then
        break
      fi
      sleep 0.25
    done
    echo "  Killed app via launchd (PID $APP_PID)"
  fi

  if xcrun simctl get_app_container "$SIMULATOR_ID" com.mattermost.rnbeta data 2>/dev/null; then
    echo "  ✅ Data container verified"
    return 0
  fi
  echo "  ⚠️ Data container not found"
  return 1
}

if ! prewarm_app 1 15; then
  echo "Retrying pre-warm with longer timeout..."
  if ! prewarm_app 2 25; then
    echo "⚠️ Pre-warm failed after 2 attempts — tests may fail at launch"
  fi
fi
echo "✅ App pre-warmed"

open -a Simulator --args -CurrentDeviceUDID "$SIMULATOR_ID"

for i in 1 2 3 4 5 6 7 8 9 10; do
  if xcrun simctl bootstatus "$SIMULATOR_ID" -b 2>/dev/null && [ "$i" -ge 8 ]; then
    break
  fi
  sleep 1
done

echo "Verifying simulator health before running tests..."
if ! xcrun simctl bootstatus "$SIMULATOR_ID" -b 2>/dev/null; then
  echo "⚠️ Simulator not responsive, attempting recovery..."
  xcrun simctl shutdown "$SIMULATOR_ID" || true
  sleep 3
  xcrun simctl boot "$SIMULATOR_ID"
  xcrun simctl bootstatus "$SIMULATOR_ID"
  open -a Simulator --args -CurrentDeviceUDID "$SIMULATOR_ID"
  sleep 5
fi

if ! xcrun simctl get_app_container "$SIMULATOR_ID" com.mattermost.rnbeta 2>/dev/null; then
  echo "⚠️ App not found in simulator — reinstalling..."
  if [ -n "$APP_PATH" ]; then
    xcrun simctl install "$SIMULATOR_ID" "$APP_PATH"
    echo "✅ App reinstalled"
  else
    echo "❌ No .app bundle found for reinstall"
    exit 1
  fi
fi

sudo mdutil -a -i off 2>/dev/null || true
echo "✅ Simulator is healthy and ready"

if [ -n "${GITHUB_ENV:-}" ]; then
  echo "SIMULATOR_ID=$SIMULATOR_ID" >> "$GITHUB_ENV"
fi
