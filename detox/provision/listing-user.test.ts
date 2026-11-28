// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {describe, it} from 'node:test';

import {ensureListingUser, LISTING_USERNAME, listingUserPassword} from './listing-user';

import type {ApiResponse, HttpMethod, MattermostClient} from './types';

const SITES_ACTION_SCRIPT = path.resolve(__dirname, '../../.github/actions/e2e-test-stack-sites/listing-password.mjs');
const SERVER_URL = 'https://worker-1.test.mattermost.cloud';

type Call = {method: HttpMethod; path: string; body?: unknown};

function fakeClient(responses: Record<string, ApiResponse>): {client: MattermostClient; calls: Call[]} {
    const calls: Call[] = [];
    const client: MattermostClient = {
        serverUrl: SERVER_URL,
        request: async <T>(method: HttpMethod, requestPath: string, body?: unknown) => {
            calls.push({method, path: requestPath, body});
            return (responses[`${method} ${requestPath}`] ?? {data: {}, status: 200, headers: {}}) as ApiResponse<T>;
        },
    };
    return {client, calls};
}

describe('listingUserPassword', () => {
    it('should match the password the e2e-test-stack-sites action derives', () => {
        const fromAction = execFileSync(process.execPath, [SITES_ACTION_SCRIPT], {
            env: {LISTING_KEY: 'admin-secret', LISTING_SITE: SERVER_URL},
            encoding: 'utf8',
        });
        assert.equal(fromAction, listingUserPassword('admin-secret', SERVER_URL));
    });

    it('should differ per server', () => {
        assert.notEqual(listingUserPassword('admin-secret', SERVER_URL), listingUserPassword('admin-secret', 'https://worker-2.test.mattermost.cloud'));
    });
});

describe('ensureListingUser', () => {
    it('should create the team and user, then verify and add the user', async () => {
        const {client, calls} = fakeClient({
            'GET /api/v4/teams/name/e2e-listing': {data: {}, status: 404, headers: {}},
            'POST /api/v4/teams': {data: {id: 'team1'}, status: 201, headers: {}},
            [`GET /api/v4/users/username/${LISTING_USERNAME}`]: {data: {}, status: 404, headers: {}},
            'POST /api/v4/users': {data: {id: 'user1'}, status: 201, headers: {}},
        });

        await ensureListingUser(client, 'token', 'admin-secret');

        assert.deepEqual(calls.map((call) => `${call.method} ${call.path}`), [
            'GET /api/v4/teams/name/e2e-listing',
            'POST /api/v4/teams',
            `GET /api/v4/users/username/${LISTING_USERNAME}`,
            'POST /api/v4/users',
            'POST /api/v4/users/user1/email/verify/member',
            'POST /api/v4/teams/team1/members',
        ]);
        assert.equal((calls[3]?.body as {password: string}).password, listingUserPassword('admin-secret', SERVER_URL));
    });

    it('should reset an existing user to the derived password', async () => {
        const {client, calls} = fakeClient({
            'GET /api/v4/teams/name/e2e-listing': {data: {id: 'team1'}, status: 200, headers: {}},
            [`GET /api/v4/users/username/${LISTING_USERNAME}`]: {data: {id: 'user1'}, status: 200, headers: {}},
        });

        await ensureListingUser(client, 'token', 'admin-secret');

        const reset = calls.find((call) => call.path === '/api/v4/users/user1/password');
        assert.deepEqual(reset?.body, {new_password: listingUserPassword('admin-secret', SERVER_URL)});
        assert.equal(calls.some((call) => call.method === 'POST' && (call.path === '/api/v4/users' || call.path === '/api/v4/teams')), false);
    });

    it('should fail without creating anything when a lookup fails for another reason', async () => {
        const {client, calls} = fakeClient({
            'GET /api/v4/teams/name/e2e-listing': {data: {}, status: 500, headers: {}},
        });

        await assert.rejects(ensureListingUser(client, 'token', 'admin-secret'), /look up the listing team \(HTTP 500\)/);
        assert.equal(calls.length, 1);
    });
});
