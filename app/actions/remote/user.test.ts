// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';

import {
    fetchMe,
    fetchProfilesInChannel,
    fetchProfilesInGroupChannels,
    type ProfilesInChannelRequest,
    fetchProfilesPerChannels,
    updateMe,
    fetchUserOrGroupsByMentionNames,
    fetchUsersByUsernames,
    fetchStatusByIds,
    fetchUsersByIds,
    fetchProfiles,
    fetchProfilesInTeam,
    fetchProfilesNotInChannel,
    searchProfiles,
    fetchMissingProfilesByIds,
    fetchMissingProfilesByUsernames,
    updateAllUsersSince,
    updateUsersNoLongerVisible,
    setStatus,
    updateCustomStatus,
    removeRecentCustomStatus,
    unsetCustomStatus,
    setDefaultProfileImage,
    uploadUserProfileImage,
    searchUsers,
    buildProfileImageUrlFromUser,
    autoUpdateTimezone,
    fetchTeamAndChannelMembership,
    getAllSupportedTimezones,
} from './user';

import type ServerDataOperator from '@database/operator/server_data_operator';

const serverUrl = 'baseHandler.test.com';
let operator: ServerDataOperator;

const channelId = 'channelid1';
const teamId = 'teamid1';

const team: Team = {
    id: teamId,
    name: 'team1',
} as Team;

const user1 = {id: 'userid1', username: 'user1', email: 'user1@mattermost.com', roles: ''} as UserProfile;
const user2 = {id: 'userid2', username: 'user2', email: 'user2@mattermost.com', roles: ''} as UserProfile;

const mockClient = {
    getMe: jest.fn(() => ({id: 'userid1', username: 'user1', email: 'user1@mattermost.com', roles: ''})),
    getStatus: jest.fn((id: string) => ({user_id: id === 'me' ? 'userid1' : id, status: 'online'})),
    getProfilesInChannel: jest.fn(() => ([user1, user2])),
    getProfilesInGroupChannels: jest.fn((ids: string[]) => {
        const m = {} as {[x: string]: UserProfile[]};
        ids.forEach((id) => {
            m[id] = [user1, user2];
        });
        return m;
    }),
    patchMe: jest.fn((me: UserProfile) => ({...user1, ...me})),
    getProfilesByUsernames: jest.fn((usernames: string[]) => usernames.map((u: string) => ({id: u + 'id', username: u, roles: ''}))),
    getStatusesByIds: jest.fn((ids: string[]) => ids.map((id) => ({user_id: id, status: 'online'}))),
    getProfilesByIds: jest.fn((ids: string[]) => ids.map((id) => ({id, username: id + 'username', roles: ''}))),
    getRolesByNames: jest.fn((roles: string[]) => roles.map((r) => ({id: r, name: r} as Role))),
    getProfiles: jest.fn(() => [user1, user2]),
    getProfilesInTeam: jest.fn(() => [user1, user2]),
    getProfilesNotInChannel: jest.fn(() => [user1, user2]),
    searchUsers: jest.fn(() => [user2]),
    autocompleteUsers: jest.fn(() => ({users: [user2]})),
    getKnownUsers: jest.fn(() => []),
    updateStatus: jest.fn((status: UserStatus) => status),
    updateCustomStatus: jest.fn((status: UserCustomStatus) => status),
    removeRecentCustomStatus: jest.fn(),
    unsetCustomStatus: jest.fn(),
    setDefaultProfileImage: jest.fn(),
    apiClient: {
        upload: jest.fn(),
    },
    getUserRoute: jest.fn((id: string) => `/users/${id}`),
    getProfilePictureUrl: jest.fn(() => '/url/to/image.jpg'),
    getTeamMember: jest.fn((id: string, userId: string) => ({id: userId + '-' + id, user_id: userId, team_id: id, roles: ''})),
    getChannelMember: jest.fn((cid: string, userId: string) => ({id: userId + '-' + cid, user_id: userId, channel_id: cid, roles: ''})),
    getTimezones: jest.fn(() => ['EST']),
};

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

