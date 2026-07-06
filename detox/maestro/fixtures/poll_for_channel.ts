// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-process-env, no-console */

import http, {type RequestOptions} from 'http';
import https from 'https';

const SITE_1_URL = process.env.SITE_1_URL as string;
const SYNC_TOKEN = process.env.SYNC_TOKEN as string;
const TEST_TEAM_ID = process.env.TEST_TEAM_ID as string;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN as string;
const MAX_POLLS = 30;
const POLL_INTERVAL_MS = 2000;

if (!SITE_1_URL || !SYNC_TOKEN || !TEST_TEAM_ID || !ADMIN_TOKEN) {
    console.error('[poll_for_channel] Error: SITE_1_URL, SYNC_TOKEN, TEST_TEAM_ID, and ADMIN_TOKEN are required');
    process.exit(1);
}

function get(url: string, token: string): Promise<{status: number; body: any}> {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const lib = parsed.protocol === 'https:' ? https : http;
        const options: RequestOptions = {
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
            path: parsed.pathname + parsed.search,
            method: 'GET',
            headers: {Authorization: `Bearer ${token}`},
        };
        lib.get(options, (res) => {
            let data = '';
            res.on('data', (chunk: string) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    resolve({status: res.statusCode || 0, body: data ? JSON.parse(data) : null});
                } catch (e) {
                    reject(new Error(`[poll_for_channel] Failed to parse response: ${data}`));
                }
            });
        }).on('error', reject);
    });
}

async function pollForChannel(): Promise<void> {
    // SYNC_TOKEN doubles as the channel name (lowercase alphanumeric), so the
    // display name typed on Device A and the URL name queried here match exactly -
    // no slug-transformation guesswork.
    const url = `${SITE_1_URL}/api/v4/teams/${TEST_TEAM_ID}/channels/name/${SYNC_TOKEN}`;
    for (let i = 0; i < MAX_POLLS; i++) {
        // eslint-disable-next-line no-await-in-loop
        const {status} = await get(url, ADMIN_TOKEN);
        if (status === 200) {
            console.log(`[poll_for_channel] Found channel "${SYNC_TOKEN}" after ${i + 1} polls`);
            process.exit(0);
        }
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
    console.error(`[poll_for_channel] Timed out waiting for channel "${SYNC_TOKEN}"`);
    process.exit(1);
}

pollForChannel().catch((err: Error) => {
    console.error('[poll_for_channel] Error:', err.message);
    process.exit(1);
});
