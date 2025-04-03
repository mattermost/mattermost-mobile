// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';
import {buildQueryString} from '@utils/helpers';

import {PER_PAGE_DEFAULT} from './constants';

import type ClientBase from './base';
import type {ClientGroupsMix} from './groups';

describe('ClientGroups', () => {
    let client: ClientGroupsMix & ClientBase;

    beforeAll(() => {
        client = TestHelper.createClient();
        client.doFetch = jest.fn();
    });

    test('getGroups', async () => {
        const params = {
            query: 'test',
            filterAllowReference: true,
            page: 1,
            perPage: 10,
            since: 0,
            includeMemberCount: true,
        };

        await client.getGroups(params);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.urlVersion}/groups${buildQueryString({
                q: params.query,
                filter_allow_reference: params.filterAllowReference,
                page: params.page,
                per_page: params.perPage,
                since: params.since,
                include_member_count: params.includeMemberCount,
            })}`,
            {method: 'get'},
        );

        // Test with default values
        await client.getGroups({});
        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.urlVersion}/groups${buildQueryString({
                q: '',
                filter_allow_reference: true,
                page: 0,
                per_page: PER_PAGE_DEFAULT,
                since: 0,
                include_member_count: false,
            })}`,
            {method: 'get'},
        );
    });

    test('getAllGroupsAssociatedToChannel', async () => {
        const channelId = 'channel1';
        const groupLabel = 'WebSocket Reconnect';

        await client.getAllGroupsAssociatedToChannel(channelId, undefined, groupLabel);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.urlVersion}/channels/${channelId}/groups${buildQueryString({
                paginate: false,
                filter_allow_reference: false,
                include_member_count: true,
            })}`,
            {method: 'get', groupLabel},
        );
    });

    test('getAllGroupsAssociatedToTeam', async () => {
        const teamId = 'team1';

        await client.getAllGroupsAssociatedToTeam(teamId);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.urlVersion}/teams/${teamId}/groups${buildQueryString({
                paginate: false,
                filter_allow_reference: false,
            })}`,
            {method: 'get'},
        );
    });

    test('getAllGroupsAssociatedToMembership', async () => {
        const userId = 'user1';
        const groupLabel = 'WebSocket Reconnect';

        await client.getAllGroupsAssociatedToMembership(userId, undefined, groupLabel);

        expect(client.doFetch).toHaveBeenCalledWith(
            `${client.urlVersion}/users/${userId}/groups${buildQueryString({
                paginate: false,
                filter_allow_reference: false,
            })}`,
            {method: 'get', groupLabel},
        );
    });
});
