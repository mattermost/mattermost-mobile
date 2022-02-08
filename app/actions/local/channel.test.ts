// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {SYSTEM_IDENTIFIERS} from '@app/constants/database';
import {queryMyChannel} from '@app/queries/servers/channel';
import {queryCommonSystemValues, queryTeamHistory} from '@app/queries/servers/system';
import {queryChannelHistory} from '@app/queries/servers/team';
import DatabaseManager from '@database/manager';
import ServerDataOperator from '@database/operator/server_data_operator';
import {dismissAllModalsAndPopToScreen} from '@screens/navigation';

import {switchToChannel} from './channel';

jest.mock('@screens/navigation', () => {
    const original = jest.requireActual('@screens/navigation');
    return {
        ...original,
        dismissAllModalsAndPopToScreen: jest.fn(),
        dismissAllModalsAndPopToRoot: jest.fn(),
    };
});

const now = new Date('2020-01-01').getTime();

describe('switchToChannel', () => {
    let operator: ServerDataOperator;
    let spyNow: jest.SpyInstance;
    const serverUrl = 'baseHandler.test.com';
    const channelId = 'id1';
    const teamId = 'tId1';
    const channel: Channel = {
        id: channelId,
        team_id: teamId,
        total_msg_count: 0,
    } as Channel;
    const channelMember: ChannelMembership = {
        id: 'id',
        channel_id: channelId,
        msg_count: 0,
    } as ChannelMembership;
    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl].operator;
        spyNow = jest.spyOn(Date, 'now').mockImplementation(() => now);
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
        spyNow.mockRestore();
    });

    it('handle not found database', async () => {
        const {error} = await switchToChannel('foo', 'channelId');
        expect(error).toBeTruthy();
    });

    it('handle no member', async () => {
        const {models, error} = await switchToChannel(serverUrl, 'channelId');
        expect(error).toBe(undefined);
        expect(models?.length).toBe(0);
    });

    it('switch to current channel', async () => {
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [channel], myChannels: [channelMember], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}, {id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID, value: channelId}], prepareRecordsOnly: false});

        const {models, error} = await switchToChannel(serverUrl, channelId);

        const systemValues = await queryCommonSystemValues(operator.database);
        const teamHistory = await queryTeamHistory(operator.database);
        const channelHistory = await queryChannelHistory(operator.database, teamId);
        const member = await queryMyChannel(operator.database, channelId);

        expect(error).toBe(undefined);
        expect(models?.length).toBe(1); // Viewed at
        expect(systemValues.currentTeamId).toBe(teamId);
        expect(systemValues.currentChannelId).toBe(channelId);
        expect(teamHistory.length).toBe(0);
        expect(channelHistory.length).toBe(0);
        expect(member?.lastViewedAt).toBe(now);
        expect(dismissAllModalsAndPopToScreen).toHaveBeenCalledTimes(1);
    });

    it('switch to different channel in same team', async () => {
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [channel], myChannels: [channelMember], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}, {id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID, value: 'currentChannelId'}], prepareRecordsOnly: false});

        const {models, error} = await switchToChannel(serverUrl, channelId);

        const systemValues = await queryCommonSystemValues(operator.database);
        const teamHistory = await queryTeamHistory(operator.database);
        const channelHistory = await queryChannelHistory(operator.database, teamId);
        const member = await queryMyChannel(operator.database, channelId);

        expect(error).toBe(undefined);
        expect(models?.length).toBe(3); // Viewed at, channel history and currentUserId
        expect(systemValues.currentTeamId).toBe(teamId);
        expect(systemValues.currentChannelId).toBe(channelId);
        expect(teamHistory.length).toBe(0);
        expect(channelHistory.length).toBe(1);
        expect(channelHistory[0]).toBe(channelId);
        expect(member?.lastViewedAt).toBe(now);
        expect(dismissAllModalsAndPopToScreen).toHaveBeenCalledTimes(1);
    });

    it('switch to different channel in different team', async () => {
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [channel], myChannels: [channelMember], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: 'currentTeamId'}, {id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID, value: 'currentChannelId'}], prepareRecordsOnly: false});

        const {models, error} = await switchToChannel(serverUrl, channelId, teamId);

        const systemValues = await queryCommonSystemValues(operator.database);
        const teamHistory = await queryTeamHistory(operator.database);
        const channelHistory = await queryChannelHistory(operator.database, teamId);
        const member = await queryMyChannel(operator.database, channelId);

        expect(error).toBe(undefined);
        expect(models?.length).toBe(5); // Viewed at, channel history, team history, currentTeamId and currentUserId
        expect(systemValues.currentTeamId).toBe(teamId);
        expect(systemValues.currentChannelId).toBe(channelId);
        expect(teamHistory.length).toBe(1);
        expect(teamHistory[0]).toBe(teamId);
        expect(channelHistory.length).toBe(1);
        expect(channelHistory[0]).toBe(channelId);
        expect(member?.lastViewedAt).toBe(now);
        expect(dismissAllModalsAndPopToScreen).toHaveBeenCalledTimes(1);
    });

    it('switch to dm channel in different team', async () => {
        const tChannel = {...channel, team_id: ''};
        await operator.handleChannel({channels: [tChannel], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [tChannel], myChannels: [channelMember], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: 'currentTeamId'}, {id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID, value: 'currentChannelId'}], prepareRecordsOnly: false});

        const {models, error} = await switchToChannel(serverUrl, channelId, teamId);

        const systemValues = await queryCommonSystemValues(operator.database);
        const teamHistory = await queryTeamHistory(operator.database);
        const channelHistory = await queryChannelHistory(operator.database, teamId);
        const member = await queryMyChannel(operator.database, channelId);

        expect(error).toBe(undefined);
        expect(models?.length).toBe(5); // Viewed at, channel history, team history, currentTeamId and currentUserId
        expect(systemValues.currentTeamId).toBe(teamId);
        expect(systemValues.currentChannelId).toBe(channelId);
        expect(teamHistory.length).toBe(1);
        expect(teamHistory[0]).toBe(teamId);
        expect(channelHistory.length).toBe(1); // Currently errors since it is being stored in the current team history and not the destination history
        expect(channelHistory[0]).toBe(channelId);
        expect(member?.lastViewedAt).toBe(now);
        expect(dismissAllModalsAndPopToScreen).toHaveBeenCalledTimes(1);
    });

    it('switch to a channel from different team without passing the teamId', async () => {
        // TODO: Why do we need to pass the team id?
    });

    it('prepare records only does not change the database', async () => {
        // This test may not be possible, since not batching the models will result in errors,
        // and querying the models without batching will either way return the modified models.
        // Unless we can cancel the models or somehow we can access the "original models", it is
        // not testable.
        const currentTeamId = 'ctid';
        const currentChannelId = 'ccid';
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [channel], myChannels: [channelMember], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: currentTeamId}, {id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID, value: currentChannelId}], prepareRecordsOnly: false});

        const {models, error} = await switchToChannel(serverUrl, channelId, teamId, true);

        const systemValues = await queryCommonSystemValues(operator.database);
        const teamHistory = await queryTeamHistory(operator.database);
        const channelHistory = await queryChannelHistory(operator.database, teamId);
        const member = await queryMyChannel(operator.database, channelId);

        expect(error).toBe(undefined);
        expect(models?.length).toBe(5); // Viewed at, channel history, team history, currentTeamId and currentUserId
        expect(systemValues.currentTeamId).toBe(currentTeamId);
        expect(systemValues.currentChannelId).toBe(currentChannelId);
        expect(teamHistory.length).toBe(0);
        expect(channelHistory.length).toBe(0);
        expect(member?.lastViewedAt).toBe(undefined);
        expect(dismissAllModalsAndPopToScreen).toHaveBeenCalledTimes(1);
    });

    it('test behaviour when it is a tablet', async () => {
        // TODO
    });
});
