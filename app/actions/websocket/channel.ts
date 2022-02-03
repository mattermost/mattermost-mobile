// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';
import {DeviceEventEmitter} from 'react-native';

import {removeCurrentUserFromChannel, setChannelDeleteAt, switchToChannel} from '@actions/local/channel';
import {fetchMyChannel} from '@actions/remote/channel';
import {fetchPostsForChannel} from '@actions/remote/post';
import {fetchUsersByIds, updateUsersNoLongerVisible} from '@actions/remote/user';
import Events from '@constants/events';
import DatabaseManager from '@database/manager';
import {queryActiveServer} from '@queries/app/servers';
import {deleteChannelMembership, prepareMyChannelsForTeam, queryChannelsById, queryCurrentChannel} from '@queries/servers/channel';
import {prepareCommonSystemValues, queryConfig, setCurrentChannelId} from '@queries/servers/system';
import {queryNthLastChannelFromTeam} from '@queries/servers/team';
import {queryCurrentUser, queryUserById} from '@queries/servers/user';
import {dismissAllModals, popToRoot} from '@screens/navigation';
import {isTablet} from '@utils/helpers';

export async function handleUserAddedToChannelEvent(serverUrl: string, msg: any) {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }
    const currentUser = await queryCurrentUser(database.database);
    const {team_id: teamId, channel_id: channelId, user_id: userId} = msg.data;

    const models: Model[] = [];

    try {
        const addedUser = queryUserById(database.database, userId);
        if (!addedUser) {
            // TODO Potential improvement https://mattermost.atlassian.net/browse/MM-40581
            const {users} = await fetchUsersByIds(serverUrl, [userId], true);
            if (users) {
                models.push(...await database.operator.handleUsers({users, prepareRecordsOnly: true}));
            }
        }

        if (userId === currentUser?.id) {
            const {channels, memberships} = await fetchMyChannel(serverUrl, teamId, channelId, true);
            if (channels && memberships) {
                const prepare = await prepareMyChannelsForTeam(database.operator, teamId, channels, memberships);
                if (prepare) {
                    const prepareModels = await Promise.all(prepare);
                    const flattenedModels = prepareModels.flat();
                    if (flattenedModels?.length > 0) {
                        models.push(...flattenedModels);
                    }
                }
            }

            const {posts, order, authors, actionType, previousPostId} = await fetchPostsForChannel(serverUrl, channelId, true);
            if (posts?.length && order && actionType) {
                models.push(...await database.operator.handlePosts({
                    actionType,
                    order,
                    posts,
                    previousPostId,
                    prepareRecordsOnly: true,
                }));
            }

            if (authors?.length) {
                models.push(...await database.operator.handleUsers({users: authors, prepareRecordsOnly: true}));
            }

            database.operator.batchRecords(models);
        } else {
            const channels = await queryChannelsById(database.database, [channelId]);
            if (channels?.[0]) {
                models.push(...await database.operator.handleChannelMembership({
                    channelMemberships: [{channel_id: channelId, user_id: userId}],
                    prepareRecordsOnly: true,
                }));
            }
        }
    } catch {
        // Do nothing
    }

    database.operator.batchRecords(models);
}

export async function handleUserRemovedFromChannelEvent(serverUrl: string, msg: any) {
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
                    const channelToJumpTo = await queryNthLastChannelFromTeam(database.database, channel?.teamId);
                    if (channelToJumpTo) {
                        const {models: switchChannelModels} = await switchToChannel(serverUrl, channelToJumpTo, '', true);
                        if (switchChannelModels) {
                            models.push(...switchChannelModels);
                        }
                    } // TODO else jump to "join a channel" screen https://mattermost.atlassian.net/browse/MM-41051
                } else {
                    const currentChannelModels = await prepareCommonSystemValues(database.operator, {currentChannelId: ''});
                    if (currentChannelModels?.length) {
                        models.push(...currentChannelModels);
                    }
                }
            }
        }
    } else {
        const {models: deleteMemberModels} = await deleteChannelMembership(database.operator, userId, channelId, true);
        if (deleteMemberModels) {
            models.push(...deleteMemberModels);
        }
    }

    database.operator.batchRecords(models);
}

export async function handleChannelDeletedEvent(serverUrl: string, msg: WebSocketMessage) {
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

    await setChannelDeleteAt(serverUrl, msg.data.channel_id, msg.data.delete_at);

    if (user.isGuest) {
        updateUsersNoLongerVisible(serverUrl);
    }

    if (config?.ExperimentalViewArchivedChannels !== 'true') {
        removeCurrentUserFromChannel(serverUrl, msg.data.channel_id);

        if (currentChannel && currentChannel.id === msg.data.channel_id) {
            const currentServer = await queryActiveServer(DatabaseManager.appDatabase!.database);

            if (currentServer?.url === serverUrl) {
                DeviceEventEmitter.emit(Events.CHANNEL_DELETED);
                await dismissAllModals();
                await popToRoot();

                if (await isTablet()) {
                    const channelToJumpTo = await queryNthLastChannelFromTeam(database.database, currentChannel?.teamId);
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
