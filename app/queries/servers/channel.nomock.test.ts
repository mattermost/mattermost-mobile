// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';

import {General} from '@constants';
import DatabaseManager from '@database/manager';
import ServerDataOperator from '@database/operator/server_data_operator';
import TestHelper from '@test/test_helper';

import {
    observeIsReadOnlyChannel,
    observeMyChannelUnreads,
    prepareAllMyChannels,
} from './channel';

describe('observeMyChannelUnreads', () => {
    const teamId = 'team_id';
    const userId = 'user_id';
    const serverUrl = 'baseHandler.test.com';
    let database: Database;
    let operator: ServerDataOperator;

    jest.restoreAllMocks();

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;
    });

    afterEach(async () => {
        await DatabaseManager.deleteServerDatabase(serverUrl);
    });

    it('should return true when there are unread channels that are not muted', async () => {
        const subscriptionNext = jest.fn();
        const notify_props = {mark_unread: 'all' as const};
        const result = observeMyChannelUnreads(database, teamId);
        result.subscribe({next: subscriptionNext});

        // Subscription always returns the first value
        expect(subscriptionNext).toHaveBeenCalledWith(false);
        subscriptionNext.mockClear();

        let models = (await Promise.all((await prepareAllMyChannels(
            operator,
            [TestHelper.fakeChannel({id: 'channel1', team_id: teamId, total_msg_count: 20})],
            [TestHelper.fakeMyChannel({channel_id: 'channel1', user_id: userId, notify_props, msg_count: 20})],
            false,
        )))).flat();
        await operator.batchRecords(models, 'test');

        // No change
        expect(subscriptionNext).not.toHaveBeenCalled();

        models = (await Promise.all((await prepareAllMyChannels(
            operator,
            [TestHelper.fakeChannel({id: 'channel1', team_id: teamId, total_msg_count: 30})],
            [TestHelper.fakeMyChannel({channel_id: 'channel1', user_id: userId, notify_props, msg_count: 20})],
            false,
        )))).flat();
        await operator.batchRecords(models, 'test');

        expect(subscriptionNext).toHaveBeenCalledWith(true);
        subscriptionNext.mockClear();

        models = (await Promise.all((await prepareAllMyChannels(
            operator,
            [TestHelper.fakeChannel({id: 'channel1', team_id: teamId, total_msg_count: 30})],
            [TestHelper.fakeMyChannel({channel_id: 'channel1', user_id: userId, notify_props, msg_count: 30})],
            false,
        )))).flat();
        await operator.batchRecords(models, 'test');

        expect(subscriptionNext).toHaveBeenCalledWith(false);
    });

    it('should return false when all unread channels are muted', async () => {
        const subscriptionNext = jest.fn();
        const notify_props = {mark_unread: 'mention' as const};
        const result = observeMyChannelUnreads(database, teamId);
        result.subscribe({next: subscriptionNext});

        // Subscription always returns the first value
        expect(subscriptionNext).toHaveBeenCalledWith(false);
        subscriptionNext.mockClear();

        let models = (await Promise.all((await prepareAllMyChannels(
            operator,
            [TestHelper.fakeChannel({id: 'channel1', team_id: teamId, total_msg_count: 20})],
            [TestHelper.fakeMyChannel({channel_id: 'channel1', user_id: userId, notify_props, msg_count: 20})],
            false,
        )))).flat();
        await operator.batchRecords(models, 'test');

        // No change
        expect(subscriptionNext).not.toHaveBeenCalled();

        models = (await Promise.all((await prepareAllMyChannels(
            operator,
            [TestHelper.fakeChannel({id: 'channel1', team_id: teamId, total_msg_count: 30})],
            [TestHelper.fakeMyChannel({channel_id: 'channel1', user_id: userId, notify_props, msg_count: 20})],
            false,
        )))).flat();
        await operator.batchRecords(models, 'test');

        expect(subscriptionNext).not.toHaveBeenCalled();

        models = (await Promise.all((await prepareAllMyChannels(
            operator,
            [TestHelper.fakeChannel({id: 'channel1', team_id: teamId, total_msg_count: 30})],
            [TestHelper.fakeMyChannel({channel_id: 'channel1', user_id: userId, notify_props, msg_count: 30})],
            false,
        )))).flat();
        await operator.batchRecords(models, 'test');

        expect(subscriptionNext).not.toHaveBeenCalled();
    });

    it('missing notify props are considered unmuted', async () => {
        const subscriptionNext = jest.fn();
        const notify_props = {};
        const result = observeMyChannelUnreads(database, teamId);
        result.subscribe({next: subscriptionNext});

        // Subscription always returns the first value
        expect(subscriptionNext).toHaveBeenCalledWith(false);
        subscriptionNext.mockClear();

        let models = (await Promise.all((await prepareAllMyChannels(
            operator,
            [TestHelper.fakeChannel({id: 'channel1', team_id: teamId, total_msg_count: 20})],
            [TestHelper.fakeMyChannel({channel_id: 'channel1', user_id: userId, notify_props, msg_count: 20})],
            false,
        )))).flat();
        await operator.batchRecords(models, 'test');

        // No change
        expect(subscriptionNext).not.toHaveBeenCalled();

        models = (await Promise.all((await prepareAllMyChannels(
            operator,
            [TestHelper.fakeChannel({id: 'channel1', team_id: teamId, total_msg_count: 30})],
            [TestHelper.fakeMyChannel({channel_id: 'channel1', user_id: userId, notify_props, msg_count: 20})],
            false,
        )))).flat();
        await operator.batchRecords(models, 'test');

        expect(subscriptionNext).toHaveBeenCalledWith(true);
        subscriptionNext.mockClear();

        models = (await Promise.all((await prepareAllMyChannels(
            operator,
            [TestHelper.fakeChannel({id: 'channel1', team_id: teamId, total_msg_count: 30})],
            [TestHelper.fakeMyChannel({channel_id: 'channel1', user_id: userId, notify_props, msg_count: 30})],
            false,
        )))).flat();
        await operator.batchRecords(models, 'test');

        expect(subscriptionNext).toHaveBeenCalledWith(false);
    });

    it('should not retrigger the subscription when there are changes in other teams', async () => {
        const subscriptionNext = jest.fn();
        const otherTeamId = 'other_team_id';
        const notify_props = {mark_unread: 'all' as const};
        const result = observeMyChannelUnreads(database, teamId);
        result.subscribe({next: subscriptionNext});

        // Subscription always returns the first value
        expect(subscriptionNext).toHaveBeenCalledWith(false);
        subscriptionNext.mockClear();

        let models = (await Promise.all((await prepareAllMyChannels(
            operator,
            [TestHelper.fakeChannel({id: 'channel1', team_id: otherTeamId, total_msg_count: 20})],
            [TestHelper.fakeMyChannel({channel_id: 'channel1', user_id: userId, notify_props, msg_count: 20})],
            false,
        )))).flat();
        await operator.batchRecords(models, 'test');

        // No change
        expect(subscriptionNext).not.toHaveBeenCalled();

        models = (await Promise.all((await prepareAllMyChannels(
            operator,
            [TestHelper.fakeChannel({id: 'channel1', team_id: otherTeamId, total_msg_count: 30})],
            [TestHelper.fakeMyChannel({channel_id: 'channel1', user_id: userId, notify_props, msg_count: 20})],
            false,
        )))).flat();
        await operator.batchRecords(models, 'test');

        expect(subscriptionNext).not.toHaveBeenCalled();

        models = (await Promise.all((await prepareAllMyChannels(
            operator,
            [TestHelper.fakeChannel({id: 'channel1', team_id: otherTeamId, total_msg_count: 30})],
            [TestHelper.fakeMyChannel({channel_id: 'channel1', user_id: userId, notify_props, msg_count: 30})],
            false,
        )))).flat();
        await operator.batchRecords(models, 'test');

        expect(subscriptionNext).not.toHaveBeenCalled();
    });
});

