// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import '../unit_test_env/legacy_ci';

import assert from 'node:assert/strict';
import {afterEach, describe, it} from 'node:test';

import {AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig} from 'axios';

import {apiAdminLoginClearingLockout} from '../admin_lockout';
import {specOwnsServerSetup} from '../server_role';

import {client} from './client';
import {AgentsPlugin, CallsPlugin, DemoPlugin} from './plugin';
import {ensureAgentsPlugin, ensureCallsPlugin, ensureCustomProfileAttributeFields, ensureDemoPlugin} from './server_setup';

const BASE_URL = 'http://unit-test.invalid';
const previousAdapter = client.defaults.adapter;

type Request = {method: string; path: string; body: any};

const response = (config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse => ({
    config,
    data,
    status,
    statusText: '',
    headers: {},
});

/** A provisioned-or-not legacy server; every request other than a read or the admin login counts as a write. */
const fakeServer = ({active = [] as string[], inactive = [] as string[], fields = [] as string[], loginErrorId = ''} = {}) => {
    const requests: Request[] = [];
    client.defaults.adapter = (async (config) => {
        const method = config.method?.toUpperCase() ?? 'GET';
        const path = (config.url ?? '').replace(BASE_URL, '');
        const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
        requests.push({method, path, body});
        if (path === '/api/v4/users/login') {
            if (loginErrorId) {
                throw new AxiosError('login failed', 'ERR_BAD_REQUEST', config, undefined, response(config, {id: loginErrorId}, 401));
            }
            return response(config, {id: 'admin'});
        }
        if (path === '/api/v4/plugins') {
            return response(config, {active: active.map((id) => ({id})), inactive: inactive.map((id) => ({id}))});
        }
        if (path === '/api/v4/plugins/statuses') {
            return response(config, [...active.map((id) => ({plugin_id: id, state: 2})), ...inactive.map((id) => ({plugin_id: id, state: 0}))]);
        }
        if (path === '/api/v4/custom_profile_attributes/fields') {
            return response(config, fields.map((name) => ({id: `${name}-id`, name})));
        }
        return response(config, {});
    }) as AxiosAdapter;
    return {
        requests,
        writes: () => requests.filter(({method, path}) => method !== 'GET' && path !== '/api/v4/users/login'),
    };
};

describe('server setup on the legacy CI pipeline', () => {
    afterEach(() => {
        client.defaults.adapter = previousAdapter;
    });

    it('should not own server setup', () => {
        assert.equal(specOwnsServerSetup, false);
    });

    it('should throw for an inactive demo plugin without enabling or uploading it', async () => {
        const server = fakeServer({inactive: [DemoPlugin.id]});

        await assert.rejects(ensureDemoPlugin(BASE_URL), /is not active\. Run Detox server provisioning/);
        assert.deepEqual(server.writes(), []);
    });

    it('should accept an active demo plugin without touching its settings', async () => {
        const server = fakeServer({active: [DemoPlugin.id]});

        await ensureDemoPlugin(BASE_URL);
        assert.deepEqual(server.writes(), []);
        assert.equal(server.requests.some(({path}) => path === '/api/v4/config'), false);
    });

    it('should throw for a stopped Calls plugin without enabling it', async () => {
        const server = fakeServer({inactive: [CallsPlugin.id]});

        await assert.rejects(ensureCallsPlugin(BASE_URL), /is not running.*provisioning/);
        assert.deepEqual(server.writes(), []);
    });

    it('should report whether Agents is active without installing or enabling it', async () => {
        const missing = fakeServer();
        assert.equal(await ensureAgentsPlugin(BASE_URL), false);
        assert.deepEqual(missing.writes(), []);

        fakeServer({active: [AgentsPlugin.id]});
        assert.equal(await ensureAgentsPlugin(BASE_URL), true);
    });

    it('should report missing profile fields without creating them', async () => {
        const server = fakeServer({fields: ['Bio']});

        const reason = await ensureCustomProfileAttributeFields(BASE_URL, ['Bio', 'Department', 'Team']);

        assert.equal(reason, 'Missing provisioned fields: Department, Team');
        assert.deepEqual(server.writes(), []);
    });

    it('should return the admin login error without retrying by email', async () => {
        const server = fakeServer({loginErrorId: 'api.user.login.invalid_credentials_email'});

        const result = await apiAdminLoginClearingLockout(BASE_URL);

        assert.equal(result.error?.id, 'api.user.login.invalid_credentials_email');
        assert.equal(server.requests.length, 1);
    });
});
