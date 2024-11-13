// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {createIntl} from 'react-intl';

import {DeepLink} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';

import {
    removeMemberFromChannel,
    fetchChannelMembersByIds,
    updateChannelMemberSchemeRoles,
    fetchMemberInChannel,
    fetchChannelMemberships,
    addMembersToChannel,
    fetchChannelByName,
    createChannel,
    patchChannel,
    leaveChannel,
    fetchChannelCreator,
    fetchMyChannelsForTeam,
    fetchMyChannel,
    joinChannel,
    joinChannelIfNeeded,
    markChannelAsRead,
    unsetActiveChannelOnServer,
    switchToChannelByName,
    goToNPSChannel,
    fetchMissingDirectChannelsInfo,
    fetchDirectChannelsInfo,
    createDirectChannel,
    fetchChannels,
    makeDirectChannel,
    fetchArchivedChannels,
    createGroupChannel,
    fetchSharedChannels,
    makeGroupChannel,
    getChannelMemberCountsByGroup,
    getChannelTimezones,
    switchToChannelById,
    switchToPenultimateChannel,
    switchToLastChannel,
    searchChannels,
    fetchChannelById,
    searchAllChannels,
    updateChannelNotifyProps,
    toggleMuteChannel,
    archiveChannel,
    unarchiveChannel,
    convertChannelToPrivate,
    handleKickFromChannel,
    fetchGroupMessageMembersCommonTeams,
    convertGroupMessageToPrivateChannel,
} from './channel';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type ChannelModel from '@typings/database/models/servers/channel';

const serverUrl = 'baseHandler.test.com';
let operator: ServerDataOperator;

const user: UserProfile = {
    id: 'userid',
    username: 'username',
    roles: '',
} as UserProfile;

let mockIsTablet: jest.Mock;
jest.mock('@utils/helpers', () => {
    const original = jest.requireActual('@utils/helpers');
    mockIsTablet = jest.fn(() => false);
    return {
        ...original,
        isTablet: mockIsTablet,
    };
});

let mockGetActiveServer: jest.Mock;
jest.mock('@queries/app/servers', () => {
    const original = jest.requireActual('@queries/app/servers');
    mockGetActiveServer = jest.fn(() => false);
    return {
        ...original,
        getActiveServer: mockGetActiveServer,
    };
});