describe('get users', () => {
    it('fetchMe - handle not found database', async () => {
        const result = await fetchMe('foo');
        expect(result?.error).toBeDefined();
    });

    it('fetchMe - handle bad user', async () => {
        mockClient.getMe.mockImplementationOnce(() => ({id: 'baduserid'} as any));
        const result = await fetchMe(serverUrl);
        expect(result?.error).toBeDefined();
        expect((result?.error as Error).message).toBe('User not found');
    });

    it('fetchMe - base case', async () => {
        const result = await fetchMe(serverUrl);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.user).toBeDefined();
    });

    it('fetchProfilesInChannel - handle not found database', async () => {
        const result = await fetchProfilesInChannel('foo', '');
        expect(result?.error).toBeDefined();
    });

    it('fetchProfilesInChannel - base case', async () => {
        const result = await fetchProfilesInChannel(serverUrl, channelId);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.users).toBeDefined();
        expect(result.users?.length).toBe(2); // both users
    });

    it('fetchProfilesInChannel - exclude user id', async () => {
        const result = await fetchProfilesInChannel(serverUrl, channelId, 'userid2');
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.users).toBeDefined();
        expect(result.users?.length).toBe(1);
        expect(result.users?.[0].id).toBe('userid1');
    });

    it('fetchProfilesInGroupChannels - handle not found database', async () => {
        const result = await fetchProfilesInGroupChannels('foo', []);
        expect(result?.error).toBeDefined();
    });

    it('fetchProfilesInGroupChannels - base case', async () => {
        const result = await fetchProfilesInGroupChannels(serverUrl, [channelId]);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.data).toBeDefined();
        const data = result.data as ProfilesInChannelRequest[];
        expect(data.length).toBe(1);
        expect(data[0].users?.length).toBe(2);
    });

    it('fetchProfilesInGroupChannels - profiles already exist', async () => {
        const gmChannelMember: ChannelMembership = {
            id: 'id',
            user_id: user1.id,
            channel_id: channelId,
            msg_count: 0,
            roles: '',
        } as ChannelMembership;

        await operator.handleChannelMembership({channelMemberships: [gmChannelMember, {...gmChannelMember, user_id: user2.id}], prepareRecordsOnly: false});

        const result = await fetchProfilesInGroupChannels(serverUrl, [channelId]);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.data).toBeDefined();
        expect(result.data?.length).toBe(0);
    });

    it('fetchProfilesPerChannels - handle not found database', async () => {
        const result = await fetchProfilesPerChannels('foo', []);
        expect(result?.error).toBeDefined();
    });

    it('fetchProfilesPerChannels - base case', async () => {
        const result = await fetchProfilesPerChannels(serverUrl, [channelId]);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.data).toBeDefined();
        const data = result.data as ProfilesInChannelRequest[];
        expect(data.length).toBe(1);
        expect(data[0].users?.length).toBe(2);
    });

    it('fetchUserOrGroupsByMentionNames - handle not found database', async () => {
        const result = await fetchUserOrGroupsByMentionNames('foo', []);
        expect(result?.error).toBeDefined();
    });

    it('fetchUserOrGroupsByMentionNames - base case', async () => {
        const result = await fetchUserOrGroupsByMentionNames(serverUrl, ['username1']);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.users).toBeDefined();
        expect(result.users?.length).toBe(1);
    });

    it('fetchUsersByUsernames - handle not found database', async () => {
        const result = await fetchUsersByUsernames('foo', ['username1']);
        expect(result?.error).toBeDefined();
    });

    it('fetchUsersByUsernames - no usernames', async () => {
        const result = await fetchUsersByUsernames(serverUrl, []);
        expect(result?.error).toBeUndefined();
        expect(result.users).toBeDefined();
        expect(result.users?.length).toBe(0);
    });

    it('fetchUsersByUsernames - base case', async () => {
        await operator.handleUsers({users: [user2], prepareRecordsOnly: false});

        const result = await fetchUsersByUsernames(serverUrl, ['username1', 'user2']);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.users).toBeDefined();
        expect(result.users?.length).toBe(1);
    });

    it('fetchUsersByIds - handle not found database', async () => {
        const result = await fetchUsersByIds('foo', [user1.id]);
        expect(result?.error).toBeDefined();
    });

    it('fetchUsersByIds - no ids', async () => {
        const result = await fetchUsersByIds(serverUrl, []);
        expect(result?.error).toBeUndefined();
        expect(result.users).toBeDefined();
        expect(result.users?.length).toBe(0);
    });

    it('fetchUsersByIds - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: 'userid1'}], prepareRecordsOnly: false});
        await operator.handleUsers({users: [user1, user2], prepareRecordsOnly: false});

        const result = await fetchUsersByIds(serverUrl, ['newuserid', user2.id]);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.users).toBeDefined();
        expect(result.users?.length).toBe(1);
        expect(result.existingUsers).toBeDefined();
        expect(result.existingUsers?.length).toBe(1);
    });

    it('fetchProfiles - handle not found database', async () => {
        const result = await fetchProfiles('foo');
        expect(result?.error).toBeDefined();
    });

    it('fetchProfiles - base case', async () => {
        const result = await fetchProfiles(serverUrl);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.users).toBeDefined();
        expect(result.users?.length).toBe(2);
    });

    it('fetchProfilesInTeam - handle not found database', async () => {
        const result = await fetchProfilesInTeam('foo', '');
        expect(result?.error).toBeDefined();
    });

    it('fetchProfilesInTeam - base case', async () => {
        const result = await fetchProfilesInTeam(serverUrl, team.id);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.users).toBeDefined();
        expect(result.users?.length).toBe(2);
    });

    it('fetchProfilesNotInChannel - handle not found database', async () => {
        const result = await fetchProfilesNotInChannel('foo', '', '');
        expect(result?.error).toBeDefined();
    });

    it('fetchProfilesNotInChannel - base case', async () => {
        const result = await fetchProfilesNotInChannel(serverUrl, team.id, 'channelid1');
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.users).toBeDefined();
        expect(result.users?.length).toBe(2);
    });

    it('searchProfiles - handle not found database', async () => {
        const result = await searchProfiles('foo', '', {});
        expect(result?.error).toBeDefined();
    });

    it('searchProfiles - base case', async () => {
        const result = await searchProfiles(serverUrl, team.id, {});
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.data).toBeDefined();
        expect(result.data?.length).toBe(1);
    });

    it('fetchMissingProfilesByIds - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: 'userid1'}], prepareRecordsOnly: false});
        await operator.handleUsers({users: [user1], prepareRecordsOnly: false});

        const result = await fetchMissingProfilesByIds(serverUrl, ['newuserid']);
        expect(result).toBeDefined();
        expect(result.users).toBeDefined();
        expect(result.users?.length).toBe(1);
    });

    it('fetchMissingProfilesByUsernames - base case', async () => {
        await operator.handleUsers({users: [user2], prepareRecordsOnly: false});

        const result = await fetchMissingProfilesByUsernames(serverUrl, ['username1', 'user2']);
        expect(result).toBeDefined();
        expect(result.users).toBeDefined();
        expect(result.users?.length).toBe(1);
    });

    it('searchUsers - base case', async () => {
        const result = await searchUsers(serverUrl, 'user2', team.id);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.users?.users).toBeDefined();
        expect(result.users?.users?.length).toBe(1);
    });

    it('buildProfileImageUrlFromUser - base case', async () => {
        const result = await buildProfileImageUrlFromUser(serverUrl, user2);
        expect(result).toBeDefined();
    });

    it('fetchTeamAndChannelMembership - handle not found database', async () => {
        const result = await fetchTeamAndChannelMembership('foo', '', '');
        expect(result?.error).toBeDefined();
    });

    it('fetchTeamAndChannelMembership - base case', async () => {
        const result = await fetchTeamAndChannelMembership(serverUrl, user1.id, team.id, channelId);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
    });

    it('getAllSupportedTimezones - base case', async () => {
        const result = await getAllSupportedTimezones(serverUrl);
        expect(result).toBeDefined();
    });
});

