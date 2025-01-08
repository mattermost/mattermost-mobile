// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';
import {buildQueryString} from '@utils/helpers';

import {PER_PAGE_DEFAULT} from './constants';

import type ClientBase from './base';
import type {ClientChannelsMix} from './channels';

describe('ClientChannels', () => {
    let client: ClientChannelsMix & ClientBase;

    beforeAll(() => {
        client = TestHelper.createClient();
        client.doFetch = jest.fn();
    });

    test('getAllChannels', async () => {
        const page = 1;
        const perPage = 10;
        const notAssociatedToGroup = 'group1';
        const excludeDefaultChannels = true;
        const includeTotalCount = true;
        const expectedUrl = `${client.getChannelsRoute()}?page=${page}&per_page=${perPage}&not_associated_to_group=${notAssociatedToGroup}&exclude_default_channels=${excludeDefaultChannels}&include_total_count=${includeTotalCount}`;
        const expectedOptions = {method: 'get'};

        await client.getAllChannels(page, perPage, notAssociatedToGroup, excludeDefaultChannels, includeTotalCount);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);

        // Test with default values
        await client.getAllChannels();
        expect(client.doFetch).toHaveBeenCalledWith(`${client.getChannelsRoute()}?page=0&per_page=${PER_PAGE_DEFAULT}&not_associated_to_group=&exclude_default_channels=false&include_total_count=false`, expectedOptions);
    });

    test('createChannel', async () => {
        const channel = {id: 'channel1', name: 'testchannel'} as Channel;
        const expectedUrl = client.getChannelsRoute();
        const expectedOptions = {method: 'post', body: channel};

        await client.createChannel(channel);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('createDirectChannel', async () => {
        const userIds = ['user1', 'user2'];
        const expectedUrl = `${client.getChannelsRoute()}/direct`;
        const expectedOptions = {method: 'post', body: userIds};

        await client.createDirectChannel(userIds);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('createGroupChannel', async () => {
        const userIds = ['user1', 'user2', 'user3'];
        const expectedUrl = `${client.getChannelsRoute()}/group`;
        const expectedOptions = {method: 'post', body: userIds};

        await client.createGroupChannel(userIds);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('deleteChannel', async () => {
        const channelId = 'channel1';
        const expectedUrl = client.getChannelRoute(channelId);
        const expectedOptions = {method: 'delete'};

        await client.deleteChannel(channelId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('unarchiveChannel', async () => {
        const channelId = 'channel1';
        const expectedUrl = `${client.getChannelRoute(channelId)}/restore`;
        const expectedOptions = {method: 'post'};

        await client.unarchiveChannel(channelId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('updateChannel', async () => {
        const channel = {id: 'channel1', name: 'updatedchannel'} as Channel;
        const expectedUrl = client.getChannelRoute(channel.id);
        const expectedOptions = {method: 'put', body: channel};

        await client.updateChannel(channel);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('convertChannelToPrivate', async () => {
        const channelId = 'channel1';
        const expectedUrl = `${client.getChannelRoute(channelId)}/privacy`;
        const expectedOptions = {method: 'put', body: {privacy: 'P'}};

        await client.convertChannelToPrivate(channelId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('updateChannelPrivacy', async () => {
        const channelId = 'channel1';
        const privacy = 'P';
        const expectedUrl = `${client.getChannelRoute(channelId)}/privacy`;
        const expectedOptions = {method: 'put', body: {privacy}};

        await client.updateChannelPrivacy(channelId, privacy);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('patchChannel', async () => {
        const channelId = 'channel1';
        const channelPatch = {name: 'patchedchannel'};
        const expectedUrl = `${client.getChannelRoute(channelId)}/patch`;
        const expectedOptions = {method: 'put', body: channelPatch};

        await client.patchChannel(channelId, channelPatch);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('updateChannelNotifyProps', async () => {
        const props = {channel_id: 'channel1', user_id: 'user1', mark_unread: 'all'} as ChannelNotifyProps & {channel_id: string; user_id: string};
        const expectedUrl = `${client.getChannelMemberRoute(props.channel_id, props.user_id)}/notify_props`;
        const expectedOptions = {method: 'put', body: props};

        await client.updateChannelNotifyProps(props);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getChannel', async () => {
        const channelId = 'channel1';
        const expectedUrl = client.getChannelRoute(channelId);
        const expectedOptions = {method: 'get'};

        await client.getChannel(channelId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getChannelByName', async () => {
        const teamId = 'team1';
        const channelName = 'channelname';
        const includeDeleted = true;
        const expectedUrl = `${client.getTeamRoute(teamId)}/channels/name/${channelName}?include_deleted=${includeDeleted}`;
        const expectedOptions = {method: 'get'};

        await client.getChannelByName(teamId, channelName, includeDeleted);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);

        // Test with default values
        await client.getChannelByName(teamId, channelName);
        expect(client.doFetch).toHaveBeenCalledWith(`${client.getTeamRoute(teamId)}/channels/name/${channelName}?include_deleted=false`, expectedOptions);
    });

    test('getChannelByNameAndTeamName', async () => {
        const teamName = 'teamname';
        const channelName = 'channelname';
        const includeDeleted = true;
        const expectedUrl = `${client.getTeamNameRoute(teamName)}/channels/name/${channelName}?include_deleted=${includeDeleted}`;
        const expectedOptions = {method: 'get'};

        await client.getChannelByNameAndTeamName(teamName, channelName, includeDeleted);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);

        // Test with default values
        await client.getChannelByNameAndTeamName(teamName, channelName);
        expect(client.doFetch).toHaveBeenCalledWith(`${client.getTeamNameRoute(teamName)}/channels/name/${channelName}?include_deleted=false`, expectedOptions);
    });

    test('getChannels', async () => {
        const teamId = 'team1';
        const page = 1;
        const perPage = 10;
        const expectedUrl = `${client.getTeamRoute(teamId)}/channels?page=${page}&per_page=${perPage}`;
        const expectedOptions = {method: 'get'};

        await client.getChannels(teamId, page, perPage);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);

        // Test with default values
        await client.getChannels(teamId);
        expect(client.doFetch).toHaveBeenCalledWith(`${client.getTeamRoute(teamId)}/channels?page=0&per_page=${PER_PAGE_DEFAULT}`, expectedOptions);
    });

    test('getArchivedChannels', async () => {
        const teamId = 'team1';
        const page = 1;
        const perPage = 10;
        const expectedUrl = `${client.getTeamRoute(teamId)}/channels/deleted?page=${page}&per_page=${perPage}`;
        const expectedOptions = {method: 'get'};

        await client.getArchivedChannels(teamId, page, perPage);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);

        // Test with default values
        await client.getArchivedChannels(teamId);
        expect(client.doFetch).toHaveBeenCalledWith(`${client.getTeamRoute(teamId)}/channels/deleted?page=0&per_page=${PER_PAGE_DEFAULT}`, expectedOptions);
    });

    test('getSharedChannels', async () => {
        const teamId = 'team1';
        const page = 1;
        const perPage = 10;
        const expectedUrl = `${client.getSharedChannelsRoute()}/${teamId}?page=${page}&per_page=${perPage}`;
        const expectedOptions = {method: 'get'};

        await client.getSharedChannels(teamId, page, perPage);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);

        // Test with default values
        await client.getSharedChannels(teamId);
        expect(client.doFetch).toHaveBeenCalledWith(`${client.getSharedChannelsRoute()}/${teamId}?page=0&per_page=${PER_PAGE_DEFAULT}`, expectedOptions);
    });

    test('getMyChannels', async () => {
        const teamId = 'team1';
        const includeDeleted = true;
        const since = 123456;
        const expectedUrl = `${client.getUserRoute('me')}/teams/${teamId}/channels?include_deleted=${includeDeleted}&last_delete_at=${since}`;
        const expectedOptions = {method: 'get'};

        await client.getMyChannels(teamId, includeDeleted, since);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);

        // Test with default values
        await client.getMyChannels(teamId);
        expect(client.doFetch).toHaveBeenCalledWith(`${client.getUserRoute('me')}/teams/${teamId}/channels?include_deleted=false&last_delete_at=0`, expectedOptions);
    });

    test('getMyChannelMember', async () => {
        const channelId = 'channel1';
        const expectedUrl = client.getChannelMemberRoute(channelId, 'me');
        const expectedOptions = {method: 'get'};

        await client.getMyChannelMember(channelId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getMyChannelMembers', async () => {
        const teamId = 'team1';
        const expectedUrl = `${client.getUserRoute('me')}/teams/${teamId}/channels/members`;
        const expectedOptions = {method: 'get'};

        await client.getMyChannelMembers(teamId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getChannelMembers', async () => {
        const channelId = 'channel1';
        const page = 1;
        const perPage = 10;
        const expectedUrl = `${client.getChannelMembersRoute(channelId)}?page=${page}&per_page=${perPage}`;
        const expectedOptions = {method: 'get'};

        await client.getChannelMembers(channelId, page, perPage);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);

        // Test with default values
        await client.getChannelMembers(channelId);
        expect(client.doFetch).toHaveBeenCalledWith(`${client.getChannelMembersRoute(channelId)}?page=0&per_page=${PER_PAGE_DEFAULT}`, expectedOptions);
    });

    test('getChannelTimezones', async () => {
        const channelId = 'channel1';
        const expectedUrl = `${client.getChannelRoute(channelId)}/timezones`;
        const expectedOptions = {method: 'get'};

        await client.getChannelTimezones(channelId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getChannelMember', async () => {
        const channelId = 'channel1';
        const userId = 'user1';
        const expectedUrl = client.getChannelMemberRoute(channelId, userId);
        const expectedOptions = {method: 'get'};

        await client.getChannelMember(channelId, userId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getChannelMembersByIds', async () => {
        const channelId = 'channel1';
        const userIds = ['user1', 'user2'];
        const expectedUrl = `${client.getChannelMembersRoute(channelId)}/ids`;
        const expectedOptions = {method: 'post', body: userIds};

        await client.getChannelMembersByIds(channelId, userIds);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('addToChannel', async () => {
        const userId = 'user1';
        const channelId = 'channel1';
        const postRootId = 'post1';
        const member = {user_id: userId, channel_id: channelId, post_root_id: postRootId};
        const expectedUrl = client.getChannelMembersRoute(channelId);
        const expectedOptions = {method: 'post', body: member};

        await client.addToChannel(userId, channelId, postRootId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);

        // Test without postRootId
        await client.addToChannel(userId, channelId);
        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, {...expectedOptions, body: {user_id: userId, channel_id: channelId, post_root_id: ''}});
    });

    test('removeFromChannel', async () => {
        const userId = 'user1';
        const channelId = 'channel1';
        const expectedUrl = client.getChannelMemberRoute(channelId, userId);
        const expectedOptions = {method: 'delete'};

        await client.removeFromChannel(userId, channelId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getChannelStats', async () => {
        const channelId = 'channel1';
        const expectedUrl = `${client.getChannelRoute(channelId)}/stats`;
        const expectedOptions = {method: 'get'};

        await client.getChannelStats(channelId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getChannelMemberCountsByGroup', async () => {
        const channelId = 'channel1';
        const includeTimezones = true;
        const expectedUrl = `${client.getChannelRoute(channelId)}/member_counts_by_group?include_timezones=${includeTimezones}`;
        const expectedOptions = {method: 'get'};

        await client.getChannelMemberCountsByGroup(channelId, includeTimezones);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('viewMyChannel', async () => {
        const channelId = 'channel1';
        const prevChannelId = 'channel2';
        const data = {channel_id: channelId, prev_channel_id: prevChannelId, collapsed_threads_supported: true};
        const expectedUrl = `${client.getChannelsRoute()}/members/me/view`;
        const expectedOptions = {method: 'post', body: data};

        await client.viewMyChannel(channelId, prevChannelId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('autocompleteChannels', async () => {
        const teamId = 'team1';
        const name = 'channelname';
        const expectedUrl = `${client.getTeamRoute(teamId)}/channels/autocomplete?name=${name}`;
        const expectedOptions = {method: 'get'};

        await client.autocompleteChannels(teamId, name);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('autocompleteChannelsForSearch', async () => {
        const teamId = 'team1';
        const name = 'channelname';
        const expectedUrl = `${client.getTeamRoute(teamId)}/channels/search_autocomplete?name=${name}`;
        const expectedOptions = {method: 'get'};

        await client.autocompleteChannelsForSearch(teamId, name);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('searchChannels', async () => {
        const teamId = 'team1';
        const term = 'searchterm';
        const expectedUrl = `${client.getTeamRoute(teamId)}/channels/search`;
        const expectedOptions = {method: 'post', body: {term}};

        await client.searchChannels(teamId, term);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('searchArchivedChannels', async () => {
        const teamId = 'team1';
        const term = 'searchterm';
        const expectedUrl = `${client.getTeamRoute(teamId)}/channels/search_archived`;
        const expectedOptions = {method: 'post', body: {term}};

        await client.searchArchivedChannels(teamId, term);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('searchAllChannels', async () => {
        const term = 'searchterm';
        const teamIds = ['team1', 'team2'];
        const archivedOnly = true;
        const queryParams = {include_deleted: false, system_console: false, exclude_default_channels: false};
        const body = {
            term,
            team_ids: teamIds,
            deleted: archivedOnly,
            exclude_default_channels: true,
            exclude_group_constrained: true,
            public: true,
            private: false,
        };
        const expectedUrl = `${client.getChannelsRoute()}/search${buildQueryString(queryParams)}`;
        const expectedOptions = {method: 'post', body};

        await client.searchAllChannels(term, teamIds, archivedOnly);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);

        // Test with default values
        const defaultExpectedOptions = {method: 'post', body: {...body, deleted: false}};
        await client.searchAllChannels(term, teamIds);
        expect(client.doFetch).toHaveBeenCalledWith(`${client.getChannelsRoute()}/search${buildQueryString(queryParams)}`, defaultExpectedOptions);
    });

    test('updateChannelMemberSchemeRoles', async () => {
        const channelId = 'channel1';
        const userId = 'user1';
        const isSchemeUser = true;
        const isSchemeAdmin = false;
        const body = {scheme_user: isSchemeUser, scheme_admin: isSchemeAdmin};
        const expectedUrl = `${client.getChannelMembersRoute(channelId)}/${userId}/schemeRoles`;
        const expectedOptions = {method: 'put', body};

        await client.updateChannelMemberSchemeRoles(channelId, userId, isSchemeUser, isSchemeAdmin);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getMemberInChannel', async () => {
        const channelId = 'channel1';
        const userId = 'user1';
        const expectedUrl = `${client.getChannelMembersRoute(channelId)}/${userId}`;
        const expectedOptions = {method: 'get'};

        await client.getMemberInChannel(channelId, userId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('getGroupMessageMembersCommonTeams', async () => {
        const channelId = 'channel1';
        const expectedUrl = `${client.getChannelRoute(channelId)}/common_teams`;
        const expectedOptions = {method: 'get'};

        await client.getGroupMessageMembersCommonTeams(channelId);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });

    test('convertGroupMessageToPrivateChannel', async () => {
        const channelId = 'channel1';
        const teamId = 'team1';
        const displayName = 'Private Channel';
        const name = 'private-channel';
        const body = {
            channel_id: channelId,
            team_id: teamId,
            display_name: displayName,
            name,
        };
        const expectedUrl = `${client.getChannelRoute(channelId)}/convert_to_channel?team-id=${teamId}`;
        const expectedOptions = {method: 'post', body};

        await client.convertGroupMessageToPrivateChannel(channelId, teamId, displayName, name);

        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
    });
});
