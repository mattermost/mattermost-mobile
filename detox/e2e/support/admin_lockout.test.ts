// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'node:assert/strict';
import {afterEach, describe, it} from 'node:test';

import {AxiosError, type AxiosAdapter, type AxiosResponse, type InternalAxiosRequestConfig} from 'axios';

import {apiAdminLoginClearingLockout} from './admin_lockout';
import {client} from './server_api/client';
import {transportFor} from './server_baseline';
import {adminEmail} from './test_config';

const BASE_URL = 'http://unit-test.invalid';
const TEAM_DOMAIN_LOCKOUT = 'api.team.is_team_creation_allowed.domain.app_error';
const previousAdapter = client.defaults.adapter;

type Request = {method?: string; path: string; body: any};

const response = (config: InternalAxiosRequestConfig, data: unknown, status = 200): AxiosResponse => ({
    config,
    data,
    status,
    statusText: '',
    headers: {},
});

const fail = (config: InternalAxiosRequestConfig, status: number, id: string) => {
    throw new AxiosError('request failed', 'ERR_BAD_REQUEST', config, undefined, response(config, {id, status_code: status}, status));
};

const fakeServer = (handle: (request: Request, config: InternalAxiosRequestConfig) => AxiosResponse) => {
    const requests: Request[] = [];
    client.defaults.adapter = (async (config) => {
        const request = {
            method: config.method?.toUpperCase(),
            path: (config.url ?? '').replace(BASE_URL, ''),
            body: typeof config.data === 'string' ? JSON.parse(config.data) : config.data,
        };
        requests.push(request);
        return handle(request, config);
    }) as AxiosAdapter;
    return requests;
};

describe('admin lockout', () => {
    afterEach(() => {
        client.defaults.adapter = previousAdapter;
    });

    it('should clear a team-domain lockout and resend the baseline request once', async () => {
        let teamCreates = 0;
        const requests = fakeServer((request, config) => {
            if (request.path === '/api/v4/teams' && ++teamCreates === 1) {
                return fail(config, 403, TEAM_DOMAIN_LOCKOUT);
            }
            return response(config, {});
        });

        const result = await transportFor(BASE_URL, {clearLockout: true}).request('POST', '/api/v4/teams', {name: 'team'});

        assert.equal(result.status, 200);
        assert.deepEqual(requests.map(({method, path}) => `${method} ${path}`), [
            'POST /api/v4/teams',
            'PUT /api/v4/config/patch',
            'POST /api/v4/teams',
        ]);
        assert.deepEqual(requests[1]?.body, {TeamSettings: {RestrictCreationToDomains: ''}});
    });

    it('should return other 4xx responses without patching', async () => {
        const requests = fakeServer((_request, config) => fail(config, 400, 'api.config.update.app_error'));

        const result = await transportFor(BASE_URL, {clearLockout: true}).request('PUT', '/api/v4/config/patch', {});

        assert.equal(result.status, 400);
        assert.equal(requests.length, 1);
    });

    it('should sign in by email when sign-in by username is disabled', async () => {
        const requests = fakeServer((request, config) => {
            if (request.body?.login_id === adminEmail) {
                return response(config, {id: 'admin'});
            }
            return fail(config, 401, 'api.user.login.invalid_credentials_email');
        });

        const result = await apiAdminLoginClearingLockout(BASE_URL);

        assert.equal(result.error, undefined);
        assert.equal(requests.length, 2);
        assert.equal(requests[1]?.body?.login_id, adminEmail);
    });

    it('should fail with the cause on a lockout the admin cannot clear', async () => {
        const requests = fakeServer((_request, config) => fail(config, 401, 'api.context.mfa_required.app_error'));

        await assert.rejects(apiAdminLoginClearingLockout(BASE_URL), /MFA is enforced.*recreate the server/);
        assert.equal(requests.length, 1);
    });
});
