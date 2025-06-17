// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

/* eslint-disable max-lines */

import {DeviceEventEmitter} from 'react-native';

import {Navigation} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getMyChannel} from '@queries/servers/channel';
import {getCommonSystemValues, getTeamHistory} from '@queries/servers/system';
import {getTeamChannelHistory} from '@queries/servers/team';
import {dismissAllModalsAndPopToRoot, dismissAllModalsAndPopToScreen} from '@screens/navigation';

import {
    switchToChannel,
    removeCurrentUserFromChannel,
    setChannelDeleteAt,
    selectAllMyChannelIds,
    markChannelAsUnread,
    resetMessageCount,
    storeMyChannelsForTeam,
    updateMyChannelFromWebsocket,
    updateChannelInfoFromChannel,
    updateLastPostAt,
    updateChannelsDisplayName,
    showUnreadChannelsOnly,
    updateDmGmDisplayName,
} from './channel';

import type {ChannelModel, MyChannelModel, SystemModel} from '@database/models/server';
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

describe('removeCurrentUserFromChannel', () => {
    let operator: ServerDataOperator;
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
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('handle not found database', async () => {
        const {error} = await removeCurrentUserFromChannel('foo', 'channelId');
        expect(error).toBeTruthy();
    });

    it('handle no member', async () => {
        const {models, error} = await removeCurrentUserFromChannel(serverUrl, 'channelId');
        expect(error).toBeUndefined();
        expect(models?.length).toBe(0);
    });

    it('handle no channel', async () => {
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [channel], myChannels: [channelMember], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}, {id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID, value: channelId}], prepareRecordsOnly: false});

        const {models, error} = await removeCurrentUserFromChannel(serverUrl, channelId);
        expect(error).toBeTruthy();
        expect(models).toBeUndefined();
    });

    it('remove user from current channel', async () => {
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [channel], myChannels: [channelMember], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: teamId}, {id: SYSTEM_IDENTIFIERS.CURRENT_CHANNEL_ID, value: channelId}], prepareRecordsOnly: false});

        const {models, error} = await removeCurrentUserFromChannel(serverUrl, channelId);

        const {member} = await queryDatabaseValues(operator.database, teamId, channelId);

        expect(error).toBeUndefined();
        expect(member).toBeUndefined();
        expect(models?.length).toBe(2); // Deleted my channel and channel
    });
});

describe('setChannelDeleteAt', () => {
    let operator: ServerDataOperator;
    const serverUrl = 'baseHandler.test.com';
    const channelId = 'id1';
    const teamId = 'tId1';
    const channel: Channel = {
        id: channelId,
        team_id: teamId,
        total_msg_count: 0,
        delete_at: 0,
    } as Channel;
    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('handle not found database', async () => {
        const {error} = await setChannelDeleteAt('foo', channelId, 0);
        expect(error).toBeTruthy();
    });

    it('handle no channel', async () => {
        const {models, error} = await setChannelDeleteAt(serverUrl, channelId, 0);
        expect(error).toBeDefined();
        expect(error).toBe(`channel with id ${channelId} not found`);
        expect(models).toBeUndefined();
    });

    it('set channel delete at', async () => {
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});

        const {models, error} = await setChannelDeleteAt(serverUrl, channelId, 123);
        expect(error).toBeUndefined();
        expect(models?.length).toBe(1); // Deleted channel
        expect(models![0].deleteAt).toBe(123);
    });
});

