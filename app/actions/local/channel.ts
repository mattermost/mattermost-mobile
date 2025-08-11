// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

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
    prepareAllMyChannels,
} from '@queries/servers/channel';
import {queryDisplayNamePreferences} from '@queries/servers/preference';
import {prepareCommonSystemValues, type PrepareCommonSystemValuesArgs, getCommonSystemValues, getCurrentTeamId, setCurrentChannelId, getCurrentUserId, getConfig, getLicense} from '@queries/servers/system';
import {addChannelToTeamHistory, addTeamToTeamHistory, getTeamById, removeChannelFromTeamHistory} from '@queries/servers/team';
import {getCurrentUser, queryUsersById} from '@queries/servers/user';
import {dismissAllModalsAndPopToRoot, dismissAllModalsAndPopToScreen} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {isTablet} from '@utils/helpers';
import {logError, logInfo} from '@utils/log';
import {displayGroupMessageName, displayUsername, getUserIdFromChannelName} from '@utils/user';

import type ServerDataOperator from '@database/operator/server_data_operator';
import type {Model} from '@nozbe/watermelondb';
import type ChannelModel from '@typings/database/models/servers/channel';
import type UserModel from '@typings/database/models/servers/user';

export async function switchToChannel(serverUrl: string, channelId: string, teamId?: string, skipLastUnread = false, prepareRecordsOnly = false) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        let models: Model[] = [];
        const dt = Date.now();
        const isTabletDevice = isTablet();
        const system = await getCommonSystemValues(database);
        const member = await getMyChannel(database, channelId);

        EphemeralStore.addSwitchingToChannel(channelId);

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
                const {member: viewedAt} = await markChannelAsViewed(serverUrl, channelId, false, true);
                if (viewedAt) {
                    models.push(viewedAt);
                }

                if (models.length && !prepareRecordsOnly) {
                    await operator.batchRecords(models, 'switchToChannel');
                }

                if (isTabletDevice) {
                    dismissAllModalsAndPopToRoot();
                    DeviceEventEmitter.emit(NavigationConstants.NAVIGATION_HOME, Screens.CHANNEL);
                } else {
                    dismissAllModalsAndPopToScreen(Screens.CHANNEL, '', undefined, {topBar: {visible: false}});
                }

                logInfo('channel switch to', channel?.displayName, channelId, (Date.now() - dt), 'ms');
            }
        }

        return {models};
    } catch (error) {
        logError('Failed to switch to channelId', channelId, 'teamId', teamId, 'error', error);
        return {error};
    }
}

export async function removeCurrentUserFromChannel(serverUrl: string, channelId: string, prepareRecordsOnly = false) {
    try {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const models: Model[] = [];
        const myChannel = await getMyChannel(database, channelId);
        if (myChannel) {
            const channel = await myChannel.channel.fetch();
            if (!channel) {
                throw new Error('myChannel present but no channel on the database');
            }
            models.push(...await prepareDeleteChannel(serverUrl, channel));
            let teamId = channel.teamId;
            if (teamId) {
                teamId = await getCurrentTeamId(database);
            }

            // We update the history ASAP to avoid clashes with channel switch.
            await removeChannelFromTeamHistory(operator, teamId, channel.id, false);

            if (models.length && !prepareRecordsOnly) {
                await operator.batchRecords(models, 'removeCurrentUserFromChannel');
            }
        }
        return {models};
    } catch (error) {
        logError('failed to removeCurrentUserFromChannel', error);
        return {error};
    }
}

export async function setChannelDeleteAt(serverUrl: string, channelId: string, deleteAt: number) {
    try {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const channel = await getChannelById(database, channelId);
        if (!channel) {
            return {error: `channel with id ${channelId} not found`};
        }

        const model = channel.prepareUpdate((c) => {
            c.deleteAt = deleteAt;
        });
        await operator.batchRecords([model], 'setChannelDeleteAt');
        return {models: [model]};
    } catch (error) {
        logError('FAILED TO BATCH CHANGES FOR CHANNEL DELETE AT', error);
        return {error};
    }
}

