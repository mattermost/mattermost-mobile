// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'node:assert/strict';
import {afterEach, describe, it, type TestContext} from 'node:test';

import {AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig} from 'axios';

import {client} from './server_api/client';
import {transportFor} from './server_baseline';

const BASE_URL = 'http://unit-test.invalid';
const previousAdapter = client.defaults.adapter;

const response = (config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse => ({
    config,
    data,
    status,
    statusText: '',
    headers: {},
});

const advanceRetryDelay = async (t: TestContext) => {
    await new Promise<void>((resolve) => {
        setImmediate(resolve);
    });
    t.mock.timers.tick(2000);
    await new Promise<void>((resolve) => {
        setImmediate(resolve);
    });
};

describe('baseline transport', () => {
    afterEach(() => {
        client.defaults.adapter = previousAdapter;
    });

    it('should retry a GET with a dropped response', async (t) => {
        t.mock.timers.enable({apis: ['setTimeout']});
        let calls = 0;
        client.defaults.adapter = (async (config) => {
            calls += 1;
            if (calls === 1) {
                throw new AxiosError('socket hang up', 'ECONNRESET', config);
            }
            return response(config, {ok: true});
        }) as AxiosAdapter;

        const pending = transportFor(BASE_URL).request('GET', '/api/v4/config');
        await advanceRetryDelay(t);

        assert.deepEqual(await pending, {status: 200, data: {ok: true}});
        assert.equal(calls, 2);
    });

    it('should not replay a write with a dropped response', async () => {
        let calls = 0;
        client.defaults.adapter = (async (config) => {
            calls += 1;
            throw new AxiosError('socket hang up', 'ECONNRESET', config);
        }) as AxiosAdapter;

        await assert.rejects(transportFor(BASE_URL).request('PATCH', '/api/v4/config/patch', {}), /socket hang up/);
        assert.equal(calls, 1);
    });

    it('should return an HTTP error response instead of throwing', async () => {
        let calls = 0;
        client.defaults.adapter = (async (config) => {
            calls += 1;
            throw new AxiosError('Request failed with status code 404', 'ERR_BAD_REQUEST', config, undefined, response(config, {message: 'not found'}, 404));
        }) as AxiosAdapter;

        assert.deepEqual(await transportFor(BASE_URL).request('GET', '/api/v4/plugins/x'), {status: 404, data: {message: 'not found'}});
        assert.equal(calls, 1);
    });
});
