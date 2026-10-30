// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'node:assert/strict';
import {afterEach, describe, it, type TestContext} from 'node:test';

import {AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig} from 'axios';

import {client} from './client';
import {apiEnableFeatureFlags, apiPatchFeatureFlags} from './system';

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

describe('apiPatchFeatureFlags', () => {
    afterEach(() => {
        client.defaults.adapter = previousAdapter;
    });

    it('should preserve current feature flags while applying the requested changes', async () => {
        const requests: InternalAxiosRequestConfig[] = [];
        const currentFlags = {
            ChannelAttributes: false,
            ClassificationMarkings: false,
            PermissionPolicies: true,
        };

        client.defaults.adapter = (async (config) => {
            requests.push(config);
            const data = config.method === 'get' ? {FeatureFlags: currentFlags} : {};
            return response(config, data);
        }) as AxiosAdapter;

        await apiPatchFeatureFlags(BASE_URL, {
            ChannelAttributes: true,
            InteractiveDialogAppsForm: true,
        });

        assert.equal(requests.length, 2);
        assert.equal(requests[0]?.method, 'get');
        assert.equal(requests[1]?.method, 'put');
        assert.deepEqual(JSON.parse(String(requests[1]?.data)), {
            FeatureFlags: {
                ChannelAttributes: true,
                ClassificationMarkings: false,
                PermissionPolicies: true,
                InteractiveDialogAppsForm: true,
            },
        });
    });

    it('should re-read current flags before retrying a write with a dropped response', async (t) => {
        t.mock.timers.enable({apis: ['setTimeout']});
        const requests: InternalAxiosRequestConfig[] = [];
        let reads = 0;
        let writes = 0;

        client.defaults.adapter = (async (config) => {
            requests.push(config);
            if (config.method === 'get') {
                reads += 1;
                const featureFlags = reads === 1 ? {PermissionPolicies: true} : {
                    PermissionPolicies: true,
                    ClassificationMarkings: true,
                };
                return response(config, {FeatureFlags: featureFlags});
            }

            writes += 1;
            if (writes === 1) {
                throw new AxiosError('socket hang up', 'ECONNRESET', config);
            }
            return response(config, {});
        }) as AxiosAdapter;

        const pending = apiPatchFeatureFlags(BASE_URL, {ChannelAttributes: true});
        await advanceRetryDelay(t);
        await pending;

        assert.deepEqual(requests.map(({method}) => method), ['get', 'put', 'get', 'put']);
        assert.deepEqual(JSON.parse(String(requests[3]?.data)), {
            FeatureFlags: {
                PermissionPolicies: true,
                ClassificationMarkings: true,
                ChannelAttributes: true,
            },
        });
    });

    it('should return a config read error without writing feature flags', async () => {
        const requests: InternalAxiosRequestConfig[] = [];

        client.defaults.adapter = (async (config) => {
            requests.push(config);
            const failedResponse = response(config, {message: 'forbidden'}, 403);
            throw new AxiosError('Request failed with status code 403', AxiosError.ERR_BAD_REQUEST, config, undefined, failedResponse);
        }) as AxiosAdapter;

        const result = await apiPatchFeatureFlags(BASE_URL, {ChannelAttributes: true});

        assert.equal(result.status, 403);
        assert.deepEqual(result.error, {message: 'forbidden'});
        assert.equal(requests.length, 1);
        assert.equal(requests[0]?.method, 'get');
    });

    it('should return an error without writing when the config body is empty', async () => {
        const requests: InternalAxiosRequestConfig[] = [];

        client.defaults.adapter = (async (config) => {
            requests.push(config);
            return response(config, undefined);
        }) as AxiosAdapter;

        const result = await apiPatchFeatureFlags(BASE_URL, {ChannelAttributes: true});

        assert.deepEqual(result.error, {message: 'getFeatureFlags: empty config response'});
        assert.equal(requests.length, 1);
        assert.equal(requests[0]?.method, 'get');
    });
});

describe('apiEnableFeatureFlags', () => {
    afterEach(() => {
        client.defaults.adapter = previousAdapter;
    });

    it('should retry a config read with a dropped response before writing', async (t) => {
        t.mock.timers.enable({apis: ['setTimeout']});
        const requests: InternalAxiosRequestConfig[] = [];
        let reads = 0;

        client.defaults.adapter = (async (config) => {
            requests.push(config);
            if (config.method === 'get') {
                reads += 1;
                if (reads === 1) {
                    throw new AxiosError('socket hang up', 'ECONNRESET', config);
                }
                return response(config, {FeatureFlags: {PermissionPolicies: false, ChannelAttributes: true}});
            }
            return response(config, {});
        }) as AxiosAdapter;

        const pending = apiEnableFeatureFlags(BASE_URL, ['PermissionPolicies']);
        await advanceRetryDelay(t);
        const result = await pending;

        assert.equal(result.error, undefined);
        assert.deepEqual(requests.map(({method}) => method), ['get', 'get', 'put']);
        assert.deepEqual(JSON.parse(String(requests[2]?.data)), {
            FeatureFlags: {PermissionPolicies: true, ChannelAttributes: true},
        });
    });
});
