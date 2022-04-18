// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {DeviceEventEmitter} from 'react-native';

import {
    addChannelToDefaultCategory,
    markChannelAsViewed,
    removeCurrentUserFromChannel,
    setChannelDeleteAt,
    storeMyChannelsForTeam,
    switchToChannel,
    updateChannelInfoFromChannel,
    updateMyChannelFromWebsocket} from '@actions/local/channel';
import {fetchMissingSidebarInfo, fetchMyChannel, fetchChannelStats, fetchChannelById} from '@actions/remote/channel';
import {fetchPostsForChannel} from '@actions/remote/post';
import {fetchRolesIfNeeded} from '@actions/remote/role';
import {fetchUsersByIds, updateUsersNoLongerVisible} from '@actions/remote/user';
import Events from '@constants/events';
import DatabaseManager from '@database/manager';
import {queryActiveServer} from '@queries/app/servers';
import {deleteChannelMembership, getChannelById, prepareMyChannelsForTeam, getCurrentChannel} from '@queries/servers/channel';
import {prepareCommonSystemValues, getConfig, setCurrentChannelId, getCurrentChannelId} from '@queries/servers/system';
import {getNthLastChannelFromTeam} from '@queries/servers/team';
import {getCurrentUser, getTeammateNameDisplay, getUserById} from '@queries/servers/user';
import {dismissAllModals, popToRoot} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {isTablet} from '@utils/helpers';

// Received when current user created a channel in a different client
export async function handleChannelCreatedEvent(serverUrl: string, msg: any) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }
    const {database} = operator;

    const {team_id: teamId, channel_id: channelId} = msg.data;
    if (EphemeralStore.creatingChannel) {
        return; // We probably don't need to handle this WS because we provoked it
    }

    try {
        const channel = await getChannelById(database, channelId);
        if (channel) {
            return; // We already have this channel
        }

        const models: Model[] = [];
        const {channels, memberships} = await fetchMyChannel(serverUrl, teamId, channelId, true);
        if (channels && memberships) {
            const prepare = await prepareMyChannelsForTeam(operator, teamId, channels, memberships);
            if (prepare.length) {
                const prepareModels = await Promise.all(prepare);
                const flattenedModels = prepareModels.flat();
                if (flattenedModels?.length > 0) {
                    models.push(...flattenedModels);
                }
                const categoryModels = await addChannelToDefaultCategory(serverUrl, channels[0], true);
                if (categoryModels.models?.length) {
                    models.push(...categoryModels.models);
                }
            }
        }
        operator.batchRecords(models);
    } catch {
        // do nothing
    }
}

export async function handleChannelUnarchiveEvent(serverUrl: string, msg: any) {
    try {
        await setChannelDeleteAt(serverUrl, msg.data.channel_id, 0);
    } catch {
        // do nothing
    }
}

export async function handleChannelConvertedEvent(serverUrl: string, msg: any) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }

    try {
        const channelId = msg.data.channel_id;
        const {channel} = await fetchChannelById(serverUrl, channelId);
        if (channel) {
            operator.handleChannel({channels: [channel], prepareRecordsOnly: false});
        }
    } catch {
        // do nothing
    }
}

export async function handleChannelUpdatedEvent(serverUrl: string, msg: any) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }

    const updatedChannel = JSON.parse(msg.data.channel);
    try {
        const models: Model[] = await operator.handleChannel({channels: [updatedChannel], prepareRecordsOnly: true});
        const infoModel = await updateChannelInfoFromChannel(serverUrl, updatedChannel, true);
        if (infoModel.model) {
            models.push(...infoModel.model);
        }
        operator.batchRecords(models);
    } catch {
        // Do nothing
    }
}

export async function handleChannelViewedEvent(serverUrl: string, msg: any) {
    try {
        const database = DatabaseManager.serverDatabases[serverUrl]?.database;
        if (!database) {
            return;
        }

        const {channel_id: channelId} = msg.data;

        const activeServerUrl = await DatabaseManager.getActiveServerUrl();
        const currentChannelId = await getCurrentChannelId(database);

        if (activeServerUrl !== serverUrl || currentChannelId !== channelId) {
            await markChannelAsViewed(serverUrl, channelId, false);
        }
    } catch {
        // do nothing
    }
}

