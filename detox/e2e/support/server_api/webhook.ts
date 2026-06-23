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
 * Throws if the server does not respond with a 2xx status.
 * @param {string} baseUrl - base URL of the webhook server (e.g. http://localhost:3000)
 * @return {Promise<void>}
 */
export const requireWebhookServer = async (baseUrl: string): Promise<void> => {
    try {
        await axios.get(baseUrl, {timeout: 5000});
    } catch (err: any) {
        // A 4xx/5xx response still means the server is up
        if (err.response) {
            return;
        }
        throw new Error(
            `Webhook server is not reachable at ${baseUrl}. ` +
            'Start the webhook server before running interactive dialog tests.',
        );
    }
};

export const Webhook = {
    requireWebhookServer,
};

export default Webhook;
