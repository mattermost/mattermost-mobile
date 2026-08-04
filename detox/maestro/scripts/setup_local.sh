#!/usr/bin/env bash
# Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
# See LICENSE.txt for license information.
#
# Local Maestro setup — runs the same provisioning + seeding the CI workflow
# does (.github/workflows/e2e-detox-pr.yml `provision-servers` job +
# .github/workflows/e2e-maestro-template.yml "Seed test data" step) so a
# developer-run flow exercises the same server state as CI.
#
# Does NOT build or install the app. After this script, build/install per
# detox/maestro/README.md (release sim .app on iOS, release APK on Android).
#
# Usage:
#   export ADMIN_USERNAME=admin
#   export ADMIN_PASSWORD=<the admin password Matterwick printed>
#   export SITE_URL=https://mobile-pr-9754-site-1-g1msm5fe.test.mattermost.cloud
#   ./detox/maestro/scripts/setup_local.sh
#   source detox/maestro/.maestro-test-env.sh
#   ~/.maestro/bin/maestro test detox/maestro/flows/calls/start_call.yml
#
# What this script does:
#   1. node detox/provision_server.js $SITE_URL
#      -- activates the trial Enterprise license
#      -- installs com.mattermost.calls + mattermost-ai plugins
#      -- sets EnableChannelBookmarks, Calls DefaultEnabled,
#         ExperimentalViewArchivedChannels, EnableSharedChannels,
#         FeatureFlags.CustomProfileAttributes, EnableBotAccountCreation,
#         RateLimit off
#   2. cd detox/maestro && npm install
#   3. SITE_1_URL=$SITE_URL npx tsx fixtures/seed.ts
#      -- creates team + channel + test user
#      -- enables Calls in the test channel (per-channel POST)
#      -- writes credentials to detox/maestro/.maestro-test-env.sh
#
# After this completes, `source detox/maestro/.maestro-test-env.sh` sets:
#   SITE_1_URL, ADMIN_TOKEN, TEST_TEAM_NAME, TEST_TEAM_ID,
#   TEST_CHANNEL_NAME, TEST_CHANNEL_ID,
#   TEST_USER_EMAIL, TEST_USER_PASSWORD, TEST_USER_ID

set -euo pipefail

# --- Validate required env vars ---
: "${SITE_URL:?Set SITE_URL=https://mobile-pr-XXXX-site-N-XXXX.test.mattermost.cloud}"
: "${ADMIN_USERNAME:?Set ADMIN_USERNAME (e.g. admin)}"
: "${ADMIN_PASSWORD:?Set ADMIN_PASSWORD (printed by Matterwick on the PR)}"

# Locate repo root regardless of where this script is invoked from.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

cd "$REPO_ROOT"

echo "==> Provisioning $SITE_URL via detox/provision"
(cd "$REPO_ROOT/detox" && npm run provision -- "$SITE_URL")

echo "==> Installing maestro fixtures dependencies"
cd "$REPO_ROOT/detox/maestro"
npm install --silent --no-audit --no-fund

echo "==> Seeding test team/channel/user (writes .maestro-test-env.sh)"
SITE_1_URL="$SITE_URL" \
    ADMIN_USERNAME="$ADMIN_USERNAME" \
    ADMIN_PASSWORD="$ADMIN_PASSWORD" \
    npx tsx fixtures/seed.ts

echo
echo "✓ Setup complete."
echo "  Next steps:"
echo "    source detox/maestro/.maestro-test-env.sh"
echo "    Build + install app (see detox/maestro/README.md — Official local workflow)"
echo "    ~/.maestro/bin/maestro test detox/maestro/flows/<flow>.yml"
