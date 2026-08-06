#!/bin/bash
# MM-T3244 — seed file attachments then run file_type_preview.yml.
# Usage (from repo root):
#   DEVICE_A_UDID=<serial> SITE_1_URL=... ./detox/maestro/scripts/run_file_type_preview.sh
#
# PR batches skip the bare flow (needs IMAGE_FILE_ID etc.); e2e-v2 runs this
# scenario so seed_file_preview.ts populates those IDs before Maestro starts.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
cd "$REPO_ROOT"

DEVICE_A_UDID="${DEVICE_A_UDID:?Error: DEVICE_A_UDID is required}"
SITE_1_URL="${SITE_1_URL:?Error: SITE_1_URL is required}"
MAESTRO_APP_ID="${MAESTRO_APP_ID:-com.mattermost.rnbeta}"
MAESTRO_BIN="${MAESTRO_BIN:-$HOME/.maestro/bin/maestro}"
if [ ! -x "$MAESTRO_BIN" ]; then
  MAESTRO_BIN="$(command -v maestro || true)"
fi
if [ -z "$MAESTRO_BIN" ]; then
  echo "Error: maestro CLI not found (set MAESTRO_BIN or install Maestro)" >&2
  exit 1
fi

echo "=== File Type Preview (MM-T3244) ==="
echo "Device: $DEVICE_A_UDID"
echo "Site: $SITE_1_URL"
echo "Maestro: $MAESTRO_BIN"

# Uploads image/video/audio/PDF/zip posts and writes IMAGE_FILE_ID etc.
(cd detox/maestro && npx tsx fixtures/seed_file_preview.ts)

# shellcheck disable=SC1091
source detox/maestro/.maestro-test-env.sh

: "${IMAGE_FILE_ID:?seed_file_preview did not set IMAGE_FILE_ID}"
: "${VIDEO_FILE_ID:?seed_file_preview did not set VIDEO_FILE_ID}"
: "${AUDIO_FILE_ID:?seed_file_preview did not set AUDIO_FILE_ID}"
: "${PDF_FILE_ID:?seed_file_preview did not set PDF_FILE_ID}"
: "${ZIP_FILE_ID:?seed_file_preview did not set ZIP_FILE_ID}"
: "${TEST_USER_EMAIL:?seed_file_preview did not set TEST_USER_EMAIL}"
: "${TEST_USER_PASSWORD:?seed_file_preview did not set TEST_USER_PASSWORD}"
: "${TEST_CHANNEL_NAME:?seed_file_preview did not set TEST_CHANNEL_NAME}"

mkdir -p build
ARGS=(
  test
  --device "$DEVICE_A_UDID"
  --format junit
  --output build/maestro-file-type-preview-report.xml
  --env "MAESTRO_APP_ID=${MAESTRO_APP_ID}"
  --env "SITE_1_URL=${SITE_1_URL}"
  --env "TEST_USER_EMAIL=${TEST_USER_EMAIL}"
  --env "TEST_USER_PASSWORD=${TEST_USER_PASSWORD}"
  --env "TEST_CHANNEL_NAME=${TEST_CHANNEL_NAME}"
  --env "IMAGE_FILE_ID=${IMAGE_FILE_ID}"
  --env "VIDEO_FILE_ID=${VIDEO_FILE_ID}"
  --env "AUDIO_FILE_ID=${AUDIO_FILE_ID}"
  --env "PDF_FILE_ID=${PDF_FILE_ID}"
  --env "ZIP_FILE_ID=${ZIP_FILE_ID}"
  detox/maestro/flows/channels/file_type_preview.yml
)
if [ -n "${MAESTRO_PLATFORM:-}" ]; then
  ARGS=(--platform "$MAESTRO_PLATFORM" "${ARGS[@]}")
fi

"$MAESTRO_BIN" "${ARGS[@]}"
echo "=== File Type Preview Complete ==="
