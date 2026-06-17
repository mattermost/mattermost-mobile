// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import client from '@support/server_api/client';
import {getResponseFromError} from '@support/server_api/common';
import {AgentsPlugin} from '@support/server_api/plugin';

// Treat API failures as inactive so agents tests can no-op gracefully.
export async function isAgentsPluginActive(baseUrl: string): Promise<boolean> {
    try {
        const response = await client.get(`${baseUrl}/api/v4/plugins`);
        return response.data?.active?.some((plugin: {id: string}) => plugin.id === AgentsPlugin.id) ?? false;
    } catch (err) {
        const {error, status} = getResponseFromError(err);
        // eslint-disable-next-line no-console
        console.warn(`[isAgentsPluginActive] could not determine plugin state (status ${status || 'unknown'}); treating as inactive: ${JSON.stringify(error)}`);
        return false;
    }
}

// No-op the test when mattermost-ai is not active after provisioning.
export function itWhenAgentsReady(
    didLogin: () => boolean,
    name: string,
    fn: () => Promise<void>,
): void {
    it(name, async () => {
        if (!didLogin()) {
            return;
        }
        await fn();
    });
}
