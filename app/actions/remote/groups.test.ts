// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';

import {
    fetchGroupsForAutocomplete,
    fetchGroupsByNames,
    fetchGroupsForChannel,
    fetchGroupsForTeam,
    fetchGroupsForMember,
    fetchFilteredTeamGroups,
    fetchFilteredChannelGroups,
    fetchGroupsForTeamIfConstrained,
    fetchGroupsForChannelIfConstrained,
} from './groups';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type GroupModel from '@typings/database/models/servers/group';
import type GroupChannelModel from '@typings/database/models/servers/group_channel';
import type GroupTeamModel from '@typings/database/models/servers/group_team';

const serverUrl = 'baseHandler.test.com';
let operator: ServerDataOperator;

const teamId = 'teamid1';
const team: Team = {
    id: teamId,
    group_constrained: true,
} as Team;

const channelId = 'channelid1';
const channel: Channel = {
    id: channelId,
    display_name: 'channelname',
    team_id: teamId,
    total_msg_count: 0,
    group_constrained: true,
} as Channel;

const user1 = {id: 'userid1', username: 'user1', email: 'user1@mattermost.com', roles: ''} as UserProfile;

const group1 = {
    id: 'groupid1',
    name: 'groupname',
    display_name: 'groupname',
    description: 'group description',
    source: 'source',
    remote_id: 'remoteid',
    allow_reference: true,
    create_at: 123,
    update_at: 123,
    delete_at: 0,
    member_count: 1,
} as Group;

jest.mock('@queries/servers/preference');

