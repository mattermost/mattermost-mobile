// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Provisions a Mattermost test server for E2E tests.
 *
 * Usage: npx tsx provision/index.ts <server_url>
 *
 * Environment variables:
 *   ADMIN_USERNAME / ADMIN_PASSWORD - admin credentials (required)
 *   AGENTS_PLUGIN_DOWNLOAD_URL - optional override for mattermost-ai install URL
 *   AGENTS_USE_LOADTEST_MOCK=0 - disable loadtest_mock fallback (enabled by default for E2E)
 */

import {readCredentialsFromEnv} from './env';
import {logError} from './log';
import {provisionServer} from './provision';
import {validateServerUrl} from './validate-url';

const serverUrl = process.argv[2];
if (!serverUrl) {
    logError('Usage: npx tsx provision/index.ts <server_url>');
    process.exit(1);
}

validateServerUrl(serverUrl);

const credentials = readCredentialsFromEnv();

provisionServer(serverUrl, credentials).catch((err: Error) => {
    logError(`Fatal error: ${err.message}`);
    process.exit(1);
});
