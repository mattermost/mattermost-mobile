#!/usr/bin/env bash
# Run Maestro flows in isolated batches for CI.
#
# One batch failure (e.g. iOS SFSafariViewController wedging the driver) must not
# prevent unrelated flows from running. Each batch is a separate `maestro test`
# invocation; JUnit XML files are merged afterward.
#
# Usage (from repo root):
#   source maestro/.maestro-test-env.sh
#   maestro/scripts/run_ci_batches.sh --platform ios --device "$SIMULATOR_ID"
#   maestro/scripts/run_ci_batches.sh --platform android
#
# Environment:
#   MAESTRO_BIN          — default ~/.maestro/bin/maestro
#   MAESTRO_APP_ID       — default com.mattermost.rnbeta
#   FLOW_PATH            — optional; space-separated flow dirs (default: maestro/flows/* categories)
#   SITE_1_URL, TEST_*   — passed through to maestro --env
#   MAESTRO_DRIVER_STARTUP_TIMEOUT — default 180000 (Maestro CI recommendation)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

PLATFORM=""
DEVICE_ARGS=()
OUTPUT_DIR="build"
ARTIFACTS_DIR="build/maestro-artifacts"
MERGED_XML="$OUTPUT_DIR/maestro-report.xml"
MAESTRO_BIN="${MAESTRO_BIN:-$HOME/.maestro/bin/maestro}"
MAESTRO_APP_ID="${MAESTRO_APP_ID:-com.mattermost.rnbeta}"
export MAESTRO_DRIVER_STARTUP_TIMEOUT="${MAESTRO_DRIVER_STARTUP_TIMEOUT:-180000}"

usage() {
  echo "Usage: $0 --platform ios|android [--device UDID]"
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --platform) PLATFORM="$2"; shift 2 ;;
    --device) DEVICE_ARGS=(--device "$2"); shift 2 ;;
    -h|--help) usage ;;
    *) echo "Unknown arg: $1"; usage ;;
  esac
done

[[ -n "$PLATFORM" ]] || usage
[[ -x "$MAESTRO_BIN" ]] || { echo "Maestro not found at $MAESTRO_BIN"; exit 1; }
[[ -n "${SITE_1_URL:-}" ]] || { echo "SITE_1_URL is required for Maestro server connect" >&2; exit 1; }
[[ -n "${TEST_USER_EMAIL:-}" ]] || { echo "TEST_USER_EMAIL is required" >&2; exit 1; }
[[ -n "${TEST_USER_PASSWORD:-}" ]] || { echo "TEST_USER_PASSWORD is required" >&2; exit 1; }

mkdir -p "$OUTPUT_DIR" "$ARTIFACTS_DIR"

# shellcheck source=maestro/utils/timezone_region.sh
source "$REPO_ROOT/maestro/utils/timezone_region.sh"
SIMULATOR_TIMEZONE="${SIMULATOR_TIMEZONE:-America/New_York}"
EXPECTED_TIMEZONE_REGION="${EXPECTED_TIMEZONE_REGION:-$(timezone_region_from_iana "$SIMULATOR_TIMEZONE")}"

build_maestro_env_args() {
  maestro_env_args=(
    --env "SITE_1_URL=${SITE_1_URL:-}"
    --env "TEST_USER_EMAIL=${TEST_USER_EMAIL:-}"
    --env "TEST_USER_PASSWORD=${TEST_USER_PASSWORD:-}"
    --env "TEST_CHANNEL_NAME=${TEST_CHANNEL_NAME:-}"
    --env "TEST_CHANNEL_ID=${TEST_CHANNEL_ID:-}"
    --env "TEST_TEAM_NAME=${TEST_TEAM_NAME:-}"
    --env "ADMIN_TOKEN=${ADMIN_TOKEN:-}"
    --env "MAESTRO_APP_ID=${MAESTRO_APP_ID}"
    --env "MAESTRO_CI=true"
    --env "SIMULATOR_TIMEZONE=${SIMULATOR_TIMEZONE}"
    --env "EXPECTED_TIMEZONE_REGION=${EXPECTED_TIMEZONE_REGION}"
    --env "SYNC_TOKEN=${SYNC_TOKEN:-}"
    --env "SHARE_VERIFY_TEXT=${SHARE_VERIFY_TEXT:-${SYNC_TOKEN:-}}"
  )
}