const mockClient = {
    removeFromChannel: jest.fn(),
    getChannelMembersByIds: jest.fn((channelId: string, userIds: string[]) => userIds.map((uid) => ({user_id: uid, channel_id: channelId, roles: ''}))),
    updateChannelMemberSchemeRoles: jest.fn(),
    getMemberInChannel: jest.fn((channelId: string, userId: string) => ({id: userId + '-' + channelId, user_id: userId, channel_id: channelId, roles: ''})),
    getChannel: jest.fn((channelId: string) => ({id: channelId, name: 'channel1', creatorId: user.id})),
    getProfilesInChannel: jest.fn(() => ([user])),
    addToChannel: jest.fn((channelId: string, userId: string) => ({id: userId + '-' + channelId, user_id: userId, channel_id: channelId, roles: ''})),
    getProfilesByIds: jest.fn((userIds: string[]) => userIds.map((uid) => ({id: uid, username: 'u' + uid, roles: ''}))),
    getChannelByName: jest.fn((teamId: string, channelName: string) => ({id: channelId, name: channelName, team_id: teamId})),
    createChannel: jest.fn((channel: Channel) => ({...channel, id: channelId})),
    getChannelMember: jest.fn((channelId: string, userId: string) => ({id: userId + '-' + channelId, user_id: userId, channel_id: channelId, roles: ''})),
    patchChannel: jest.fn((channelId: string, channel: ChannelPatch) => ({...channel, id: channelId})),
    getUser: jest.fn((userId: string) => ({...user, id: userId})),
    getMyChannels: jest.fn((teamId: string) => ([{id: channelId, name: 'channel1', creatorId: user.id, team_id: teamId}])),
    getMyChannelMembers: jest.fn(() => ([{id: user.id + '-' + channelId, user_id: user.id, channel_id: channelId, roles: ''}])),
    getCategories: jest.fn((userId: string, teamId: string) => ({categories: [{id: 'categoryid', channel_ids: [channelId], team_id: teamId}], order: ['categoryid']})),
    viewMyChannel: jest.fn(),
    getTeamByName: jest.fn((teamName: string) => ({id: teamId, name: teamName})),
    getTeam: jest.fn((id: string) => ({id, name: 'teamname'})),
    addToTeam: jest.fn((teamId: string, userId: string) => ({id: userId + '-' + teamId, user_id: userId, team_id: teamId, roles: ''})),
    getUserByUsername: jest.fn((username: string) => ({...user, id: 'userid2', username})),
    createDirectChannel: jest.fn((userIds: string[]) => ({id: userIds[0] + '__' + userIds[1], team_id: '', type: 'D', display_name: 'displayname'})),
    getChannels: jest.fn((teamId: string) => ([{id: channelId, name: 'channel1', creatorId: user.id, team_id: teamId}])),
    getArchivedChannels: jest.fn((teamId: string) => ([{id: channelId + 'old', name: 'channel1old', creatorId: user.id, team_id: teamId, delete_at: 1}])),
    createGroupChannel: jest.fn(() => ({id: 'groupid', team_id: '', type: 'G', display_name: 'displayname'})),
    getProfilesInGroupChannels: jest.fn(() => ({groupid: [user, {...user, id: 'userid2'}]})),
    savePreferences: jest.fn(),
    getRolesByNames: jest.fn((roles: string[]) => roles.map((r) => ({id: r, name: r} as Role))),
    getSharedChannels: jest.fn((teamId: string) => ([{id: channelId + 'shared', name: 'channel1shared', creatorId: user.id, team_id: teamId, shared: true}])),
    getChannelMemberCountsByGroup: jest.fn((channelId: string) => ({group_id: channelId, channel_member_count: 3, channel_member_timezones_count: 2})),
    getChannelTimezones: jest.fn(() => ['est']),
    autocompleteChannels: jest.fn((teamId: string) => ([{id: channelId, name: 'channel1', creatorId: user.id, team_id: teamId}])),
    searchAllChannels: jest.fn(() => ([{id: channelId, name: 'channel1', creatorId: user.id, team_id: teamId}])),
    updateChannelNotifyProps: jest.fn(),
    deleteChannel: jest.fn(),
    unarchiveChannel: jest.fn(),
    convertChannelToPrivate: jest.fn(),
    getGroupMessageMembersCommonTeams: jest.fn(() => ({id: teamId, name: 'teamname'})),
    convertGroupMessageToPrivateChannel: jest.fn((channelId: string) => ({id: channelId, name: 'channel1', creatorId: user.id, type: 'P'})),
    getPosts: jest.fn(() => ({
        order: [],
        posts: [],
        previousPostId: '',
    })),
};

const teamId = 'teamid1';
const channelId = 'channelid1';

const intl = createIntl({
    locale: 'en',
    messages: {},
});

beforeAll(() => {
    // eslint-disable-next-line
    // @ts-ignore
    NetworkManager.getClient = () => mockClient;
});

beforeEach(async () => {
    await DatabaseManager.init([serverUrl]);
    operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
});

afterEach(async () => {
    await DatabaseManager.destroyServerDatabase(serverUrl);
});

