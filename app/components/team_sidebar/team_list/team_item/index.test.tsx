// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';
import React from 'react';

import {processReceivedThreads} from '@actions/local/thread';
import {Config} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {prepareAllMyChannels} from '@queries/servers/channel';
import {renderWithEverything, act} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import TeamItem from './team_item';

import EnhancedTeamItem from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type MyTeamModel from '@typings/database/models/servers/my_team';

jest.mock('./team_item', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(TeamItem).mockImplementation((props) => React.createElement('TeamItem', {...props, testID: 'team-item'}));

describe('TeamItem enhanced component', () => {
    const serverUrl = 'server-1';
    const teamId = 'team1';
    let database: Database;
    let operator: ServerDataOperator;
    const myTeam = {id: teamId} as MyTeamModel;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;

        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        await operator.handleTeam({teams: [TestHelper.fakeTeam({id: teamId})], prepareRecordsOnly: false});
        await operator.handleConfigs({
            configs: [
                {id: 'CollapsedThreads', value: Config.ALWAYS_ON},
                {id: 'Version', value: '7.6.0'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should correctly show hasUnreads if we have unread channels', async () => {
        let models = await Promise.all(await prepareAllMyChannels(operator,
            [TestHelper.fakeChannel({id: 'channel1', team_id: teamId, total_msg_count: 10})],
            [TestHelper.fakeMyChannel({id: 'my_channel1', channel_id: 'channel1', msg_count: 10})],
            false,
        ));
        await operator.batchRecords(models.flat(), 'test');

        const {getByTestId} = renderWithEverything(<EnhancedTeamItem myTeam={myTeam}/>, {database});
        const teamItem = getByTestId('team-item');
        expect(teamItem.props.hasUnreads).toBe(false);

        await act(async () => {
            models = await Promise.all(await prepareAllMyChannels(operator,
                [TestHelper.fakeChannel({id: 'channel1', team_id: teamId, total_msg_count: 20})],
                [TestHelper.fakeMyChannel({id: 'my_channel1', channel_id: 'channel1', msg_count: 10})],
                false,
            ));
            await operator.batchRecords(models.flat(), 'test');
        });

        expect(teamItem.props.hasUnreads).toBe(true);

        await act(async () => {
            models = await Promise.all(await prepareAllMyChannels(operator,
                [TestHelper.fakeChannel({id: 'channel1', team_id: teamId, total_msg_count: 20})],
                [TestHelper.fakeMyChannel({id: 'my_channel1', channel_id: 'channel1', msg_count: 20})],
                false,
            ));
            await operator.batchRecords(models.flat(), 'test');
        });

        expect(teamItem.props.hasUnreads).toBe(false);
    });

    it('should correctly show hasUnreads if we have unread threads', async () => {
        const channelId = 'channel1';
        const threadId = 'thread1';
        const channelModels = await Promise.all(await prepareAllMyChannels(operator,
            [TestHelper.fakeChannel({id: channelId, team_id: teamId, total_msg_count: 10})],
            [TestHelper.fakeMyChannel({id: 'my_channel1', channel_id: channelId, msg_count: 10})],
            false,
        ));
        const threadModels = await processReceivedThreads(serverUrl, [TestHelper.fakeThread({
            id: threadId,
            reply_count: 1,
            unread_replies: 0,
            post: TestHelper.fakePost({id: threadId, channel_id: channelId}),
            is_following: true,
        })], teamId, true);
        await operator.batchRecords([...channelModels.flat(), ...threadModels.models!], 'test');

        const {getByTestId} = renderWithEverything(<EnhancedTeamItem myTeam={myTeam}/>, {database});
        const teamItem = getByTestId('team-item');
        expect(teamItem.props.hasUnreads).toBe(false);

        await act(async () => {
            await processReceivedThreads(serverUrl, [TestHelper.fakeThread({
                id: threadId,
                reply_count: 1,
                unread_replies: 1,
                post: TestHelper.fakePost({id: threadId, channel_id: channelId}),
                is_following: true,
            })], teamId, false);
        });

        expect(teamItem.props.hasUnreads).toBe(true);

        await act(async () => {
            await processReceivedThreads(serverUrl, [TestHelper.fakeThread({
                id: threadId,
                reply_count: 1,
                unread_replies: 0,
                post: TestHelper.fakePost({id: threadId, channel_id: channelId}),
                is_following: true,
            })], teamId, false);
        });

        expect(teamItem.props.hasUnreads).toBe(false);
    });

    it('should not consider unread threads if collapsed threads is off', async () => {
        const channelId = 'channel1';
        const threadId = 'thread1';

        await operator.handleConfigs({
            configs: [{id: 'CollapsedThreads', value: Config.DISABLED}],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });

        const channelModels = await Promise.all(await prepareAllMyChannels(operator,
            [TestHelper.fakeChannel({id: channelId, team_id: teamId, total_msg_count: 10})],
            [TestHelper.fakeMyChannel({id: 'my_channel1', channel_id: channelId, msg_count: 10})],
            false,
        ));
        const threadModels = await processReceivedThreads(serverUrl, [TestHelper.fakeThread({
            id: threadId,
            reply_count: 1,
            unread_replies: 0,
            post: TestHelper.fakePost({id: threadId, channel_id: channelId}),
            is_following: true,
        })], teamId, true);
        await operator.batchRecords([...channelModels.flat(), ...threadModels.models!], 'test');

        const {getByTestId} = renderWithEverything(<EnhancedTeamItem myTeam={myTeam}/>, {database});
        const teamItem = getByTestId('team-item');
        expect(teamItem.props.hasUnreads).toBe(false);

        await act(async () => {
            await processReceivedThreads(serverUrl, [TestHelper.fakeThread({
                id: threadId,
                reply_count: 1,
                unread_replies: 1,
                post: TestHelper.fakePost({id: threadId, channel_id: channelId}),
                is_following: true,
            })], teamId, false);
        });

        expect(teamItem.props.hasUnreads).toBe(false);

        await act(async () => {
            const models = await Promise.all(await prepareAllMyChannels(operator,
                [TestHelper.fakeChannel({id: 'channel1', team_id: teamId, total_msg_count: 20})],
                [TestHelper.fakeMyChannel({id: 'my_channel1', channel_id: 'channel1', msg_count: 10})],
                false,
            ));
            await operator.batchRecords(models.flat(), 'test');
        });

        expect(teamItem.props.hasUnreads).toBe(true);
    });
});
