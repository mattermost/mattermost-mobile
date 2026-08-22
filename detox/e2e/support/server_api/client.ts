// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import http from 'http';
import https from 'https';

import {adminPassword, adminUsername} from '@support/test_config';
import axios from 'axios';
import {wrapper} from 'axios-cookiejar-support';
import {CookieJar} from 'tough-cookie';

// Force IPv4 — axios-cookiejar-support v5 uses global agents.
(http.globalAgent as any).options.family = 4;
(https.globalAgent as any).options.family = 4;

const jar = new CookieJar();

// Bound hung TCP / silent Cloudflare stalls. Without a client timeout, apiCreatePost
// can sit in test_fn until Jest's 300s cap with zero Detox UI actions.
const REQUEST_TIMEOUT_MS = 45_000;

/**
 * Wall-clock ceiling for ALL retries of a single logical request, across every
 * interceptor below.
 *
 * Attempt counts alone are not a bound when each attempt can burn the full 45s
 * timeout: 1 + 3 timeout retries is 180s of retrying, and an outer layer
 * (retryTransient in setup.ts, withTransportRetry) multiplies that again. A
 * measured example — CI run 32543957273, iOS shard 3, search_messages.e2e.ts —
 * spent its entire 300s beforeAll on two POST /api/v4/teams attempts that each
 * timed out four times, and died with a bare "Exceeded timeout of 300000 ms for a
 * hook" instead of a diagnosable network error. Every other spec on that shard
 * and server passed.
 *
 * 90s leaves room for exactly one more full-timeout attempt, while a fast failure
 * (a 502 in 2s) still gets several. Retries never start unless the remaining
 * budget can cover another whole attempt, so the ceiling is a real bound rather
 * than a target that the last attempt overshoots.
 */
export const RETRY_BUDGET_MS = 90_000;

type RetryBudgetConfig = {_retryDeadlineAt?: number};

/**
 * True when there is room for another whole attempt. Stamps the deadline on first
 * use so the budget covers the retry sequence, not each retry in isolation.
 */
const hasRetryBudget = (config: RetryBudgetConfig, attemptCostMs = REQUEST_TIMEOUT_MS): boolean => {
    const now = Date.now();
    if (config._retryDeadlineAt === undefined) {
        config._retryDeadlineAt = now + RETRY_BUDGET_MS;
    }
    return config._retryDeadlineAt - now >= attemptCostMs;
};

const baseClient = wrapper(axios.create({
    headers: {'X-Requested-With': 'XMLHttpRequest'},
    jar,
    timeout: REQUEST_TIMEOUT_MS,
}));

// Add request interceptor to handle CSRF tokens
baseClient.interceptors.request.use(async (config) => {
    // Extract CSRF token from MMCSRF cookie and add as header
    const cookies = jar.getCookiesSync(config.url || '');
    const csrfCookie = cookies.find((cookie) => cookie.key === 'MMCSRF');

    if (csrfCookie && csrfCookie.value) {
        config.headers = config.headers || {};
        config.headers['X-CSRF-Token'] = csrfCookie.value;
    }

    return config;
});

// Auto-retry on 401 by re-logging in as admin.
let isRetrying = false;
baseClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Retry once on 401.
        if (
            error.response?.status === 401 &&
            !originalRequest._retried &&
            !isRetrying &&
            !originalRequest.url?.endsWith('/api/v4/users/login')
        ) {
            originalRequest._retried = true;
            isRetrying = true;

            try {
                await clearCookies();
                await baseClient.post(
                    `${originalRequest.url?.split('/api/')[0]}/api/v4/users/login`,
                    {login_id: adminUsername, password: adminPassword},
                );

                console.info('🔄 Admin session refreshed after 401'); // eslint-disable-line no-console
                return baseClient(originalRequest);
            } catch (retryErr) {
                return Promise.reject(retryErr);
            } finally {
                isRetrying = false;
            }
        }

        return Promise.reject(error);
    },
);

/**
 * A timed-out request produced no response, so we cannot tell whether the server
 * committed it. Replaying is only safe for idempotent methods; a POST that timed
 * out may well have created the team/channel/post already, and replaying it
 * duplicates the record. Non-idempotent callers that want a retry ask for one
 * explicitly (see withTransportRetry's allowNonIdempotent).
 *
 * A non-replayable body (a stream or FormData) is single-use: it has already been
 * consumed by the failed attempt, so a replay would send an empty or truncated
 * request. Those are never retried regardless of method.
 */
const isReplayableBody = (data: unknown): boolean => {
    if (data === undefined || data === null) {
        return true;
    }
    if (typeof data === 'string' || typeof data === 'object') {
        const ctor = (data as {constructor?: {name?: string}}).constructor?.name ?? '';
        if (ctor === 'FormData' || ctor === 'ReadStream' || ctor === 'Readable') {
            return false;
        }
        return typeof (data as {pipe?: unknown}).pipe !== 'function';
    }
    return true;
};

