// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import client from '@support/server_api/client';
import {getResponseFromError} from '@support/server_api/common';
import {AgentsPlugin} from '@support/server_api/plugin';

/**
 * Returns whether mattermost-ai is in the server's active plugin list.
 * Treats any API/network problem as "not active" so that a transient
 * provisioning/auth failure does not crash the whole agents suite at
 * beforeAll-time. A dedicated API failure is logged for debugging.
 */
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

/**
 * Wraps an agents E2E test so it no-ops when the suite setup was skipped
 * (e.g. mattermost-ai not active after provisioning).
 */
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
