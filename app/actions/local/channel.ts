// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {DeviceEventEmitter} from 'react-native';

import {Navigation as NavigationConstants, Screens} from '@constants';
import DatabaseManager from '@database/manager';
import {prepareDeleteChannel, queryAllMyChannelIds, queryChannelsById, queryMyChannel} from '@queries/servers/channel';
import {prepareCommonSystemValues, PrepareCommonSystemValuesArgs, queryCommonSystemValues, queryCurrentTeamId} from '@queries/servers/system';
import {addChannelToTeamHistory, addTeamToTeamHistory, removeChannelFromTeamHistory} from '@queries/servers/team';
import {dismissAllModalsAndPopToRoot, dismissAllModalsAndPopToScreen} from '@screens/navigation';
import {isTablet} from '@utils/helpers';

import type ChannelModel from '@typings/database/models/servers/channel';

export const switchToChannel = async (serverUrl: string, channelId: string, teamId?: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const dt = Date.now();
        const isTabletDevice = await isTablet();
        const system = await queryCommonSystemValues(database);
        const member = await queryMyChannel(database, channelId);

        if (member) {
            const channel: ChannelModel = await member.channel.fetch();
            const {operator} = DatabaseManager.serverDatabases[serverUrl];
            const models = [];
            const commonValues: PrepareCommonSystemValuesArgs = {currentChannelId: channelId};

            if (teamId && system.currentTeamId !== teamId) {
                commonValues.currentTeamId = teamId;
                const history = await addTeamToTeamHistory(operator, teamId, true);
                models.push(...history);
            }

            const common = await prepareCommonSystemValues(operator, commonValues);
            if (common) {
                models.push(...common);
            }

            if (system.currentChannelId !== channelId) {
                const history = await addChannelToTeamHistory(operator, system.currentTeamId, channelId, true);
                models.push(...history);
            }

            const viewedAt = await markChannelAsViewed(serverUrl, channelId, true);
            if (viewedAt instanceof Model) {
                models.push(viewedAt);
            }

            if (models.length) {
                await operator.batchRecords(models);
            }

            if (isTabletDevice) {
                dismissAllModalsAndPopToRoot();
                DeviceEventEmitter.emit(NavigationConstants.NAVIGATION_HOME);
            } else {
                dismissAllModalsAndPopToScreen(Screens.CHANNEL, '', undefined, {topBar: {visible: false}});
            }

            console.log('channel switch to', channel?.displayName, channelId, (Date.now() - dt), 'ms'); //eslint-disable-line
        }
    } catch (error) {
        return {error};
    }

    return {error: undefined};
};

export const localRemoveUserFromChannel = async (serverUrl: string, channelId: string) => {
    const serverDatabase = DatabaseManager.serverDatabases[serverUrl];
    if (!serverDatabase) {
        return;
    }

    const {operator, database} = serverDatabase;

    const myChannel = await queryMyChannel(database, channelId);
    if (myChannel) {
        const channel = await myChannel.channel.fetch() as ChannelModel;
        const models = await prepareDeleteChannel(channel);
        let teamId = channel.teamId;
        if (teamId) {
            teamId = await queryCurrentTeamId(database);
        }
        const system = await removeChannelFromTeamHistory(operator, teamId, channel.id, true);
        if (system) {
            models.push(...system);
        }
        if (models.length) {
            try {
                await operator.batchRecords(models);
            } catch {
                // eslint-disable-next-line no-console
                console.log('FAILED TO BATCH CHANGES FOR REMOVE USER FROM CHANNEL');
            }
        }
    }
};

export const localSetChannelDeleteAt = async (serverUrl: string, channelId: string, deleteAt: number) => {
    const serverDatabase = DatabaseManager.serverDatabases[serverUrl];
    if (!serverDatabase) {
        return;
    }

    const {operator, database} = serverDatabase;

    const channels = await queryChannelsById(database, [channelId]);
    if (!channels?.length) {
        return;
    }

    const channel = channels[0];
    const model = channel.prepareUpdate((c) => {
        c.deleteAt = deleteAt;
    });

    try {
        await operator.batchRecords([model]);
    } catch {
        // eslint-disable-next-line no-console
        console.log('FAILED TO BATCH CHANGES FOR CHANNEL DELETE AT');
    }
};

export const selectAllMyChannelIds = async (serverUrl: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return [];
    }

    return queryAllMyChannelIds(database);
};

export const markChannelAsViewed = async (serverUrl: string, channelId: string, prepareRecordsOnly = false) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    const member = await queryMyChannel(database, channelId);
    if (!member) {
        return {error: 'not a member'};
    }

    member.prepareUpdate((m) => {
        m.messageCount = 0;
        m.mentionsCount = 0;
        m.manuallyUnread = false;
        m.viewedAt = member.lastViewedAt;
    });

    try {
        if (!prepareRecordsOnly) {
            const {operator} = DatabaseManager.serverDatabases[serverUrl];
            await operator.batchRecords([member]);
        }

        return member;
    } catch (error) {
        return {error};
    }
};
