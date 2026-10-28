// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {applyBaseline, formatBaselineReport, verifyBaseline, type BaselineReport, type BaselineTransport} from '../shared/server-baseline';

import {sleep} from './http-client';
import {logInfo, logWarn} from './log';

import type {MattermostClient} from './types';

const REQUEST_MAX_ATTEMPTS = 3;
const REQUEST_RETRY_BASE_DELAY_MS = 2_000;

export async function getServerMmVersion(client: MattermostClient, token: string): Promise<string> {
    const res = await client.request<{Version?: string; version?: string}>('GET', '/api/v4/config/client?format=old', undefined, token);
    if (res.status >= 400) {
        logWarn('Could not read server version — assuming 0.0.0.');
        return '0.0.0';
    }

    return res.data?.Version || res.data?.version || '0.0.0';
}

/** Admin transport for the baseline: retries transport errors and 5xx, as the old config patch did. */
export function createBaselineTransport(client: MattermostClient, token: string): BaselineTransport {
    /* eslint-disable no-await-in-loop -- retry sequence */
    return {
        async request<T = any>(method: 'GET' | 'PUT' | 'POST' | 'DELETE' | 'PATCH', path: string, body?: unknown) {
            for (let attempt = 1; ; attempt++) {
                try {
                    const response = await client.request<T>(method, path, body, token);
                    if (response.status < 500 || attempt === REQUEST_MAX_ATTEMPTS) {
                        return {status: response.status, data: response.data};
                    }

                    logWarn(`${method} ${path} returned HTTP ${response.status}; retrying (${attempt}/${REQUEST_MAX_ATTEMPTS})...`);
                } catch (error) {
                    if (attempt === REQUEST_MAX_ATTEMPTS) {
                        throw error;
                    }

                    const detail = error instanceof Error ? error.message : String(error);
                    logWarn(`${method} ${path} failed (${detail}); retrying (${attempt}/${REQUEST_MAX_ATTEMPTS})...`);
                }

                await sleep(REQUEST_RETRY_BASE_DELAY_MS * attempt);
            }
        },
    };
    /* eslint-enable no-await-in-loop */
}

function logReport(label: string, report: BaselineReport): void {
    formatBaselineReport(report).split('\n').forEach((line) => {
        if (report.ok) {
            logInfo(`${label}: ${line}`);
        } else {
            logWarn(`${label}: ${line}`);
        }
    });
}

/** Applies the baseline (with leftover E2E cleanup). Throws when the server cannot be brought to the baseline. */
export async function applyProvisionBaseline(client: MattermostClient, token: string, serverUrl: string, serverVersion: string): Promise<void> {
    logInfo(`Applying server baseline (server ${serverVersion})...`);
    const report = await applyBaseline(createBaselineTransport(client, token), {serverUrl, log: logInfo});
    logReport('Baseline apply', report);
    if (!report.ok) {
        throw new Error('Server baseline could not be applied; see the report above.');
    }
}

/** Read-only check of the baseline, including client-side flag propagation. Throws when it does not hold. */
export async function verifyProvisionBaseline(client: MattermostClient, token: string, serverUrl: string): Promise<void> {
    logInfo('Verifying server baseline...');
    const report = await verifyBaseline(createBaselineTransport(client, token), {serverUrl});
    logReport('Baseline verify', report);
    if (!report.ok) {
        throw new Error('Server baseline verification failed; see the report above.');
    }
}
