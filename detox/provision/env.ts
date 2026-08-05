// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-process-env */

import {logError} from './log';

import type {ProvisionCredentials} from './types';

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