describe('observeIsReadOnlyChannel', () => {
    const userId = 'user_id';
    const serverUrl = 'baseHandler.test.com';
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;

        await operator.handleSystem({
            systems: [{id: 'currentUserId', value: userId}],
            prepareRecordsOnly: false,
        });
    });

    afterEach(async () => {
        await DatabaseManager.deleteServerDatabase(serverUrl);
    });

    it('should return true for town square when user is not admin and setting is enabled', async () => {
        const subscriptionNext = jest.fn();
        const channelId = 'channel_id';

        // Set up initial data
        const models = (await Promise.all([
            operator.handleChannel({
                channels: [TestHelper.fakeChannel({id: channelId, name: General.DEFAULT_CHANNEL})],
                prepareRecordsOnly: true,
            }),
            operator.handleUsers({
                users: [TestHelper.fakeUser({id: userId, roles: ''})],
                prepareRecordsOnly: true,
            }),
        ])).flat();
        await operator.batchRecords(models, 'test');

        // Set up config
        await operator.handleConfigs({
            configs: [{id: 'ExperimentalTownSquareIsReadOnly', value: 'true'}],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        const result = observeIsReadOnlyChannel(database, channelId);
        result.subscribe({next: subscriptionNext});

        expect(subscriptionNext).toHaveBeenCalledWith(true);
    });

    it('should return false for non-town-square channels', async () => {
        const subscriptionNext = jest.fn();
        const channelId = 'channel_id';

        // Set up initial data
        const models = (await Promise.all([
            operator.handleChannel({
                channels: [TestHelper.fakeChannel({id: channelId, name: 'other-channel'})],
                prepareRecordsOnly: true,
            }),
            operator.handleUsers({
                users: [TestHelper.fakeUser({id: userId, roles: ''})],
                prepareRecordsOnly: true,
            }),
        ])).flat();
        await operator.batchRecords(models, 'test');

        // Set up config
        await operator.handleConfigs({
            configs: [{id: 'ExperimentalTownSquareIsReadOnly', value: 'true'}],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        const result = observeIsReadOnlyChannel(database, channelId);
        result.subscribe({next: subscriptionNext});

        expect(subscriptionNext).toHaveBeenCalledWith(false);
    });

    it('should return false when experimental setting is disabled', async () => {
        const subscriptionNext = jest.fn();
        const channelId = 'channel_id';

        // Set up initial data
        const models = (await Promise.all([
            operator.handleChannel({
                channels: [TestHelper.fakeChannel({id: channelId, name: General.DEFAULT_CHANNEL})],
                prepareRecordsOnly: true,
            }),
            operator.handleUsers({
                users: [TestHelper.fakeUser({id: userId, roles: ''})],
                prepareRecordsOnly: true,
            }),
        ])).flat();
        await operator.batchRecords(models, 'test');

        // Set up config
        await operator.handleConfigs({
            configs: [{id: 'ExperimentalTownSquareIsReadOnly', value: 'false'}],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        const result = observeIsReadOnlyChannel(database, channelId);
        result.subscribe({next: subscriptionNext});

        expect(subscriptionNext).toHaveBeenCalledWith(false);
    });

    it('should return false when user is system admin', async () => {
        const subscriptionNext = jest.fn();
        const channelId = 'channel_id';

        // Set up initial data
        const models = (await Promise.all([
            operator.handleChannel({
                channels: [TestHelper.fakeChannel({id: channelId, name: General.DEFAULT_CHANNEL})],
                prepareRecordsOnly: true,
            }),
            operator.handleUsers({
                users: [TestHelper.fakeUser({id: userId, roles: 'system_admin'})],
                prepareRecordsOnly: true,
            }),
        ])).flat();
        await operator.batchRecords(models, 'test');

        // Set up config
        await operator.handleConfigs({
            configs: [{id: 'ExperimentalTownSquareIsReadOnly', value: 'true'}],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        const result = observeIsReadOnlyChannel(database, channelId);
        result.subscribe({next: subscriptionNext});

        expect(subscriptionNext).toHaveBeenCalledWith(false);
    });

    it('should return false when channel is undefined', async () => {
        const subscriptionNext = jest.fn();
        const channelId = 'nonexistent_channel';

        // Set up initial data
        const models = await operator.handleUsers({
            users: [TestHelper.fakeUser({id: userId, roles: ''})],
            prepareRecordsOnly: true,
        });
        await operator.batchRecords(models, 'test');

        // Set up config
        await operator.handleConfigs({
            configs: [{id: 'ExperimentalTownSquareIsReadOnly', value: 'true'}],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        const result = observeIsReadOnlyChannel(database, channelId);
        result.subscribe({next: subscriptionNext});

        expect(subscriptionNext).toHaveBeenCalledWith(false);
    });
});