build_maestro_env_args

platform_args=()
[[ "$PLATFORM" == "android" ]] && platform_args=(--platform android)

DEFAULT_FLOW_PATH="maestro/flows/timezone maestro/flows/channels maestro/flows/account maestro/flows/calls maestro/flows/share_extension"

flow_sort_key() {
  case "$1" in
    maestro/flows/timezone/*) echo "1:$1" ;;
    maestro/flows/channels/*) echo "2:$1" ;;
    maestro/flows/account/*) echo "3:$1" ;;
    maestro/flows/share_extension/*) echo "4:$1" ;;
    maestro/flows/calls/*) echo "5:$1" ;;
    *) echo "9:$1" ;;
  esac
}

should_skip_flow() {
  local flow=$1
  local base=${flow##*/}
  [[ "$flow" == *"/multi_device/"* ]] && return 0
  [[ "$base" == _* ]] && return 0
  [[ "$base" == *_picker.yml ]] && return 0
  [[ "$base" == "attach_logs_disabled_when_download_logs_off.yml" ]] && return 0
  [[ "$base" == "file_type_preview.yml" ]] && return 0
  [[ "$PLATFORM" == "android" && "$base" == "share_image_to_channel.yml" ]] && return 0
  return 1
}

BATCHES=()
flow_path="${FLOW_PATH:-}"
[[ -z "$flow_path" ]] && flow_path="$DEFAULT_FLOW_PATH"
read -r -a flow_entries <<< "$flow_path"
for entry in "${flow_entries[@]}"; do
  if [[ -d "$entry" ]]; then
    while IFS= read -r flow; do
      should_skip_flow "$flow" && continue
      BATCHES+=("$(flow_sort_key "$flow")")
    done < <(find "$entry" -maxdepth 1 -name '*.yml' | sort)
  elif [[ -f "$entry" ]]; then
    should_skip_flow "$entry" || BATCHES+=("$(flow_sort_key "$entry")")
  else
    echo "Flow path not found: $entry" >&2
    exit 1
  fi
done