export async function selectAllMyChannelIds(serverUrl: string) {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        return queryAllMyChannel(database).fetchIds();
    } catch {
        return [];
    }
}

export async function markChannelAsViewed(serverUrl: string, channelId: string, onlyCounts = false, prepareRecordsOnly = false) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const member = await getMyChannel(database, channelId);
        if (!member) {
            return {error: 'not a member'};
        }

        member.prepareUpdate((m) => {
            m.isUnread = false;
            m.mentionsCount = 0;
            m.manuallyUnread = false;
            if (!onlyCounts) {
                m.viewedAt = member.lastViewedAt;
                m.lastViewedAt = Date.now();
            }
        });
        PushNotifications.removeChannelNotifications(serverUrl, channelId);
        if (!prepareRecordsOnly) {
            await operator.batchRecords([member], 'markChannelAsViewed');
        }

        return {member};
    } catch (error) {
        logError('Failed markChannelAsViewed', error);
        return {error};
    }
}

export async function markChannelAsUnread(serverUrl: string, channelId: string, messageCount: number, mentionsCount: number, lastViewed: number, prepareRecordsOnly = false) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const member = await getMyChannel(database, channelId);
        if (!member) {
            return {error: 'not a member'};
        }

        member.prepareUpdate((m) => {
            m.viewedAt = lastViewed - 1;
            m.lastViewedAt = lastViewed - 1;
            m.messageCount = messageCount;
            m.mentionsCount = mentionsCount;
            m.manuallyUnread = true;
            m.isUnread = true;
        });
        if (!prepareRecordsOnly) {
            await operator.batchRecords([member], 'markChannelAsUnread');
        }

        return {member};
    } catch (error) {
        logError('Failed markChannelAsUnread', error);
        return {error};
    }
}

export async function resetMessageCount(serverUrl: string, channelId: string) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const member = await getMyChannel(database, channelId);
        if (!member) {
            return {error: 'not a member'};
        }
        member.prepareUpdate((m) => {
            m.messageCount = 0;
        });
        await operator.batchRecords([member], 'resetMessageCount');

        return member;
    } catch (error) {
        logError('Failed resetMessageCount', error);
        return {error};
    }
}

const resolveAndFlattenModels = async (
    operator: ServerDataOperator,
    modelPromises: Array<Promise<Model[]>>,
    description: string,
    prepareRecordsOnly: boolean,
) => {
    try {
        const models = await Promise.all(modelPromises);
        const flattenedModels = models.flat();

        if (prepareRecordsOnly || !flattenedModels.length) {
            return {models: flattenedModels, error: undefined};
        }

        await operator.batchRecords(flattenedModels, description);
        return {models: flattenedModels, error: undefined};
    } catch (error) {
        logError('Failed resolveAndFlattenModels', {error, description});
        return {models: [], error};
    }
};

export async function storeAllMyChannels(serverUrl: string, channels: Channel[], memberships: ChannelMembership[], isCRTEnabled: boolean, prepareRecordsOnly = false) {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const cs = new Set(channels.map((c) => c.id));
        const modelPromises: Array<Promise<Model[]>> = [
            ...await prepareAllMyChannels(operator, channels, memberships.filter((m) => cs.has(m.channel_id)), isCRTEnabled),
        ];

        return resolveAndFlattenModels(operator, modelPromises, 'storeAllMyChannels', prepareRecordsOnly);
    } catch (error) {
        logError('Failed storeAllMyChannels', {error, serverUrl, channelsCount: channels.length});
        return {error, models: undefined};
    }
}

export async function storeMyChannelsForTeam(serverUrl: string, teamId: string, channels: Channel[], memberships: ChannelMembership[], prepareRecordsOnly = false, isCRTEnabled?: boolean) {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const modelPromises: Array<Promise<Model[]>> = [
            ...await prepareMyChannelsForTeam(operator, teamId, channels, memberships, isCRTEnabled),
        ];

        return resolveAndFlattenModels(operator, modelPromises, 'storeMyChannelsForTeam', prepareRecordsOnly);
    } catch (error) {
        logError('Failed storeMyChannelsForTeam', error);
        return {error, models: undefined};
    }
}

