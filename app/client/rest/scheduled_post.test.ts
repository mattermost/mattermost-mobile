// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';

import type ClientBase from './base';
import type {ClientScheduledPostMix} from './scheduled_post';

describe('ClientScheduledPost', () => {
    let client: ClientScheduledPostMix & ClientBase;
    beforeAll(() => {
        client = TestHelper.createClient();
        client.doFetch = jest.fn();
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

    test('deleteScheduledPost', async () => {
        const scheduledPostId = 'scheduled_post_id';
        const connectionId = 'connection_id';
        const expectedUrl = `${client.getScheduledPostActionsRoute()}/${scheduledPostId}`;
        const expectedOptions = {
            method: 'delete',
            headers: {'Connection-Id': connectionId},
        };

        await client.deleteScheduledPost(scheduledPostId, connectionId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });
});
