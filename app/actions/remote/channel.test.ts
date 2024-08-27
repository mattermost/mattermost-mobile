// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@app/constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';

import {
    removeMemberFromChannel,
    fetchChannelMembersByIds,
    updateChannelMemberSchemeRoles,
    fetchMemberInChannel,
    fetchChannelMemberships,
    addMembersToChannel,
} from './channel';

import type ServerDataOperator from '@database/operator/server_data_operator';

const serverUrl = 'baseHandler.test.com';
let operator: ServerDataOperator;

const user: UserProfile = {
    id: 'userid',
    username: 'username',
    roles: '',
} as UserProfile;

const mockClient = {
    removeFromChannel: jest.fn(),
    getChannelMembersByIds: jest.fn((channelId: string, userIds: string[]) => userIds.map((uid) => ({user_id: uid, channel_id: channelId, roles: ''}))),
    updateChannelMemberSchemeRoles: jest.fn(),
    getMemberInChannel: jest.fn((channelId: string, userId: string) => ({id: userId + '-' + channelId, user_id: userId, channel_id: channelId, roles: ''})),
    getChannel: jest.fn((channelId: string) => ({id: channelId, name: 'channel1'})),
    getProfilesInChannel: jest.fn(() => ([user])),
    addToChannel: jest.fn((channelId: string, userId: string) => ({user_id: userId, channel_id: channelId, roles: ''})),
    getProfilesByIds: jest.fn((userIds: string[]) => userIds.map((uid) => ({id: uid, username: 'u' + uid, roles: ''}))),
};

const channelId = 'channelid1';

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
});
