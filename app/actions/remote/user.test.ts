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
    fetchCustomAttributes,
    updateCustomAttributes,
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
    getCustomProfileAttributeFields: jest.fn(),
    getCustomProfileAttributeValues: jest.fn(),
    updateCustomProfileAttributeValues: jest.fn(),
};

beforeAll(() => {
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
        const result = buildProfileImageUrlFromUser(serverUrl, user2);
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

describe('fetchCustomAttributes', () => {
    beforeEach(() => {
        // Reset mocks before each test
        mockClient.getCustomProfileAttributeFields.mockReset();
        mockClient.getCustomProfileAttributeValues.mockReset();
    });

    it('fetchCustomAttributes - handle not found database', async () => {
        // Mock NetworkManager.getClient to throw an error for invalid server URL
        const originalGetClient = NetworkManager.getClient;
        NetworkManager.getClient = jest.fn((url: string) => {
            if (url === 'foo') {
                throw new Error('foo client not found');
            }
            return originalGetClient(url);
        });

        const result = await fetchCustomAttributes('foo', user1.id);
        expect(result?.error).toBeDefined();

        // Restore original implementation
        NetworkManager.getClient = originalGetClient;
    });

    it('fetchCustomAttributes - base case with fields and values', async () => {
        const mockFields = [
            {
                id: 'field1',
                name: 'Field 1',
                type: 'text',
                attrs: {sort_order: 1},
            },
            {
                id: 'field2',
                name: 'Field 2',
                type: 'select',
                attrs: {sort_order: 2},
            },
        ];
        const mockValues = {
            field1: 'value1',
            field2: 'value2',
        };

        mockClient.getCustomProfileAttributeFields.mockResolvedValue(mockFields);
        mockClient.getCustomProfileAttributeValues.mockResolvedValue(mockValues);

        const result = await fetchCustomAttributes(serverUrl, user1.id);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.attributes).toBeDefined();
        expect(Object.keys(result.attributes)).toHaveLength(2);
        expect(result.attributes.field1).toEqual({
            id: 'field1',
            name: 'Field 1',
            type: 'text',
            value: 'value1',
            sort_order: 1,
        });
        expect(result.attributes.field2).toEqual({
            id: 'field2',
            name: 'Field 2',
            type: 'select',
            value: 'value2',
            sort_order: 2,
        });
    });

    it('fetchCustomAttributes - no fields', async () => {
        mockClient.getCustomProfileAttributeFields.mockResolvedValue([]);
        mockClient.getCustomProfileAttributeValues.mockResolvedValue({});

        const result = await fetchCustomAttributes(serverUrl, user1.id);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.attributes).toEqual({});
    });

    it('fetchCustomAttributes - filterEmpty true with empty values', async () => {
        const mockFields = [
            {
                id: 'field1',
                name: 'Field 1',
                type: 'text',
                attrs: {sort_order: 1},
            },
            {
                id: 'field2',
                name: 'Field 2',
                type: 'text',
                attrs: {sort_order: 2},
            },
            {
                id: 'field3',
                name: 'Field 3',
                type: 'text',
                attrs: {sort_order: 3},
            },
        ];
        const mockValues = {
            field1: 'value1',
            field2: '',

            // field3 is missing entirely
        };

        mockClient.getCustomProfileAttributeFields.mockResolvedValue(mockFields);
        mockClient.getCustomProfileAttributeValues.mockResolvedValue(mockValues);

        const result = await fetchCustomAttributes(serverUrl, user1.id, true);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.attributes).toBeDefined();
        expect(Object.keys(result.attributes)).toHaveLength(1);
        expect(result.attributes.field1).toBeDefined();
        expect(result.attributes.field2).toBeUndefined();
        expect(result.attributes.field3).toBeUndefined();
    });

    it('fetchCustomAttributes - filterEmpty false includes empty values', async () => {
        const mockFields = [
            {
                id: 'field1',
                name: 'Field 1',
                type: 'text',
                attrs: {sort_order: 1},
            },
            {
                id: 'field2',
                name: 'Field 2',
                type: 'text',
                attrs: {sort_order: 2},
            },
        ];
        const mockValues = {
            field1: 'value1',
            field2: '',
        };

        mockClient.getCustomProfileAttributeFields.mockResolvedValue(mockFields);
        mockClient.getCustomProfileAttributeValues.mockResolvedValue(mockValues);

        const result = await fetchCustomAttributes(serverUrl, user1.id, false);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.attributes).toBeDefined();
        expect(Object.keys(result.attributes)).toHaveLength(2);
        expect(result.attributes.field1).toBeDefined();
        expect(result.attributes.field2).toBeDefined();
        expect(result.attributes.field2.value).toBe('');
    });

    it('fetchCustomAttributes - handles array values', async () => {
        const mockFields = [
            {
                id: 'field1',
                name: 'Field 1',
                type: 'multiselect',
                attrs: {sort_order: 1},
            },
            {
                id: 'field2',
                name: 'Field 2',
                type: 'text',
                attrs: {sort_order: 2},
            },
        ];
        const mockValues = {
            field1: ['option1', 'option2', 'option3'],
            field2: 'text value',
        };

        mockClient.getCustomProfileAttributeFields.mockResolvedValue(mockFields);
        mockClient.getCustomProfileAttributeValues.mockResolvedValue(mockValues);

        const result = await fetchCustomAttributes(serverUrl, user1.id);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.attributes).toBeDefined();
        expect(result.attributes.field1.value).toBe('["option1","option2","option3"]');
        expect(result.attributes.field2.value).toBe('text value');
    });

    it('fetchCustomAttributes - handles missing attrs', async () => {
        const mockFields = [
            {
                id: 'field1',
                name: 'Field 1',
                type: 'text',

                // No attrs property
            },
        ];
        const mockValues = {
            field1: 'value1',
        };

        mockClient.getCustomProfileAttributeFields.mockResolvedValue(mockFields);
        mockClient.getCustomProfileAttributeValues.mockResolvedValue(mockValues);

        const result = await fetchCustomAttributes(serverUrl, user1.id);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.attributes).toBeDefined();
        expect(result.attributes.field1.sort_order).toBeUndefined();
    });

    it('fetchCustomAttributes - handles API error', async () => {
        mockClient.getCustomProfileAttributeFields.mockRejectedValue(new Error('API Error'));

        const result = await fetchCustomAttributes(serverUrl, user1.id);
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(result.attributes).toEqual({});
    });
});

