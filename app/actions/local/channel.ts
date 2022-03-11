// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model, Q} from '@nozbe/watermelondb';
import {DeviceEventEmitter} from 'react-native';

import {General, Navigation as NavigationConstants, Preferences, Screens} from '@constants';
import {MM_TABLES} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getTeammateNameDisplaySetting} from '@helpers/api/preference';
import {prepareDeleteChannel, prepareMyChannelsForTeam, queryAllMyChannelIds, queryChannelsById, queryMyChannel} from '@queries/servers/channel';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {prepareCommonSystemValues, PrepareCommonSystemValuesArgs, queryCommonSystemValues, queryCurrentTeamId, setCurrentChannelId} from '@queries/servers/system';
import {addChannelToTeamHistory, addTeamToTeamHistory, queryTeamById, removeChannelFromTeamHistory} from '@queries/servers/team';
import {queryCurrentUser} from '@queries/servers/user';
import {dismissAllModalsAndPopToRoot, dismissAllModalsAndPopToScreen} from '@screens/navigation';
import {isTablet} from '@utils/helpers';
import {displayGroupMessageName, displayUsername, getUserIdFromChannelName} from '@utils/user';

import type ChannelModel from '@typings/database/models/servers/channel';
import type UserModel from '@typings/database/models/servers/user';

const {SERVER: {CHANNEL_MEMBERSHIP, USER}} = MM_TABLES;