# Sort by category order, then strip sort prefix.
if ((${#BATCHES[@]})); then
  sorted=()
  while IFS= read -r line; do
    sorted+=("${line#*:}")
  done < <(printf '%s\n' "${BATCHES[@]}" | sort)
  BATCHES=("${sorted[@]}")
fi

if ((${#BATCHES[@]} == 0)); then
  echo "No Maestro flows to run (FLOW_PATH=$flow_path)" >&2
  exit 1
fi

echo "==> Running ${#BATCHES[@]} Maestro flow(s)"

ensure_ios_simulator_healthy() {
  [[ "$PLATFORM" != "ios" ]] && return 0
  local udid="${DEVICE_ARGS[1]:-}"
  [[ -n "$udid" ]] || return 0

  if xcrun simctl listapps "$udid" &>/dev/null; then
    return 0
  fi

  echo "==> iOS simulator unhealthy — rebooting $udid"
  xcrun simctl shutdown "$udid" 2>/dev/null || true
  xcrun simctl boot "$udid" 2>/dev/null || true
  PREBOOT_SKIP_PREWARM="${PREBOOT_SKIP_PREWARM:-1}" \
    DEVICE_NAME="${E2E_IOS_DEVICE_NAME:-iPhone 17 Pro}" \
    DEVICE_OS_VERSION="${E2E_IOS_DEVICE_OS_VERSION:-iOS 26.2}" \
    bash detox/scripts/preboot_ios_simulator.sh
  for _ in $(seq 1 30); do
    xcrun simctl listapps "$udid" &>/dev/null && return 0
    sleep 2
  done
  echo "Warning: simulator may still be unhealthy after reboot"
}

ensure_android_app_launchable() {
  [[ "$PLATFORM" != "android" ]] && return 0
  command -v adb >/dev/null 2>&1 || return 0

  echo "==> Preparing Android app $MAESTRO_APP_ID for Maestro launch"
  adb shell am force-stop "$MAESTRO_APP_ID" 2>/dev/null || true
  adb reverse tcp:8081 tcp:8081 2>/dev/null || true
}

grant_ios_calls_permissions() {
  [[ "$PLATFORM" != "ios" ]] && return 0
  local udid="${DEVICE_ARGS[1]:-}"
  [[ -n "$udid" ]] || return 0

  echo "==> Re-granting iOS microphone/camera for Calls ($MAESTRO_APP_ID)"
  xcrun simctl privacy "$udid" grant microphone "$MAESTRO_APP_ID" 2>/dev/null || true
  xcrun simctl privacy "$udid" grant camera "$MAESTRO_APP_ID" 2>/dev/null || true
}

grant_android_calls_permissions() {
  [[ "$PLATFORM" != "android" ]] && return 0
  command -v adb >/dev/null 2>&1 || return 0

  echo "==> Re-granting Android microphone/camera for Calls ($MAESTRO_APP_ID)"
  adb shell pm grant "$MAESTRO_APP_ID" android.permission.RECORD_AUDIO 2>/dev/null || true
  adb shell pm grant "$MAESTRO_APP_ID" android.permission.CAMERA 2>/dev/null || true
}

reset_android_app_state() {
  [[ "$PLATFORM" != "android" ]] && return 0
  command -v adb >/dev/null 2>&1 || return 0

  echo "==> Resetting Android cross-app state ($MAESTRO_APP_ID)"
  adb shell am force-stop com.android.chrome 2>/dev/null || true
  adb shell am force-stop "$MAESTRO_APP_ID" 2>/dev/null || true
  adb reverse tcp:8081 tcp:8081 2>/dev/null || true
  sleep 2
}

reset_ios_cross_app_state() {
  [[ "$PLATFORM" != "ios" ]] && return 0
  local udid="${DEVICE_ARGS[1]:-}"
  [[ -n "$udid" ]] || return 0

  echo "==> Terminating cross-app targets on iOS simulator $udid"
  xcrun simctl terminate "$udid" com.apple.mobilesafari 2>/dev/null || true
  xcrun simctl terminate "$udid" com.apple.mobileslideshow 2>/dev/null || true
  xcrun simctl terminate "$udid" "$MAESTRO_APP_ID" 2>/dev/null || true
  sleep 2
}

# Android API 35 share sheets often expose icon-only targets Maestro cannot tap by
# "Mattermost" text. Open ShareActivity directly after login (same UX under test).
trigger_android_share_intent() {
  local flow_basename=$1
  local component="${MAESTRO_APP_ID}/com.mattermost.rnshare.ShareActivity"
  local payload=""

  case "$flow_basename" in
    share_text_to_channel.yml)
      payload="Example Domain - Maestro share text E2E"
      ;;
    share_link_to_channel.yml)
      payload="https://example.com"
      ;;
    *)
      echo "No Android share intent mapping for $flow_basename" >&2
      return 1
      ;;
  esac

  echo "==> Opening Android share extension via SEND intent ($flow_basename)"
  local payload_escaped
  payload_escaped=$(printf '%s' "$payload" | sed "s/'/'\\\\''/g")
  adb shell "am start -a android.intent.action.SEND -t text/plain --es android.intent.extra.TEXT '${payload_escaped}' -n '${component}'" >/dev/null 2>&1 || {
      echo "Failed to launch $component" >&2
      return 1
    }
  sleep 3
}

is_android_share_flow_batch() {
  [[ "$PLATFORM" == "android" ]] || return 1
  is_share_flow_batch "$1"
}

is_share_flow_batch() {
  [[ "$1" == *share_extension/share_* ]] || return 1
  local base=${1##*/}
  case "$base" in
    share_text_to_channel.yml|share_link_to_channel.yml) return 0 ;;
    *) return 1 ;;
  esac
}

share_sync_token_for_flow() {
  case "${1##*/}" in
    share_text_to_channel.yml) echo "Example Domain - Maestro share text E2E" ;;
    share_link_to_channel.yml) echo "example.com" ;;
    *) return 1 ;;
  esac
}

share_verify_text_for_flow() {
  case "${1##*/}" in
    share_text_to_channel.yml) echo "Example Domain - Maestro share text E2E" ;;
    share_link_to_channel.yml) echo "Example Domain" ;;
    *) return 1 ;;
  esac
}