describe('channelMember', () => {
    it('removeMemberFromChannel - handle not found database', async () => {
        const result = await removeMemberFromChannel('foo', '', '') as {error: unknown};
        expect(result?.error).toBeDefined();
    });

    it('removeMemberFromChannel - base case', async () => {
        const result = await removeMemberFromChannel(serverUrl, channelId, user.id);
        expect(result).toBeDefined();
    });

    it('fetchChannelMembersByIds - handle not found database', async () => {
        const {members, error} = await fetchChannelMembersByIds('foo', '', []);
        expect(members).toBeUndefined();
        expect(error).toBeDefined();
    });

    it('fetchChannelMembersByIds - base case', async () => {
        const {members, error} = await fetchChannelMembersByIds(serverUrl, channelId, [user.id]);
        expect(error).toBeUndefined();
        expect(members).toBeDefined();
        expect(members?.length).toBe(1);
    });

    it('updateChannelMemberSchemeRoles - base case', async () => {
        const result = await updateChannelMemberSchemeRoles(serverUrl, channelId, user.id, true, true);
        expect(result).toBeDefined();
    });

    it('fetchMemberInChannel - handle not found database', async () => {
        const {member, error} = await fetchMemberInChannel('foo', '', '');
        expect(member).toBeUndefined();
        expect(error).toBeDefined();
    });

    it('fetchMemberInChannel - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}], prepareRecordsOnly: false});
        const {member, error} = await fetchMemberInChannel(serverUrl, channelId, user.id);
        expect(error).toBeUndefined();
        expect(member).toBeDefined();
    });

    it('fetchChannelMemberships - base case', async () => {
        const {members, users} = await fetchChannelMemberships(serverUrl, channelId, {});
        expect(users).toBeDefined();
        expect(users.length).toBe(1);
        expect(members).toBeDefined();
        expect(members.length).toBe(1);
    });

    it('addMembersToChannel - handle not found database', async () => {
        const {channelMemberships, error} = await addMembersToChannel('foo', '', []);
        expect(channelMemberships).toBeUndefined();
        expect(error).toBeDefined();
    });

    it('addMembersToChannel - base case', async () => {
        const {channelMemberships, error} = await addMembersToChannel(serverUrl, channelId, [user.id]);
        expect(error).toBeUndefined();
        expect(channelMemberships).toBeDefined();
        expect(channelMemberships?.length).toBe(1);
    });

    it('getChannelMemberCountsByGroup - base case', async () => {
        const {channelMemberCountsByGroup, error} = await getChannelMemberCountsByGroup(serverUrl, channelId, true);
        expect(error).toBeUndefined();
        expect(channelMemberCountsByGroup).toBeDefined();
    });

    it('updateChannelNotifyProps - handle not found database', async () => {
        const {notifyProps, error} = await updateChannelNotifyProps('foo', '', {});
        expect(notifyProps).toBeUndefined();
        expect(error).toBeDefined();
    });

    it('updateChannelNotifyProps - base case', async () => {
        const {notifyProps, error} = await updateChannelNotifyProps(serverUrl, channelId, {});
        expect(error).toBeUndefined();
        expect(notifyProps).toBeDefined();
    });

    it('toggleMuteChannel - handle not found database', async () => {
        const {notifyProps, error} = await toggleMuteChannel('foo', '');
        expect(notifyProps).toBeUndefined();
        expect(error).toBeDefined();
    });

    it('toggleMuteChannel - base case', async () => {
        await operator.handleMyChannelSettings({
            settings: [{id: channelId, user_id: user.id, channel_id: channelId, roles: '', last_viewed_at: 1, last_update_at: 1, msg_count: 10, mention_count: 0, notify_props: {}}],
            prepareRecordsOnly: false,
        });

        const {notifyProps, error} = await toggleMuteChannel(serverUrl, channelId, true);
        expect(error).toBeUndefined();
        expect(notifyProps).toBeDefined();
    });
});