// Retry client-side timeouts (no HTTP response). A 30–45s hang is a dropped
// TCP/Cloudflare stall, not a committed write we can observe.
baseClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config as typeof error.config & {_timeoutRetries?: number; _retryDeadlineAt?: number};
        const timedOut = !error.response && (
            error.code === 'ECONNABORTED' ||
            String(error.message || '').includes('timeout')
        );
        const replayable = Boolean(config) &&
            IDEMPOTENT_METHODS.has((config.method ?? 'get').toLowerCase()) &&
            isReplayableBody(config.data);

        if (timedOut && replayable && hasRetryBudget(config)) {
            config._timeoutRetries = (config._timeoutRetries ?? 0) + 1;
            const delay = config._timeoutRetries * 1000;
            console.warn(`[client] request timeout — retry ${config._timeoutRetries} for ${config.method} ${config.url} in ${delay}ms`); // eslint-disable-line no-console
            await new Promise((r) => setTimeout(r, delay)); // eslint-disable-line no-promise-executor-return
            return baseClient(config);
        }
        return Promise.reject(error);
    },
);

/** Cloudflare edge failures — 520–524 stay retryable alongside the gateway 5xx below. */
const CLOUDFLARE_EDGE_STATUSES: ReadonlySet<number> = new Set([520, 521, 522, 523, 524]);

const TRANSIENT_HTTP_STATUSES: ReadonlySet<number> = new Set([502, 503, 504, ...CLOUDFLARE_EDGE_STATUSES]);

/**
 * Cloudflare could not reach the origin, so the request provably had no side effect.
 * 522 is excluded: the connection can also time out after the origin accepted the request.
 */
const PRE_ORIGIN_STATUSES: ReadonlySet<number> = new Set([521, 523]);

const IDEMPOTENT_METHODS: ReadonlySet<string> = new Set(['get', 'head', 'options']);

/** Gateway 5xx plus Cloudflare edge — shared with the apiInit retry layer in setup.ts. */
export const isTransientHttpStatus = (status?: number): status is number =>
    status !== undefined && TRANSIENT_HTTP_STATUSES.has(status);

/**
 * Upper bound for an honored Cloudflare `retry_after`; the advertised tens of seconds blow
 * Detox's 300s beforeAll budget. Shared with the apiInit retry layer in setup.ts.
 */
export const MAX_RETRY_AFTER_SEC = 3;

// Retry transient gateway / Cloudflare edge 5xx with short backoff.
baseClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config as typeof error.config & {_5xxRetries?: number; _retryDeadlineAt?: number};
        const status = error.response?.status;

        // A write may already have reached the origin behind 502/503/504 and CF 520/522/524, so
        // only idempotent methods are retried on those; CF 521/523 never reach the origin at all.
        const isSafeToRetry = isTransientHttpStatus(status) &&
            (IDEMPOTENT_METHODS.has((config.method ?? 'get').toLowerCase()) || PRE_ORIGIN_STATUSES.has(status));

        if (isSafeToRetry && hasRetryBudget(config, 0) && (config._5xxRetries ?? 0) < 3) {
            config._5xxRetries = (config._5xxRetries ?? 0) + 1;
            const retryAfterSec = Number(error.response?.data?.retry_after);
            const cappedRetryAfterMs = Number.isFinite(retryAfterSec) && retryAfterSec > 0 ?
                Math.min(retryAfterSec, MAX_RETRY_AFTER_SEC) * 1000 :
                0;
            const delay = cappedRetryAfterMs || (config._5xxRetries * 1000);
            console.warn(`[client] ${status} from server — retry ${config._5xxRetries}/3 in ${delay}ms`); // eslint-disable-line no-console
            await new Promise((r) => setTimeout(r, delay)); // eslint-disable-line no-promise-executor-return
            return baseClient(config);
        }
        return Promise.reject(error);
    },
);

// Retry cloud/inaccessible HTML responses during workspace cold starts.
baseClient.interceptors.response.use(
    async (response) => {
        const data = response.data;
        const isInaccessible = typeof data === 'string' && data.includes('cloud/inaccessible');

        if (!isInaccessible) {
            return response;
        }

        const config = response.config as typeof response.config & {_cloudInaccessibleRetries?: number; _retryDeadlineAt?: number};
        const attempts = (config._cloudInaccessibleRetries ?? 0) + 1;

        if (attempts > 3 || !hasRetryBudget(config, 0)) {
            return Promise.reject(new Error(`Server returned cloud/inaccessible HTML for ${config.url} (retries exhausted or retry budget spent)`));
        }

        config._cloudInaccessibleRetries = attempts;
        const delay = attempts * 3000;
        console.warn(`[client] cloud/inaccessible HTML from server — retry ${attempts}/3 in ${delay}ms for ${config.url}`); // eslint-disable-line no-console
        await new Promise((r) => setTimeout(r, delay));
        return baseClient(config);
    },
    (error) => Promise.reject(error),
);

export const clearCookies = async (): Promise<void> => {
    await jar.removeAllCookies();
};

export const client = baseClient;

export default client;