poll_for_shared_post() {
  local token=$1
  [[ -n "$token" ]] || { echo "poll_for_shared_post: token required" >&2; return 1; }
  [[ -n "${TEST_CHANNEL_ID:-}" ]] || { echo "TEST_CHANNEL_ID required for poll" >&2; return 1; }
  [[ -n "${ADMIN_TOKEN:-}" ]] || { echo "ADMIN_TOKEN required for poll" >&2; return 1; }

  echo "==> Polling API for shared post containing: $token"
  SITE_1_URL="$SITE_1_URL" SYNC_TOKEN="$token" TEST_CHANNEL_ID="$TEST_CHANNEL_ID" ADMIN_TOKEN="$ADMIN_TOKEN" \
    npx tsx "$REPO_ROOT/maestro/fixtures/poll_for_message.ts"
}

run_share_flow_batch() {
  local batch_paths=$1
  local batch_xml=$2

  SYNC_TOKEN="$(share_sync_token_for_flow "$batch_paths")" || return 1
  SHARE_VERIFY_TEXT="$(share_verify_text_for_flow "$batch_paths")" || return 1
  export SYNC_TOKEN SHARE_VERIFY_TEXT
  build_maestro_env_args

  if [[ "$PLATFORM" == "android" ]]; then
    run_android_share_flow_batch "$batch_paths" "$batch_xml"
    return $?
  fi

  reset_ios_cross_app_state

  local post_xml="${batch_xml%.xml}-post.xml"
  set +e
  run_maestro_batch "$post_xml" "$batch_paths"
  local post_rc=$?
  set -e
  if [[ $post_rc -ne 0 ]]; then
    cp -f "$post_xml" "$batch_xml" 2>/dev/null || true
    return "$post_rc"
  fi

  poll_for_shared_post "$SYNC_TOKEN" || return 1

  local verify_xml="${batch_xml%.xml}-verify.xml"
  set +e
  run_maestro_batch "$verify_xml" maestro/utils/verify_shared_post_in_channel.yml
  post_rc=$?
  set -e
  cp -f "$verify_xml" "$batch_xml" 2>/dev/null || cp -f "$post_xml" "$batch_xml" 2>/dev/null || true
  return "$post_rc"
}

