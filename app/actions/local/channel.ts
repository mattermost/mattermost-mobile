// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {DeviceEventEmitter} from 'react-native';

import {General, Navigation as NavigationConstants, Preferences, Screens} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getTeammateNameDisplaySetting} from '@helpers/api/preference';
import {extractChannelDisplayName} from '@helpers/database';
import PushNotifications from '@init/push_notifications';
import {
    prepareDeleteChannel, prepareMyChannelsForTeam, queryAllMyChannel,
    getMyChannel, getChannelById, queryUsersOnChannel, queryUserChannelsByTypes,
} from '@queries/servers/channel';
import {queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {prepareCommonSystemValues, PrepareCommonSystemValuesArgs, getCommonSystemValues, getCurrentTeamId, setCurrentChannelId, getCurrentUserId} from '@queries/servers/system';
import {addChannelToTeamHistory, addTeamToTeamHistory, getTeamById, removeChannelFromTeamHistory} from '@queries/servers/team';
import {getCurrentUser, queryUsersById} from '@queries/servers/user';
import {dismissAllModalsAndPopToRoot, dismissAllModalsAndPopToScreen} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {isTablet} from '@utils/helpers';
import {setThemeDefaults, updateThemeIfNeeded} from '@utils/theme';
import {displayGroupMessageName, displayUsername, getUserIdFromChannelName} from '@utils/user';

import type ChannelModel from '@typings/database/models/servers/channel';
import type UserModel from '@typings/database/models/servers/user';

export async function switchToChannel(serverUrl: string, channelId: string, teamId?: string, skipLastUnread = false, prepareRecordsOnly = false) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const {database} = operator;
    let models: Model[] = [];
    try {
        const dt = Date.now();
        const isTabletDevice = await isTablet();
        const system = await getCommonSystemValues(database);
        const member = await getMyChannel(database, channelId);

        if (member) {
            const channel = await member.channel.fetch();
            if (channel) {
                if (!channel.teamId && teamId) {
                    const team = await getTeamById(database, teamId);
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

                const modelPromises: Array<Promise<Model[]>> = [];
                if (system.currentTeamId !== toTeamId) {
                    modelPromises.push(addTeamToTeamHistory(operator, toTeamId, true));
                }

                const commonValues: PrepareCommonSystemValuesArgs = {
                    lastUnreadChannelId: member.isUnread && !skipLastUnread ? channelId : '',
                };

                if ((system.currentTeamId !== toTeamId) || (system.currentChannelId !== channelId)) {
                    commonValues.currentChannelId = system.currentChannelId === channelId ? undefined : channelId;
                    commonValues.currentTeamId = system.currentTeamId === toTeamId ? undefined : toTeamId;
                }

                modelPromises.push(prepareCommonSystemValues(operator, commonValues));

                if (system.currentChannelId !== channelId || system.currentTeamId !== toTeamId) {
                    modelPromises.push(addChannelToTeamHistory(operator, toTeamId, channelId, true));
                }

                models = (await Promise.all(modelPromises)).flat();
                const {member: viewedAt} = await markChannelAsViewed(serverUrl, channelId, true);
                if (viewedAt) {
                    models.push(viewedAt);
                }

                if (models.length && !prepareRecordsOnly) {
                    await operator.batchRecords(models);
                }

                if (!EphemeralStore.theme) {
                    // When opening the app from a push notification the theme may not be set in the EphemeralStore
                    // causing the goToScreen to use the Appearance theme instead and that causes the screen background color to potentially
                    // not match the theme
                    const themes = await queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_THEME, toTeamId).fetch();
                    let theme = Preferences.THEMES.denim;
                    if (themes.length) {
                        theme = setThemeDefaults(JSON.parse(themes[0].value) as Theme);
                    }
                    updateThemeIfNeeded(theme, true);
                }

                if (isTabletDevice) {
                    dismissAllModalsAndPopToRoot();
                    DeviceEventEmitter.emit(NavigationConstants.NAVIGATION_HOME, Screens.CHANNEL);
                } else {
                    dismissAllModalsAndPopToScreen(Screens.CHANNEL, '', undefined, {topBar: {visible: false}});
                }

                console.log('channel switch to', channel?.displayName, channelId, (Date.now() - dt), 'ms'); //eslint-disable-line
            }
        }
    } catch (error) {
        return {error};
    }

    return {models};
}

