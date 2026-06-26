#!/usr/bin/env bash
# Run Maestro flows in isolated batches for CI.
#
# One batch failure (e.g. iOS SFSafariViewController wedging the driver) must not
# prevent unrelated flows from running. Each batch is a separate `maestro test`
# invocation; JUnit XML files are merged afterward.
#
# Usage (from repo root):
#   source detox/maestro/.maestro-test-env.sh
#   detox/maestro/scripts/run_ci_batches.sh --platform ios --device "$SIMULATOR_ID"
#   detox/maestro/scripts/run_ci_batches.sh --platform android
#
# Environment:
#   MAESTRO_BIN          — default ~/.maestro/bin/maestro
#   MAESTRO_APP_ID       — default com.mattermost.rnbeta
#   FLOW_PATH            — optional; space-separated flow dirs (default: detox/maestro/flows/* categories)
#   SITE_1_URL, TEST_*   — passed through to maestro --env
#   MAESTRO_DRIVER_STARTUP_TIMEOUT — default 180000 (Maestro CI recommendation)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
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

# shellcheck source=detox/maestro/lib/timezone_region.sh
source "$REPO_ROOT/detox/maestro/lib/timezone_region.sh"
SIMULATOR_TIMEZONE="${SIMULATOR_TIMEZONE:-America/New_York}"
EXPECTED_TIMEZONE_REGION="${EXPECTED_TIMEZONE_REGION:-$(timezone_region_from_iana "$SIMULATOR_TIMEZONE")}"

EXCLUDE_TAGS_FILE="$REPO_ROOT/detox/maestro/config/exclude_tags.json"
load_exclude_tags() {
  # Reads detox/maestro/config/exclude_tags.json and emits a comma-joined list
  # from the "default" key. Returns empty string if the file or key is missing.
  [[ -f "$EXCLUDE_TAGS_FILE" ]] || { echo ""; return 0; }
  node -e "
const cfg = require('$EXCLUDE_TAGS_FILE');
process.stdout.write((cfg.default || []).join(','));
"
}

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
  )
}

build_maestro_env_args

platform_args=()
[[ "$PLATFORM" == "android" ]] && platform_args=(--platform android)

DEFAULT_FLOW_PATH="detox/maestro/flows/timezone detox/maestro/flows/channels detox/maestro/flows/account detox/maestro/flows/calls"

flow_sort_key() {
  case "$1" in
    detox/maestro/flows/timezone/*) echo "1:$1" ;;
    detox/maestro/flows/channels/*) echo "2:$1" ;;
    detox/maestro/flows/account/*) echo "3:$1" ;;
    detox/maestro/flows/calls/*) echo "4:$1" ;;
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
  [[ "$base" == "start_call.yml" ]] && return 0
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
  set +e
  PREBOOT_SKIP_PREWARM="${PREBOOT_SKIP_PREWARM:-1}" \
    DEVICE_NAME="${E2E_IOS_DEVICE_NAME:-iPhone 17 Pro}" \
    DEVICE_OS_VERSION="${E2E_IOS_DEVICE_OS_VERSION:-iOS 26.2}" \
    bash detox/scripts/preboot_ios_simulator.sh
  set -e
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

ensure_calls_channel_enabled() {
  [[ -n "${TEST_CHANNEL_ID:-}" && -n "${ADMIN_TOKEN:-}" && -n "${SITE_1_URL:-}" ]] || {
    echo "Warning: missing TEST_CHANNEL_ID/ADMIN_TOKEN/SITE_1_URL; skipping calls channel enable" >&2
    return 0
  }

  echo "==> Ensuring Calls enabled in channel ${TEST_CHANNEL_ID}"
  if ! curl -fsS -X POST \
    -H "Authorization: Bearer $ADMIN_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"enabled":true}' \
    "${SITE_1_URL}/plugins/com.mattermost.calls/${TEST_CHANNEL_ID}" >/dev/null; then
    echo "Warning: could not POST calls enable for channel ${TEST_CHANNEL_ID}" >&2
  fi
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
  )
  local exclude_tags
  exclude_tags=$(load_exclude_tags)
  if [[ -n "$exclude_tags" ]]; then
    cmd+=("--exclude-tags=$exclude_tags")
  fi
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
  if [[ "$batch_paths" == *"/calls/"* ]]; then
    ensure_calls_channel_enabled
    grant_ios_calls_permissions
    grant_android_calls_permissions
  fi
  [[ "$PLATFORM" == "android" ]] && reset_android_app_state
  ensure_android_app_launchable

  set +e
  run_maestro_batch "$batch_xml" "${path_arr[@]}"
  rc=$?

  if [[ $rc -ne 0 ]]; then
    echo "==> Batch $batch_idx failed (exit $rc) — continuing with remaining batches"
    BATCH_FAILED=1
    if [[ "$PLATFORM" == "ios" ]]; then
      ensure_ios_simulator_healthy
    fi
  fi

  # Browser hand-off flows can wedge the driver; recover before the next batch.
  if [[ "$batch_paths" == *help_url* ]]; then
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