describe('update users', () => {
    it('updateMe - handle not found database', async () => {
        const result = await updateMe('foo', {});
        expect(result?.error).toBeDefined();
    });

    it('updateMe - handle base case', async () => {
        const result = await updateMe(serverUrl, {...user1, username: 'username2'});
        expect(result?.error).toBeUndefined();
        expect(result?.data).toBeDefined();
    });

    it('updateAllUsersSince - handle not found database', async () => {
        const result = await updateAllUsersSince('foo', 1);
        expect(result?.error).toBeDefined();
    });

    it('updateAllUsersSince - no time', async () => {
        const result = await updateAllUsersSince(serverUrl, -1);
        expect(result?.userUpdates).toBeDefined();
        expect(result?.userUpdates?.length).toBe(0);
    });

    it('updateAllUsersSince - handle base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: 'userid1'}], prepareRecordsOnly: false});
        await operator.handleUsers({users: [user1, user2], prepareRecordsOnly: false});

        const result = await updateAllUsersSince(serverUrl, 1);
        expect(result?.error).toBeUndefined();
        expect(result?.userUpdates).toBeDefined();
        expect(result?.userUpdates?.length).toBe(1);
    });

    it('updateUsersNoLongerVisible - handle not found database', async () => {
        const result = await updateUsersNoLongerVisible('foo');
        expect(result?.error).toBeDefined();
    });

    it('updateUsersNoLongerVisible - handle base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: 'userid1'}], prepareRecordsOnly: false});
        await operator.handleUsers({users: [user1, user2], prepareRecordsOnly: false});

        const result = await updateUsersNoLongerVisible(serverUrl);
        expect(result?.error).toBeUndefined();
        expect(result?.models).toBeDefined();
        expect(result?.models?.length).toBe(1);
    });

    it('setDefaultProfileImage - base case', async () => {
        const result = await setDefaultProfileImage(serverUrl, user1.id);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
    });

    it('uploadUserProfileImage - handle not found database', async () => {
        const result = await uploadUserProfileImage('foo', '');
        expect(result?.error).toBeDefined();
    });

    it('uploadUserProfileImage - handle base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: 'userid1'}], prepareRecordsOnly: false});
        await operator.handleUsers({users: [user1], prepareRecordsOnly: false});

        const result = await uploadUserProfileImage(serverUrl, '/path/to/image');
        expect(result?.error).toBeUndefined();
    });

    it('autoUpdateTimezone - handle not found database', async () => {
        const result = await autoUpdateTimezone('foo');
        expect(result?.error).toBeDefined();
    });

    it('autoUpdateTimezone - no current user', async () => {
        const result = await autoUpdateTimezone(serverUrl);
        expect(result?.error).toBeUndefined();
    });

    it('autoUpdateTimezone - handle base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: 'userid1'}], prepareRecordsOnly: false});
        await operator.handleUsers({users: [user1], prepareRecordsOnly: false});

        const result = await autoUpdateTimezone(serverUrl);
        expect(result?.error).toBeUndefined();
    });
});