export async function updateMyChannelFromWebsocket(serverUrl: string, channelMember: ChannelMembership, prepareRecordsOnly = false) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const member = await getMyChannel(database, channelMember.channel_id);
        if (member) {
            member.prepareUpdate((m) => {
                m.roles = channelMember.roles;
            });
            if (!prepareRecordsOnly) {
                operator.batchRecords([member], 'updateMyChannelFromWebsocket');
            }
        }
        return {model: member};
    } catch (error) {
        logError('Failed updateMyChannelFromWebsocket', error);
        return {error};
    }
}

export async function updateChannelInfoFromChannel(serverUrl: string, channel: Channel, prepareRecordsOnly = false) {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const newInfo = await operator.handleChannelInfo({channelInfos: [{
            header: channel.header,
            purpose: channel.purpose,
            id: channel.id,
        }],
        prepareRecordsOnly: true});
        if (!prepareRecordsOnly) {
            operator.batchRecords(newInfo, 'updateChannelInfoFromChannel');
        }
        return {model: newInfo};
    } catch (error) {
        logError('Failed updateChannelInfoFromChannel', error);
        return {error};
    }
}

export async function updateLastPostAt(serverUrl: string, channelId: string, lastPostAt: number, prepareRecordsOnly = false) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const myChannel = await getMyChannel(database, channelId);
        if (!myChannel) {
            return {error: 'not a member'};
        }

        if (lastPostAt > myChannel.lastPostAt) {
            myChannel.resetPreparedState();
            myChannel.prepareUpdate((m) => {
                m.lastPostAt = lastPostAt;
            });

            if (!prepareRecordsOnly) {
                await operator.batchRecords([myChannel], 'updateLastPostAt');
            }

            return {member: myChannel};
        }

        return {member: undefined};
    } catch (error) {
        logError('Failed updateLastPostAt', error);
        return {error};
    }
}

export async function updateMyChannelLastFetchedAt(serverUrl: string, channelId: string, lastFetchedAt: number, prepareRecordsOnly = false) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const myChannel = await getMyChannel(database, channelId);
        if (!myChannel) {
            return {error: 'not a member'};
        }

        if (lastFetchedAt > myChannel.lastFetchedAt) {
            myChannel.resetPreparedState();
            myChannel.prepareUpdate((m) => {
                m.lastFetchedAt = lastFetchedAt;
            });

            if (!prepareRecordsOnly) {
                await operator.batchRecords([myChannel], 'updateMyChannelLastFetchedAt');
            }

            return {member: myChannel};
        }

        return {member: undefined};
    } catch (error) {
        logError('Failed updateLastFetchedAt', error);
        return {error};
    }
}

type User = UserProfile | UserModel;
export async function updateChannelsDisplayName(serverUrl: string, channels: ChannelModel[], users: User[], prepareRecordsOnly = false) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const currentUser = await getCurrentUser(database);
        if (!currentUser) {
            return {};
        }

        const license = await getLicense(database);
        const config = await getConfig(database);
        const preferences = await queryDisplayNamePreferences(database, Preferences.NAME_NAME_FORMAT).fetch();
        const displaySettings = getTeammateNameDisplaySetting(preferences, config.LockTeammateNameDisplay, config.TeammateNameDisplay, license);
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
            await operator.batchRecords(models, 'updateChannelsDisplayName');
        }

        return {models};
    } catch (error) {
        logError('Failed updateChannelsDisplayName', error);
        return {error};
    }
}

export async function showUnreadChannelsOnly(serverUrl: string, onlyUnreads: boolean) {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        return operator.handleSystem({
            systems: [{
                id: SYSTEM_IDENTIFIERS.ONLY_UNREADS,
                value: JSON.stringify(onlyUnreads),
            }],
            prepareRecordsOnly: false,
        });
    } catch (error) {
        logError('Failed showUnreadChannelsOnly', error);
        return {error};
    }
}

export const updateDmGmDisplayName = async (serverUrl: string) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
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
        logError('Failed updateDmGmDisplayName', error);
        return {error};
    }
};
