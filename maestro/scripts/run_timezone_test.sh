#!/bin/bash
# Wrapper: set device timezone, run clock_display.yml, then reset timezone.
# Usage: ./maestro/scripts/run_timezone_test.sh [--android ADB_SERIAL | --ios SIMULATOR_UDID] [TIMEZONE]
# Examples:
#   iOS:     ./maestro/scripts/run_timezone_test.sh --ios 6F3708EC-xxxx America/New_York
#   Android: ./maestro/scripts/run_timezone_test.sh --android emulator-5554 America/New_York
#   Default: uses booted iOS simulator
#
# iOS: 'xcrun simctl timezone' was removed in Xcode 26; 'launchctl setenv TZ' sets it in launchd
#       so the restarted app (stopApp: true) picks up the new timezone.
# Android: 'adb root' + 'adb shell setprop persist.sys.timezone' works on google_apis emulators.

set -e

PLATFORM="ios"
DEVICE="booted"
TIMEZONE="America/New_York"

while [[ $# -gt 0 ]]; do
    case "$1" in
        --ios)     PLATFORM="ios";     DEVICE="$2"; shift 2 ;;
        --android) PLATFORM="android"; DEVICE="$2"; shift 2 ;;
        *)         TIMEZONE="$1";      shift ;;
    esac
done

set_timezone_ios() {
    local udid="$1" tz="$2"
    xcrun simctl spawn "$udid" launchctl setenv TZ "$tz"
    echo "[timezone_test] iOS simulator timezone set to $tz"
}

reset_timezone_ios() {
    local udid="$1"
    xcrun simctl spawn "$udid" launchctl unsetenv TZ 2>/dev/null || true
    echo "[timezone_test] iOS simulator timezone reset"
}

set_timezone_android() {
    local serial="$1" tz="$2"
    adb -s "$serial" root
    adb -s "$serial" shell setprop persist.sys.timezone "$tz"
    echo "[timezone_test] Android emulator timezone set to $tz"
}

reset_timezone_android() {
    local serial="$1"
    # Restore to UTC as a neutral default; CI emulators don't have a meaningful "original" timezone
    adb -s "$serial" shell setprop persist.sys.timezone "UTC" 2>/dev/null || true
    echo "[timezone_test] Android emulator timezone reset to UTC"
}

echo "[timezone_test] Setting $PLATFORM timezone to $TIMEZONE..."
if [ "$PLATFORM" = "android" ]; then
    set_timezone_android "$DEVICE" "$TIMEZONE"
    MAESTRO_DEVICE_FLAG="--device $DEVICE"
    MAESTRO_PLATFORM_FLAG="--platform android"
else
    set_timezone_ios "$DEVICE" "$TIMEZONE"
    MAESTRO_DEVICE_FLAG=""
    MAESTRO_PLATFORM_FLAG=""
    if [ "$DEVICE" != "booted" ]; then
        MAESTRO_DEVICE_FLAG="--device $DEVICE"
    fi
fi

echo "[timezone_test] Running clock_display flow..."

# shellcheck disable=SC2086
~/.maestro/bin/maestro test \
  $MAESTRO_DEVICE_FLAG \
  $MAESTRO_PLATFORM_FLAG \
  --env SITE_1_URL="${SITE_1_URL:-http://localhost:8065}" \
  --env TEST_USER_EMAIL="${TEST_USER_EMAIL}" \
  --env TEST_USER_PASSWORD="${TEST_USER_PASSWORD}" \
  --env MAESTRO_APP_ID="${MAESTRO_APP_ID:-com.mattermost.rnbeta}" \
  --env SIMULATOR_TIMEZONE="$TIMEZONE" \
  "$(dirname "$0")/../flows/timezone/clock_display.yml"

EXIT_CODE=$?

echo "[timezone_test] Resetting $PLATFORM timezone..."
if [ "$PLATFORM" = "android" ]; then
    reset_timezone_android "$DEVICE"
else
    reset_timezone_ios "$DEVICE"
fi

exit $EXIT_CODE
