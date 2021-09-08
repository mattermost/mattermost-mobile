// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {WebsocketEvents} from '@app/constants';
import {SYSTEM_IDENTIFIERS} from '@app/constants/database';
import {queryCommonSystemValues, queryWebSocketLastDisconnected} from '@app/queries/servers/system';
import {queryAllUsers} from '@app/queries/servers/user';
import {removeUserFromList} from '@app/utils/user';
import DatabaseManager from '@database/manager';
import NetworkManager from '@init/network_manager';

export async function handleFirstConnect(serverURL: string) {
    const database = DatabaseManager.serverDatabases[serverURL];
    const {config} = await queryCommonSystemValues(database.database);
    const lastDisconnect = await queryWebSocketLastDisconnected(database.database);
    if (lastDisconnect && config.EnableReliableWebSockets !== 'true') {
        return doReconnect(serverURL);
    }

    return doFirstConnect(serverURL);
}

export async function handleReconnect(serverURL: string) {
    return doReconnect(serverURL);
}

export async function handleClose(serverURL: string, lastDisconnect: number) {
    const {operator} = DatabaseManager.serverDatabases[serverURL];
    operator.handleSystem({
        systems: [
            {
                id: SYSTEM_IDENTIFIERS.WEBSOCKET,
                value: lastDisconnect.toString(10),
            },
        ],
        prepareRecordsOnly: false,
    });
}

async function doFirstConnect(serverURL: string) {
    const database = DatabaseManager.serverDatabases[serverURL];
    const lastDisconnectedAt = await queryWebSocketLastDisconnected(database.database);

    if (!lastDisconnectedAt) {
        return;
    }

    const {currentUserId} = await queryCommonSystemValues(database.database);
    const users = await queryAllUsers(database.database);
    const userIds = users.map((u) => u.id);
    const userUpdates = await NetworkManager.getClient(serverURL).getProfilesByIds(userIds, {since: lastDisconnectedAt});

    removeUserFromList(currentUserId, userUpdates);

    if (!userUpdates.length) {
        return;
    }

    database.operator.handleUsers({users: userUpdates, prepareRecordsOnly: false});
}

async function doReconnect(serverURL: string) {
    // TODO
    //setChanelRetryFailed(false);
}

export async function handleEvent(serverURL: string, msg: any) {
    switch (msg.event) {
        case WebsocketEvents.POSTED:
        case WebsocketEvents.EPHEMERAL_MESSAGE:

        //return dispatch(handleNewPostEvent(msg));
        case WebsocketEvents.POST_EDITED:

        //return dispatch(handlePostEdited(msg));
        case WebsocketEvents.POST_DELETED:

        // return dispatch(handlePostDeleted(msg));
        case WebsocketEvents.POST_UNREAD:

        // return dispatch(handlePostUnread(msg));
        case WebsocketEvents.LEAVE_TEAM:

        // return dispatch(handleLeaveTeamEvent(msg));
        case WebsocketEvents.UPDATE_TEAM:

        // return dispatch(handleUpdateTeamEvent(msg));
        case WebsocketEvents.ADDED_TO_TEAM:

        // return dispatch(handleTeamAddedEvent(msg));
        case WebsocketEvents.USER_ADDED:

        // return dispatch(handleUserAddedEvent(msg));
        case WebsocketEvents.USER_REMOVED:

        // return dispatch(handleUserRemovedEvent(msg));
        case WebsocketEvents.USER_UPDATED:

        // return dispatch(handleUserUpdatedEvent(msg));
        case WebsocketEvents.ROLE_ADDED:

        // return dispatch(handleRoleAddedEvent(msg));
        case WebsocketEvents.ROLE_REMOVED:

        // return dispatch(handleRoleRemovedEvent(msg));
        case WebsocketEvents.ROLE_UPDATED:

        // return dispatch(handleRoleUpdatedEvent(msg));
        case WebsocketEvents.USER_ROLE_UPDATED:

        // return dispatch(handleUserRoleUpdated(msg));
        case WebsocketEvents.MEMBERROLE_UPDATED:

        // return dispatch(handleUpdateMemberRoleEvent(msg));
        case WebsocketEvents.CHANNEL_CREATED:

        // return dispatch(handleChannelCreatedEvent(msg));
        case WebsocketEvents.CHANNEL_DELETED:

        // return dispatch(handleChannelDeletedEvent(msg));
        case WebsocketEvents.CHANNEL_UNARCHIVED:

        // return dispatch(handleChannelUnarchiveEvent(msg));
        case WebsocketEvents.CHANNEL_UPDATED:

        // return dispatch(handleChannelUpdatedEvent(msg));
        case WebsocketEvents.CHANNEL_CONVERTED:

        // return dispatch(handleChannelConvertedEvent(msg));
        case WebsocketEvents.CHANNEL_VIEWED:

        // return dispatch(handleChannelViewedEvent(msg));
        case WebsocketEvents.CHANNEL_MEMBER_UPDATED:

        // return dispatch(handleChannelMemberUpdatedEvent(msg));
        case WebsocketEvents.CHANNEL_SCHEME_UPDATED:

        // return dispatch(handleChannelSchemeUpdatedEvent(msg));
        case WebsocketEvents.DIRECT_ADDED:

        // return dispatch(handleDirectAddedEvent(msg));
        case WebsocketEvents.PREFERENCE_CHANGED:

        // return dispatch(handlePreferenceChangedEvent(msg));
        case WebsocketEvents.PREFERENCES_CHANGED:

        // return dispatch(handlePreferencesChangedEvent(msg));
        case WebsocketEvents.PREFERENCES_DELETED:

        // return dispatch(handlePreferencesDeletedEvent(msg));
        case WebsocketEvents.STATUS_CHANGED:

        // return dispatch(handleStatusChangedEvent(msg));
        case WebsocketEvents.TYPING:

        // return dispatch(handleUserTypingEvent(msg));
        case WebsocketEvents.HELLO:

        // handleHelloEvent(msg);
        // break;
        case WebsocketEvents.REACTION_ADDED:

        // return dispatch(handleReactionAddedEvent(msg));
        case WebsocketEvents.REACTION_REMOVED:

        // return dispatch(handleReactionRemovedEvent(msg));
        case WebsocketEvents.EMOJI_ADDED:

        // return dispatch(handleAddEmoji(msg));
        case WebsocketEvents.LICENSE_CHANGED:

        // return dispatch(handleLicenseChangedEvent(msg));
        case WebsocketEvents.CONFIG_CHANGED:

        // return dispatch(handleConfigChangedEvent(msg));
        case WebsocketEvents.OPEN_DIALOG:

        // return dispatch(handleOpenDialogEvent(msg));
        case WebsocketEvents.RECEIVED_GROUP:

        // return dispatch(handleGroupUpdatedEvent(msg));
        case WebsocketEvents.THREAD_UPDATED:

        // return dispatch(handleThreadUpdated(msg));
        case WebsocketEvents.THREAD_READ_CHANGED:

        // return dispatch(handleThreadReadChanged(msg));
        case WebsocketEvents.THREAD_FOLLOW_CHANGED:

        // return dispatch(handleThreadFollowChanged(msg));
        case WebsocketEvents.APPS_FRAMEWORK_REFRESH_BINDINGS:

        // return dispatch(handleRefreshAppsBindings());
    }
}
