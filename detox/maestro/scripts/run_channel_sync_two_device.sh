#!/bin/bash
# Two-device orchestration for MM-T837 channel-creation-sync test
# Usage: DEVICE_A_UDID=<udid> DEVICE_B_UDID=<udid> ./detox/maestro/scripts/run_channel_sync_two_device.sh
#
# Same test user logs in on both devices (matches RF-CS117's mobile-app +
# browser same-account scenario) - single-user seed.ts (no --two-users).

set -e

DEVICE_A_UDID="${DEVICE_A_UDID:?Error: DEVICE_A_UDID is required}"
DEVICE_B_UDID="${DEVICE_B_UDID:?Error: DEVICE_B_UDID is required}"
SITE_1_URL="${SITE_1_URL:?Error: SITE_1_URL is required}"
# Lowercase alphanumeric only: doubles as the channel display name AND URL name,
# so Device B can query for it without predicting Mattermost's slug transformation.
SYNC_TOKEN="${SYNC_TOKEN:-$(LC_ALL=C tr -dc a-z0-9 </dev/urandom | head -c 8)}"

export SYNC_TOKEN

echo "=== Two-Device Channel Sync Test (MM-T837) ==="
echo "Device A: $DEVICE_A_UDID"
echo "Device B: $DEVICE_B_UDID"
echo "Sync token / channel name: $SYNC_TOKEN"

# Seed test data (single user, one team - no channel needed since the test creates one)
npx tsx detox/maestro/fixtures/seed.ts

# Source the generated env file (provides TEST_USER_EMAIL, TEST_TEAM_ID, ADMIN_TOKEN, etc.)
# shellcheck disable=SC1091
source detox/maestro/.maestro-test-env.sh

cleanup() {
  kill "$DEVICE_A_PID" 2>/dev/null || true
  wait "$DEVICE_A_PID" 2>/dev/null || true
}

trap cleanup EXIT

echo "--- Starting Device A (creates channel) ---"
~/.maestro/bin/maestro \
  --device "$DEVICE_A_UDID" \
  test \
  --format junit \
  --output build/maestro-device-a-report.xml \
  detox/maestro/flows/multi_device/device_a_creates_channel.yml \
  --env "TEST_USER_EMAIL=${TEST_USER_EMAIL}" \
  --env "TEST_USER_PASSWORD=${TEST_USER_PASSWORD}" \
  --env "SITE_1_URL=${SITE_1_URL}" \
  --env "SYNC_TOKEN=${SYNC_TOKEN}" &

DEVICE_A_PID=$!

echo "--- Waiting for Device A to create the channel (polling API) ---"
POLL_COUNT=0
MAX_POLLS=30
until SYNC_TOKEN="${SYNC_TOKEN}" TEST_TEAM_ID="${TEST_TEAM_ID}" ADMIN_TOKEN="${ADMIN_TOKEN}" SITE_1_URL="${SITE_1_URL}" npx tsx detox/maestro/fixtures/poll_for_channel.ts; do
  POLL_COUNT=$((POLL_COUNT + 1))
  if [ $POLL_COUNT -ge $MAX_POLLS ]; then
    echo "Error: Device A did not create the channel within timeout"
    exit 1
  fi
  if ! kill -0 "$DEVICE_A_PID" 2>/dev/null; then
    echo "Error: Device A process exited unexpectedly"
    exit 1
  fi
  sleep 2
done

echo "--- Starting Device B (verifies channel synced) ---"
~/.maestro/bin/maestro \
  --device "$DEVICE_B_UDID" \
  test \
  --format junit \
  --output build/maestro-device-b-report.xml \
  detox/maestro/flows/multi_device/device_b_verifies_channel.yml \
  --env "TEST_USER_EMAIL=${TEST_USER_EMAIL}" \
  --env "TEST_USER_PASSWORD=${TEST_USER_PASSWORD}" \
  --env "SITE_1_URL=${SITE_1_URL}" \
  --env "SYNC_TOKEN=${SYNC_TOKEN}" \
  --env "TEST_TEAM_ID=${TEST_TEAM_ID}" \
  --env "ADMIN_TOKEN=${ADMIN_TOKEN}"

# Wait for Device A to finish before declaring success
wait "$DEVICE_A_PID"

echo "=== Two-Device Channel Sync Test Complete ==="