describe('selectAllMyChannelIds', () => {
    let operator: ServerDataOperator;
    const serverUrl = 'baseHandler.test.com';
    const channelId = 'id1';
    const teamId = 'tId1';
    const channel: Channel = {
        id: channelId,
        team_id: teamId,
        total_msg_count: 0,
        delete_at: 0,
    } as Channel;
    const channelMember: ChannelMembership = {
        id: 'id',
        channel_id: channelId,
        msg_count: 0,
    } as ChannelMembership;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('handle not found database', async () => {
        const result = await selectAllMyChannelIds('foo');
        expect(result.length).toBe(0);
    });

    it('handle no my channels', async () => {
        const result = await selectAllMyChannelIds(serverUrl);
        expect(result.length).toBe(0);
    });

    it('select my channels', async () => {
        await operator.handleMyChannel({channels: [channel], myChannels: [channelMember], prepareRecordsOnly: false});

        const result = await selectAllMyChannelIds(serverUrl);
        expect(result.length).toBe(1); // My channel
        expect(result[0]).toBe(channelId);
    });
});

describe('markChannelAsUnread', () => {
    let operator: ServerDataOperator;
    const serverUrl = 'baseHandler.test.com';
    const channelId = 'id1';
    const teamId = 'tId1';
    const channel: Channel = {
        id: channelId,
        team_id: teamId,
        total_msg_count: 0,
        delete_at: 0,
    } as Channel;
    const channelMember: ChannelMembership = {
        id: 'id',
        channel_id: channelId,
        msg_count: 0,
    } as ChannelMembership;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('handle not found database', async () => {
        const {member, error} = await markChannelAsUnread('foo', channelId, 10, 1, 123, false);
        expect(error).toBeTruthy();
        expect(member).toBeUndefined();
    });

    it('handle no member', async () => {
        const {member, error} = await markChannelAsUnread(serverUrl, channelId, 10, 1, 123, false);
        expect(error).toBe('not a member');
        expect(member).toBeUndefined();
    });

    it('mark channel as unread', async () => {
        await operator.handleMyChannel({channels: [channel], myChannels: [channelMember], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});

        const {member, error} = await markChannelAsUnread(serverUrl, channelId, 10, 1, 123, false);
        expect(error).toBeUndefined();
        expect(member).toBeDefined();
        expect(member?.viewedAt).toBe(122);
        expect(member?.lastViewedAt).toBe(122);
        expect(member?.messageCount).toBe(10);
        expect(member?.mentionsCount).toBe(1);
    });
});

describe('resetMessageCount', () => {
    let operator: ServerDataOperator;
    const serverUrl = 'baseHandler.test.com';
    const channelId = 'id1';
    const teamId = 'tId1';
    const channel: Channel = {
        id: channelId,
        team_id: teamId,
        total_msg_count: 10,
        delete_at: 0,
    } as Channel;
    const channelMember: ChannelMembership = {
        id: 'id',
        channel_id: channelId,
        msg_count: 10,
    } as ChannelMembership;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('handle not found database', async () => {
        const result = await resetMessageCount('foo', channelId);
        expect((result as { error: unknown }).error).toBeDefined();
    });

    it('handle no member', async () => {
        const result = await resetMessageCount(serverUrl, channelId);
        expect((result as { error: unknown }).error).toBe('not a member');
    });

    it('reset message count', async () => {
        await operator.handleMyChannel({channels: [channel], myChannels: [channelMember], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});

        const member = await resetMessageCount(serverUrl, channelId);
        expect((member as { error: unknown }).error).toBeUndefined();
        expect(member).toBeDefined();
        expect((member as MyChannelModel).messageCount).toBe(0);
    });
});

