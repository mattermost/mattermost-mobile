// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';
import React from 'react';

import {processReceivedThreads} from '@actions/local/thread';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {renderWithEverything, act} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import GlobalThreads from './global_threads';

import EnhancedGlobalThreads from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';

jest.mock('./global_threads', () => ({
    __esModule: true,
    default: jest.fn(),
}));
jest.mocked(GlobalThreads).mockImplementation((props) => React.createElement('GlobalThreads', {...props, testID: 'global-threads'}));

describe('GlobalThreads enhanced component', () => {
    const serverUrl = 'server-1';
    const teamId = 'team1';
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;

        await operator.handleSystem({
            systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}],
            prepareRecordsOnly: false,
        });
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should correctly show hasUnreads when there are unread threads', async () => {
        const channelId = 'channel1';
        const threadId = 'thread1';

        await operator.handleChannel({
            channels: [TestHelper.fakeChannel({id: channelId, team_id: teamId})],
            prepareRecordsOnly: false,
        });
        await processReceivedThreads(serverUrl, [TestHelper.fakeThread({
            id: threadId,
            reply_count: 1,
            unread_replies: 0,
            post: TestHelper.fakePost({id: threadId, channel_id: channelId}),
            is_following: true,
        })], teamId, false);

        const {getByTestId} = renderWithEverything(<EnhancedGlobalThreads/>, {database});
        const globalThreads = getByTestId('global-threads');
        expect(globalThreads.props.hasUnreads).toBe(false);

        await act(async () => {
            await processReceivedThreads(serverUrl, [TestHelper.fakeThread({
                id: threadId,
                reply_count: 1,
                unread_replies: 1,
                post: TestHelper.fakePost({id: threadId, channel_id: channelId}),
                is_following: true,
            })], teamId, false);
        });

        expect(globalThreads.props.hasUnreads).toBe(true);
    });

    it('should select the threads for unreads based on the current team', async () => {
        const channelId1 = 'channel1';
        const threadId1 = 'thread1';

        const channelId2 = 'channel2';
        const threadId2 = 'thread2';
        const teamId2 = 'team2';

        await operator.handleChannel({
            channels: [TestHelper.fakeChannel({id: channelId1, team_id: teamId})],
            prepareRecordsOnly: false,
        });
        await processReceivedThreads(serverUrl, [TestHelper.fakeThread({
            id: threadId1,
            reply_count: 1,
            unread_replies: 0,
            post: TestHelper.fakePost({id: threadId1, channel_id: channelId1}),
            is_following: true,
        })], teamId, false);

        await operator.handleChannel({
            channels: [TestHelper.fakeChannel({id: channelId2, team_id: teamId2})],
            prepareRecordsOnly: false,
        });
        await processReceivedThreads(serverUrl, [TestHelper.fakeThread({
            id: threadId2,
            reply_count: 1,
            unread_replies: 1,
            post: TestHelper.fakePost({id: threadId2, channel_id: channelId2}),
            is_following: true,
        })], teamId2, false);

        const {getByTestId} = renderWithEverything(<EnhancedGlobalThreads/>, {database});
        const globalThreads = getByTestId('global-threads');
        expect(globalThreads.props.hasUnreads).toBe(false);

        await act(async () => {
            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId2}],
                prepareRecordsOnly: false,
            });
        });

        expect(globalThreads.props.hasUnreads).toBe(true);
    });

    it('should update teamId when current team changes', async () => {
        const {getByTestId} = renderWithEverything(<EnhancedGlobalThreads/>, {database});
        const globalThreads = getByTestId('global-threads');
        expect(globalThreads.props.teamId).toBe(teamId);

        const newTeamId = 'team2';
        await act(async () => {
            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: newTeamId}],
                prepareRecordsOnly: false,
            });
        });

        expect(globalThreads.props.teamId).toBe(newTeamId);
    });

    it('should observe global threads tab changes', async () => {
        const {getByTestId} = renderWithEverything(<EnhancedGlobalThreads/>, {database});
        const globalThreads = getByTestId('global-threads');

        // Default tab should be 'all'
        expect(globalThreads.props.globalThreadsTab).toBe('all');

        await act(async () => {
            await operator.handleSystem({
                systems: [{id: SYSTEM_IDENTIFIERS.GLOBAL_THREADS_TAB, value: 'unreads'}],
                prepareRecordsOnly: false,
            });
        });

        expect(globalThreads.props.globalThreadsTab).toBe('unreads');
    });
});