describe('channel', () => {
    it('fetchChannelByName - handle not found database', async () => {
        const {channel, error} = await fetchChannelByName('foo', '', '');
        expect(channel).toBeUndefined();
        expect(error).toBeDefined();
    });

    it('fetchChannelByName - base case', async () => {
        const {channel, error} = await fetchChannelByName(serverUrl, channelId, 'channelname');
        expect(error).toBeUndefined();
        expect(channel).toBeDefined();
    });

    it('createChannel - handle not found database', async () => {
        const {channel, error} = await createChannel('foo', '', '', '', 'O');
        expect(channel).toBeUndefined();
        expect(error).toBeDefined();
    });

    it('createChannel - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}, {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        const {channel, error} = await createChannel(serverUrl, 'channeldisplayname', 'purpose', 'header', 'O');
        expect(error).toBeUndefined();
        expect(channel).toBeDefined();
    });

    it('patchChannel - handle not found database', async () => {
        const {channel, error} = await patchChannel('foo', '', {});
        expect(channel).toBeUndefined();
        expect(error).toBeDefined();
    });

    it('patchChannel - base case', async () => {
        await operator.handleChannel({channels: [{
            id: channelId,
            purpose: 'oldpurpose',
            team_id: teamId,
            total_msg_count: 0,
        } as Channel],
        prepareRecordsOnly: false});

        const {channel, error} = await patchChannel(serverUrl, channelId, {name: 'channelname', display_name: 'Channel Name', purpose: 'purpose', header: 'header'});
        expect(error).toBeUndefined();
        expect(channel).toBeDefined();
    });

    it('leaveChannel - handle not found database', async () => {
        const {error} = await leaveChannel('foo', '');
        expect(error).toBeDefined();
    });

    it('leaveChannel - no user', async () => {
        const {error} = await leaveChannel(serverUrl, channelId);
        expect(error).toBeDefined();
        expect(error).toBe('current user not found');
    });

    it('leaveChannel - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}, {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        await operator.handleUsers({users: [user], prepareRecordsOnly: false});

        const result = await leaveChannel(serverUrl, channelId);
        expect(result.error).toBeUndefined();
        expect(result).toBeDefined();
    });

    it('fetchChannelCreator - handle not found database', async () => {
        const {user: fetchedUser, error} = await fetchChannelCreator('foo', '');
        expect(fetchedUser).toBeUndefined();
        expect(error).toBeDefined();
    });

    it('fetchChannelCreator - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}, {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [{
            id: channelId,
            team_id: teamId,
            total_msg_count: 0,
            creator_id: user.id,
        } as Channel],
        prepareRecordsOnly: false});

        const {user: fetchedUser, error} = await fetchChannelCreator(serverUrl, channelId);
        expect(error).toBeUndefined();
        expect(fetchedUser).toBeDefined();
    });

    it('fetchMyChannelsForTeam - handle not found database', async () => {
        const {error} = await fetchMyChannelsForTeam('foo', '');
        expect(error).toBeDefined();
    });

    it('fetchMyChannelsForTeam - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}, {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        const {channels, memberships, categories, error} = await fetchMyChannelsForTeam(serverUrl, teamId, true, 0, false, true);
        expect(error).toBeUndefined();
        expect(channels).toBeDefined();
        expect(memberships).toBeDefined();
        expect(categories).toBeDefined();
    });

    it('fetchMyChannel - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}, {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        const {channels, memberships, error} = await fetchMyChannel(serverUrl, teamId, channelId);
        expect(error).toBeUndefined();
        expect(channels).toBeDefined();
        expect(memberships).toBeDefined();
    });

    it('joinChannel - handle not found database', async () => {
        const {error} = await joinChannel('foo', '');
        expect(error).toBeDefined();
    });

    it('joinChannel - by id', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}, {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        const {channel, member, error} = await joinChannel(serverUrl, teamId, channelId);
        expect(error).toBeUndefined();
        expect(channel).toBeDefined();
        expect(member).toBeDefined();
    });

    it('joinChannel - by name', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}, {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        const {channel, member, error} = await joinChannel(serverUrl, teamId, undefined, 'channelname');
        expect(error).toBeUndefined();
        expect(channel).toBeDefined();
        expect(member).toBeDefined();
    });

    it('joinChannelIfNeeded - handle not found database', async () => {
        const {error} = await joinChannelIfNeeded('foo', '') as {error: unknown};
        expect(error).toBeDefined();
    });

    it('joinChannelIfNeeded - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}, {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        const {channel, member} = await joinChannelIfNeeded(serverUrl, channelId) as {channel: Channel; member: ChannelMember};
        expect(channel).toBeDefined();
        expect(member).toBeDefined();
    });

    it('joinChannelIfNeeded - not needed', async () => {
        await operator.handleMyChannel({channels: [{
            id: channelId,
            team_id: teamId,
            total_msg_count: 0,
            creator_id: user.id,
        } as Channel],
        myChannels: [{
            id: 'id',
            channel_id: channelId,
            user_id: user.id,
            msg_count: 0,
        } as ChannelMembership],
        prepareRecordsOnly: false});

        const result = await joinChannelIfNeeded(serverUrl, channelId) as {};
        expect(result).toBeDefined();
        expect(result).not.toHaveProperty('channel');
        expect(result).not.toHaveProperty('error');
    });

    it('markChannelAsRead - base case', async () => {
        const result = await markChannelAsRead(serverUrl, channelId, true);
        expect(result).toBeDefined();
        expect(result).not.toHaveProperty('error');
    });

    it('unsetActiveChannelOnServer - base case', async () => {
        const result = await unsetActiveChannelOnServer(serverUrl);
        expect(result).toBeDefined();
        expect(result).not.toHaveProperty('error');
    });

    it('switchToChannelByName - handle not found database', async () => {
        const {error} = await switchToChannelByName('foo', '', '', () => {}, intl);
        expect(error).toBeDefined();
    });

    it('switchToChannelByName - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}, {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});

        const result = await switchToChannelByName(serverUrl, 'channelname', 'teamname', () => {}, intl);
        expect(result).toBeDefined();
        expect(result).not.toHaveProperty('error');
    });

    it('switchToChannelByName - team redirect', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}, {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});

        const result = await switchToChannelByName(serverUrl, 'channelname', DeepLink.Redirect, () => {}, intl);
        expect(result).toBeDefined();
        expect(result).not.toHaveProperty('error');
    });

    it('goToNPSChannel - handle not found database', async () => {
        const {error} = await goToNPSChannel('foo');
        expect(error).toBeDefined();
    });

    it('goToNPSChannel - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}, {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});
        await operator.handleUsers({users: [user], prepareRecordsOnly: false});

        const result = await goToNPSChannel(serverUrl);
        expect(result).toBeDefined();
        expect(result).not.toHaveProperty('error');
    });

    it('fetchChannels - base case', async () => {
        const {channels, error} = await fetchChannels(serverUrl, teamId);
        expect(error).toBeUndefined();
        expect(channels).toBeDefined();
    });

    it('fetchArchivedChannels - base case', async () => {
        const {channels, error} = await fetchArchivedChannels(serverUrl, teamId);
        expect(error).toBeUndefined();
        expect(channels).toBeDefined();
    });

    it('fetchSharedChannels - base case', async () => {
        const {channels, error} = await fetchSharedChannels(serverUrl, teamId);
        expect(error).toBeUndefined();
        expect(channels).toBeDefined();
    });

    it('getChannelTimezones - base case', async () => {
        const {channelTimezones, error} = await getChannelTimezones(serverUrl, channelId);
        expect(error).toBeUndefined();
        expect(channelTimezones).toBeDefined();
    });

    it('switchToChannelById - handle not found database', async () => {
        const {error} = await switchToChannelById('foo', '') as {error: unknown};
        expect(error).toBeDefined();
    });

    it('switchToChannelById - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}, {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});

        const result = await switchToChannelById(serverUrl, channelId);
        expect(result).toBeDefined();
        expect(result).not.toHaveProperty('error');
    });

    it('switchToPenultimateChannel - handle not found database', async () => {
        const {error} = await switchToPenultimateChannel('foo') as {error: unknown};
        expect(error).toBeDefined();
    });

    it('switchToPenultimateChannel - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}, {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});

        const result = await switchToPenultimateChannel(serverUrl);
        expect(result).toBeDefined();
        expect(result).not.toHaveProperty('error');
    });

    it('switchToLastChannel - handle not found database', async () => {
        const {error} = await switchToLastChannel('foo') as {error: unknown};
        expect(error).toBeDefined();
    });

    it('switchToLastChannel - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}, {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});

        const result = await switchToLastChannel(serverUrl);
        expect(result).toBeDefined();
        expect(result).not.toHaveProperty('error');
    });

    it('searchChannels - handle error', async () => {
        const {error} = await searchChannels('foo', '', teamId, true) as {error: unknown};
        expect(error).toBeDefined();
    });

    it('searchChannels - base case', async () => {
        const result = await searchChannels(serverUrl, 'searchterm', teamId, false);
        expect(result).toBeDefined();
        expect(result).not.toHaveProperty('error');
        expect(result).toHaveProperty('channels');
    });

    it('fetchChannelById - base case', async () => {
        const result = await fetchChannelById(serverUrl, channelId);
        expect(result).toBeDefined();
        expect(result).not.toHaveProperty('error');
    });

    it('searchAllChannels - handle not found database', async () => {
        const {error} = await searchAllChannels('foo', '') as {error: unknown};
        expect(error).toBeDefined();
    });

    it('searchAllChannels - base case', async () => {
        const result = await searchAllChannels(serverUrl, 'searchterm');
        expect(result).toBeDefined();
        expect(result).not.toHaveProperty('error');
        expect(result).toHaveProperty('channels');
    });

    it('archiveChannel - handle not found database', async () => {
        const {error} = await archiveChannel('foo', '') as {error: unknown};
        expect(error).toBeDefined();
    });

    it('archiveChannel - base case', async () => {
        const result = await archiveChannel(serverUrl, channelId);
        expect(result).toBeDefined();
        expect(result).not.toHaveProperty('error');
    });

    it('unarchiveChannel - base case', async () => {
        const result = await unarchiveChannel(serverUrl, channelId);
        expect(result).toBeDefined();
        expect(result).not.toHaveProperty('error');
    });

    it('convertChannelToPrivate - handle not found database', async () => {
        const {error} = await convertChannelToPrivate('foo', '') as {error: unknown};
        expect(error).toBeDefined();
    });

    it('convertChannelToPrivate - base case', async () => {
        await operator.handleChannel({channels: [{
            id: channelId,
            team_id: teamId,
            total_msg_count: 0,
            type: 'O',
        } as Channel],
        prepareRecordsOnly: false});

        const result = await convertChannelToPrivate(serverUrl, channelId);
        expect(result).toBeDefined();
        expect(result).not.toHaveProperty('error');
    });

    it('handleKickFromChannel - handle not found database', async () => {
        const {error} = await handleKickFromChannel('foo', '');
        expect(error).toBeDefined();
    });

    it('handleKickFromChannel - not current channel', async () => {
        const result = await handleKickFromChannel(serverUrl, channelId);
        expect(result).toBeDefined();
        expect(result).not.toHaveProperty('error');
    });

    it('handleKickFromChannel - base case', async () => {
        mockIsTablet.mockImplementationOnce(() => true);
        mockGetActiveServer.mockImplementationOnce(() => ({url: serverUrl}));
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID, value: channelId}, {id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}], prepareRecordsOnly: false});

        const result = await handleKickFromChannel(serverUrl, channelId);
        expect(result).toBeDefined();
        expect(result).not.toHaveProperty('error');
    });
});