describe('storeMyChannelsForTeam', () => {
    let operator: ServerDataOperator;
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
        delete_at: 0,
    } as Channel;
    const channelMember: ChannelMembership = {
        id: 'id',
        user_id: 'userid',
        channel_id: channelId,
        msg_count: 0,
    } as ChannelMembership;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('handle not found database', async () => {
        const {models, error} = await storeMyChannelsForTeam('foo', teamId, [channel], [channelMember], false, false);
        expect(models).toBeUndefined();
        expect(error).toBeTruthy();
    });

    it('handle no member', async () => {
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: 'userid'}], prepareRecordsOnly: false});

        const {models, error} = await storeMyChannelsForTeam(serverUrl, teamId, [], [], false, false);
        expect(error).toBeUndefined();
        expect(models).toBeDefined();
        expect(models!.length).toBe(0);
    });

    it('store my channels for team', async () => {
        await operator.handleTeam({teams: [team], prepareRecordsOnly: false});

        const {models: prepModels, error: prepError} = await storeMyChannelsForTeam(serverUrl, teamId, [channel], [channelMember], true, false);
        expect(prepError).toBeUndefined();
        expect(prepModels).toBeDefined();
        expect(prepModels!.length).toBe(5); // Channel, channel info, member, settings and my channel

        const {models, error} = await storeMyChannelsForTeam(serverUrl, teamId, [channel], [channelMember], false, false);
        expect(error).toBeUndefined();
        expect(models).toBeDefined();
        expect(models!.length).toBe(5);
    });
});

describe('updateMyChannelFromWebsocket', () => {
    let operator: ServerDataOperator;
    const serverUrl = 'baseHandler.test.com';
    const channelId = 'id1';
    const teamId = 'tId1';
    const channel: Channel = {
        id: channelId,
        team_id: teamId,
        total_msg_count: 0,
        delete_at: 0,
    } as Channel;
    const channelMember: ChannelMembership = {
        id: 'id',
        user_id: 'userid',
        channel_id: channelId,
        msg_count: 0,
        roles: '',
    } as ChannelMembership;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('handle not found database', async () => {
        const {model, error} = await updateMyChannelFromWebsocket('foo', channelMember, false);
        expect(model).toBeUndefined();
        expect(error).toBeTruthy();
    });

    it('update my channel from websocket', async () => {
        await operator.handleMyChannel({channels: [channel], myChannels: [channelMember], prepareRecordsOnly: false});
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});

        const {model, error} = await updateMyChannelFromWebsocket(serverUrl, {...channelMember, roles: 'channel_user'}, false);
        expect(error).toBeUndefined();
        expect(model).toBeDefined();
        expect(model?.roles).toBe('channel_user');
    });
});

describe('updateChannelInfoFromChannel', () => {
    let operator: ServerDataOperator;
    const serverUrl = 'baseHandler.test.com';
    const channelId = 'id1';
    const teamId = 'tId1';
    const channel: Channel = {
        id: channelId,
        team_id: teamId,
        total_msg_count: 0,
        delete_at: 0,
    } as Channel;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('handle not found database', async () => {
        const {model, error} = await updateChannelInfoFromChannel('foo', channel, false);
        expect(model).toBeUndefined();
        expect(error).toBeTruthy();
    });

    it('update channel info from channel', async () => {
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});

        const {model, error} = await updateChannelInfoFromChannel(serverUrl, {...channel, header: 'newheader'}, false);
        expect(error).toBeUndefined();
        expect(model).toBeDefined();
        expect(model?.length).toBe(1);
        expect(model![0].header).toBe('newheader');
    });
});

describe('updateLastPostAt', () => {
    let operator: ServerDataOperator;
    const serverUrl = 'baseHandler.test.com';
    const channelId = 'id1';
    const teamId = 'tId1';
    const channel: Channel = {
        id: channelId,
        team_id: teamId,
        total_msg_count: 0,
        delete_at: 0,
    } as Channel;
    const channelMember: ChannelMembership = {
        id: 'id',
        user_id: 'userid',
        channel_id: channelId,
        msg_count: 0,
        roles: '',
    } as ChannelMembership;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('handle not found database', async () => {
        const {member, error} = await updateLastPostAt('foo', channelId, 123, false);
        expect(member).toBeUndefined();
        expect(error).toBeTruthy();
    });

    it('handle no member', async () => {
        const {member, error} = await updateLastPostAt(serverUrl, channelId, 123, false);
        expect(error).toBeDefined();
        expect(error).toBe('not a member');
        expect(member).toBeUndefined();
    });

    it('update last post at', async () => {
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [channel], myChannels: [channelMember], prepareRecordsOnly: false});

        const {member, error} = await updateLastPostAt(serverUrl, channelId, 123, false);
        expect(error).toBeUndefined();
        expect(member).toBeDefined();
        expect(member?.lastPostAt).toBe(123);
    });
});

