// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {client, isHtmlInterstitialError} from './client';

import type {AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig} from 'axios';

/**
 * Trimmed from a real failure body in PR 10050's 40b8e5ea run: Cloudflare answered the Detox
 * runners' API calls with its bot check instead of proxying to Mattermost. Kept verbatim in the
 * parts that matter, because the defect this file guards was a matcher that did not recognise
 * this exact markup — a paraphrased fixture would not have caught it.
 */
const CHALLENGE_HTML = [
    '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">',
    '<title>Mattermost captcha challenge</title></head><body>',
    '<h1>Just a moment...</h1><h2>Enable JavaScript and cookies to continue</h2>',
    "<script>(function(){window._cf_chl_opt = {cFPWv: 'b'};})();</script>",
    '</body></html>',
].join('');

const COLD_START_HTML = '<!DOCTYPE html><html><body>cloud/inaccessible</body></html>';

const ok = (config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse => ({
    config, data, status, statusText: 'OK', headers: {},
});

/**
 * Installs an adapter that replays `steps` in order and holds the last one, then restores the
 * previous adapter. Driving the real instance means the interceptors under test run exactly as
 * they do in CI; only the transport is replaced.
 */
const withAdapter = async (
    steps: Array<{status: number; data: unknown}>,
    run: (calls: () => number) => Promise<void>,
) => {
    const previous = client.defaults.adapter;
    let calls = 0;

    const adapter: AxiosAdapter = async (config) => {
        const step = steps.at(Math.min(calls, steps.length - 1));
        assert.ok(step, 'adapter step fixture must exist');
        calls += 1;
        const response = ok(config, step.data, step.status);
        if (step.status >= 400) {
            const error = new Error(`Request failed with status code ${step.status}`) as Error & {
                config: InternalAxiosRequestConfig;
                response: AxiosResponse;
                isAxiosError: boolean;
            };
            error.config = config;
            error.response = response;
            error.isAxiosError = true;
            throw error;
        }
        return response;
    };

    client.defaults.adapter = adapter;
    try {
        await run(() => calls);
    } finally {
        client.defaults.adapter = previous;
    }
};

describe('client HTML interstitial retry', () => {
    it('retries a Cloudflare challenge served as 403 and returns the eventual API response', async () => {
        await withAdapter(
            [{status: 403, data: CHALLENGE_HTML}, {status: 200, data: {status: 'OK'}}],
            async (calls) => {
                const response = await client.get('http://example.test/api/v4/system/ping');

                assert.deepEqual(response.data, {status: 'OK'});
                assert.equal(calls(), 2, 'the challenge should have been retried exactly once');
            },
        );
    });

    it('retries a cold-start page served as 200, which axios resolves rather than rejects', async () => {
        await withAdapter(
            [{status: 200, data: COLD_START_HTML}, {status: 200, data: {status: 'OK'}}],
            async (calls) => {
                const response = await client.get('http://example.test/api/v4/system/ping');

                assert.deepEqual(response.data, {status: 'OK'});
                assert.equal(calls(), 2);
            },
        );
    });

    it('leaves an ordinary 403 alone, so a real permission error still fails fast', async () => {
        await withAdapter(
            [{status: 403, data: {id: 'api.context.permissions.app_error', status_code: 403}}],
            async (calls) => {
                await assert.rejects(() => client.get('http://example.test/api/v4/system/ping'));
                assert.equal(calls(), 1, 'a JSON 403 must not be retried');
            },
        );
    });

    it('reports an exhausted interstitial as such, so apiInit can spend its own budget on it', () => {
        assert.equal(isHtmlInterstitialError(new Error('Server returned "_cf_chl_opt" HTML for /x (retries exhausted or retry budget spent)')), true);
        assert.equal(isHtmlInterstitialError(new Error('Request failed with status code 403')), false);
        assert.equal(isHtmlInterstitialError(undefined), false);
    });
});