export async function removeCurrentUserFromChannel(serverUrl: string, channelId: string, prepareRecordsOnly = false) {
    const serverDatabase = DatabaseManager.serverDatabases[serverUrl];
    if (!serverDatabase) {
        return {error: `${serverUrl} database not found`};
    }

    const {operator, database} = serverDatabase;

    const models: Model[] = [];
    const myChannel = await getMyChannel(database, channelId);
    if (myChannel) {
        const channel = await myChannel.channel.fetch();
        if (!channel) {
            return {error: 'myChannel present but no channel on the database'};
        }
        models.push(...await prepareDeleteChannel(channel));
        let teamId = channel.teamId;
        if (teamId) {
            teamId = await getCurrentTeamId(database);
        }

        // We update the history ASAP to avoid clashes with channel switch.
        await removeChannelFromTeamHistory(operator, teamId, channel.id, false);

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
}

export async function setChannelDeleteAt(serverUrl: string, channelId: string, deleteAt: number) {
    const serverDatabase = DatabaseManager.serverDatabases[serverUrl];
    if (!serverDatabase) {
        return;
    }

    const {operator, database} = serverDatabase;

    const channel = await getChannelById(database, channelId);
    if (!channel) {
        return;
    }

    const model = channel.prepareUpdate((c) => {
        c.deleteAt = deleteAt;
    });

    try {
        await operator.batchRecords([model]);
    } catch {
        // eslint-disable-next-line no-console
        console.log('FAILED TO BATCH CHANGES FOR CHANNEL DELETE AT');
    }
}

export async function selectAllMyChannelIds(serverUrl: string) {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return [];
    }

    return queryAllMyChannel(database).fetchIds();
}

export async function markChannelAsViewed(serverUrl: string, channelId: string, prepareRecordsOnly = false) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const member = await getMyChannel(operator.database, channelId);
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
        PushNotifications.cancelChannelNotifications(channelId);
        if (!prepareRecordsOnly) {
            await operator.batchRecords([member]);
        }

        return {member};
    } catch (error) {
        return {error};
    }
}

export async function markChannelAsUnread(serverUrl: string, channelId: string, messageCount: number, mentionsCount: number, lastViewed: number, prepareRecordsOnly = false) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const member = await getMyChannel(operator.database, channelId);
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
}

export async function resetMessageCount(serverUrl: string, channelId: string) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const member = await getMyChannel(operator.database, channelId);
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
}

export async function storeMyChannelsForTeam(serverUrl: string, teamId: string, channels: Channel[], memberships: ChannelMembership[], prepareRecordsOnly = false, isCRTEnabled?: boolean) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    const modelPromises: Array<Promise<Model[]>> = [
        ...await prepareMyChannelsForTeam(operator, teamId, channels, memberships, isCRTEnabled),
    ];

    const models = await Promise.all(modelPromises);
    if (!models.length) {
        return {models: []};
    }

    const flattenedModels = models.flat();

    if (prepareRecordsOnly) {
        return {models: flattenedModels};
    }

    if (flattenedModels.length) {
        try {
            await operator.batchRecords(flattenedModels);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.log('FAILED TO BATCH CHANNELS');
            return {error};
        }
    }

    return {models: flattenedModels};
}

export async function updateMyChannelFromWebsocket(serverUrl: string, channelMember: ChannelMembership, prepareRecordsOnly = false) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const member = await getMyChannel(operator.database, channelMember.channel_id);
    if (member) {
        member.prepareUpdate((m) => {
            m.roles = channelMember.roles;
        });
        if (!prepareRecordsOnly) {
            operator.batchRecords([member]);
        }
    }
    return {model: member};
}