describe('updateChannelsDisplayName', () => {
    let operator: ServerDataOperator;
    const serverUrl = 'baseHandler.test.com';
    const channelId = 'id1';
    const dmChannel: Channel = {
        id: channelId,
        name: 'userid__userid2',
        display_name: '',
        team_id: '',
        total_msg_count: 0,
        delete_at: 0,
        type: 'D',
    } as Channel;
    const dmChannelMember: ChannelMembership = {
        id: 'id',
        user_id: 'userid',
        channel_id: dmChannel.id,
        msg_count: 0,
        roles: '',
    } as ChannelMembership;
    const gmChannel: Channel = {
        id: 'id2',
        name: 'name',
        display_name: '',
        team_id: '',
        total_msg_count: 0,
        delete_at: 0,
        type: 'G',
    } as Channel;
    const gmChannelMember: ChannelMembership = {
        id: 'id',
        user_id: 'userid',
        channel_id: gmChannel.id,
        msg_count: 0,
        roles: '',
    } as ChannelMembership;
    const user: UserProfile = {
        id: 'userid',
        username: 'username',
        roles: '',
    } as UserProfile;
    const user2: UserProfile = {
        id: 'userid2',
        username: 'username2',
        first_name: 'first',
        last_name: 'last',
        roles: '',
    } as UserProfile;
    const user3: UserProfile = {
        id: 'userid3',
        username: 'username3',
        first_name: 'first',
        last_name: 'last',
        roles: '',
    } as UserProfile;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('handle not found database', async () => {
        const {models, error} = await updateChannelsDisplayName('foo', [], [], false);
        expect(models).toBeUndefined();
        expect(error).toBeTruthy();
    });

    it('handle no currnet user', async () => {
        const {models, error} = await updateChannelsDisplayName(serverUrl, [], [], false);
        expect(models).toBeUndefined();
        expect(error).toBeUndefined();
    });

    it('update channels display name', async () => {
        const channelModels = await operator.handleChannel({channels: [dmChannel, gmChannel], prepareRecordsOnly: false});
        await operator.handleUsers({users: [user, user2, user3], prepareRecordsOnly: false});
        await operator.handleChannelMembership({channelMemberships: [{...gmChannelMember, user_id: user2.id}, {...gmChannelMember, user_id: user3.id}], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [dmChannel, gmChannel], myChannels: [dmChannelMember, gmChannelMember], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}], prepareRecordsOnly: false});

        const {models, error} = await updateChannelsDisplayName(serverUrl, channelModels, [user, user2], false);
        expect(error).toBeUndefined();
        expect(models).toBeDefined();
        expect(models?.length).toBe(2);
        expect((models![0] as ChannelModel).displayName).toBe(user2.username);
        expect((models![1] as ChannelModel).displayName).toBe(`${user2.username}, ${user3.username}`);
    });
});

describe('showUnreadChannelsOnly', () => {
    let operator: ServerDataOperator;
    const serverUrl = 'baseHandler.test.com';
    const channelId = 'id1';
    const teamId = 'tId1';
    const channel: Channel = {
        id: channelId,
        team_id: teamId,
        total_msg_count: 0,
        delete_at: 0,
    } as Channel;
    const channelMember: ChannelMembership = {
        id: 'id',
        user_id: 'userid',
        channel_id: channelId,
        msg_count: 0,
        roles: '',
    } as ChannelMembership;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('handle not found database', async () => {
        const result = await showUnreadChannelsOnly('foo', true);
        expect((result as { error: unknown}).error).toBeTruthy();
    });

    it('show unread channels only', async () => {
        await operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [channel], myChannels: [channelMember], prepareRecordsOnly: false});

        const result = await showUnreadChannelsOnly(serverUrl, true);
        expect((result as { error: unknown}).error).toBeUndefined();
        const models = (result as SystemModel[]);
        expect(models).toBeDefined();
        expect(models?.length).toBe(1);
        expect(models![0].id).toBe(SYSTEM_IDENTIFIERS.ONLY_UNREADS);
        expect(models![0].value).toBe(true);
    });
});

