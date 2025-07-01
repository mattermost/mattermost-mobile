// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {storeGlobal} from '@actions/app/global';
import {ActionType, Tutorial, Screens} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {act, renderWithEverything, waitFor} from '@test/intl-test-helper';
import TestHelper from '@test/test_helper';

import GlobalScheduledPostList from './global_scheduled_post_list';

import EnhancedGlobalScheduledPostList from './index';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';
import type ScheduledPostModel from '@typings/database/models/servers/scheduled_post';

jest.mock('./global_scheduled_post_list', () => ({
    __esModule: true,
    default: jest.fn(),
}));

jest.mocked(GlobalScheduledPostList).mockImplementation((props) => React.createElement('GlobalScheduledPostList', {...props, testID: 'global-scheduled-post-list'}));

describe('GlobalScheduledPostList', () => {
    const serverUrl = 'server-1';
    const teamId = 'team1';
    let database: Database;
    let operator: ServerDataOperator;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        const serverDatabaseAndOperator = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        database = serverDatabaseAndOperator.database;
        operator = serverDatabaseAndOperator.operator;

        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        await operator.handleTeam({teams: [TestHelper.fakeTeam({id: teamId})], prepareRecordsOnly: false});
        await operator.handleConfigs({
            configs: [
                {id: 'Version', value: '7.6.0'},
            ],
            configsToDelete: [],
            prepareRecordsOnly: false,
        });
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('should return empty array is there is no scheduled post', async () => {
        const {getByTestId} = renderWithEverything(
            <EnhancedGlobalScheduledPostList
                location={Screens.GLOBAL_DRAFTS}
            />,
            {database},
        );

        const globalScheduledPostList = getByTestId('global-scheduled-post-list');
        expect(globalScheduledPostList.props.allScheduledPosts).toStrictEqual([]);
    });

    it('should show scheduled post when one exists', async () => {
        const {getByTestId} = renderWithEverything(
            <EnhancedGlobalScheduledPostList
                location={Screens.GLOBAL_DRAFTS}
            />,
            {database},
        );

        const globalScheduledPostList = getByTestId('global-scheduled-post-list');
        expect(globalScheduledPostList.props.allScheduledPosts).toStrictEqual([]);

        const channelId = 'channel1';
        await operator.handleChannel({
            channels: [TestHelper.fakeChannel({id: channelId, team_id: teamId})],
            prepareRecordsOnly: false,
        });

        const scheduledPosts = [TestHelper.fakeScheduledPost({
            message: 'test message',
            files: [],
            channel_id: channelId,
        })];

        await act(async () => {
            await operator.handleScheduledPosts({
                actionType: ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST,
                scheduledPosts,
                includeDirectChannelPosts: false,
                prepareRecordsOnly: false,
            });
        });

        await waitFor(() => {
            const updatedGlobalScheduledPostList = getByTestId('global-scheduled-post-list');
            expect(updatedGlobalScheduledPostList.props.allScheduledPosts).toHaveLength(1);
            expect(updatedGlobalScheduledPostList.props.allScheduledPosts[0].id).toStrictEqual(scheduledPosts[0].id);
        });
    });

    it('should correctly handle tutorial watched state', async () => {
        const {getByTestId} = renderWithEverything(
            <EnhancedGlobalScheduledPostList
                location={Screens.GLOBAL_DRAFTS}
            />,
            {database},
        );

        const globalScheduledPostList = getByTestId('global-scheduled-post-list');
        expect(globalScheduledPostList.props.tutorialWatched).toBe(false);

        await storeGlobal(Tutorial.SCHEDULED_POSTS_LIST, 'true', false);

        await waitFor(() => {
            const updatedGlobalScheduledPostList = getByTestId('global-scheduled-post-list');
            expect(updatedGlobalScheduledPostList.props.tutorialWatched).toBe(true);
        });
    });

    it('should only show scheduled posts for current team', async () => {
        const {getByTestId} = renderWithEverything(
            <EnhancedGlobalScheduledPostList
                location={Screens.GLOBAL_DRAFTS}
            />,
            {database},
        );

        const team1ChannelId = 'team1_channel';
        const team2ChannelId = 'team2_channel';

        await operator.handleChannel({
            channels: [
                TestHelper.fakeChannel({id: team1ChannelId, team_id: teamId, type: 'O'}),
                TestHelper.fakeChannel({id: team2ChannelId, team_id: 'team2', type: 'O'}),
            ],
            prepareRecordsOnly: false,
        });

        const scheduledPosts = [
            TestHelper.fakeScheduledPost({
                id: 'post1',
                message: 'Team1 message',
                channel_id: team1ChannelId,
            }),
            TestHelper.fakeScheduledPost({
                id: 'post2',
                message: 'Team2 message',
                channel_id: team2ChannelId,
            }),
        ];

        await act(async () => {
            await operator.handleScheduledPosts({
                actionType: ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST,
                scheduledPosts,
                includeDirectChannelPosts: false,
                prepareRecordsOnly: false,
            });
        });

        await waitFor(() => {
            const globalScheduledPostList = getByTestId('global-scheduled-post-list');

            // Should only show the post from current team (team1)
            expect(globalScheduledPostList.props.allScheduledPosts).toHaveLength(1);
            expect(globalScheduledPostList.props.allScheduledPosts[0].id).toBe('post1');
        });
    });

    it('should include DMs and GMs in scheduled posts', async () => {
        const {getByTestId} = renderWithEverything(
            <EnhancedGlobalScheduledPostList
                location={Screens.GLOBAL_DRAFTS}
            />,
            {database},
        );

        const teamChannelId = 'team_channel';
        const dmChannelId = 'dm_channel';
        const gmChannelId = 'gm_channel';

        await operator.handleChannel({
            channels: [
                TestHelper.fakeChannel({id: teamChannelId, team_id: teamId, type: 'O'}), // Team channel
                TestHelper.fakeChannel({id: dmChannelId, team_id: '', type: 'D'}), // Direct message
                TestHelper.fakeChannel({id: gmChannelId, team_id: '', type: 'G'}), // Group message
            ],
            prepareRecordsOnly: false,
        });

        const scheduledPosts = [
            TestHelper.fakeScheduledPost({
                id: 'team_post',
                message: 'Team message',
                channel_id: teamChannelId,
            }),
            TestHelper.fakeScheduledPost({
                id: 'dm_post',
                message: 'DM message',
                channel_id: dmChannelId,
            }),
            TestHelper.fakeScheduledPost({
                id: 'gm_post',
                message: 'GM message',
                channel_id: gmChannelId,
            }),
        ];

        await act(async () => {
            await operator.handleScheduledPosts({
                actionType: ActionType.SCHEDULED_POSTS.CREATE_OR_UPDATED_SCHEDULED_POST,
                scheduledPosts,
                includeDirectChannelPosts: true,
                prepareRecordsOnly: false,
            });
        });

        await waitFor(() => {
            const globalScheduledPostList = getByTestId('global-scheduled-post-list');

            expect(globalScheduledPostList.props.allScheduledPosts).toHaveLength(3);

            const postIds = globalScheduledPostList.props.allScheduledPosts.map((post: ScheduledPostModel) => post.id);
            expect(postIds).toContain('team_post');
            expect(postIds).toContain('dm_post');
            expect(postIds).toContain('gm_post');
        });
    });
});