describe('user status', () => {
    it('fetchStatusByIds - handle not found database', async () => {
        const result = await fetchStatusByIds('foo', [user1.id]);
        expect(result?.error).toBeDefined();
    });

    it('fetchStatusByIds - no ids', async () => {
        const result = await fetchStatusByIds(serverUrl, []);
        expect(result?.error).toBeUndefined();
        expect(result.statuses).toBeDefined();
        expect(result.statuses?.length).toBe(0);
    });

    it('fetchStatusByIds - base case', async () => {
        await operator.handleUsers({users: [user1, user2], prepareRecordsOnly: false});

        const result = await fetchStatusByIds(serverUrl, [user1.id]);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.statuses).toBeDefined();
        expect(result.statuses?.length).toBe(1);
    });

    it('setStatus - base case', async () => {
        const result = await setStatus(serverUrl, {user_id: user1.id, status: 'online'} as UserStatus);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.data).toBeDefined();
    });

    it('updateCustomStatus - base case', async () => {
        const result = await updateCustomStatus(serverUrl, {text: 'custom status'} as UserCustomStatus);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
    });

    it('removeRecentCustomStatus - base case', async () => {
        const result = await removeRecentCustomStatus(serverUrl, {text: 'custom status'} as UserCustomStatus);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
    });

    it('unsetCustomStatus - base case', async () => {
        const result = await unsetCustomStatus(serverUrl);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
    });
});
