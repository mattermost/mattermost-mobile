// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'node:assert/strict';
import {afterEach, describe, it} from 'node:test';

import {classifyRequest, drainPoolGuardViolations, poolGuardInterceptor, poolGuardMode} from './pool_guard';

const POOL = 'https://pool-a.test.mattermost.cloud';
const OTHER = 'https://unrelated.test.mattermost.cloud';
const env = {CI: 'true', E2E_SERVER_ROLE: 'pool', E2E_POOL_GUARD: 'enforce', SITE_1_URL: POOL, SITE_2_URL: 'https://pool-b.test.mattermost.cloud'};

describe('poolGuardMode', () => {
    it('should be off outside CI, on the mutation shard, or without a mode', () => {
        assert.equal(poolGuardMode({...env, CI: undefined}), 'off');
        assert.equal(poolGuardMode({...env, E2E_SERVER_ROLE: 'mutation'}), 'off');
        assert.equal(poolGuardMode({...env, E2E_POOL_GUARD: undefined}), 'off');
        assert.equal(poolGuardMode({...env, E2E_POOL_GUARD: 'warn'}), 'warn');
        assert.equal(poolGuardMode(env), 'enforce');
    });
});

describe('classifyRequest', () => {
    it('should flag server-wide writes to a pool server', () => {
        assert.match(classifyRequest('put', `${POOL}/api/v4/config/patch`, {}, env) ?? '', /server config/);
        assert.match(classifyRequest('post', `${POOL}/api/v4/plugins/com.mattermost.calls/disable`, undefined, env) ?? '', /plugin state/);
        assert.match(classifyRequest('delete', `${POOL}/api/v4/remotecluster/abc`, undefined, env) ?? '', /remote clusters/);
        assert.match(classifyRequest('post', `${POOL}/api/v4/custom_profile_attributes/fields`, {}, env) ?? '', /profile attribute/);
        assert.match(classifyRequest('patch', `${POOL}/api/v4/properties/groups/access_control/system/values`, {}, env) ?? '', /system property/);
        assert.match(classifyRequest('put', `${POOL}/api/v4/access_control_policies`, {type: 'permission'}, env) ?? '', /access policy/);
        assert.match(classifyRequest('put', `${POOL}/api/v4/access_control_policies`, {type: 'permission', scope: 'team', scope_id: 't1'}, env) ?? '', /access policy/);
    });

    it('should allow reads and user-scoped writes', () => {
        assert.equal(classifyRequest('get', `${POOL}/api/v4/config`, undefined, env), null);
        assert.equal(classifyRequest('post', `${POOL}/api/v4/posts`, {}, env), null);
        assert.equal(classifyRequest('patch', `${POOL}/api/v4/users/u1/custom_profile_attributes`, {}, env), null);
        assert.equal(classifyRequest('post', `${POOL}/api/v4/plugins/com.mattermost.demo-plugin/kv`, {}, env), null);
        assert.equal(classifyRequest('put', `${POOL}/api/v4/access_control_policies`, JSON.stringify({id: 'c1', type: 'channel', version: 'v0.4'}), env), null);
        assert.equal(classifyRequest('post', `${POOL}/api/v4/properties/groups/access_control/channel/fields`, {name: 'sensitivity_a1b2c3'}, env), null);
        assert.equal(classifyRequest('delete', `${POOL}/api/v4/properties/groups/access_control/channel/fields/f1`, undefined, env), null);
    });

    it('should flag required or fixed-name property fields', () => {
        assert.match(classifyRequest('post', `${POOL}/api/v4/properties/groups/access_control/channel/fields`, {name: 'sensitivity_a1b2c3', attrs: {required: true}}, env) ?? '', /property fields/);
        assert.match(classifyRequest('post', `${POOL}/api/v4/properties/groups/access_control/system/fields`, {name: 'classification'}, env) ?? '', /property fields/);
    });

    it('should ignore servers that are not this shard\'s', () => {
        assert.equal(classifyRequest('put', `${OTHER}/api/v4/config/patch`, {}, env), null);
    });
});

describe('poolGuardInterceptor', () => {
    const saved = {...process.env};
    afterEach(() => {
        process.env = {...saved};
        drainPoolGuardViolations();
    });

    it('should record and block a violation in enforce mode', () => {
        Object.assign(process.env, env);
        assert.throws(() => poolGuardInterceptor({method: 'put', url: `${POOL}/api/v4/config/patch`, data: {}}), /E2E_POOL_GUARD blocked/);
        assert.equal(drainPoolGuardViolations().length, 1);
    });

    it('should record but let the request through in warn mode', () => {
        Object.assign(process.env, env, {E2E_POOL_GUARD: 'warn'});
        const config = {method: 'put', url: `${POOL}/api/v4/config/patch`, data: {}};
        assert.equal(poolGuardInterceptor(config), config);
        assert.equal(drainPoolGuardViolations().length, 1);
    });
});