export async function updateChannelInfoFromChannel(serverUrl: string, channel: Channel, prepareRecordsOnly = false) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const newInfo = await operator.handleChannelInfo({channelInfos: [{
        header: channel.header,
        purpose: channel.purpose,
        id: channel.id,
    }],
    prepareRecordsOnly: true});
    if (!prepareRecordsOnly) {
        operator.batchRecords(newInfo);
    }
    return {model: newInfo};
}

export async function updateLastPostAt(serverUrl: string, channelId: string, lastPostAt: number, prepareRecordsOnly = false) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const member = await getMyChannel(operator.database, channelId);
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

        return {member};
    }

    return {member: undefined};
}

type User = UserProfile | UserModel;
export async function updateChannelsDisplayName(serverUrl: string, channels: ChannelModel[], users: User[], prepareRecordsOnly = false) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {};
    }

    const {database} = operator;
    const currentUser = await getCurrentUser(database);
    if (!currentUser) {
        return {};
    }

    const {config, license} = await getCommonSystemValues(database);
    const preferences = await queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.NAME_NAME_FORMAT).fetch();
    const displaySettings = getTeammateNameDisplaySetting(preferences, config, license);
    const models: Model[] = [];
    for await (const channel of channels) {
        let newDisplayName = '';
        if (channel.type === General.DM_CHANNEL) {
            const otherUserId = getUserIdFromChannelName(currentUser.id, channel.name);
            const user = users.find((u) => u.id === otherUserId);
            newDisplayName = displayUsername(user, currentUser.locale, displaySettings, false);
        } else {
            const dbProfiles = await queryUsersOnChannel(database, channel.id).fetch();
            const profileIds = new Set(dbProfiles.map((p) => p.id));
            const gmUsers = users.filter((u) => profileIds.has(u.id));
            if (gmUsers.length) {
                const uIds = new Set(gmUsers.map((u) => u.id));
                const newProfiles: Array<UserModel|UserProfile> = dbProfiles.filter((u) => !uIds.has(u.id));
                newProfiles.push(...gmUsers);
                newDisplayName = displayGroupMessageName(newProfiles, currentUser.locale, displaySettings, currentUser.id);
            }
        }

        if (newDisplayName && channel.displayName !== newDisplayName) {
            channel.prepareUpdate((c) => {
                c.displayName = extractChannelDisplayName({
                    type: c.type,
                    display_name: newDisplayName,
                    fake: true,
                }, c);
            });
            models.push(channel);
        }
    }

    if (models.length && !prepareRecordsOnly) {
        await operator.batchRecords(models);
    }

    return {models};
}

export async function showUnreadChannelsOnly(serverUrl: string, onlyUnreads: boolean) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    return operator.handleSystem({
        systems: [{
            id: SYSTEM_IDENTIFIERS.ONLY_UNREADS,
            value: JSON.stringify(onlyUnreads),
        }],
        prepareRecordsOnly: false,
    });
}

export const updateDmGmDisplayName = async (serverUrl: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const currentUserId = await getCurrentUserId(database);
        if (!currentUserId) {
            return {error: 'The current user id could not be retrieved from the database'};
        }

        const channels = await queryUserChannelsByTypes(database, currentUserId, ['G', 'D']).fetch();
        const userIds = channels.reduce((acc: string[], ch) => {
            if (ch.type !== General.DM_CHANNEL) {
                return acc;
            }
            const uid = getUserIdFromChannelName(currentUserId, ch.name);
            acc.push(uid);
            return acc;
        }, []);

        const users = await queryUsersById(database, userIds).fetch();

        await updateChannelsDisplayName(serverUrl, channels, users, false);

        return {channels};
    } catch (error) {
        return {error};
    }
};

