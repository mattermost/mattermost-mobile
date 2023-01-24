// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {Navigation} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getMyChannel} from '@queries/servers/channel';
import {getCommonSystemValues, getTeamHistory} from '@queries/servers/system';
import {getTeamChannelHistory} from '@queries/servers/team';
import {dismissAllModalsAndPopToRoot, dismissAllModalsAndPopToScreen} from '@screens/navigation';

import {switchToChannel} from './channel';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Database} from '@nozbe/watermelondb';

let mockIsTablet: jest.Mock;
const now = new Date('2020-01-01').getTime();

jest.mock('@screens/navigation', () => {
    const original = jest.requireActual('@screens/navigation');
    return {
        ...original,
        dismissAllModalsAndPopToScreen: jest.fn(),
        dismissAllModalsAndPopToRoot: jest.fn(),
    };
});

jest.mock('@utils/helpers', () => {
    const original = jest.requireActual('@utils/helpers');
    mockIsTablet = jest.fn(() => false);
    return {
        ...original,
        isTablet: mockIsTablet,
    };
});

const queryDatabaseValues = async (database: Database, teamId: string, channelId: string) => ({
    systemValues: await getCommonSystemValues(database),
    teamHistory: await getTeamHistory(database),
    channelHistory: await getTeamChannelHistory(database, teamId),
    member: await getMyChannel(database, channelId),
});