describe('updateDmGmDisplayName', () => {
    let operator: ServerDataOperator;
    const serverUrl = 'baseHandler.test.com';
    const channelId = 'id1';
    const dmChannel: Channel = {
        id: channelId,
        name: 'userid__userid2',
        display_name: '',
        team_id: '',
        total_msg_count: 0,
        delete_at: 0,
        type: 'D',
    } as Channel;
    const dmChannelMember: ChannelMembership = {
        id: 'id',
        user_id: 'userid',
        channel_id: dmChannel.id,
        msg_count: 0,
        roles: '',
    } as ChannelMembership;
    const gmChannel: Channel = {
        id: 'id2',
        name: 'name',
        display_name: '',
        team_id: '',
        total_msg_count: 0,
        delete_at: 0,
        type: 'G',
    } as Channel;
    const gmChannelMember: ChannelMembership = {
        id: 'id',
        user_id: 'userid',
        channel_id: gmChannel.id,
        msg_count: 0,
        roles: '',
    } as ChannelMembership;
    const user: UserProfile = {
        id: 'userid',
        username: 'username',
        roles: '',
    } as UserProfile;
    const user2: UserProfile = {
        id: 'userid2',
        username: 'username2',
        first_name: 'first',
        last_name: 'last',
        roles: '',
    } as UserProfile;
    const user3: UserProfile = {
        id: 'userid3',
        username: 'username3',
        first_name: 'first',
        last_name: 'last',
        roles: '',
    } as UserProfile;

    beforeEach(async () => {
        await DatabaseManager.init([serverUrl]);
        operator = DatabaseManager.serverDatabases[serverUrl]!.operator;
    });

    afterEach(async () => {
        await DatabaseManager.destroyServerDatabase(serverUrl);
    });

    it('handle not found database', async () => {
        const {channels, error} = await updateDmGmDisplayName('foo');
        expect(channels).toBeUndefined();
        expect(error).toBeTruthy();
    });

    it('handle no currnet user', async () => {
        const {channels, error} = await updateDmGmDisplayName(serverUrl);
        expect(channels).toBeUndefined();
        expect(error).toBeDefined();
        expect(error).toBe('The current user id could not be retrieved from the database');
    });

    it('update dm gm display name', async () => {
        await operator.handleChannel({channels: [dmChannel, gmChannel], prepareRecordsOnly: false});
        await operator.handleUsers({users: [user, user2, user3], prepareRecordsOnly: false});
        await operator.handleChannelMembership({channelMemberships: [gmChannelMember, dmChannelMember, {...gmChannelMember, user_id: user2.id}, {...gmChannelMember, user_id: user3.id}], prepareRecordsOnly: false});
        await operator.handleMyChannel({channels: [dmChannel, gmChannel], myChannels: [dmChannelMember, gmChannelMember], prepareRecordsOnly: false});
        await operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.CURRENT_USER_ID, value: user.id}], prepareRecordsOnly: false});

        const {channels, error} = await updateDmGmDisplayName(serverUrl);
        expect(error).toBeUndefined();
        expect(channels).toBeDefined();
        expect(channels?.length).toBe(2);
        expect((channels![0] as ChannelModel).displayName).toBe(user2.username);
        expect((channels![1] as ChannelModel).displayName).toBe(`${user2.username}, ${user3.username}`);
    });
});
