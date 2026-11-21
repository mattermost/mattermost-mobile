// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {DEMO_PLUGIN_REQUIREMENT, REQUIRED_PLUGINS} from './constants';
import {isE2eTestStack} from './env';
import {demoPluginSettingsPatch, demoPluginViolation, ensurePrepackagedPlugin, strayPluginIds} from './plugins';

import type {MattermostClient} from './types';

describe('strayPluginIds', () => {
    it('should keep prepackaged and provisioned plugins and return the rest', () => {
        const active = [
            {id: 'com.mattermost.calls'},
            {id: 'com.mattermost.demo-plugin'},
            {id: 'mattermost-ai'},
            {id: 'zoom'},
            {id: 'com.example.leftover'},
        ];
        assert.deepEqual(strayPluginIds(active, [...REQUIRED_PLUGINS, DEMO_PLUGIN_REQUIREMENT]), ['com.example.leftover']);
    });

    it('should report the demo plugin as stray on a server it is not provisioned for', () => {
        const active = [{id: 'com.mattermost.demo-plugin'}, {id: 'com.example.leftover'}];
        assert.deepEqual(strayPluginIds(active, REQUIRED_PLUGINS), ['com.mattermost.demo-plugin', 'com.example.leftover']);
    });
});

describe('demoPluginViolation', () => {
    const active = [{id: 'com.mattermost.calls'}, {id: 'com.mattermost.demo-plugin'}];

    it('should flag an active demo plugin on a server provisioned without it', () => {
        assert.match(demoPluginViolation(active, false) ?? '', /com\.mattermost\.demo-plugin is active on a server provisioned without it/);
    });

    it('should allow the demo plugin when it was requested, or when it is not active', () => {
        assert.equal(demoPluginViolation(active, true), undefined);
        assert.equal(demoPluginViolation([{id: 'com.mattermost.calls'}], false), undefined);
        assert.equal(demoPluginViolation(undefined, false), undefined);
    });
});

describe('demoPluginSettingsPatch', () => {
    it('should turn DialogOnlyMode on for a missing or empty entry', () => {
        assert.deepEqual(demoPluginSettingsPatch({}), {DialogOnlyMode: true});
    });

    it('should keep other settings and replace any spelling of DialogOnlyMode', () => {
        assert.deepEqual(demoPluginSettingsPatch({username: 'demo', dialogonlymode: false}), {username: 'demo', DialogOnlyMode: true});
    });

    it('should leave an entry that already has DialogOnlyMode on', () => {
        assert.equal(demoPluginSettingsPatch({DialogOnlyMode: true}), null);
        assert.equal(demoPluginSettingsPatch({dialogonlymode: true, username: 'demo'}), null);
    });

    it('should not treat a string "true" as on', () => {
        assert.deepEqual(demoPluginSettingsPatch({dialogonlymode: 'true'}), {DialogOnlyMode: true});
    });
});

type FakeServer = {
    active: string[];
    inactive: string[];

    /** Plugin states the statuses endpoint answers with, one per call; the last repeats. */
    states: number[];
};

/** A server answering the plugin list and statuses; records every call. */
const fakeServer = (server: FakeServer) => {
    const calls: string[] = [];
    let polls = 0;
    const client = {
        serverUrl: 'https://site.example.test',
        request: async (method: string, path: string) => {
            calls.push(`${method} ${path}`);
            if (method === 'GET' && path === '/api/v4/plugins') {
                return {status: 200, data: {active: server.active.map((id) => ({id})), inactive: server.inactive.map((id) => ({id}))}, headers: {}};
            }
            if (method === 'GET' && path === '/api/v4/plugins/statuses') {
                const state = server.states[Math.min(polls++, server.states.length - 1)];
                return {status: 200, data: [{plugin_id: 'com.mattermost.calls', state, version: '1.2.3', error: 'broken'}], headers: {}};
            }
            return {status: 200, data: {}, headers: {}};
        },
    } as unknown as MattermostClient;
    return {client, calls};
};

