#!/bin/bash
# Two-device orchestration for Calls E2E tests (MM-T4830 / MM-T4831)
#
# Device A starts a call; Device B sees the JoinCallBanner and joins.
#
# Usage:
#   DEVICE_A_UDID=<udid> DEVICE_B_UDID=<udid> \
#   SITE_1_URL=http://localhost:8065 \
#   ADMIN_EMAIL=admin@localhost ADMIN_PASSWORD=admin \
#     ./maestro/scripts/run_calls_two_device.sh
#
# Optional:
#   MAESTRO_APP_ID — app bundle/package ID (default: com.mattermost.rnbeta)

set -e

DEVICE_A_UDID="${DEVICE_A_UDID:?Error: DEVICE_A_UDID is required}"
DEVICE_B_UDID="${DEVICE_B_UDID:?Error: DEVICE_B_UDID is required}"
SITE_1_URL="${SITE_1_URL:?Error: SITE_1_URL is required}"
ADMIN_EMAIL="${ADMIN_EMAIL:?Error: ADMIN_EMAIL is required}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:?Error: ADMIN_PASSWORD is required}"
MAESTRO_APP_ID="${MAESTRO_APP_ID:-com.mattermost.rnbeta}"

# A unique token posted to the channel so Device B knows the call is active
SYNC_TOKEN="${SYNC_TOKEN:-$(LC_ALL=C tr -dc a-z0-9 </dev/urandom | head -c 8)}"
export SYNC_TOKEN

echo "=== Calls Two-Device Maestro Test ==="
echo "Device A: $DEVICE_A_UDID"
echo "Device B: $DEVICE_B_UDID"
echo "Sync token: $SYNC_TOKEN"
echo "App ID: $MAESTRO_APP_ID"

# Seed test data: creates 2 users on the same channel using the Detox server API
tsx --tsconfig detox/tsconfig.json maestro/fixtures/calls_seed.ts --two-users

# shellcheck disable=SC1091
source .maestro-test-env.sh

mkdir -p build

echo "--- Starting Device A (starts call) ---"
~/.maestro/bin/maestro \
    --device "$DEVICE_A_UDID" \
    test \
    --format junit \
    --output build/maestro-calls-device-a-report.xml \
    maestro/flows/calls/device_a_start_call.yml \
    --env "TEST_USER_EMAIL=${USER_A_EMAIL}" \
    --env "TEST_USER_PASSWORD=${USER_A_PASSWORD}" \
    --env "SITE_1_URL=${SITE_1_URL}" \
    --env "SYNC_TOKEN=${SYNC_TOKEN}" \
    --env "TEST_CHANNEL_NAME=${TEST_CHANNEL_NAME}" \
    --env "TEST_CHANNEL_ID=${TEST_CHANNEL_ID}" \
    --env "ADMIN_TOKEN=${ADMIN_TOKEN}" \
    --env "MAESTRO_APP_ID=${MAESTRO_APP_ID}" &

DEVICE_A_PID=$!

echo "--- Waiting for Device A to start the call (polling API for sync token) ---"
# Post the sync token to the channel via API so poll_for_message can detect it
SITE_1_URL="$SITE_1_URL" TEST_CHANNEL_ID="$TEST_CHANNEL_ID" SYNC_TOKEN="$SYNC_TOKEN" ADMIN_TOKEN="$ADMIN_TOKEN" \
node -e '
const https = require("https");
const http = require("http");
const url = new URL(process.env.SITE_1_URL + "/api/v4/posts");
const lib = url.protocol === "https:" ? https : http;
const payload = JSON.stringify({channel_id: process.env.TEST_CHANNEL_ID, message: process.env.SYNC_TOKEN});
const req = lib.request({
    hostname: url.hostname,
    port: url.port || (url.protocol === "https:" ? 443 : 80),
    path: url.pathname,
    method: "POST",
    headers: {"Content-Type": "application/json", "Content-Length": Buffer.byteLength(payload), Authorization: "Bearer " + process.env.ADMIN_TOKEN},
}, (res) => { res.resume(); res.on("end", () => process.exit(0)); });
req.on("error", (e) => { console.error(e.message); process.exit(1); });
req.write(payload);
req.end();
'

# Wait for Device A to be in the call (allow 20 s for the call screen to appear)
sleep 20

echo "--- Starting Device B (joins call via banner) ---"
~/.maestro/bin/maestro \
    --device "$DEVICE_B_UDID" \
    test \
    --format junit \
    --output build/maestro-calls-device-b-report.xml \
    maestro/flows/calls/device_b_join_call.yml \
    --env "TEST_USER_EMAIL=${USER_B_EMAIL}" \
    --env "TEST_USER_PASSWORD=${USER_B_PASSWORD}" \
    --env "SITE_1_URL=${SITE_1_URL}" \
    --env "TEST_CHANNEL_NAME=${TEST_CHANNEL_NAME}" \
    --env "MAESTRO_APP_ID=${MAESTRO_APP_ID}"

DEVICE_B_EXIT=$?

# Device B is done — signal Device A to clean up (leave the call)
kill "$DEVICE_A_PID" 2>/dev/null || true
wait "$DEVICE_A_PID" 2>/dev/null || true

if [ "$DEVICE_B_EXIT" -ne 0 ]; then
    echo "=== FAILURE: Device B flow exited with code $DEVICE_B_EXIT ==="
    exit "$DEVICE_B_EXIT"
fi

echo "=== Calls Two-Device Test Complete ==="
