// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import assert from 'assert';

import nock from 'nock';

import {Client4} from '@client/rest';
import {PER_PAGE_DEFAULT} from '@client/rest/constants';
import {GeneralTypes} from '@mm-redux/action_types';
import * as Actions from '@mm-redux/actions/general';
import TestHelper from '@test/test_helper';
import configureStore from '@test/test_store';

import {FormattedError} from './helpers.ts';

describe('Actions.General', () => {
    let store;
    beforeAll(async () => {
        await TestHelper.initBasic(Client4);
    });

    beforeEach(async () => {
        store = await configureStore();
    });

    afterAll(async () => {
        await TestHelper.tearDown();
    });

    it('getPing - Invalid URL', async () => {
        const serverUrl = Client4.getUrl();
        Client4.setUrl('notarealurl');

        const pingError = new FormattedError(
            'mobile.server_ping_failed',
            'Cannot connect to the server. Please check your server URL and internet connection.',
        );

        nock(Client4.getBaseRoute()).
            get('/system/ping').
            query(true).
            reply(401, {error: 'ping error', code: 401});

        const {error} = await Actions.getPing()(store.dispatch, store.getState);
        Client4.setUrl(serverUrl);
        assert.deepEqual(error, pingError);
    });

    it('getPing', async () => {
        const response = {
            status: 'OK',
            version: '4.0.0',
        };

        nock(Client4.getBaseRoute()).
            get('/system/ping').
            query(true).
            reply(200, response);

        const {data} = await Actions.getPing()(store.dispatch, store.getState);
        assert.deepEqual(data, response);
    });

    it('getClientConfig', async () => {
        nock(Client4.getBaseRoute()).
            get('/config/client').
            query(true).
            reply(200, {Version: '4.0.0', BuildNumber: '3', BuildDate: 'Yesterday', BuildHash: '1234'});

        await Actions.getClientConfig()(store.dispatch, store.getState);

        const clientConfig = store.getState().entities.general.config;

        // Check a few basic fields since they may change over time
        assert.ok(clientConfig.Version);
        assert.ok(clientConfig.BuildNumber);
        assert.ok(clientConfig.BuildDate);
        assert.ok(clientConfig.BuildHash);
    });

    it('getLicenseConfig', async () => {
        nock(Client4.getBaseRoute()).
            get('/license/client').
            query(true).
            reply(200, {IsLicensed: 'false'});

        await Actions.getLicenseConfig()(store.dispatch, store.getState);

        const licenseConfig = store.getState().entities.general.license;

        // Check a few basic fields since they may change over time
        assert.notStrictEqual(licenseConfig.IsLicensed, undefined);
    });

    it('setServerVersion', async () => {
        const version = '3.7.0';
        await Actions.setServerVersion(version)(store.dispatch, store.getState);
        await TestHelper.wait(100);
        const {serverVersion} = store.getState().entities.general;
        assert.deepEqual(serverVersion, version);
    });

    it('getDataRetentionPolicy', async () => {
        const globalPolicyResponse = {
            message_deletion_enabled: true,
            file_deletion_enabled: false,
            message_retention_cutoff: Date.now(),
            file_retention_cutoff: 0,
        };

        const channelPoliciesResponse1 = {
            policies: [{
                post_duration: 5,
                channel_id: 'channe1',
            }],
            total_count: 2,
        };

        const channelPoliciesResponse2 = {
            policies: [{
                post_duration: 2,
                channel_id: 'channe2',
            }],
            total_count: 2,
        };

        const teamPoliciesResponse1 = {
            policies: [{
                post_duration: 1,
                team_id: 'team1',
            }],
            total_count: 2,
        };

        const teamPoliciesResponse2 = {
            policies: [{
                post_duration: 2,
                team_id: 'team2',
            }],
            total_count: 2,
        };

        const userId = '';

        nock(Client4.getBaseRoute()).
            get('/data_retention/policy').
            query(true).
            reply(200, globalPolicyResponse).
            get(`/users/${userId}/data_retention/channel_policies`).
            query({
                page: 0,
                per_page: PER_PAGE_DEFAULT,
            }).
            reply(200, channelPoliciesResponse1).
            get(`/users/${userId}/data_retention/channel_policies`).
            query({
                page: 1,
                per_page: PER_PAGE_DEFAULT,
            }).
            reply(200, channelPoliciesResponse2).
            get(`/users/${userId}/data_retention/team_policies`).
            query({
                page: 0,
                per_page: PER_PAGE_DEFAULT,
            }).
            reply(200, teamPoliciesResponse1).
            get(`/users/${userId}/data_retention/team_policies`).
            query({
                page: 1,
                per_page: PER_PAGE_DEFAULT,
            }).
            reply(200, teamPoliciesResponse2);

        await store.dispatch({type: GeneralTypes.RECEIVED_SERVER_VERSION, data: '5.37.0'});
        await Actions.getDataRetentionPolicy()(store.dispatch, store.getState);
        await TestHelper.wait(100);
        const {dataRetention} = store.getState().entities.general;
        assert.deepEqual(dataRetention.policies, {
            global: globalPolicyResponse,
            channels: [...channelPoliciesResponse1.policies, ...channelPoliciesResponse2.policies],
            teams: [...teamPoliciesResponse1.policies, ...teamPoliciesResponse2.policies],
        });
    });

    it('getTimezones', async () => {
        nock(Client4.getBaseRoute()).
            get('/system/timezones').
            query(true).
            reply(200, ['America/New_York', 'America/Los_Angeles']);

        await Actions.getSupportedTimezones()(store.dispatch, store.getState);

        await TestHelper.wait(100);
        const {timezones} = store.getState().entities.general;
        assert.equal(timezones.length > 0, true);
        assert.equal(timezones.length === 0, false);
    });

    describe('getRedirectLocation', () => {
        it('should save the correct location', async () => {
            store.dispatch({type: GeneralTypes.RECEIVED_SERVER_VERSION, data: '5.3.0'});

            nock(Client4.getBaseRoute()).
                get('/redirect_location').
                query({url: 'http://examp.le'}).
                reply(200, '{"location": "https://example.com"}');

            // Save the found URL if it finds one
            await store.dispatch(Actions.getRedirectLocation('http://examp.le'));

            const existingURL = store.getState().entities.posts.expandedURLs['http://examp.le'];
            assert.equal(existingURL, 'https://example.com');

            // Save the found URL if it finds one
            await store.dispatch(Actions.getRedirectLocation('http://nonexisting.url'));

            const nonexistingURL = store.getState().entities.posts.expandedURLs['http://nonexisting.url'];
            assert.equal(nonexistingURL, 'http://nonexisting.url');
        });
    });
});