const RUNNING = 2;
const FAILED = 3;
const STARTING = 1;
const fast = {waitMs: 10000, pollMs: 0};
const expired = {waitMs: 0, pollMs: 0};

describe('ensurePrepackagedPlugin', () => {
    it('should accept a running prepackaged plugin without enabling or installing anything', async () => {
        const {client, calls} = fakeServer({active: ['com.mattermost.calls'], inactive: [], states: [RUNNING]});
        await ensurePrepackagedPlugin(client, 'token', 'com.mattermost.calls', fast);
        assert.deepEqual(calls, ['GET /api/v4/plugins', 'GET /api/v4/plugins/statuses']);
    });

    it('should enable an inactive prepackaged plugin and wait for it to run', async () => {
        const {client, calls} = fakeServer({active: [], inactive: ['com.mattermost.calls'], states: [STARTING, RUNNING]});
        await ensurePrepackagedPlugin(client, 'token', 'com.mattermost.calls', fast);
        assert.deepEqual(calls, [
            'GET /api/v4/plugins',
            'POST /api/v4/plugins/com.mattermost.calls/enable',
            'GET /api/v4/plugins/statuses',
            'GET /api/v4/plugins/statuses',
        ]);
    });

    it('should fail for a plugin missing from the server, without installing it', async () => {
        const {client, calls} = fakeServer({active: [], inactive: [], states: [RUNNING]});
        await assert.rejects(ensurePrepackagedPlugin(client, 'token', 'com.mattermost.calls', fast), /not on the server/);
        assert.deepEqual(calls, ['GET /api/v4/plugins']);
    });

    it('should fail for a failed plugin, and for one not running in time', async () => {
        const failed = fakeServer({active: ['com.mattermost.calls'], inactive: [], states: [FAILED]});
        await assert.rejects(ensurePrepackagedPlugin(failed.client, 'token', 'com.mattermost.calls', fast), /failed: broken/);

        const stuck = fakeServer({active: ['com.mattermost.calls'], inactive: [], states: [STARTING]});
        await assert.rejects(ensurePrepackagedPlugin(stuck.client, 'token', 'com.mattermost.calls', expired), /not running after/);
        assert.equal(stuck.calls.some((call) => call.includes('marketplace') || call.includes('install')), false);
    });
});

describe('ensurePrepackagedPlugin errors', () => {
    const failing = (failOn: string) => ({
        serverUrl: 'https://site.example.test',
        request: async (method: string, path: string) => {
            if (`${method} ${path}` === failOn) {
                return {status: 500, data: {message: 'boom'}, headers: {}};
            }
            return {status: 200, data: {active: [], inactive: [{id: 'com.mattermost.calls'}]}, headers: {}};
        },
    } as unknown as MattermostClient);

    it('should fail when the plugins cannot be listed', async () => {
        await assert.rejects(ensurePrepackagedPlugin(failing('GET /api/v4/plugins'), 'token', 'com.mattermost.calls', fast), /Could not list plugins \(HTTP 500\)/);
    });

    it('should fail at once, with the server error, when enabling fails', async () => {
        await assert.rejects(
            ensurePrepackagedPlugin(failing('POST /api/v4/plugins/com.mattermost.calls/enable'), 'token', 'com.mattermost.calls', fast),
            /Could not enable prepackaged plugin com\.mattermost\.calls \(HTTP 500\): boom/,
        );
    });
});

describe('isE2eTestStack', () => {
    it('should be true for e2e-test-stack, false when unset, and refuse any other value', () => {
        assert.equal(isE2eTestStack({E2E_SERVER_SOURCE: 'e2e-test-stack'}), true);
        assert.equal(isE2eTestStack({}), false);
        assert.equal(isE2eTestStack({E2E_SERVER_SOURCE: ''}), false);
        assert.throws(() => isE2eTestStack({E2E_SERVER_SOURCE: 'e2e-test-stack '}), /must be e2e-test-stack or unset/);
        assert.throws(() => isE2eTestStack({E2E_SERVER_SOURCE: 'matterwick'}), /must be e2e-test-stack or unset/);
    });
});
