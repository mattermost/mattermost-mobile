// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import axios from 'axios';

import {
    applyBaseline,
    formatBaselineReport,
    inspectBaselineKeys,
    isBaselineKey,
    type BaselineReport,
    type BaselineTransport,
} from '../../shared/server-baseline';

import {apiAdminLoginClearingLockout, clearAdminLockout} from './admin_lockout';
import client from './server_api/client';
import {withTransportRetry} from './utils/transport_retry';

/* eslint-disable no-console, no-process-env */

type BaselineMethod = 'GET' | 'PUT' | 'POST' | 'DELETE' | 'PATCH';

async function sendBaselineRequest<T>(baseUrl: string, method: BaselineMethod, path: string, body?: unknown) {
    const requestOnce = async (): Promise<{response?: {status: number; data: T}; error?: unknown; status?: number}> => {
        try {
            const res = await client.request<T>({method, url: `${baseUrl}${path}`, data: body});
            return {response: {status: res.status, data: res.data}};
        } catch (error) {
            if (axios.isAxiosError(error) && error.response) {
                return {response: {status: error.response.status, data: error.response.data as T}};
            }
            return {error, status: 0};
        }
    };

    // Only reads are retried; a short budget keeps several reads inside one beforeAll.
    const result = method === 'GET' ? await withTransportRetry(requestOnce, {idempotent: true, label: `baseline GET ${path}`, budgetMs: 30_000}) : await requestOnce();
    if (!result.response) {
        throw result.error;
    }
    return result.response;
}

/**
 * Adapts the E2E axios client to the baseline transport. Non-2xx responses are returned, not thrown.
 * With clearLockout, a 4xx caused by an admin lockout is cleared and the request sent once more.
 */
export const transportFor = (baseUrl: string, {clearLockout = false} = {}): BaselineTransport => ({
    async request<T = any>(method: BaselineMethod, path: string, body?: unknown) {
        const response = await sendBaselineRequest<T>(baseUrl, method, path, body);
        if (clearLockout && response.status >= 400 && response.status < 500 && await clearAdminLockout(baseUrl, response.data)) {
            return sendBaselineRequest<T>(baseUrl, method, path, body);
        }
        return response;
    },
});

async function loginAsAdmin(baseUrl: string): Promise<void> {
    const {error} = await apiAdminLoginClearingLockout(baseUrl);
    if (error) {
        throw new Error(`server baseline: admin login failed: ${JSON.stringify(error)}`);
    }
}

/** Drives the server to the baseline, including leftover E2E cleanup. Throws unless the baseline is fully met. */
export async function applyServerBaseline(baseUrl: string): Promise<BaselineReport> {
    await loginAsAdmin(baseUrl);
    const report = await applyBaseline(transportFor(baseUrl, {clearLockout: true}), {serverUrl: baseUrl});
    if (!report.ok) {
        throw new Error(formatBaselineReport(report));
    }
    return report;
}

/** CI throws on drift (each spec file's setup applies the baseline first); locally drifted keys are applied without cleanup, and a failed apply throws. */
export async function assertServerBaseline(baseUrl: string, keys: string[]): Promise<void> {
    const unknown = keys.filter((key) => !isBaselineKey(key));
    if (unknown.length > 0) {
        throw new Error(`assertServerBaseline: not part of the server baseline: ${unknown.join(', ')}`);
    }

    await loginAsAdmin(baseUrl);
    const transport = transportFor(baseUrl);
    const statuses = await inspectBaselineKeys(transport, {serverUrl: baseUrl, keys});
    const drift = statuses.filter((status) => !status.matches);
    if (drift.length === 0) {
        return;
    }

    if (process.env.CI === 'true') {
        const [first, ...rest] = drift;
        const more = rest.length > 0 ? ` (and ${rest.length} more: ${rest.map((item) => item.key).join(', ')})` : '';
        throw new Error(
            `server not at baseline: ${first?.key} expected ${first?.expected} got ${first?.actual} — applyServerBaseline must run first${more}`,
        );
    }

    const driftKeys = drift.map((status) => status.key);
    console.warn(`[server_baseline] applying baseline locally for: ${driftKeys.join(', ')}`);
    const report = await applyBaseline(transport, {serverUrl: baseUrl, only: driftKeys, cleanup: false});
    if (!report.ok) {
        throw new Error(formatBaselineReport(report));
    }
}