// This event is triggered by changes in the notify props or in the roles.
export async function handleChannelMemberUpdatedEvent(serverUrl: string, msg: any) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }

    try {
        const models: Model[] = [];

        const updatedChannelMember: ChannelMembership = JSON.parse(msg.data.channelMember);
        updatedChannelMember.id = updatedChannelMember.channel_id;

        const myMemberModel = await updateMyChannelFromWebsocket(serverUrl, updatedChannelMember, true);
        if (myMemberModel.model) {
            models.push(myMemberModel.model);
        }
        models.push(...await operator.handleMyChannelSettings({
            settings: [updatedChannelMember],
            prepareRecordsOnly: true,
        }));
        const rolesRequest = await fetchRolesIfNeeded(serverUrl, updatedChannelMember.roles.split(','), true);
        if (rolesRequest.roles?.length) {
            models.push(...await operator.handleRole({roles: rolesRequest.roles, prepareRecordsOnly: true}));
        }
        operator.batchRecords(models);
    } catch {
        // do nothing
    }
}

export async function handleDirectAddedEvent(serverUrl: string, msg: WebSocketMessage) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }

    const {database} = operator;

    if (EphemeralStore.creatingDMorGMTeammates.length) {
        let userList: string[] | undefined;
        if ('teammate_ids' in msg.data) { // GM
            try {
                userList = JSON.parse(msg.data.teammate_ids);
            } catch {
                // Do nothing
            }
        } else if (msg.data.teammate_id) { // DM
            userList = [msg.data.teammate_id];
        }
        if (userList?.length === EphemeralStore.creatingDMorGMTeammates.length) {
            const usersSet = new Set(userList);
            if (EphemeralStore.creatingDMorGMTeammates.every((v) => usersSet.has(v))) {
                return; // We are adding this channel
            }
        }
    }

    try {
        const {channel_id: channelId} = msg.broadcast;
        const channel = await getChannelById(database, channelId);
        if (channel) {
            return; // We already have this channel
        }
        const {channels, memberships} = await fetchMyChannel(serverUrl, '', channelId, true);
        if (!channels || !memberships) {
            return;
        }
        const user = await getCurrentUser(database);
        if (!user) {
            return;
        }

        const teammateDisplayNameSetting = await getTeammateNameDisplay(database);

        const {directChannels, users} = await fetchMissingSidebarInfo(serverUrl, channels, user.locale, teammateDisplayNameSetting, user.id, true);
        if (!directChannels?.[0]) {
            return;
        }

        const models: Model[] = [];
        const channelModels = await storeMyChannelsForTeam(serverUrl, '', directChannels, memberships, true);
        if (channelModels.models?.length) {
            models.push(...channelModels.models);
        }
        const categoryModels = await addChannelToDefaultCategory(serverUrl, channels[0], true);
        if (categoryModels.models?.length) {
            models.push(...categoryModels.models);
        }

        if (users.length) {
            const userModels = await operator.handleUsers({users, prepareRecordsOnly: true});
            models.push(...userModels);
        }

        operator.batchRecords(models);
    } catch {
        // do nothing
    }
}

export async function handleUserAddedToChannelEvent(serverUrl: string, msg: any) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }

    const {database} = operator;

    const currentUser = await getCurrentUser(database);
    const userId = msg.data.user_id || msg.broadcast.userId;
    const channelId = msg.data.channel_id || msg.broadcast.channel_id;
    const {team_id: teamId} = msg.data;
    const models: Model[] = [];

    try {
        if (userId === currentUser?.id) {
            const {channels, memberships} = await fetchMyChannel(serverUrl, teamId, channelId, true);
            if (channels && memberships) {
                const prepare = await prepareMyChannelsForTeam(operator, teamId, channels, memberships);
                if (prepare.length) {
                    const prepareModels = await Promise.all(prepare);
                    const flattenedModels = prepareModels.flat();
                    if (flattenedModels?.length > 0) {
                        await operator.batchRecords(flattenedModels);
                    }
                }

                const categoriesModels = await addChannelToDefaultCategory(serverUrl, channels[0], true);
                if (categoriesModels.models?.length) {
                    models.push(...categoriesModels.models);
                }
            }

            const {posts, order, authors, actionType, previousPostId} = await fetchPostsForChannel(serverUrl, channelId, true);
            if (actionType) {
                models.push(...await operator.handlePosts({
                    actionType,
                    order,
                    posts,
                    previousPostId,
                    prepareRecordsOnly: true,
                }));
            }

            if (authors?.length) {
                models.push(...await operator.handleUsers({users: authors, prepareRecordsOnly: true}));
            }
        } else {
            const addedUser = getUserById(database, userId);
            if (!addedUser) {
                // TODO Potential improvement https://mattermost.atlassian.net/browse/MM-40581
                const {users} = await fetchUsersByIds(serverUrl, [userId], true);
                models.push(...await operator.handleUsers({users, prepareRecordsOnly: true}));
            }
            const channel = await getChannelById(database, channelId);
            if (channel) {
                models.push(...await operator.handleChannelMembership({
                    channelMemberships: [{channel_id: channelId, user_id: userId}],
                    prepareRecordsOnly: true,
                }));
            }
        }
        await operator.batchRecords(models);

        await fetchChannelStats(serverUrl, channelId, false);
    } catch {
        // Do nothing
    }
}