describe('updateCustomAttributes', () => {
    beforeEach(() => {
        // Reset mocks before each test
        mockClient.updateCustomProfileAttributeValues.mockReset();
    });

    it('updateCustomAttributes - handle not found database', async () => {
        // Mock NetworkManager.getClient to throw an error for invalid server URL
        const originalGetClient = NetworkManager.getClient;
        NetworkManager.getClient = jest.fn((url: string) => {
            if (url === 'foo') {
                throw new Error('foo client not found');
            }
            return originalGetClient(url);
        });

        const attributes = {
            field1: {
                id: 'field1',
                name: 'Field 1',
                type: 'text',
                value: 'value1',
                sort_order: 1,
            },
        };

        const result = await updateCustomAttributes('foo', attributes);
        expect(result?.error).toBeDefined();
        expect(result.success).toBe(false);

        // Restore original implementation
        NetworkManager.getClient = originalGetClient;
    });

    it('updateCustomAttributes - base case', async () => {
        const attributes = {
            field1: {
                id: 'field1',
                name: 'Field 1',
                type: 'text',
                value: 'value1',
                sort_order: 1,
            },
            field2: {
                id: 'field2',
                name: 'Field 2',
                type: 'select',
                value: 'value2',
                sort_order: 2,
            },
        };

        mockClient.updateCustomProfileAttributeValues.mockResolvedValue(undefined);

        const result = await updateCustomAttributes(serverUrl, attributes);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.success).toBe(true);
        expect(mockClient.updateCustomProfileAttributeValues).toHaveBeenCalledWith({
            field1: 'value1',
            field2: 'value2',
        });
    });

    it('updateCustomAttributes - handles API error', async () => {
        const attributes = {
            field1: {
                id: 'field1',
                name: 'Field 1',
                type: 'text',
                value: 'value1',
                sort_order: 1,
            },
        };

        mockClient.updateCustomProfileAttributeValues.mockRejectedValue(new Error('API Error'));

        const result = await updateCustomAttributes(serverUrl, attributes);
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(result.success).toBe(false);
    });

    it('updateCustomAttributes - empty attributes', async () => {
        const attributes = {};

        mockClient.updateCustomProfileAttributeValues.mockResolvedValue(undefined);

        const result = await updateCustomAttributes(serverUrl, attributes);
        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.success).toBe(true);
        expect(mockClient.updateCustomProfileAttributeValues).toHaveBeenCalledWith({});
    });
});
