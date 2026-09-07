// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig} from 'axios';

import client, {isPreConnectionFailure, PRE_CONNECTION_MAX_RETRIES} from './client';

const URL = 'http://unit-test.invalid/api/v4/channels';
const BODY = {name: 'channel-1'};

type Step = {code: string} | {status: number; data?: unknown};
type CallCounter = {calls: number};

// Adapter that replays `script` in order and holds the last step forever, so a single-step
// script models "fails every time". Errors are raised the way axios' http adapter raises
// them: an AxiosError carrying `code` and `config`, with `response` only for HTTP answers.
const scriptedAdapter = (script: readonly Step[], counter: CallCounter): AxiosAdapter => async (config: InternalAxiosRequestConfig) => {
    const step = script[Math.min(counter.calls, script.length - 1)]!;
    counter.calls++;

    if ('code' in step) {
        throw new AxiosError(`${step.code} ${config.url}`, step.code, config);
    }

    const response: AxiosResponse = {data: step.data ?? {}, status: step.status, statusText: '', headers: {}, config};
    if (step.status >= 400) {
        throw new AxiosError(`Request failed with status code ${step.status}`, AxiosError.ERR_BAD_REQUEST, config, undefined, response);
    }
    return response;
};

const post = (script: readonly Step[], counter: CallCounter) => client.post(URL, BODY, {adapter: scriptedAdapter(script, counter)});

describe('server_api client pre-connection retry', () => {
    it('should classify only response-less DNS / connect failures as pre-connection', () => {
        assert.equal(isPreConnectionFailure({code: 'ENOTFOUND'}), true);
        assert.equal(isPreConnectionFailure({code: 'ECONNREFUSED'}), true);
        assert.equal(isPreConnectionFailure({code: 'ECONNRESET'}), false, 'a reset can happen after the request was sent');
        assert.equal(isPreConnectionFailure({code: 'ECONNABORTED'}), false, 'timeouts are owned by the timeout interceptor');
        assert.equal(isPreConnectionFailure({code: 'ENOTFOUND', response: {status: 502}}), false, 'an HTTP answer means the request was sent');
    });

    it('should replay a POST after DNS failures and return the eventual answer', async () => {
        const counter: CallCounter = {calls: 0};
        const response = await post([{code: 'ENOTFOUND'}, {code: 'ENOTFOUND'}, {status: 201, data: {id: 'c1'}}], counter);

        assert.equal(counter.calls, 3, 'two failed attempts then the success');
        assert.equal(response.status, 201);
        assert.deepEqual(response.data, {id: 'c1'});
    });

    it('should give up after PRE_CONNECTION_MAX_RETRIES and surface the original error', async () => {
        const counter: CallCounter = {calls: 0};
        await assert.rejects(post([{code: 'ECONNREFUSED'}], counter), (error: AxiosError) => error.code === 'ECONNREFUSED' && error.response === undefined);

        assert.equal(counter.calls, 1 + PRE_CONNECTION_MAX_RETRIES, 'the first attempt plus every retry');
    });

    it('should not replay a POST on an ambiguous socket error', async () => {
        const counter: CallCounter = {calls: 0};
        await assert.rejects(post([{code: 'ECONNRESET'}], counter), (error: AxiosError) => error.code === 'ECONNRESET');

        assert.equal(counter.calls, 1, 'the request may have reached the server, so it must not be replayed');
    });

    it('should not replay a POST the server answered', async () => {
        const counter: CallCounter = {calls: 0};
        await assert.rejects(post([{status: 400, data: {message: 'bad request'}}], counter), (error: AxiosError) => error.response?.status === 400);

        assert.equal(counter.calls, 1);
    });
});