export const switchToChannel = async (serverUrl: string, channelId: string, teamId?: string, prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const {database} = operator;
    const models: Model[] = [];
    try {
        const dt = Date.now();
        const isTabletDevice = await isTablet();
        const system = await queryCommonSystemValues(database);
        const member = await queryMyChannel(database, channelId);

        if (member) {
            const channel: ChannelModel = await member.channel.fetch();
            if (!channel.teamId && teamId) {
                const team = await queryTeamById(database, teamId);
                if (!team) {
                    return {error: `team with id ${teamId} not found`};
                }
            }
            const toTeamId = channel.teamId || teamId || system.currentTeamId;

            if (isTabletDevice && system.currentChannelId !== channelId) {
                // On tablet, the channel is being rendered, by setting the channel to empty first we speed up
                // the switch by ~3x
                await setCurrentChannelId(operator, '');
            }

            if (system.currentTeamId !== toTeamId) {
                const history = await addTeamToTeamHistory(operator, toTeamId, true);
                models.push(...history);
            }

            if ((system.currentTeamId !== toTeamId) || (system.currentChannelId !== channelId)) {
                const commonValues: PrepareCommonSystemValuesArgs = {
                    currentChannelId: system.currentChannelId === channelId ? undefined : channelId,
                    currentTeamId: system.currentTeamId === toTeamId ? undefined : toTeamId,
                };
                const common = await prepareCommonSystemValues(operator, commonValues);
                if (common) {
                    models.push(...common);
                }
            }

            if (system.currentChannelId !== channelId || system.currentTeamId !== toTeamId) {
                const history = await addChannelToTeamHistory(operator, toTeamId, channelId, true);
                models.push(...history);
            }

            const {member: viewedAt} = await markChannelAsViewed(serverUrl, channelId, true);
            if (viewedAt) {
                models.push(viewedAt);
            }

            if (models.length && !prepareRecordsOnly) {
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

    return {models};
};

export const removeCurrentUserFromChannel = async (serverUrl: string, channelId: string, prepareRecordsOnly = false) => {
    const serverDatabase = DatabaseManager.serverDatabases[serverUrl];
    if (!serverDatabase) {
        return {error: `${serverUrl} database not found`};
    }

    const {operator, database} = serverDatabase;

    const models: Model[] = [];
    const myChannel = await queryMyChannel(database, channelId);
    if (myChannel) {
        const channel = await myChannel.channel.fetch() as ChannelModel;
        models.push(...await prepareDeleteChannel(channel));
        let teamId = channel.teamId;
        if (teamId) {
            teamId = await queryCurrentTeamId(database);
        }
        const system = await removeChannelFromTeamHistory(operator, teamId, channel.id, true);
        if (system) {
            models.push(...system);
        }
        if (models.length && !prepareRecordsOnly) {
            try {
                await operator.batchRecords(models);
            } catch {
                // eslint-disable-next-line no-console
                console.log('FAILED TO BATCH CHANGES FOR REMOVE USER FROM CHANNEL');
            }
        }
    }
    return {models};
};

export const setChannelDeleteAt = async (serverUrl: string, channelId: string, deleteAt: number) => {
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
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const member = await queryMyChannel(operator.database, channelId);
    if (!member) {
        return {error: 'not a member'};
    }

    member.prepareUpdate((m) => {
        m.isUnread = false;
        m.mentionsCount = 0;
        m.manuallyUnread = false;
        m.viewedAt = member.lastViewedAt;
        m.lastViewedAt = Date.now();
    });

    try {
        if (!prepareRecordsOnly) {
            await operator.batchRecords([member]);
        }

        return {member};
    } catch (error) {
        return {error};
    }
};

export const markChannelAsUnread = async (serverUrl: string, channelId: string, messageCount: number, mentionsCount: number, lastViewed: number, prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const member = await queryMyChannel(operator.database, channelId);
    if (!member) {
        return {error: 'not a member'};
    }

    member.prepareUpdate((m) => {
        m.viewedAt = lastViewed - 1;
        m.lastViewedAt = lastViewed;
        m.messageCount = messageCount;
        m.mentionsCount = mentionsCount;
        m.manuallyUnread = true;
        m.isUnread = true;
    });

    try {
        if (!prepareRecordsOnly) {
            await operator.batchRecords([member]);
        }

        return {member};
    } catch (error) {
        return {error};
    }
};

export const resetMessageCount = async (serverUrl: string, channelId: string) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const member = await queryMyChannel(operator.database, channelId);
    if (!member) {
        return {error: 'not a member'};
    }

    try {
        member.prepareUpdate((m) => {
            m.messageCount = 0;
        });
        await operator.batchRecords([member]);

        return member;
    } catch (error) {
        return {error};
    }
};

export const storeMyChannelsForTeam = async (serverUrl: string, teamId: string, channels: Channel[], memberships: ChannelMembership[], prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    const modelPromises: Array<Promise<Model[]>> = [];
    const prepare = await prepareMyChannelsForTeam(operator, teamId, channels, memberships);
    if (prepare) {
        modelPromises.push(...prepare);
    }

    const models = await Promise.all(modelPromises);
    const flattenedModels = models.flat() as Model[];

    if (prepareRecordsOnly) {
        return {models: flattenedModels};
    }

    if (flattenedModels?.length > 0) {
        try {
            await operator.batchRecords(flattenedModels);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.log('FAILED TO BATCH CHANNELS');
            return {error};
        }
    }

    return {models: flattenedModels};
};

export const updateLastPostAt = async (serverUrl: string, channelId: string, lastPostAt: number, prepareRecordsOnly = false) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const member = await queryMyChannel(operator.database, channelId);
    if (!member) {
        return {error: 'not a member'};
    }

    if (lastPostAt > member.lastPostAt) {
        member.prepareUpdate((m) => {
            m.lastPostAt = lastPostAt;
        });

        try {
            if (!prepareRecordsOnly) {
                await operator.batchRecords([member]);
            }
        } catch (error) {
            return {error};
        }
    }

    return {member: undefined};
};

export async function updateChannelsDisplayName(serverUrl: string, channels: ChannelModel[], users: UserProfile[], prepareRecordsOnly = false) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {};
    }

    const {database} = operator;
    const currentUser = await queryCurrentUser(database);
    if (!currentUser) {
        return {};
    }

    const {config, license} = await queryCommonSystemValues(database);
    const preferences = await queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.NAME_NAME_FORMAT);
    const displaySettings = getTeammateNameDisplaySetting(preferences, config, license);
    const models: Model[] = [];
    for await (const channel of channels) {
        let newDisplayName = '';
        if (channel.type === General.DM_CHANNEL) {
            const otherUserId = getUserIdFromChannelName(currentUser.id, channel.name);
            const user = users.find((u) => u.id === otherUserId);
            newDisplayName = displayUsername(user, currentUser.locale, displaySettings);
        } else {
            const dbProfiles = await database.get<UserModel>(USER).query(Q.on(CHANNEL_MEMBERSHIP, Q.where('channel_id', channel.id))).fetch();
            const profileIds = dbProfiles.map((p) => p.id);
            const gmUsers = users.filter((u) => profileIds.includes(u.id));
            if (gmUsers.length) {
                const uIds = gmUsers.map((u) => u.id);
                const newProfiles: Array<UserModel|UserProfile> = dbProfiles.filter((u) => !uIds.includes(u.id));
                newProfiles.push(...gmUsers);
                newDisplayName = displayGroupMessageName(newProfiles, currentUser.locale, displaySettings, currentUser.id);
            }
        }

        if (channel.displayName !== newDisplayName) {
            channel.prepareUpdate((c) => {
                c.displayName = newDisplayName;
            });
            models.push(channel);
        }
    }

    if (models.length && !prepareRecordsOnly) {
        await operator.batchRecords(models);
    }

    return {models};
}
