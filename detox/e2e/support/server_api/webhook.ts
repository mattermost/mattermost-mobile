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
 * Assert that the webhook sidecar at the given base URL is healthy. A 4xx still proves it
 * is listening; an empty URL, transport failure, 5xx, or foreign body payload all throw.
 * @param {string} baseUrl - base URL of the webhook server (e.g. http://localhost:3000)
 * @return {Promise<void>}
 */
export const requireWebhookServer = async (baseUrl: string): Promise<void> => {
    if (!baseUrl?.trim()) {
        throw new Error(
            'WEBHOOK_BASE_URL is empty — Cloudflare quick tunnel did not come up on this shard. ' +
            'Configure MM_MOBILE_E2E_WEBHOOK_PUBLIC_BASE_URL (+ optional CLOUDFLARED_TUNNEL_TOKEN) ' +
            'for stable ingress. Non-mm_blocks specs on other shards are unaffected.',
        );
    }
    try {
        const response = await axios.get<{message?: string}>(baseUrl, {
            timeout: 10000,

            // trycloudflare often fails TLS/DNS from the runner after a brief healthy window.
            validateStatus: () => true,
        });
        if (response.status >= 500) {
            throw new Error(`HTTP ${response.status} from ${baseUrl}`);
        }
        if (response.data?.message !== 'I\'m alive!') {
            // Body is not echoed — a wrong host answers with a full HTML error page.
            throw new Error(`Unexpected health response from ${baseUrl} (HTTP ${response.status})`);
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
