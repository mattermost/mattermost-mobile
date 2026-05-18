// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import client from './client';

/**
 * Health check for the webhook sidecar (`detox/webhook_server.js`, default http://localhost:3000).
 */
export const isWebhookTestServerReachable = async (webhookBaseUrl: string): Promise<boolean> => {
    try {
        const response = await client.get(webhookBaseUrl, {timeout: 5000});
        return response.status === 200;
    } catch {
        return false;
    }
};

/**
 * Fail fast when integration tests require the webhook sidecar.
 */
export const requireWebhookServer = async (webhookBaseUrl: string): Promise<void> => {
    const reachable = await isWebhookTestServerReachable(webhookBaseUrl);
    if (!reachable) {
        throw new Error(
            `Webhook test server is not reachable at ${webhookBaseUrl}. ` +
            'Start it from the repo: cd detox && node webhook_server.js',
        );
    }
};

export const Webhook = {
    isWebhookTestServerReachable,
    requireWebhookServer,
};

export default Webhook;
