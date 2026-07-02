// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable no-await-in-loop */

import {existsSync} from 'fs';
import {mkdir, writeFile} from 'fs/promises';
import path from 'path';

import client from './server_api/client';

const FIXTURES_DIR = path.resolve(__dirname, './fixtures');
const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 120000;

/**
 * Download a file into detox/e2e/support/fixtures/ if it's not already there.
 * Idempotent — existsSync short-circuits when the file is present.
 * Retries on transient failures with linear backoff.
 */
export async function downloadPluginIfMissing(url: string, filename: string): Promise<void> {
    const destination = path.join(FIXTURES_DIR, filename);
    if (existsSync(destination)) {
        return;
    }

    await mkdir(FIXTURES_DIR, {recursive: true});

    let lastError: unknown;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
        try {
            const response = await client.get(url, {
                responseType: 'arraybuffer',
                timeout: TIMEOUT_MS,
            });
            await writeFile(destination, Buffer.from(response.data));
            return;
        } catch (err) {
            lastError = err;
            if (attempt < MAX_ATTEMPTS) {
                await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
            }
        }
    }
    throw new Error(`Failed to download ${url} after ${MAX_ATTEMPTS} attempts: ${String(lastError)}`);
}