describe('direct and group', () => {
    it('fetchMissingDirectChannelsInfo - handle not found database', async () => {
        const {directChannels, error} = await fetchMissingDirectChannelsInfo('foo', []);
        expect(directChannels).toBeUndefined();
        expect(error).toBeDefined();
    });

    it('fetchMissingDirectChannelsInfo - base case', async () => {
        const {directChannels, error} = await fetchMissingDirectChannelsInfo(serverUrl, [{id: 'id', name: 'name', type: 'D'} as Channel], 'channelname');
        expect(error).toBeUndefined();
        expect(directChannels).toBeDefined();
    });

    it('fetchDirectChannelsInfo - handle not found database', async () => {
        const {directChannels, error} = await fetchDirectChannelsInfo('foo', []);
        expect(directChannels).toBeUndefined();
        expect(error).toBeDefined();
    });

    it('fetchDirectChannelsInfo - base case', async () => {
        const channel = {id: 'id', name: 'name', type: 'D'} as Channel;
        const {directChannels, error} = await fetchDirectChannelsInfo(serverUrl, [{...channel, toApi: () => channel} as unknown as ChannelModel]);
        expect(error).toBeUndefined();
        expect(directChannels).toBeDefined();
    });

    it('createDirectChannel - handle not found database', async () => {
        const {data, error} = await createDirectChannel('foo', '');
        expect(data).toBeUndefined();
        expect(error).toBeDefined();
    });

    it('createDirectChannel - no user', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}], prepareRecordsOnly: false});
        const {data, error} = await createDirectChannel(serverUrl, 'userid2');
        expect(data).toBeUndefined();
        expect(error).toBeDefined();
        expect(error).toBe('Cannot get the current user');
    });

    it('createDirectChannel - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}], prepareRecordsOnly: false});
        await operator.handleUsers({users: [user], prepareRecordsOnly: false});

        const {data, error} = await createDirectChannel(serverUrl, 'userid2');
        expect(error).toBeUndefined();
        expect(data).toBeDefined();
    });

    it('createDirectChannel - with display name', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}], prepareRecordsOnly: false});
        await operator.handleUsers({users: [user], prepareRecordsOnly: false});

        const {data, error} = await createDirectChannel(serverUrl, 'userid2', 'displayname');
        expect(error).toBeUndefined();
        expect(data).toBeDefined();
    });

    it('makeDirectChannel - handle not found database', async () => {
        const {data, error} = await makeDirectChannel('foo', '');
        expect(data).toBeUndefined();
        expect(error).toBeDefined();
    });

    it('makeDirectChannel - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}], prepareRecordsOnly: false});
        await operator.handleUsers({users: [user], prepareRecordsOnly: false});

        const {data, error} = await makeDirectChannel(serverUrl, 'userid2');
        expect(error).toBeUndefined();
        expect(data).toBeDefined();
    });

    it('makeDirectChannel - with display name', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}], prepareRecordsOnly: false});
        await operator.handleUsers({users: [user], prepareRecordsOnly: false});

        const {data, error} = await makeDirectChannel(serverUrl, 'userid2', 'displayname');
        expect(error).toBeUndefined();
        expect(data).toBeDefined();
    });

    it('createGroupChannel - handle not found database', async () => {
        const {data, error} = await createGroupChannel('foo', []);
        expect(data).toBeUndefined();
        expect(error).toBeDefined();
    });

    it('createGroupChannel - no user', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}], prepareRecordsOnly: false});
        const {data, error} = await createGroupChannel(serverUrl, ['userid2']);
        expect(data).toBeUndefined();
        expect(error).toBeDefined();
        expect(error).toBe('Cannot get the current user');
    });

    it('createGroupChannel - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}], prepareRecordsOnly: false});
        await operator.handleUsers({users: [user], prepareRecordsOnly: false});

        const {data, error} = await createGroupChannel(serverUrl, ['userid2']);
        expect(error).toBeUndefined();
        expect(data).toBeDefined();
    });

    it('makeGroupChannel - handle not found database', async () => {
        const {data, error} = await makeGroupChannel('foo', []);
        expect(data).toBeUndefined();
        expect(error).toBeDefined();
    });

    it('makeGroupChannel - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}], prepareRecordsOnly: false});
        await operator.handleUsers({users: [user], prepareRecordsOnly: false});

        const {data, error} = await makeGroupChannel(serverUrl, ['userid2']);
        expect(error).toBeUndefined();
        expect(data).toBeDefined();
    });

    it('fetchGroupMessageMembersCommonTeams - base case', async () => {
        const {teams, error} = await fetchGroupMessageMembersCommonTeams(serverUrl, channelId);
        expect(error).toBeUndefined();
        expect(teams).toBeDefined();
    });

    it('convertGroupMessageToPrivateChannel - handle not found database', async () => {
        const {updatedChannel, error} = await convertGroupMessageToPrivateChannel('foo', '', '', '');
        expect(updatedChannel).toBeUndefined();
        expect(error).toBeDefined();
    });

    it('convertGroupMessageToPrivateChannel - base case', async () => {
        await operator.handleChannel({channels: [{
            id: channelId,
            team_id: teamId,
            total_msg_count: 0,
            type: 'G',
        } as Channel],
        prepareRecordsOnly: false});

        const {updatedChannel, error} = await convertGroupMessageToPrivateChannel(serverUrl, channelId, teamId, 'newprivatechannel');
        expect(error).toBeUndefined();
        expect(updatedChannel).toBeDefined();
    });
});
