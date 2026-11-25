// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-process-env */

import {logError} from './log';

import type {ProvisionCredentials} from './types';

export function getAgentsPluginDownloadUrl(): string | undefined {
    return process.env.AGENTS_PLUGIN_DOWNLOAD_URL;
}

/**
 * Whether the servers are e2e-test-stack's, as the workflows say with E2E_SERVER_SOURCE=e2e-test-stack: their image
 * carries the prepackaged plugins, which are then enabled and checked, never installed or downloaded.
 */
export function isE2eTestStack(env: Record<string, string | undefined> = process.env): boolean {
    const source = env.E2E_SERVER_SOURCE;
    if (source === undefined || source === '') {
        return false;
    }
    if (source !== 'e2e-test-stack') {
        throw new Error(`E2E_SERVER_SOURCE must be e2e-test-stack or unset, got '${source}'`);
    }
    return true;
}

export function readCredentialsFromEnv(): ProvisionCredentials {
    const username = process.env.ADMIN_USERNAME || process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!username || !password) {
        logError('ADMIN_USERNAME (or ADMIN_EMAIL) and ADMIN_PASSWORD environment variables are required');
        process.exit(1);
    }

    return {username, password};
}
