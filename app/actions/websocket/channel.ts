// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {DeviceEventEmitter} from 'react-native';

import {localRemoveCurrentUserFromChannel, localSetChannelDeleteAt, switchToChannel} from '@actions/local/channel';
import {fetchChannelInfo, fetchMyChannel} from '@actions/remote/channel';
import {fetchUsersByIds, updateNewUsersVisible, updateUsersNoLongerVisible} from '@actions/remote/user';
import Events from '@constants/events';
import DatabaseManager from '@database/manager';
import {queryActiveServer} from '@queries/app/servers';
import {deleteChannelMembership, queryCurrentChannel} from '@queries/servers/channel';
import {queryCommonSystemValues, queryConfig, setCurrentChannelId} from '@queries/servers/system';
import {queryLastChannelFromTeam} from '@queries/servers/team';
import {queryCurrentUser, queryUserById} from '@queries/servers/user';
import {dismissAllModals, popToRoot} from '@screens/navigation';
import {isTablet} from '@utils/helpers';
import {isGuest} from '@utils/user';

export async function handleUserAddedEvent(serverUrl: string, msg: any) {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }
    const {currentChannelId, currentUserId} = await queryCommonSystemValues(database.database);
    const teamId = msg.data.team_id;
    const channelId = msg.data.channel_id;
    const userId = msg.data.user_id;

    const models: Model[] = [];

    try {
        // Handle new visible users for guests
        const addedUser = queryUserById(database.database, userId);
        if (!addedUser) {
            const {users} = await fetchUsersByIds(serverUrl, [userId], true);
            if (users) {
                models.push(...await database.operator.handleUsers({users, prepareRecordsOnly: true}));
            }
        }

        if (userId === currentUserId) {
            const {channels, memberships} = await fetchMyChannel(serverUrl, teamId, channelId, true);
            if (channels && memberships) {
                models.push(...await database.operator.handleMyChannel({channels, myChannels: memberships, prepareRecordsOnly: true}));
            }
            const {users} = await updateNewUsersVisible(serverUrl, true);
            if (users) {
                models.push(...await database.operator.handleUsers({users, prepareRecordsOnly: true}));
            }
        } else if (msg.broadcast.channel_id === currentChannelId) {
            const {channelInfo} = await fetchChannelInfo(serverUrl, channelId, true);
            if (channelInfo) {
                models.push(...await database.operator.handleChannelInfo({channelInfos: [channelInfo], prepareRecordsOnly: true}));
                models.push(...await database.operator.handleChannelMembership({channelMemberships: [{channel_id: channelId, user_id: userId}], prepareRecordsOnly: true}));
            }
        }
    } catch {
        // Do nothing
    }

    database.operator.batchRecords(models);
}

export async function handleUserRemovedEvent(serverUrl: string, msg: any) {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    const channel = await queryCurrentChannel(database.database);
    const user = await queryCurrentUser(database.database);
    if (!user) {
        return;
    }

    const userId = msg.data.user_id;
    const channelId = msg.data.channel_id;

    const models: Model[] = [];

    if (isGuest(user.roles)) {
        const {models: updateVisibleModels} = await updateUsersNoLongerVisible(serverUrl);
        if (updateVisibleModels) {
            models.push(...updateVisibleModels);
        }
    }

    if (user.id === userId) {
        const {models: removeUserModels} = await localRemoveCurrentUserFromChannel(serverUrl, channelId, true);
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
                    const channelToJumpTo = await queryLastChannelFromTeam(database.database, channel?.teamId);
                    if (channelToJumpTo) {
                        const {models: switchChannelModels} = await switchToChannel(serverUrl, channelToJumpTo);
                        if (switchChannelModels) {
                            models.push(...switchChannelModels);
                        }
                    } // TODO else jump to "join a channel" screen
                } else {
                    const {models: currentChannelModels} = await setCurrentChannelId(database.operator, '');
                    if (currentChannelModels) {
                        models.push(...currentChannelModels);
                    }
                }
            }
        }
    } else if (channelId === channel?.id) {
        const {models: deleteMemberModels} = await deleteChannelMembership(database.operator, userId, channelId, true);
        if (deleteMemberModels) {
            models.push(...deleteMemberModels);
        }
    }

    database.operator.batchRecords(models);
}

export async function handleChannelDeletedEvent(serverUrl: string, msg: any) {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    const currentChannel = await queryCurrentChannel(database.database);
    const user = await queryCurrentUser(database.database);
    if (!user) {
        return;
    }

    const config = await queryConfig(database.database);

    await localSetChannelDeleteAt(serverUrl, msg.data.channel_id, msg.data.delete_at);

    if (isGuest(user.roles)) {
        updateUsersNoLongerVisible(serverUrl);
    }

    if (config?.ExperimentalViewArchivedChannels !== 'true') {
        localRemoveCurrentUserFromChannel(serverUrl, msg.data.channel_id);

        if (currentChannel && currentChannel.id === msg.data.channel_id) {
            const currentServer = await queryActiveServer(DatabaseManager.appDatabase!.database);

            if (currentServer?.url === serverUrl) {
                DeviceEventEmitter.emit(Events.CHANNEL_DELETED);
                await dismissAllModals();
                await popToRoot();

                if (await isTablet()) {
                    const channelToJumpTo = await queryLastChannelFromTeam(database.database, currentChannel?.teamId);
                    if (channelToJumpTo) {
                        switchToChannel(serverUrl, channelToJumpTo);
                    } // TODO else jump to "join a channel" screen
                } else {
                    setCurrentChannelId(database.operator, '');
                }
            }
        }
    }
}
