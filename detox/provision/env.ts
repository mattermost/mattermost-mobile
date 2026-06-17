// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-process-env */

import {logError} from './log';

import type {ProvisionCredentials} from './types';

/** E2E provisioning defaults to loadtest_mock (no real LLM). Set AGENTS_USE_LOADTEST_MOCK=0 to disable. */
export function shouldUseLoadtestMock(): boolean {
    return process.env.AGENTS_USE_LOADTEST_MOCK !== '0';
}

export function getAgentsPluginDownloadUrl(): string | undefined {
    return process.env.AGENTS_PLUGIN_DOWNLOAD_URL;
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
