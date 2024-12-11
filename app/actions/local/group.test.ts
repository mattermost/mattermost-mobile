// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import * as remoteGroups from '@actions/remote/groups';
import DatabaseManager from '@database/manager';

import {
    searchGroupsByName,
    searchGroupsByNameInTeam,
    searchGroupsByNameInChannel,
} from './group';

import type ServerDataOperator from '@database/operator/server_data_operator';

jest.mock('@actions/remote/groups');

const mockedRemoteGroups = jest.mocked(remoteGroups);

describe('searchGroups', () => {
    let operator: ServerDataOperator;
    const serverUrl = 'baseHandler.test.com';
    const teamId = 'teamid1';
    const channelId = 'channelid1';
    const group: Group = {
        id: 'kjlw9j1ttnxwig7tnqgebg7dtipno',
        name: 'groupname',
        display_name: 'Test',
        source: 'custom',
        remote_id: 'iuh4r89egnslnvakjsdjhg',
        description: 'Test description',
        member_count: 0,
        allow_reference: true,
        create_at: 0,
        update_at: 0,
        delete_at: 0,
    } as Group;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('searchGroupsByName - handle not found database', async () => {
        const models = await searchGroupsByName('foo', 'test');
        expect(models).toBeDefined();
        expect(models.length).toBe(0);
    });

    it('searchGroupsByName - no groups', async () => {
        const models = await searchGroupsByName(serverUrl, 'test');
        expect(models).toBeDefined();
        expect(models.length).toBe(0);
    });

    it('searchGroupsByName - fetch failed', async () => {
        await operator.handleGroups({groups: [group], prepareRecordsOnly: false});
        mockedRemoteGroups.fetchGroupsForAutocomplete.mockReturnValueOnce(Promise.reject(new Error('fail')));

        const models = await searchGroupsByName(serverUrl, group.name);
        expect(models).toBeDefined();
        expect(models.length).toBe(1);
        expect(models[0].id).toBe(group.id);
    });

    it('searchGroupsByName', async () => {
        const groupModels = await operator.handleGroups({groups: [group], prepareRecordsOnly: false});
        mockedRemoteGroups.fetchGroupsForAutocomplete.mockReturnValueOnce(Promise.resolve(groupModels));

        const models = await searchGroupsByName(serverUrl, group.name);
        expect(models).toBeDefined();
        expect(models.length).toBe(1);
        expect(models[0].id).toBe(group.id);
    });

    it('searchGroupsByNameInTeam - handle not found database', async () => {
        const models = await searchGroupsByNameInTeam('foo', 'test', teamId);
        expect(models).toBeDefined();
        expect(models.length).toBe(0);
    });

    it('searchGroupsByNameInTeam - no groups', async () => {
        const models = await searchGroupsByNameInTeam(serverUrl, 'test', teamId);
        expect(models).toBeDefined();
        expect(models.length).toBe(0);
    });

    it('searchGroupsByNameInTeam - fetch failed', async () => {
        await operator.handleGroups({groups: [group], prepareRecordsOnly: false});
        await operator.handleGroupTeamsForTeam({groups: [group], teamId, prepareRecordsOnly: false});

        mockedRemoteGroups.fetchFilteredTeamGroups.mockReturnValueOnce(Promise.reject(new Error('fail')));

        const models = await searchGroupsByNameInTeam(serverUrl, group.name, teamId);
        expect(models).toBeDefined();
        expect(models.length).toBe(1);
        expect(models[0].id).toBe(group.id);
    });

    it('searchGroupsByNameInTeam', async () => {
        const groupModels = await operator.handleGroups({groups: [group], prepareRecordsOnly: false});
        await operator.handleGroupTeamsForTeam({groups: [group], teamId, prepareRecordsOnly: false});

        mockedRemoteGroups.fetchFilteredTeamGroups.mockReturnValueOnce(Promise.resolve(groupModels));

        const models = await searchGroupsByNameInTeam(serverUrl, group.name, teamId);
        expect(models).toBeDefined();
        expect(models.length).toBe(1);
        expect(models[0].id).toBe(group.id);
    });

    it('searchGroupsByNameInChannel - handle not found database', async () => {
        const models = await searchGroupsByNameInChannel('foo', 'test', channelId);
        expect(models).toBeDefined();
        expect(models.length).toBe(0);
    });

    it('searchGroupsByNameInChannel - no groups', async () => {
        const models = await searchGroupsByNameInChannel(serverUrl, 'test', channelId);
        expect(models).toBeDefined();
        expect(models.length).toBe(0);
    });

    it('searchGroupsByNameInChannel - fetch failed', async () => {
        await operator.handleGroups({groups: [group], prepareRecordsOnly: false});
        await operator.handleGroupChannelsForChannel({groups: [group], channelId, prepareRecordsOnly: false});

        mockedRemoteGroups.fetchFilteredChannelGroups.mockReturnValueOnce(Promise.reject(new Error('fail')));

        const models = await searchGroupsByNameInChannel(serverUrl, group.name, channelId);
        expect(models).toBeDefined();
        expect(models.length).toBe(1);
        expect(models[0].id).toBe(group.id);
    });

    it('searchGroupsByNameInChannel', async () => {
        const groupModels = await operator.handleGroups({groups: [group], prepareRecordsOnly: false});
        await operator.handleGroupChannelsForChannel({groups: [group], channelId, prepareRecordsOnly: false});

        mockedRemoteGroups.fetchFilteredChannelGroups.mockReturnValueOnce(Promise.resolve(groupModels));

        const models = await searchGroupsByNameInChannel(serverUrl, group.name, channelId);
        expect(models).toBeDefined();
        expect(models.length).toBe(1);
        expect(models[0].id).toBe(group.id);
    });
});
