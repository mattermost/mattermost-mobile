// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import http from 'http';
import https from 'https';

import {adminPassword, adminUsername} from '@support/test_config';
import axios from 'axios';
import {wrapper} from 'axios-cookiejar-support';
import {CookieJar} from 'tough-cookie';

// Force IPv4 to avoid IPv6 connection timeouts in CI environments
// where the test server is behind Cloudflare and IPv6 is unreachable.
// Set on global agents because axios-cookiejar-support v5 does not
// support custom httpAgent/httpsAgent (it uses its own internally).
(http.globalAgent as any).options.family = 4;
(https.globalAgent as any).options.family = 4;

const jar = new CookieJar();
const baseClient = wrapper(axios.create({
    headers: {'X-Requested-With': 'XMLHttpRequest'},
    jar,
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

// Add response interceptor to auto-retry on 401 by re-logging in as admin.
// This prevents flaky CI failures when the admin session expires between test files.
let isRetrying = false;
baseClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Only retry once, only on 401, and never retry the login endpoint itself
        if (
            error.response?.status === 401 &&
            !originalRequest._retried &&
            !isRetrying &&
            !originalRequest.url?.endsWith('/api/v4/users/login')
        ) {
            originalRequest._retried = true;
            isRetrying = true;

            try {
                // Clear stale cookies before re-login
                await clearCookies();

                // Re-login as admin
                await baseClient.post(
                    `${originalRequest.url?.split('/api/')[0]}/api/v4/users/login`,
                    {login_id: adminUsername, password: adminPassword},
                );

                console.info('🔄 Admin session refreshed after 401'); // eslint-disable-line no-console

                // Retry the original request
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

// Add response interceptor to retry on transient 5xx server errors (502, 503, 504).
// During beforeAll API calls a single 502 from Cloudflare/the server would otherwise
// cause the whole test suite to fail. Linear backoff: 1s, 2s, 3s.
baseClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config;
        const status = error.response?.status;
        const isTransient = status === 502 || status === 503 || status === 504;

        if (isTransient && (config._5xxRetries ?? 0) < 3) {
            config._5xxRetries = (config._5xxRetries ?? 0) + 1;
            const delay = config._5xxRetries * 1000;
            console.warn(`[client] ${status} from server — retry ${config._5xxRetries}/3 in ${delay}ms`); // eslint-disable-line no-console
            await new Promise((r) => setTimeout(r, delay)); // eslint-disable-line no-promise-executor-return
            return baseClient(config);
        }
        return Promise.reject(error);
    },
);

/**
 * Remove all cookies from the jar.
 * Call before login to prevent stale session/CSRF tokens from interfering.
 */
export const clearCookies = async (): Promise<void> => {
    await jar.removeAllCookies();
};

export const client = baseClient;

export default client;
