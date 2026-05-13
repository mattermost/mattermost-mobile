#!/bin/bash
# Two-device orchestration for MM-T3055/MM-T3056 multi-device sync tests
# Usage: DEVICE_A_UDID=<udid> DEVICE_B_UDID=<udid> ./maestro/scripts/run_two_device.sh

set -e

DEVICE_A_UDID="${DEVICE_A_UDID:?Error: DEVICE_A_UDID is required}"
DEVICE_B_UDID="${DEVICE_B_UDID:?Error: DEVICE_B_UDID is required}"
SITE_1_URL="${SITE_1_URL:?Error: SITE_1_URL is required}"
SYNC_TOKEN="${SYNC_TOKEN:-$(LC_ALL=C tr -dc a-z0-9 </dev/urandom | head -c 8)}"

export SYNC_TOKEN

echo "=== Two-Device Maestro Test ==="
echo "Device A: $DEVICE_A_UDID"
echo "Device B: $DEVICE_B_UDID"
echo "Sync token: $SYNC_TOKEN"

# Seed test data (creates 2 users sharing 1 channel)
node maestro/fixtures/seed.js --two-users

# Source the generated env file (provides USER_A_EMAIL, USER_B_EMAIL, TEST_CHANNEL_ID, etc.)
# shellcheck disable=SC1091
source .maestro-test-env.sh

echo "--- Starting Device A (sends message) ---"
~/.maestro/bin/maestro \
  --device "$DEVICE_A_UDID" \
  test \
  --format junit \
  --output build/maestro-device-a-report.xml \
  maestro/flows/multi_device/user_a_sends_message.yml \
  --env "TEST_USER_EMAIL=${USER_A_EMAIL}" \
  --env "TEST_USER_PASSWORD=${USER_A_PASSWORD}" \
  --env "SITE_1_URL=${SITE_1_URL}" \
  --env "SYNC_TOKEN=${SYNC_TOKEN}" \
  --env "CHANNEL_NAME=${TEST_CHANNEL_NAME}" &

DEVICE_A_PID=$!

echo "--- Waiting for Device A to post message (polling API) ---"
# Poll the API until the sync message appears before starting Device B
POLL_COUNT=0
MAX_POLLS=30
until node maestro/fixtures/poll_for_message.js; do
  POLL_COUNT=$((POLL_COUNT + 1))
  if [ $POLL_COUNT -ge $MAX_POLLS ]; then
    echo "Error: Device A did not post message within timeout"
    kill "$DEVICE_A_PID" 2>/dev/null || true
    exit 1
  fi
  sleep 2
done

echo "--- Starting Device B (receives message) ---"
~/.maestro/bin/maestro \
  --device "$DEVICE_B_UDID" \
  test \
  --format junit \
  --output build/maestro-device-b-report.xml \
  maestro/flows/multi_device/user_b_receives_message.yml \
  --env "TEST_USER_EMAIL=${USER_B_EMAIL}" \
  --env "TEST_USER_PASSWORD=${USER_B_PASSWORD}" \
  --env "SITE_1_URL=${SITE_1_URL}" \
  --env "SYNC_TOKEN=${SYNC_TOKEN}" \
  --env "CHANNEL_NAME=${TEST_CHANNEL_NAME}" \
  --env "TEST_CHANNEL_ID=${TEST_CHANNEL_ID}" \
  --env "ADMIN_TOKEN=${ADMIN_TOKEN}"

# Wait for Device A to finish before declaring success
wait "$DEVICE_A_PID"

echo "=== Two-Device Test Complete ==="
