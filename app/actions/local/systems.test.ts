// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import Database from '@nozbe/watermelondb/Database';

import {ActionType} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import TestHelper from '@test/test_helper';

import {
    storeConfig,
    storeConfigAndLicense,
    storeDataRetentionPolicies,
    updateLastDataRetentionRun,
    dataRetentionCleanup,
    setLastServerVersionCheck,
    setGlobalThreadsTab,
    dismissAnnouncement,
} from './systems';

import type {DataRetentionPoliciesRequest} from '@actions/remote/systems';
import type ServerDataOperator from '@database/operator/server_data_operator';
import type SystemModel from '@typings/database/models/servers/system';

const serverUrl = 'baseHandler.test.com';
let operator: ServerDataOperator;

jest.mock('@init/credentials', () => {
    const original = jest.requireActual('@init/credentials');
    return {
        ...original,
        getServerCredentials: jest.fn(async (url: string) => ({serverUrl: url})),
    };
});

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('storeConfigAndLicense', () => {
    it('handle not found database - storeConfig', async () => {
        const models = await storeConfig('foo', {} as ClientConfig);
        expect(models).toBeDefined();
        expect(models.length).toBe(0);
    });

    it('handle undefined config - storeConfig', async () => {
        const models = await storeConfig(serverUrl, undefined);
        expect(models).toBeDefined();
        expect(models.length).toBe(0);
    });

    it('base case - storeConfig', async () => {
        await operator.handleConfigs({
            configs: [
                {id: 'DataRetentionEnableMessageDeletion', value: 'true'},
                {id: 'AboutLink', value: 'link'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        const models = await storeConfig(serverUrl, {AboutLink: 'link'} as ClientConfig);
        expect(models).toBeDefined();
        expect(models.length).toBe(1); // data retention removed
    });

    it('nothing to update - storeConfig', async () => {
        await operator.handleConfigs({
            configs: [
                {id: 'AboutLink', value: 'link'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        const models = await storeConfig(serverUrl, {AboutLink: 'link'} as ClientConfig);
        expect(models).toBeDefined();
        expect(models.length).toBe(0);
    });

    it('handle not found database', async () => {
        const models = await storeConfigAndLicense('foo', {} as ClientConfig, {} as ClientLicense);
        expect(models).toBeDefined();
        expect(models.length).toBe(0);
    });

    it('base case', async () => {
        const models = await storeConfigAndLicense(serverUrl, {AboutLink: 'link'} as ClientConfig, {Announcement: 'test'} as ClientLicense);
        expect(models).toBeDefined();
        expect(models.length).toBe(1); // config
    });
});

describe('dataRetention', () => {
    it('handle not found database - storeDataRetentionPolicies', async () => {
        const models = await storeDataRetentionPolicies('foo', {} as DataRetentionPoliciesRequest);
        expect(models).toBeDefined();
        expect(models.length).toBe(0);
    });

    it('base case - storeDataRetentionPolicies', async () => {
        const models = await storeDataRetentionPolicies(serverUrl, {globalPolicy: {} as GlobalDataRetentionPolicy, teamPolicies: [], channelPolicies: []} as DataRetentionPoliciesRequest);
        expect(models).toBeDefined();
        expect(models.length).toBe(2); // data retention and granular data retention policies
    });

    it('empty case - storeDataRetentionPolicies', async () => {
        const models = await storeDataRetentionPolicies(serverUrl, {} as DataRetentionPoliciesRequest);
        expect(models).toBeDefined();
        expect(models.length).toBe(2); // data retention and granular data retention policies
    });

    it('handle not found database - updateLastDataRetentionRun', async () => {
        const {error} = await updateLastDataRetentionRun('foo', 0) as {error: unknown};
        expect(error).toBeDefined();
    });

    it('base case - updateLastDataRetentionRun', async () => {
        const models = await updateLastDataRetentionRun(serverUrl, 10) as SystemModel[];
        expect(models).toBeDefined();
        expect(models.length).toBe(1); // data retention
    });

    it('no time provided - updateLastDataRetentionRun', async () => {
        const models = await updateLastDataRetentionRun(serverUrl) as SystemModel[];
        expect(models).toBeDefined();
        expect(models.length).toBe(1); // data retention
    });

    it('handle not found database - dataRetentionCleanup', async () => {
        const {error} = await dataRetentionCleanup('foo');
        expect(error).toBeDefined();
    });

    it('rentention off - dataRetentionCleanup', async () => {
        const post = TestHelper.fakePost({channel_id: 'channelid1', id: 'postid', create_at: 1});
        await operator.handlePosts({
            actionType: ActionType.POSTS.RECEIVED_IN_CHANNEL,
            order: [post.id],
            posts: [post],
            prepareRecordsOnly: false,
        });

        const spy = jest.spyOn(Database.prototype, 'unsafeVacuum').mockImplementation(jest.fn());
        const {error} = await dataRetentionCleanup(serverUrl);
        expect(error).toBeDefined(); // unsafeExecute loki error
        spy.mockRestore();
    });

    it('retention on - dataRetentionCleanup', async () => {
        const channel: Channel = {
            id: 'channelid1',
            team_id: 'teamid1',
            total_msg_count: 0,
        } as Channel;

        await operator.handleConfigs({
            configs: [
                {id: 'DataRetentionEnableMessageDeletion', value: 'true'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
        await operator.handleSystem({systems:
            [
                {id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', DataRetention: 'true'}},
                {id: SYSTEM_IDENTIFIERS.GRANULAR_DATA_RETENTION_POLICIES, value: {team: [{team_id: 'teamid1', post_duration: 100}], channel: [{channel_id: 'channelid1', post_duration: 100}]}},
            ],
        prepareRecordsOnly: false});
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});

        const spy = jest.spyOn(Database.prototype, 'unsafeVacuum').mockImplementation(jest.fn());
        const {error} = await dataRetentionCleanup(serverUrl);
        expect(error).toBeDefined(); // LokiJSAdapter doesn't support unsafeSqlQuery
        spy.mockRestore();
    });

    it('already cleaned today - dataRetentionCleanup', async () => {
        const channel: Channel = {
            id: 'channelid1',
            team_id: 'teamid1',
            total_msg_count: 0,
        } as Channel;

        await operator.handleConfigs({
            configs: [
                {id: 'DataRetentionEnableMessageDeletion', value: 'true'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
        await operator.handleSystem({systems:
            [
                {id: SYSTEM_IDENTIFIERS.LAST_DATA_RETENTION_RUN, value: Date.now()},
                {id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true', DataRetention: 'true'}},
                {id: SYSTEM_IDENTIFIERS.GRANULAR_DATA_RETENTION_POLICIES, value: {team: [{team_id: 'teamid1', post_duration: 100}], channel: [{channel_id: 'channelid1', post_duration: 100}]}},
            ],
        prepareRecordsOnly: false});
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});

        const {error} = await dataRetentionCleanup(serverUrl);
        expect(error).toBeUndefined();
    });
});

describe('setLastServerVersionCheck', () => {
    it('handle not found database', async () => {
        const {error} = await setLastServerVersionCheck('foo');
        expect(error).toBeDefined();
    });

    it('base case', async () => {
        const {error} = await setLastServerVersionCheck(serverUrl);
        expect(error).toBeUndefined();
    });

    it('base case - reset', async () => {
        const {error} = await setLastServerVersionCheck(serverUrl, true);
        expect(error).toBeUndefined();
    });
});

describe('setGlobalThreadsTab', () => {
    it('handle not found database', async () => {
        const {error} = await setGlobalThreadsTab('foo', 'all');
        expect(error).toBeDefined();
    });

    it('base case', async () => {
        const {error} = await setGlobalThreadsTab(serverUrl, 'all');
        expect(error).toBeUndefined();
    });
});

describe('dismissAnnouncement', () => {
    it('handle not found database', async () => {
        const {error} = await dismissAnnouncement('foo', 'text');
        expect(error).toBeDefined();
    });

    it('base case', async () => {
        const {error} = await dismissAnnouncement(serverUrl, 'text');
        expect(error).toBeUndefined();
    });
});