run_android_share_flow_batch() {
  local batch_paths=$1
  local batch_xml=$2
  local flow_basename=${batch_paths##*/}
  local login_xml="${batch_xml%.xml}-login.xml"

  reset_android_app_state
  ensure_android_app_launchable

  set +e
  run_maestro_batch "$login_xml" maestro/utils/android_share_login_warm.yml
  local login_rc=$?
  set -e
  if [[ $login_rc -ne 0 ]]; then
    echo "==> Android share login failed (exit $login_rc)" >&2
    cp -f "$login_xml" "$batch_xml" 2>/dev/null || true
    return "$login_rc"
  fi

  trigger_android_share_intent "$flow_basename" || return 1

  local post_xml="${batch_xml%.xml}-post.xml"
  set +e
  run_maestro_batch "$post_xml" maestro/utils/android_post_share_submit.yml
  local post_rc=$?
  set -e
  if [[ $post_rc -ne 0 ]]; then
    echo "==> Android share submit failed (exit $post_rc)" >&2
    return "$post_rc"
  fi

  poll_for_shared_post "$SYNC_TOKEN" || return 1

  local verify_xml="${batch_xml%.xml}-verify.xml"
  set +e
  run_maestro_batch "$verify_xml" maestro/utils/verify_shared_post_in_channel.yml
  post_rc=$?
  set -e
  if [[ $post_rc -ne 0 ]]; then
    cp -f "$verify_xml" "$batch_xml" 2>/dev/null || true
  else
    cp -f "$verify_xml" "$batch_xml" 2>/dev/null || true
  fi
  return "$post_rc"
}

# macOS CI uses bash 3.2; with `set -u`, expanding an empty array via "${arr[@]}"
# throws "unbound variable". Build the maestro argv explicitly instead.
run_maestro_batch() {
  build_maestro_env_args
  local batch_xml=$1
  shift
  local -a flows=("$@")
  local -a cmd=( "$MAESTRO_BIN" test )

  if ((${#DEVICE_ARGS[@]})); then
    cmd+=("${DEVICE_ARGS[@]}")
  fi
  if ((${#platform_args[@]})); then
    cmd+=("${platform_args[@]}")
  fi

  cmd+=(
    --format junit
    --output "$batch_xml"
    --test-output-dir "$ARTIFACTS_DIR"
    --flatten-debug-output
    --exclude-tags=MM-T67856_4
  )
  cmd+=("${maestro_env_args[@]}")
  cmd+=("${flows[@]}")

  "${cmd[@]}"
}

BATCH_XMLS=()
BATCH_FAILED=0
batch_idx=0
MERGE_DONE=0

merge_batch_reports() {
  [[ "$MERGE_DONE" == "1" ]] && return 0
  [[ ${#BATCH_XMLS[@]} -eq 0 ]] && return 0
  MERGE_DONE=1
  echo ""
  echo "==> Merging ${#BATCH_XMLS[@]} JUnit reports -> $MERGED_XML"
  local xml_json
  xml_json=$(printf '"%s",' "${BATCH_XMLS[@]}")
  xml_json="[${xml_json%,}]"
  node -e "
const {mergeMaestroJunitReports} = require('./detox/utils/maestro_report');
mergeMaestroJunitReports(${xml_json}, '${MERGED_XML}');
"
}

trap merge_batch_reports EXIT

ensure_android_timezone() {
  [[ "$PLATFORM" != "android" ]] && return 0
  command -v adb >/dev/null 2>&1 || return 0

  echo "==> Setting Android emulator timezone to America/New_York (MM-T1325)"
  adb root 2>/dev/null || true
  adb shell cmd alarm set-timezone "America/New_York" 2>/dev/null || true
  adb shell setprop persist.sys.timezone "America/New_York" 2>/dev/null || true
  adb shell setprop sys.timezone "America/New_York" 2>/dev/null || true
  adb shell am force-stop "$MAESTRO_APP_ID" 2>/dev/null || true
  sleep 2
}

for batch_paths in "${BATCHES[@]}"; do
  batch_idx=$((batch_idx + 1))
  read -r -a path_arr <<< "$batch_paths"
  batch_xml="$OUTPUT_DIR/maestro-batch-${batch_idx}.xml"
  BATCH_XMLS+=("$batch_xml")

  echo ""
  echo "==> Maestro batch $batch_idx/${#BATCHES[@]}: ${path_arr[*]}"
  [[ "$batch_paths" == *"/timezone/"* ]] && ensure_android_timezone
  ensure_ios_simulator_healthy
  if [[ "$batch_paths" == *share_extension* ]]; then
    [[ "$PLATFORM" == "ios" ]] && ! is_share_flow_batch "$batch_paths" && reset_ios_cross_app_state
  fi
  if [[ "$batch_paths" == *"/calls/"* ]]; then
    grant_ios_calls_permissions
    grant_android_calls_permissions
  fi
  [[ "$PLATFORM" == "android" ]] && reset_android_app_state
  ensure_android_app_launchable

  set +e
  if is_share_flow_batch "$batch_paths"; then
    run_share_flow_batch "$batch_paths" "$batch_xml"
    rc=$?
  else
    run_maestro_batch "$batch_xml" "${path_arr[@]}"
    rc=$?
  fi
  set -e

  if [[ $rc -ne 0 ]]; then
    echo "==> Batch $batch_idx failed (exit $rc) — continuing with remaining batches"
    BATCH_FAILED=1
    if [[ "$PLATFORM" == "ios" ]]; then
      ensure_ios_simulator_healthy
    fi
  fi

  # Browser/share batches can wedge the driver; recover before the next batch.
  if [[ "$batch_paths" == *share_extension* || "$batch_paths" == *help_url* ]]; then
    [[ "$PLATFORM" == "ios" ]] && ensure_ios_simulator_healthy
    [[ "$PLATFORM" == "android" ]] && ensure_android_app_launchable
  fi
done

merge_batch_reports

if [[ $BATCH_FAILED -ne 0 ]]; then
  echo "==> One or more Maestro batches failed"
  exit 1
fi

echo "==> All Maestro batches passed"
