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

mkdir -p "$OUTPUT_DIR" "$ARTIFACTS_DIR"

maestro_env_args=(
  --env "SITE_1_URL=${SITE_1_URL:-}"
  --env "TEST_USER_EMAIL=${TEST_USER_EMAIL:-}"
  --env "TEST_USER_PASSWORD=${TEST_USER_PASSWORD:-}"
  --env "TEST_CHANNEL_NAME=${TEST_CHANNEL_NAME:-}"
  --env "TEST_TEAM_NAME=${TEST_TEAM_NAME:-}"
  --env "ADMIN_TOKEN=${ADMIN_TOKEN:-}"
  --env "MAESTRO_APP_ID=${MAESTRO_APP_ID}"
)

platform_args=()
[[ "$PLATFORM" == "android" ]] && platform_args=(--platform android)

# Batch order: in-app first, file picker, calls, browser-risk (isolated), cross-app share last.
# help_url runs alone — it can wedge the iOS Maestro driver on CI simulators.
if [[ "$PLATFORM" == "ios" ]]; then
  BATCHES=(
    "maestro/flows/channels/channel_bookmark_link_external.yml maestro/flows/timezone"
    "maestro/flows/account/attach_logs.yml maestro/flows/account/attach_logs_toggle_visible.yml maestro/flows/account/attach_logs_toggle_on_surfaces_option.yml maestro/flows/account/attach_logs_toggle_off_hides_option.yml"
    "maestro/flows/calls"
    "maestro/flows/channels/channel_bookmark_file.yml"
    "maestro/flows/account/help_url.yml"
    "maestro/flows/share_extension"
  )
else
  BATCHES=(
    "maestro/flows/channels/channel_bookmark_link_external.yml maestro/flows/timezone"
    "maestro/flows/account/attach_logs.yml maestro/flows/account/attach_logs_toggle_visible.yml maestro/flows/account/attach_logs_toggle_on_surfaces_option.yml maestro/flows/account/attach_logs_toggle_off_hides_option.yml"
    "maestro/flows/calls"
    "maestro/flows/channels/channel_bookmark_file.yml"
    "maestro/flows/account/help_url.yml"
    "maestro/flows/share_extension/share_link_to_channel.yml maestro/flows/share_extension/share_text_to_channel.yml"
  )
fi

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

BATCH_XMLS=()
BATCH_FAILED=0
batch_idx=0

for batch_paths in "${BATCHES[@]}"; do
  batch_idx=$((batch_idx + 1))
  read -r -a path_arr <<< "$batch_paths"
  batch_xml="$OUTPUT_DIR/maestro-batch-${batch_idx}.xml"
  BATCH_XMLS+=("$batch_xml")

  echo ""
  echo "==> Maestro batch $batch_idx/${#BATCHES[@]}: ${path_arr[*]}"
  ensure_ios_simulator_healthy

  set +e
  "$MAESTRO_BIN" test \
    "${DEVICE_ARGS[@]}" \
    "${platform_args[@]}" \
    --format junit \
    --output "$batch_xml" \
    --test-output-dir "$ARTIFACTS_DIR" \
    --flatten-debug-output \
    --exclude-tags=MM-T67856_4 \
    "${maestro_env_args[@]}" \
    "${path_arr[@]}"
  rc=$?
  set -e

  if [[ $rc -ne 0 ]]; then
    echo "==> Batch $batch_idx failed (exit $rc) — continuing with remaining batches"
    BATCH_FAILED=1
  fi

  # Browser batches can wedge the driver; recover before the next batch on iOS.
  if [[ "$PLATFORM" == "ios" ]] && [[ "$batch_paths" == *help_url* || "$batch_paths" == *share_extension* ]]; then
    ensure_ios_simulator_healthy
  fi
done

echo ""
echo "==> Merging ${#BATCH_XMLS[@]} JUnit reports -> $MERGED_XML"
XML_JSON=$(printf '"%s",' "${BATCH_XMLS[@]}")
XML_JSON="[${XML_JSON%,}]"
node -e "
const {mergeMaestroJunitReports} = require('./detox/utils/maestro_report');
mergeMaestroJunitReports(${XML_JSON}, '${MERGED_XML}');
"

if [[ $BATCH_FAILED -ne 0 ]]; then
  echo "==> One or more Maestro batches failed"
  exit 1
fi

echo "==> All Maestro batches passed"
