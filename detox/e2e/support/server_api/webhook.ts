// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import axios from 'axios';

// ****************************************************************
// Webhook helpers
//
// Utilities for verifying external webhook/integration servers
// are reachable before running interactive dialog tests.
// ****************************************************************

/**
 * Assert that the webhook server at the given base URL is reachable.
 * Throws only if the server is unreachable; HTTP error responses still prove it is listening.
 * @param {string} baseUrl - base URL of the webhook server (e.g. http://localhost:3000)
 * @return {Promise<void>}
 */
export const requireWebhookServer = async (baseUrl: string): Promise<void> => {
    try {
        const response = await axios.get<{message?: string}>(baseUrl, {timeout: 10000});
        if (response.data?.message !== 'I\'m alive!') {
            throw new Error(`Unexpected health response from ${baseUrl}`);
        }
    } catch (err: unknown) {
        const detail = axios.isAxiosError(err) ? err.message : String(err);
        throw new Error(
            `Webhook sidecar is not healthy at ${baseUrl}: ${detail}. ` +
            'CI must run detox/scripts/start_webhook_sidecar.sh and export its WEBHOOK_BASE_URL.',
        );
    }
};

export const Webhook = {
    requireWebhookServer,
};

export default Webhook;