const mockClient = {
    getGroups: jest.fn(() => [group1]),
    getAllGroupsAssociatedToChannel: jest.fn(() => ({groups: [group1], total_group_count: 1})),
    getAllGroupsAssociatedToTeam: jest.fn(() => ({groups: [group1], total_group_count: 1})),
    getAllGroupsAssociatedToMembership: jest.fn(() => [group1]),
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

describe('groups', () => {
    it('fetchGroupsForAutocomplete - handle not found database', async () => {
        const result = await fetchGroupsForAutocomplete('foo', '') as {error: unknown};
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('fetchGroupsForAutocomplete - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true'}}], prepareRecordsOnly: false});

        const result = await fetchGroupsForAutocomplete(serverUrl, group1.name) as GroupModel[];
        expect(result).toBeDefined();
        expect(result.length).toBe(1);
        expect(result[0].id).toBe(group1.id);
    });

    it('fetchGroupsForAutocomplete - no license', async () => {
        const result = await fetchGroupsForAutocomplete(serverUrl, group1.name) as GroupModel[];
        expect(result).toBeDefined();
        expect(result.length).toBe(0);
    });

    it('fetchGroupsForAutocomplete - no groups', async () => {
        mockClient.getGroups.mockImplementationOnce(jest.fn(() => []));
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true'}}], prepareRecordsOnly: false});

        const result = await fetchGroupsForAutocomplete(serverUrl, group1.name) as GroupModel[];
        expect(result).toBeDefined();
        expect(result.length).toBe(0);
    });

    it('fetchGroupsByNames - handle not found database', async () => {
        const result = await fetchGroupsByNames('foo', []) as {error: unknown};
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('fetchGroupsByNames - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true'}}], prepareRecordsOnly: false});

        const result = await fetchGroupsByNames(serverUrl, [group1.name]) as GroupModel[];
        expect(result).toBeDefined();
        expect(result.length).toBe(1);
        expect(result[0].id).toBe(group1.id);
    });

    it('fetchGroupsByNames - no license', async () => {
        const result = await fetchGroupsByNames(serverUrl, [group1.name]) as GroupModel[];
        expect(result).toBeDefined();
        expect(result.length).toBe(0);
    });

    it('fetchGroupsByNames - no groups', async () => {
        mockClient.getGroups.mockImplementationOnce(jest.fn(() => []));
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true'}}], prepareRecordsOnly: false});

        const result = await fetchGroupsByNames(serverUrl, [group1.name]) as GroupModel[];
        expect(result).toBeDefined();
        expect(result.length).toBe(0);
    });

    it('fetchGroupsForChannel - handle not found database', async () => {
        const result = await fetchGroupsForChannel('foo', '');
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('fetchGroupsForChannel - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true'}}], prepareRecordsOnly: false});

        const result = await fetchGroupsForChannel(serverUrl, channel.id);
        expect(result).toBeDefined();
        expect(result.groups).toBeDefined();
        expect(result.groups?.length).toBe(1);
        expect(result.groups?.[0].id).toBe(group1.id);
        expect(result.groupChannels).toBeDefined();
        expect(result.groupChannels?.length).toBe(1);
        expect(result.groupChannels?.[0].channelId).toBe(channel.id);
    });

    it('fetchGroupsForChannel - no license', async () => {
        const result = await fetchGroupsForChannel(serverUrl, channel.id);
        expect(result).toBeDefined();
        expect(result.groups).toBeDefined();
        expect(result.groups?.length).toBe(0);
        expect(result.groupChannels).toBeDefined();
        expect(result.groupChannels?.length).toBe(0);
    });

    it('fetchGroupsForChannel - no groups', async () => {
        mockClient.getAllGroupsAssociatedToChannel.mockImplementationOnce(jest.fn(() => ({groups: [], total_group_count: 0})));
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true'}}], prepareRecordsOnly: false});

        const result = await fetchGroupsForChannel(serverUrl, channel.id);
        expect(result).toBeDefined();
        expect(result.groups).toBeDefined();
        expect(result.groups?.length).toBe(0);
        expect(result.groupChannels).toBeDefined();
        expect(result.groupChannels?.length).toBe(0);
    });

    it('fetchGroupsForTeam - handle not found database', async () => {
        const result = await fetchGroupsForTeam('foo', '');
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('fetchGroupsForTeam - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true'}}], prepareRecordsOnly: false});

        const result = await fetchGroupsForTeam(serverUrl, teamId);
        expect(result).toBeDefined();
        expect(result.groups).toBeDefined();
        expect(result.groups?.length).toBe(1);
        expect(result.groups?.[0].id).toBe(group1.id);
        expect(result.groupTeams).toBeDefined();
        expect(result.groupTeams?.length).toBe(1);
        expect(result.groupTeams?.[0].teamId).toBe(teamId);
    });

    it('fetchGroupsForTeam - no license', async () => {
        const result = await fetchGroupsForTeam(serverUrl, teamId);
        expect(result).toBeDefined();
        expect(result.groups).toBeDefined();
        expect(result.groups?.length).toBe(0);
        expect(result.groupTeams).toBeDefined();
        expect(result.groupTeams?.length).toBe(0);
    });

    it('fetchGroupsForTeam - no groups', async () => {
        mockClient.getAllGroupsAssociatedToTeam.mockImplementationOnce(jest.fn(() => ({groups: [], total_group_count: 0})));
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true'}}], prepareRecordsOnly: false});

        const result = await fetchGroupsForTeam(serverUrl, teamId);
        expect(result).toBeDefined();
        expect(result.groups).toBeDefined();
        expect(result.groups?.length).toBe(0);
        expect(result.groupTeams).toBeDefined();
        expect(result.groupTeams?.length).toBe(0);
    });

    it('fetchGroupsForMember - handle not found database', async () => {
        const result = await fetchGroupsForMember('foo', '');
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('fetchGroupsForMember - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true'}}], prepareRecordsOnly: false});

        const result = await fetchGroupsForMember(serverUrl, user1.id);
        expect(result).toBeDefined();
        expect(result.groups).toBeDefined();
        expect(result.groups?.length).toBe(1);
        expect(result.groups?.[0].id).toBe(group1.id);
        expect(result.groupMemberships).toBeDefined();
        expect(result.groupMemberships?.length).toBe(1);
        expect(result.groupMemberships?.[0].userId).toBe(user1.id);
    });

    it('fetchGroupsForMember - no license', async () => {
        const result = await fetchGroupsForMember(serverUrl, user1.id);
        expect(result).toBeDefined();
        expect(result.groups).toBeDefined();
        expect(result.groups?.length).toBe(0);
        expect(result.groupMemberships).toBeDefined();
        expect(result.groupMemberships?.length).toBe(0);
    });

    it('fetchGroupsForMember - no groups', async () => {
        mockClient.getAllGroupsAssociatedToMembership.mockImplementationOnce(jest.fn(() => []));
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true'}}], prepareRecordsOnly: false});

        const result = await fetchGroupsForMember(serverUrl, user1.id);
        expect(result).toBeDefined();
        expect(result.groups).toBeDefined();
        expect(result.groups?.length).toBe(0);
        expect(result.groupMemberships).toBeDefined();
        expect(result.groupMemberships?.length).toBe(0);
    });

    it('fetchFilteredTeamGroups - handle not found database', async () => {
        const result = await fetchFilteredTeamGroups('foo', '', '') as {error: unknown};
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('fetchFilteredTeamGroups - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true'}}], prepareRecordsOnly: false});

        const result = await fetchFilteredTeamGroups(serverUrl, group1.name, teamId) as GroupModel[];
        expect(result).toBeDefined();
        expect(result.length).toBe(1);
        expect(result[0].id).toBe(group1.id);
    });

    it('fetchFilteredChannelGroups - handle not found database', async () => {
        const result = await fetchFilteredChannelGroups('foo', '', '') as {error: unknown};
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('fetchFilteredChannelGroups - base case', async () => {
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true'}}], prepareRecordsOnly: false});

        const result = await fetchFilteredChannelGroups(serverUrl, group1.name, channel.id) as GroupModel[];
        expect(result).toBeDefined();
        expect(result.length).toBe(1);
        expect(result[0].id).toBe(group1.id);
    });

    it('fetchGroupsForTeamIfConstrained - handle not found database', async () => {
        const result = await fetchGroupsForTeamIfConstrained('foo', '') as {error: unknown};
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('fetchGroupsForTeamIfConstrained - base case', async () => {
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true'}}], prepareRecordsOnly: false});

        const result = await fetchGroupsForTeamIfConstrained(serverUrl, teamId) as {groups?: GroupModel[]; groupTeams?: GroupTeamModel[]};
        expect(result).toBeDefined();
        expect(result.groups).toBeDefined();
        expect(result.groups?.length).toBe(1);
        expect(result.groups?.[0].id).toBe(group1.id);
        expect(result.groupTeams).toBeDefined();
        expect(result.groupTeams?.length).toBe(1);
        expect(result.groupTeams?.[0].teamId).toBe(teamId);
    });

    it('fetchGroupsForTeamIfConstrained - not constrained', async () => {
        await operator.handleTeam({teams: [{...team, group_constrained: false}], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true'}}], prepareRecordsOnly: false});

        const result = await fetchGroupsForTeamIfConstrained(serverUrl, teamId) as {groups?: GroupModel[]; groupTeams?: GroupTeamModel[]};
        expect(result).toBeDefined();
        expect(result.groups).toBeUndefined();
        expect(result.groupTeams).toBeUndefined();
    });

    it('fetchGroupsForChannelIfConstrained - handle not found database', async () => {
        const result = await fetchGroupsForChannelIfConstrained('foo', '') as {error: unknown};
        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
    });

    it('fetchGroupsForChannelIfConstrained - base case', async () => {
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true'}}], prepareRecordsOnly: false});

        const result = await fetchGroupsForChannelIfConstrained(serverUrl, channel.id) as {groups?: GroupModel[]; groupChannels?: GroupChannelModel[]};
        expect(result).toBeDefined();
        expect(result.groups).toBeDefined();
        expect(result.groups?.length).toBe(1);
        expect(result.groups?.[0].id).toBe(group1.id);
        expect(result.groupChannels).toBeDefined();
        expect(result.groupChannels?.length).toBe(1);
        expect(result.groupChannels?.[0].channelId).toBe(channel.id);
    });

    it('fetchGroupsForChannelIfConstrained - not constrained', async () => {
        await operator.handleChannel({channels: [{...channel, group_constrained: false}], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.LICENSE, value: {IsLicensed: 'true'}}], prepareRecordsOnly: false});

        const result = await fetchGroupsForChannelIfConstrained(serverUrl, channel.id) as {groups?: GroupModel[]; groupChannels?: GroupChannelModel[]};
        expect(result).toBeDefined();
        expect(result.groups).toBeUndefined();
        expect(result.groupChannels).toBeUndefined();
    });
});