export async function handleUserRemovedFromChannelEvent(serverUrl: string, msg: any) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }

    const {database} = operator;

    const channel = await getCurrentChannel(database);
    const user = await getCurrentUser(database);
    if (!user) {
        return;
    }

    // Depending on who was removed, the ids may come from one place dataset or the other.
    const userId = msg.data.user_id || msg.broadcast.user_id;
    const channelId = msg.data.channel_id || msg.broadcast.channel_id;

    const models: Model[] = [];

    if (user.isGuest) {
        const {models: updateVisibleModels} = await updateUsersNoLongerVisible(serverUrl, true);
        if (updateVisibleModels) {
            models.push(...updateVisibleModels);
        }
    }

    if (user.id === userId) {
        const {models: removeUserModels} = await removeCurrentUserFromChannel(serverUrl, channelId, true);
        if (removeUserModels) {
            models.push(...removeUserModels);
        }

        if (channel && channel.id === channelId) {
            const currentServer = await queryActiveServer(DatabaseManager.appDatabase!.database);

            if (currentServer?.url === serverUrl) {
                DeviceEventEmitter.emit(Events.LEAVE_CHANNEL);
                await dismissAllModals();
                await popToRoot();

                if (await isTablet()) {
                    const channelToJumpTo = await getNthLastChannelFromTeam(database, channel?.teamId);
                    if (channelToJumpTo) {
                        const {models: switchChannelModels} = await switchToChannel(serverUrl, channelToJumpTo, '', true);
                        if (switchChannelModels) {
                            models.push(...switchChannelModels);
                        }
                    } // TODO else jump to "join a channel" screen https://mattermost.atlassian.net/browse/MM-41051
                } else {
                    const currentChannelModels = await prepareCommonSystemValues(operator, {currentChannelId: ''});
                    if (currentChannelModels?.length) {
                        models.push(...currentChannelModels);
                    }
                }
            }
        }
    } else {
        const {models: deleteMemberModels} = await deleteChannelMembership(operator, userId, channelId, true);
        if (deleteMemberModels) {
            models.push(...deleteMemberModels);
        }
    }

    await fetchChannelStats(serverUrl, channelId, false);
    operator.batchRecords(models);
}

export async function handleChannelDeletedEvent(serverUrl: string, msg: WebSocketMessage) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }

    const {database} = operator;

    const currentChannel = await getCurrentChannel(database);
    const user = await getCurrentUser(database);
    if (!user) {
        return;
    }

    const {channel_id: channelId, delete_at: deleteAt} = msg.data;

    const config = await getConfig(database);

    await setChannelDeleteAt(serverUrl, channelId, deleteAt);

    if (user.isGuest) {
        updateUsersNoLongerVisible(serverUrl);
    }

    if (config?.ExperimentalViewArchivedChannels !== 'true') {
        removeCurrentUserFromChannel(serverUrl, channelId);

        if (currentChannel && currentChannel.id === channelId) {
            const currentServer = await queryActiveServer(DatabaseManager.appDatabase!.database);

            if (currentServer?.url === serverUrl) {
                DeviceEventEmitter.emit(Events.CHANNEL_DELETED);
                await dismissAllModals();
                await popToRoot();

                if (await isTablet()) {
                    const channelToJumpTo = await getNthLastChannelFromTeam(database, currentChannel?.teamId);
                    if (channelToJumpTo) {
                        switchToChannel(serverUrl, channelToJumpTo);
                    } // TODO else jump to "join a channel" screen
                } else {
                    setCurrentChannelId(operator, '');
                }
            }
        }
    }
}
