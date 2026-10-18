#!/bin/bash
# Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
# See LICENSE.txt for license information.
#
# Reinstall the iOS app on a simulator for a clean state, and return only once it launches.
#
# Maestro's launchApp clearState:true reinstalls the app and launches it at once. On a loaded
# runner FrontBoard can lag the install, so the launch fails with "unknown to FrontBoard" and
# Maestro's retry does not cover that error. Flows run with MAESTRO_APP_RESET_BY_RUNNER=true
# skip clearState and rely on this reset instead.
#
# Usage: reset_ios_app.sh <simulator-udid> <bundle-id>
set -euo pipefail

if [[ $# -ne 2 ]]; then
    echo "usage: $0 <simulator-udid> <bundle-id>" >&2
    exit 2
fi
udid="$1"
bundle_id="$2"
LAUNCH_READY_TIMEOUT_SECS="${LAUNCH_READY_TIMEOUT_SECS:-180}"

app_path="$(xcrun simctl get_app_container "$udid" "$bundle_id" app)"
tmp_dir="$(mktemp -d)"
trap 'rm -rf "$tmp_dir"' EXIT
cp -R "$app_path" "$tmp_dir/"

xcrun simctl terminate "$udid" "$bundle_id" 2>/dev/null || true
xcrun simctl uninstall "$udid" "$bundle_id"
xcrun simctl install "$udid" "$tmp_dir/$(basename "$app_path")"

# Launching is the only check that FrontBoard knows the app; listapps reads the install registry.
deadline=$((SECONDS + LAUNCH_READY_TIMEOUT_SECS))
attempts=0
until xcrun simctl launch "$udid" "$bundle_id" >/dev/null 2>&1; do
    attempts=$((attempts + 1))
    if ((SECONDS >= deadline)); then
        echo "::error::$bundle_id was reinstalled but would not launch within ${LAUNCH_READY_TIMEOUT_SECS}s" >&2
        exit 1
    fi
    sleep 2
done
xcrun simctl terminate "$udid" "$bundle_id" 2>/dev/null || true
echo "==> Reinstalled $bundle_id; it launched after $attempts failed attempt(s)"
