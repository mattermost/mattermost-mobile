// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import http from 'http';
import https from 'https';

import {adminPassword, adminUsername} from '@support/test_config';
import axios, {type InternalAxiosRequestConfig} from 'axios';
import {wrapper} from 'axios-cookiejar-support';
import {CookieJar} from 'tough-cookie';

import {logError} from '../../../provision/log';

// Force IPv4 — axios-cookiejar-support v5 uses global agents.
(http.globalAgent as any).options.family = 4;
(https.globalAgent as any).options.family = 4;

const jar = new CookieJar();

// Bound hung TCP / silent Cloudflare stalls. Without a client timeout, apiCreatePost
// can sit in test_fn until Jest's 300s cap with zero Detox UI actions.
const REQUEST_TIMEOUT_MS = 45_000;

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
            logError(`[client] request timeout — retry ${config._timeoutRetries} for ${config.method} ${config.url} in ${delay}ms`);
            await new Promise((r) => setTimeout(r, delay)); // eslint-disable-line no-promise-executor-return
            return baseClient(config);
        }
        return Promise.reject(error);
    },
);

/**
 * Name resolution failures for a freshly provisioned test server. Unlike a timeout, these
 * are provably side-effect-free — the request never left the machine — so a POST is as safe
 * to replay as a GET, and the idempotency rule above does not apply.
 */
const DNS_ERROR_CODES: ReadonlySet<string> = new Set(['ENOTFOUND', 'EAI_AGAIN']);

const DNS_RETRY_COST_MS = 5_000;

baseClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config as typeof error.config & {_dnsRetries?: number; _retryDeadlineAt?: number};
        const unresolved = !error.response && DNS_ERROR_CODES.has(String(error.code ?? ''));

        if (unresolved && config && isReplayableBody(config.data) && hasRetryBudget(config, DNS_RETRY_COST_MS)) {
            config._dnsRetries = (config._dnsRetries ?? 0) + 1;
            const delay = config._dnsRetries * 2000;
            logError(`[client] ${error.code} — retry ${config._dnsRetries} for ${config.method} ${config.url} in ${delay}ms`);
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
            logError(`[client] ${status} from server — retry ${config._5xxRetries}/3 in ${delay}ms`);
            await new Promise((r) => setTimeout(r, delay)); // eslint-disable-line no-promise-executor-return
            return baseClient(config);
        }
        return Promise.reject(error);
    },
);

/**
 * HTML the edge returns *in place of* the API. Two kinds appear against the ephemeral test
 * servers: the cloud cold-start page, and Cloudflare's bot check ("Just a moment…"). Like the
 * DNS block above — and unlike a timeout — both are provably side-effect-free: the request was
 * answered at the edge and never reached Mattermost, so replaying a POST is as safe as a GET.
 *
 * Matched on the body, not the status. The cold-start page can arrive with a 2xx while a
 * challenge is usually 403 or 503, so no status set covers both; 403 in particular is not, and
 * should not become, a globally retryable status. Only `cloud/inaccessible` used to be matched
 * here, which is how a challenge reached callers as though it were a response body — surfacing
 * downstream as "server is not healthy", "Failed to create team", and TypeErrors dereferencing
 * fixtures the API had never created.
 */
const HTML_INTERSTITIAL_MARKERS: readonly string[] = [
    'cloud/inaccessible',
    '_cf_chl_opt',
    'cf-browser-verification',
    'captcha challenge',
    'Just a moment',
];

const MAX_INTERSTITIAL_RETRIES = 3;

type InterstitialConfig = InternalAxiosRequestConfig & {_htmlInterstitialRetries?: number; _retryDeadlineAt?: number};

const interstitialMarkerIn = (data: unknown): string | undefined => (
    typeof data === 'string' ? HTML_INTERSTITIAL_MARKERS.find((marker) => data.includes(marker)) : undefined
);

/**
 * True for the error `retryInterstitial` throws once its own attempts are spent. Exported so
 * the apiInit retry layer in setup.ts can treat an edge interstitial as transient and spend
 * its own budget on it — a challenge can outlast this interceptor's ~18s of backoff.
 */
export const isHtmlInterstitialError = (error: unknown): boolean => {
    const message = typeof error === 'string' ? error : String((error as {message?: unknown})?.message ?? '');
    return message.startsWith('Server returned "') && message.includes('HTML for ');
};

const retryInterstitial = async (config: InterstitialConfig, marker: string) => {
    const attempts = (config._htmlInterstitialRetries ?? 0) + 1;

    if (attempts > MAX_INTERSTITIAL_RETRIES || !hasRetryBudget(config, 0)) {
        throw new Error(`Server returned "${marker}" HTML for ${config.url} (retries exhausted or retry budget spent)`);
    }

    config._htmlInterstitialRetries = attempts;

    // A managed challenge clears in seconds once the edge is satisfied, so back off in whole
    // seconds rather than the sub-second steps used for gateway 5xx.
    const delay = attempts * 3000;
    logError(`[client] "${marker}" HTML from server — retry ${attempts}/${MAX_INTERSTITIAL_RETRIES} in ${delay}ms for ${config.url}`);
    await new Promise((r) => setTimeout(r, delay)); // eslint-disable-line no-promise-executor-return
    return baseClient(config);
};

// Both axios paths are covered: a 2xx interstitial resolves and lands on the success handler,
// while a 403/503 challenge rejects and lands on the error handler.
baseClient.interceptors.response.use(
    async (response) => {
        const marker = interstitialMarkerIn(response.data);
        if (!marker) {
            return response;
        }
        return retryInterstitial(response.config as InterstitialConfig, marker);
    },
    async (error) => {
        const marker = interstitialMarkerIn(error.response?.data);
        if (!marker || !error.config) {
            return Promise.reject(error);
        }
        return retryInterstitial(error.config as InterstitialConfig, marker);
    },
);

export const clearCookies = async (): Promise<void> => {
    await jar.removeAllCookies();
};

export const client = baseClient;

export default client;
