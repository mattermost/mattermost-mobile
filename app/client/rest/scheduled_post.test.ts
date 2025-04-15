// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';

import type ClientBase from './base';
import type {ClientScheduledPostMix} from './scheduled_post';

describe('ClientScheduledPost', () => {
    let client: ClientScheduledPostMix & ClientBase;
    const scheduledPost: ScheduledPost = {
        id: 'scheduled_post_id',
        channel_id: 'channel_id',
        message: 'scheduled post message',
        scheduled_at: 1738925211,
        user_id: 'current_user_id',
        root_id: '',
        update_at: 1738925211,
        create_at: 1738925211,
    };

    beforeAll(() => {
        client = TestHelper.createClient();
        client.doFetch = jest.fn();
    });

    test('createScheduledPost', async () => {
        await client.createScheduledPost(scheduledPost, 'connection_id');

        const expectedUrl = client.getScheduledPostRoute();
        const expectedOptions = {
            method: 'post',
            body: scheduledPost,
            headers: {'Connection-Id': 'connection_id'},
        };
        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('createScheduledPost without connection ID', async () => {
        await client.createScheduledPost(scheduledPost);

        const expectedUrl = client.getScheduledPostRoute();
        const expectedOptions = {
            method: 'post',
            body: scheduledPost,
            headers: {'Connection-Id': undefined},
        };
        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getScheduledPostsForTeam', async () => {
        const teamId = 'team_id';
        const includeDirectChannels = false;
        const groupLabel = 'WebSocket Reconnect';
        const expectedUrl = `${client.getTeamAndDirectChannelScheduledPostsRoute()}/team/${teamId}?includeDirectChannels=${includeDirectChannels}`;
        const expectedOptions = {
            method: 'get',
            groupLabel,
        };

        await client.getScheduledPostsForTeam(teamId, includeDirectChannels, groupLabel);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getScheduledPostsForTeam with include direct channels', async () => {
        const teamId = 'team_id';
        const includeDirectChannels = true;
        const groupLabel = 'WebSocket Reconnect';
        const expectedUrl = `${client.getTeamAndDirectChannelScheduledPostsRoute()}/team/${teamId}?includeDirectChannels=${includeDirectChannels}`;
        const expectedOptions = {
            method: 'get',
            groupLabel,
        };

        await client.getScheduledPostsForTeam(teamId, includeDirectChannels, groupLabel);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('updateScheduledPost', async () => {
        const updatedPost = {
            ...scheduledPost,
            message: 'updated scheduled post message',
        };
        const connectionId = 'connection_id';
        await client.updateScheduledPost(updatedPost, connectionId);
        const expectedUrl = `${client.getScheduledPostRoute()}/${scheduledPost.id}`;
        const expectedOptions = {
            method: 'put',
            body: updatedPost,
            headers: {'Connection-Id': connectionId},
        };
        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('updateScheduledPost without connection ID', async () => {
        const updatedPost = {
            ...scheduledPost,
            message: 'updated scheduled post message',
        };
        await client.updateScheduledPost(updatedPost);
        const expectedUrl = `${client.getScheduledPostRoute()}/${scheduledPost.id}`;
        const expectedOptions = {
            method: 'put',
            body: updatedPost,
            headers: {},
        };
        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('deleteScheduledPost', async () => {
        const scheduledPostId = 'scheduled_post_id';
        const connectionId = 'connection_id';
        const expectedUrl = `${client.getScheduledPostRoute()}/${scheduledPostId}`;
        const expectedOptions = {
            method: 'delete',
            headers: {'Connection-Id': connectionId},
        };
        await client.deleteScheduledPost(scheduledPostId, connectionId);
        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('deleteScheduledPost without connection ID', async () => {
        const scheduledPostId = 'scheduled_post_id';
        const expectedUrl = `${client.getScheduledPostRoute()}/${scheduledPostId}`;
        const expectedOptions = {
            method: 'delete',
            headers: {},
        };
        await client.deleteScheduledPost(scheduledPostId);
        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });
});