describe('switchToChannel', () => {
    let operator: ServerDataOperator;
    let spyNow: jest.SpyInstance;
    const serverUrl = 'baseHandler.test.com';
    const channelId = 'id1';
    const teamId = 'tId1';
    const team: Team = {
        id: teamId,
    } as Team;
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
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
        spyNow = jest.spyOn(Date, 'now').mockImplementation(() => now);
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
        spyNow.mockRestore();
    });

    it('handle not found database', async () => {
        const listenerCallback = jest.fn();
        const listener = DeviceEventEmitter.addListener(Navigation.NAVIGATION_HOME, listenerCallback);
        const {error} = await switchToChannel('foo', 'channelId');
        listener.remove();

        expect(error).toBeTruthy();
        expect(dismissAllModalsAndPopToScreen).toHaveBeenCalledTimes(0);
        expect(dismissAllModalsAndPopToRoot).toHaveBeenCalledTimes(0);
        expect(listenerCallback).toHaveBeenCalledTimes(0);
    });

    it('handle no member', async () => {
        const listenerCallback = jest.fn();
        const listener = DeviceEventEmitter.addListener(Navigation.NAVIGATION_HOME, listenerCallback);
        const {models, error} = await switchToChannel(serverUrl, 'channelId');
        listener.remove();

        expect(error).toBeUndefined();
        expect(models?.length).toBe(0);

        const {systemValues, teamHistory, channelHistory, member} = await queryDatabaseValues(operator.database, teamId, channelId);

        expect(error).toBeUndefined();
        expect(systemValues.currentTeamId).toBe('');
        expect(systemValues.currentChannelId).toBe('');
        expect(teamHistory.length).toBe(0);
        expect(channelHistory.length).toBe(0);
        expect(member?.lastViewedAt).toBe(undefined);
        expect(dismissAllModalsAndPopToScreen).toHaveBeenCalledTimes(0);
        expect(dismissAllModalsAndPopToRoot).toHaveBeenCalledTimes(0);
        expect(listenerCallback).toHaveBeenCalledTimes(0);
    });

    it('switch to current channel', async () => {
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [channel], myChannels: [channelMember], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}, {id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID, value: channelId}], prepareRecordsOnly: false});

        const listenerCallback = jest.fn();
        const listener = DeviceEventEmitter.addListener(Navigation.NAVIGATION_HOME, listenerCallback);
        const {models, error} = await switchToChannel(serverUrl, channelId);
        listener.remove();

        const {systemValues, teamHistory, channelHistory, member} = await queryDatabaseValues(operator.database, teamId, channelId);

        expect(error).toBeUndefined();
        expect(models?.length).toBe(2); // Viewed at, lastUnread
        expect(systemValues.currentTeamId).toBe(teamId);
        expect(systemValues.currentChannelId).toBe(channelId);
        expect(teamHistory.length).toBe(0);
        expect(channelHistory.length).toBe(0);
        expect(member?.lastViewedAt).toBe(now);
        expect(dismissAllModalsAndPopToScreen).toHaveBeenCalledTimes(1);
        expect(dismissAllModalsAndPopToRoot).toHaveBeenCalledTimes(0);
        expect(listenerCallback).toHaveBeenCalledTimes(0);
    });

    it('switch to different channel in same team', async () => {
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [channel], myChannels: [channelMember], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}, {id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID, value: 'currentChannelId'}], prepareRecordsOnly: false});

        const listenerCallback = jest.fn();
        const listener = DeviceEventEmitter.addListener(Navigation.NAVIGATION_HOME, listenerCallback);
        const {models, error} = await switchToChannel(serverUrl, channelId);
        listener.remove();

        const {systemValues, teamHistory, channelHistory, member} = await queryDatabaseValues(operator.database, teamId, channelId);

        expect(error).toBeUndefined();
        expect(models?.length).toBe(4); // Viewed at, channel history and currentChannelId
        expect(systemValues.currentTeamId).toBe(teamId);
        expect(systemValues.currentChannelId).toBe(channelId);
        expect(teamHistory.length).toBe(0);
        expect(channelHistory.length).toBe(1);
        expect(channelHistory[0]).toBe(channelId);
        expect(member?.lastViewedAt).toBe(now);
        expect(dismissAllModalsAndPopToScreen).toHaveBeenCalledTimes(1);
        expect(dismissAllModalsAndPopToRoot).toHaveBeenCalledTimes(0);
        expect(listenerCallback).toHaveBeenCalledTimes(0);
    });

    it('switch to different channel in different team', async () => {
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [channel], myChannels: [channelMember], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: 'currentTeamId'}, {id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID, value: 'currentChannelId'}], prepareRecordsOnly: false});

        const listenerCallback = jest.fn();
        const listener = DeviceEventEmitter.addListener(Navigation.NAVIGATION_HOME, listenerCallback);
        const {models, error} = await switchToChannel(serverUrl, channelId, teamId);
        listener.remove();

        const {systemValues, teamHistory, channelHistory, member} = await queryDatabaseValues(operator.database, teamId, channelId);

        expect(error).toBeUndefined();
        expect(models?.length).toBe(6); // Viewed at, channel history, team history, currentTeamId and currentChannelId
        expect(systemValues.currentTeamId).toBe(teamId);
        expect(systemValues.currentChannelId).toBe(channelId);
        expect(teamHistory.length).toBe(1);
        expect(teamHistory[0]).toBe(teamId);
        expect(channelHistory.length).toBe(1);
        expect(channelHistory[0]).toBe(channelId);
        expect(member?.lastViewedAt).toBe(now);
        expect(dismissAllModalsAndPopToScreen).toHaveBeenCalledTimes(1);
        expect(dismissAllModalsAndPopToRoot).toHaveBeenCalledTimes(0);
        expect(listenerCallback).toHaveBeenCalledTimes(0);
    });

    it('switch to same channel in different team', async () => {
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
        const tChannel = {...channel, team_id: ''};
        await operator.handleChannel({channels: [tChannel], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [tChannel], myChannels: [channelMember], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: 'currentTeamId'}, {id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID, value: channelId}], prepareRecordsOnly: false});

        const listenerCallback = jest.fn();
        const listener = DeviceEventEmitter.addListener(Navigation.NAVIGATION_HOME, listenerCallback);
        const {models, error} = await switchToChannel(serverUrl, channelId, teamId);
        listener.remove();

        const {systemValues, teamHistory, channelHistory, member} = await queryDatabaseValues(operator.database, teamId, channelId);

        expect(error).toBeUndefined();
        expect(models?.length).toBe(5); // Viewed at, channel history, team history and currentTeamId, lastUnread
        expect(systemValues.currentTeamId).toBe(teamId);
        expect(systemValues.currentChannelId).toBe(channelId);
        expect(teamHistory.length).toBe(1);
        expect(teamHistory[0]).toBe(teamId);
        expect(channelHistory.length).toBe(1);
        expect(channelHistory[0]).toBe(channelId);
        expect(member?.lastViewedAt).toBe(now);
        expect(dismissAllModalsAndPopToScreen).toHaveBeenCalledTimes(1);
        expect(dismissAllModalsAndPopToRoot).toHaveBeenCalledTimes(0);
        expect(listenerCallback).toHaveBeenCalledTimes(0);
    });

    it('switch to dm channel in different team', async () => {
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
        const tChannel = {...channel, team_id: ''};
        await operator.handleChannel({channels: [tChannel], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [tChannel], myChannels: [channelMember], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: 'currentTeamId'}, {id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID, value: 'currentChannelId'}], prepareRecordsOnly: false});

        const listenerCallback = jest.fn();
        const listener = DeviceEventEmitter.addListener(Navigation.NAVIGATION_HOME, listenerCallback);
        const {models, error} = await switchToChannel(serverUrl, channelId, teamId);
        listener.remove();

        const {systemValues, teamHistory, channelHistory, member} = await queryDatabaseValues(operator.database, teamId, channelId);

        expect(error).toBeUndefined();
        expect(models?.length).toBe(6); // Viewed at, channel history, team history, currentTeamId and currentChannelId, lastUnread
        expect(systemValues.currentTeamId).toBe(teamId);
        expect(systemValues.currentChannelId).toBe(channelId);
        expect(teamHistory.length).toBe(1);
        expect(teamHistory[0]).toBe(teamId);
        expect(channelHistory.length).toBe(1);
        expect(channelHistory[0]).toBe(channelId);
        expect(member?.lastViewedAt).toBe(now);
        expect(dismissAllModalsAndPopToScreen).toHaveBeenCalledTimes(1);
        expect(dismissAllModalsAndPopToRoot).toHaveBeenCalledTimes(0);
        expect(listenerCallback).toHaveBeenCalledTimes(0);
    });

    it('switch to a channel from different team without passing the teamId', async () => {
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [channel], myChannels: [channelMember], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: 'currentTeamId'}, {id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID, value: 'currentChannelId'}], prepareRecordsOnly: false});

        const listenerCallback = jest.fn();
        const listener = DeviceEventEmitter.addListener(Navigation.NAVIGATION_HOME, listenerCallback);
        const {models, error} = await switchToChannel(serverUrl, channelId);
        listener.remove();

        const {systemValues, teamHistory, channelHistory, member} = await queryDatabaseValues(operator.database, teamId, channelId);

        expect(error).toBeUndefined();
        expect(models?.length).toBe(6); // Viewed at, channel history, team history, currentTeamId and currentChannelId, lastUnread
        expect(systemValues.currentTeamId).toBe(teamId);
        expect(systemValues.currentChannelId).toBe(channelId);
        expect(teamHistory.length).toBe(1);
        expect(teamHistory[0]).toBe(teamId);
        expect(channelHistory.length).toBe(1);
        expect(channelHistory[0]).toBe(channelId);
        expect(member?.lastViewedAt).toBe(now);
        expect(dismissAllModalsAndPopToScreen).toHaveBeenCalledTimes(1);
        expect(dismissAllModalsAndPopToRoot).toHaveBeenCalledTimes(0);
        expect(listenerCallback).toHaveBeenCalledTimes(0);
    });

    it('switch to a channel from the same team without passing a teamId', async () => {
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [channel], myChannels: [channelMember], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}, {id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID, value: 'currentChannelId'}], prepareRecordsOnly: false});

        const listenerCallback = jest.fn();
        const listener = DeviceEventEmitter.addListener(Navigation.NAVIGATION_HOME, listenerCallback);
        const {models, error} = await switchToChannel(serverUrl, channelId);
        listener.remove();

        const {systemValues, teamHistory, channelHistory, member} = await queryDatabaseValues(operator.database, teamId, channelId);

        expect(error).toBeUndefined();
        expect(models?.length).toBe(4); // Viewed at, channel history and currentChannelId, lastUnread
        expect(systemValues.currentTeamId).toBe(teamId);
        expect(systemValues.currentChannelId).toBe(channelId);
        expect(teamHistory.length).toBe(0);
        expect(channelHistory.length).toBe(1);
        expect(channelHistory[0]).toBe(channelId);
        expect(member?.lastViewedAt).toBe(now);
        expect(dismissAllModalsAndPopToScreen).toHaveBeenCalledTimes(1);
        expect(dismissAllModalsAndPopToRoot).toHaveBeenCalledTimes(0);
        expect(listenerCallback).toHaveBeenCalledTimes(0);
    });

    it('switch to a DM without passing the teamId', async () => {
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
        const tChannel = {...channel, team_id: ''};
        await operator.handleChannel({channels: [tChannel], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [tChannel], myChannels: [channelMember], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}, {id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID, value: 'currentChannelId'}], prepareRecordsOnly: false});

        const listenerCallback = jest.fn();
        const listener = DeviceEventEmitter.addListener(Navigation.NAVIGATION_HOME, listenerCallback);
        const {models, error} = await switchToChannel(serverUrl, channelId);
        listener.remove();

        const {systemValues, teamHistory, channelHistory, member} = await queryDatabaseValues(operator.database, teamId, channelId);

        expect(error).toBeUndefined();
        expect(models?.length).toBe(4); // Viewed at, channel history and currentChannelId, lastUnread
        expect(systemValues.currentTeamId).toBe(teamId);
        expect(systemValues.currentChannelId).toBe(channelId);
        expect(teamHistory.length).toBe(0);
        expect(channelHistory.length).toBe(1);
        expect(channelHistory[0]).toBe(channelId);
        expect(member?.lastViewedAt).toBe(now);
        expect(dismissAllModalsAndPopToScreen).toHaveBeenCalledTimes(1);
        expect(dismissAllModalsAndPopToRoot).toHaveBeenCalledTimes(0);
        expect(listenerCallback).toHaveBeenCalledTimes(0);
    });

    it('switch to a channel passing a wrong teamId', async () => {
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [channel], myChannels: [channelMember], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: 'currentTeamId'}, {id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID, value: 'currentChannelId'}], prepareRecordsOnly: false});

        const listenerCallback = jest.fn();
        const listener = DeviceEventEmitter.addListener(Navigation.NAVIGATION_HOME, listenerCallback);
        const {models, error} = await switchToChannel(serverUrl, channelId, 'someTeamId');
        listener.remove();

        const {systemValues, teamHistory, channelHistory, member} = await queryDatabaseValues(operator.database, teamId, channelId);

        expect(error).toBeUndefined();
        expect(models?.length).toBe(6); // Viewed at, channel history, team history, currentTeamId and currentChannelId, lastUnread
        expect(systemValues.currentTeamId).toBe(teamId);
        expect(systemValues.currentChannelId).toBe(channelId);
        expect(teamHistory.length).toBe(1);
        expect(teamHistory[0]).toBe(teamId);
        expect(channelHistory.length).toBe(1);
        expect(channelHistory[0]).toBe(channelId);
        expect(member?.lastViewedAt).toBe(now);
        expect(dismissAllModalsAndPopToScreen).toHaveBeenCalledTimes(1);
        expect(dismissAllModalsAndPopToRoot).toHaveBeenCalledTimes(0);
        expect(listenerCallback).toHaveBeenCalledTimes(0);
    });

    it('switch to a DM passing a non-existing teamId', async () => {
        const currentTeamId = 'ctid';
        const currentChannelId = 'ccid';

        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
        const tChannel = {...channel, team_id: ''};
        await operator.handleChannel({channels: [tChannel], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [tChannel], myChannels: [channelMember], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: currentTeamId}, {id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID, value: currentChannelId}], prepareRecordsOnly: false});

        const listenerCallback = jest.fn();
        const listener = DeviceEventEmitter.addListener(Navigation.NAVIGATION_HOME, listenerCallback);
        const {error} = await switchToChannel(serverUrl, channelId, 'someTeamId');
        listener.remove();

        const {systemValues, teamHistory, channelHistory, member} = await queryDatabaseValues(operator.database, teamId, channelId);

        expect(error).toBeTruthy();
        expect(systemValues.currentTeamId).toBe(currentTeamId);
        expect(systemValues.currentChannelId).toBe(currentChannelId);
        expect(teamHistory.length).toBe(0);
        expect(channelHistory.length).toBe(0);
        expect(member?.lastViewedAt).toBe(0);
        expect(dismissAllModalsAndPopToScreen).toHaveBeenCalledTimes(0);
        expect(dismissAllModalsAndPopToRoot).toHaveBeenCalledTimes(0);
        expect(listenerCallback).toHaveBeenCalledTimes(0);
    });

    it('prepare records only does not change the database', async () => {
        const currentTeamId = 'ctid';
        const currentChannelId = 'ccid';

        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [channel], myChannels: [channelMember], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: currentTeamId}, {id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID, value: currentChannelId}], prepareRecordsOnly: false});

        const listenerCallback = jest.fn();
        const listener = DeviceEventEmitter.addListener(Navigation.NAVIGATION_HOME, listenerCallback);
        const {models, error} = await switchToChannel(serverUrl, channelId, teamId, false, true);
        for (const model of models!) {
            model.cancelPrepareUpdate();
        }
        listener.remove();

        const {systemValues, teamHistory, channelHistory, member} = await queryDatabaseValues(operator.database, teamId, channelId);

        expect(error).toBeUndefined();
        expect(models?.length).toBe(6); // Viewed at, channel history, team history, currentTeamId and currentChannelId, lastunread
        expect(systemValues.currentTeamId).toBe(currentTeamId);
        expect(systemValues.currentChannelId).toBe(currentChannelId);
        expect(teamHistory.length).toBe(0);
        expect(channelHistory.length).toBe(0);
        expect(member?.lastViewedAt).toBe(0);
        expect(dismissAllModalsAndPopToScreen).toHaveBeenCalledTimes(1);
        expect(dismissAllModalsAndPopToRoot).toHaveBeenCalledTimes(0);
        expect(listenerCallback).toHaveBeenCalledTimes(0);
    });

    it('test behaviour when it is a tablet', async () => {
        mockIsTablet.mockImplementationOnce(() => true);

        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [channel], myChannels: [channelMember], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: 'currentTeamId'}, {id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID, value: 'currentChannelId'}], prepareRecordsOnly: false});

        const listenerCallback = jest.fn();
        const listener = DeviceEventEmitter.addListener(Navigation.NAVIGATION_HOME, listenerCallback);
        const {models, error} = await switchToChannel(serverUrl, channelId, teamId);
        listener.remove();

        const {systemValues, teamHistory, channelHistory, member} = await queryDatabaseValues(operator.database, teamId, channelId);

        expect(error).toBeUndefined();
        expect(models?.length).toBe(6); // Viewed at, channel history, team history, currentTeamId and currentChannelId, lastUnread
        expect(systemValues.currentTeamId).toBe(teamId);
        expect(systemValues.currentChannelId).toBe(channelId);
        expect(teamHistory.length).toBe(1);
        expect(teamHistory[0]).toBe(teamId);
        expect(channelHistory.length).toBe(1);
        expect(channelHistory[0]).toBe(channelId);
        expect(member?.lastViewedAt).toBe(now);
        expect(dismissAllModalsAndPopToScreen).toHaveBeenCalledTimes(0);
        expect(dismissAllModalsAndPopToRoot).toHaveBeenCalledTimes(1);
        expect(listenerCallback).toHaveBeenCalledTimes(1);
    });
});
