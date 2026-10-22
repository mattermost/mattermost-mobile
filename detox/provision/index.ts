// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/**
 * Provisions a Mattermost test server for E2E tests.
 *
 * Usage: npx tsx provision/index.ts <server_url> [--demo-plugin | --no-demo-plugin]
 *
 * The demo plugin is installed by default; CI passes --no-demo-plugin for every server but mutation server B.
 *
 * Environment variables:
 *   ADMIN_USERNAME / ADMIN_PASSWORD - admin credentials (required)
 *   AGENTS_PLUGIN_DOWNLOAD_URL - optional override for mattermost-ai install URL
 */

import {readCredentialsFromEnv} from './env';
import {logError} from './log';
import {provisionServer} from './provision';
import {validateServerUrl} from './validate-url';

const USAGE = 'Usage: npx tsx provision/index.ts <server_url> [--demo-plugin | --no-demo-plugin]';
const DEMO_PLUGIN_FLAGS = ['--demo-plugin', '--no-demo-plugin'];

const args = process.argv.slice(2);
const serverUrl = args.find((arg) => !arg.startsWith('--'));
const demoFlags = args.filter((arg) => DEMO_PLUGIN_FLAGS.includes(arg));
const unknownFlags = args.filter((arg) => arg.startsWith('--') && !DEMO_PLUGIN_FLAGS.includes(arg));
if (!serverUrl || unknownFlags.length > 0 || demoFlags.length > 1) {
    logError(USAGE);
    process.exit(1);
}

validateServerUrl(serverUrl);

const credentials = readCredentialsFromEnv();

// Without a flag the demo plugin is installed, as local runs always did.
const demoPlugin = demoFlags.length === 0 || demoFlags[0] === '--demo-plugin';

provisionServer(serverUrl, credentials, {demoPlugin}).catch((err: Error) => {
    logError(`Fatal error: ${err.message}`);
    process.exit(1);
});
