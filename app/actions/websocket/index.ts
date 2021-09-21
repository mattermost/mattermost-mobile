// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {fetchMyChannelsForTeam} from '@actions/remote/channel';
import {fetchPostsSince} from '@actions/remote/post';
import {loadMe, updateAllusersSinceLastDisconnect} from '@actions/remote/user';
import {General, WebsocketEvents} from '@app/constants';
import {SYSTEM_IDENTIFIERS} from '@app/constants/database';
import {queryCommonSystemValues, queryWebSocketLastDisconnected} from '@app/queries/servers/system';
import DatabaseManager from '@database/manager';

import {handleLeaveTeamEvent} from './teams';

export async function handleFirstConnect(serverURL: string) {
    const database = DatabaseManager.serverDatabases[serverURL]?.database;
    if (!database) {
        return;
    }
    const {config} = await queryCommonSystemValues(database);
    const lastDisconnect = await queryWebSocketLastDisconnected(database);
    if (lastDisconnect && config.EnableReliableWebSockets !== 'true') {
        doReconnect(serverURL);
        return;
    }

    doFirstConnect(serverURL);
}

export async function handleReconnect(serverURL: string) {
    doReconnect(serverURL);
}

export async function handleClose(serverURL: string, lastDisconnect: number) {
    console.log('WSA: close');
    const operator = DatabaseManager.serverDatabases[serverURL]?.operator;
    if (!operator) {
        return;
    }
    await operator.handleSystem({
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
    console.log('WSA: doFirstConnect');
    await updateAllusersSinceLastDisconnect(serverURL);
}

async function doReconnect(serverURL: string) {
    console.log('WSA: doReconnect');

    const database = DatabaseManager.serverDatabases[serverURL];
    if (!database) {
        return;
    }

    const {teamMemberships, config, error} = await loadMe(serverURL, {});
    if (error) {
        //TODO handle error
        return;
    }

    const {currentUserId, currentTeamId, currentChannelId} = await queryCommonSystemValues(database.database);
    const lastDisconnectedAt = await queryWebSocketLastDisconnected(database.database);
    const currentTeamMembership = teamMemberships?.find((tm) => tm.team_id === currentTeamId && tm.delete_at === 0);

    if (currentTeamMembership) {
        const channelsRequest = await fetchMyChannelsForTeam(serverURL, currentTeamMembership.team_id, false, lastDisconnectedAt);
        if (channelsRequest.error) {
            // TODO handle error.
            return; //?
        }

        const stillMemberOfCurrentChannel = channelsRequest.memberships?.find((cm) => cm.channel_id === currentChannelId);
        const channelStillExist = channelsRequest.channels?.find((c) => c.id === currentChannelId);
        const viewArchivedChannels = config?.ExperimentalViewArchivedChannels === 'true';

        if (
            !stillMemberOfCurrentChannel ||
            !channelStillExist ||
            (!viewArchivedChannels && channelStillExist.delete_at !== 0)
        ) {
            DeviceEventEmitter.emit(General.SWITCH_TO_DEFAULT_CHANNEL, currentTeamId);
        } else {
            fetchPostsSince(serverURL, currentChannelId, lastDisconnectedAt);
        }
    } else {
        handleLeaveTeamEvent(serverURL, {data: {user_id: currentUserId, team_id: currentTeamId}});
    }

    await updateAllusersSinceLastDisconnect(serverURL);
}

export async function handleEvent(serverURL: string, msg: any) {
    switch (msg.event) {
        case WebsocketEvents.POSTED:
        case WebsocketEvents.EPHEMERAL_MESSAGE:
            break;

        //return dispatch(handleNewPostEvent(msg));
        case WebsocketEvents.POST_EDITED:
            break;

        //return dispatch(handlePostEdited(msg));
        case WebsocketEvents.POST_DELETED:
            break;

        // return dispatch(handlePostDeleted(msg));
        case WebsocketEvents.POST_UNREAD:
            break;

        // return dispatch(handlePostUnread(msg));
        case WebsocketEvents.LEAVE_TEAM:
            handleLeaveTeamEvent(serverURL, msg);
            break;
        case WebsocketEvents.UPDATE_TEAM:
            break;

        // return dispatch(handleUpdateTeamEvent(msg));
        case WebsocketEvents.ADDED_TO_TEAM:
            break;

        // return dispatch(handleTeamAddedEvent(msg));
        case WebsocketEvents.USER_ADDED:
            break;

        // return dispatch(handleUserAddedEvent(msg));
        case WebsocketEvents.USER_REMOVED:
            break;

        // return dispatch(handleUserRemovedEvent(msg));
        case WebsocketEvents.USER_UPDATED:
            break;

        // return dispatch(handleUserUpdatedEvent(msg));
        case WebsocketEvents.ROLE_ADDED:
            break;

        // return dispatch(handleRoleAddedEvent(msg));
        case WebsocketEvents.ROLE_REMOVED:
            break;

        // return dispatch(handleRoleRemovedEvent(msg));
        case WebsocketEvents.ROLE_UPDATED:
            break;

        // return dispatch(handleRoleUpdatedEvent(msg));
        case WebsocketEvents.USER_ROLE_UPDATED:
            break;

        // return dispatch(handleUserRoleUpdated(msg));
        case WebsocketEvents.MEMBERROLE_UPDATED:
            break;

        // return dispatch(handleUpdateMemberRoleEvent(msg));
        case WebsocketEvents.CHANNEL_CREATED:
            break;

        // return dispatch(handleChannelCreatedEvent(msg));
        case WebsocketEvents.CHANNEL_DELETED:
            break;

        // return dispatch(handleChannelDeletedEvent(msg));
        case WebsocketEvents.CHANNEL_UNARCHIVED:
            break;

        // return dispatch(handleChannelUnarchiveEvent(msg));
        case WebsocketEvents.CHANNEL_UPDATED:
            break;

        // return dispatch(handleChannelUpdatedEvent(msg));
        case WebsocketEvents.CHANNEL_CONVERTED:
            break;

        // return dispatch(handleChannelConvertedEvent(msg));
        case WebsocketEvents.CHANNEL_VIEWED:
            break;

        // return dispatch(handleChannelViewedEvent(msg));
        case WebsocketEvents.CHANNEL_MEMBER_UPDATED:
            break;

        // return dispatch(handleChannelMemberUpdatedEvent(msg));
        case WebsocketEvents.CHANNEL_SCHEME_UPDATED:
            break;

        // return dispatch(handleChannelSchemeUpdatedEvent(msg));
        case WebsocketEvents.DIRECT_ADDED:
            break;

        // return dispatch(handleDirectAddedEvent(msg));
        case WebsocketEvents.PREFERENCE_CHANGED:
            break;

        // return dispatch(handlePreferenceChangedEvent(msg));
        case WebsocketEvents.PREFERENCES_CHANGED:
            break;

        // return dispatch(handlePreferencesChangedEvent(msg));
        case WebsocketEvents.PREFERENCES_DELETED:
            break;

        // return dispatch(handlePreferencesDeletedEvent(msg));
        case WebsocketEvents.STATUS_CHANGED:
            break;

        // return dispatch(handleStatusChangedEvent(msg));
        case WebsocketEvents.TYPING:
            break;

        // return dispatch(handleUserTypingEvent(msg));
        case WebsocketEvents.HELLO:
            break;

        // handleHelloEvent(msg);
        // break;
        case WebsocketEvents.REACTION_ADDED:
            break;

        // return dispatch(handleReactionAddedEvent(msg));
        case WebsocketEvents.REACTION_REMOVED:
            break;

        // return dispatch(handleReactionRemovedEvent(msg));
        case WebsocketEvents.EMOJI_ADDED:
            break;

        // return dispatch(handleAddEmoji(msg));
        case WebsocketEvents.LICENSE_CHANGED:
            break;

        // return dispatch(handleLicenseChangedEvent(msg));
        case WebsocketEvents.CONFIG_CHANGED:
            break;

        // return dispatch(handleConfigChangedEvent(msg));
        case WebsocketEvents.OPEN_DIALOG:
            break;

        // return dispatch(handleOpenDialogEvent(msg));
        case WebsocketEvents.RECEIVED_GROUP:
            break;

        // return dispatch(handleGroupUpdatedEvent(msg));
        case WebsocketEvents.THREAD_UPDATED:
            break;

        // return dispatch(handleThreadUpdated(msg));
        case WebsocketEvents.THREAD_READ_CHANGED:
            break;

        // return dispatch(handleThreadReadChanged(msg));
        case WebsocketEvents.THREAD_FOLLOW_CHANGED:
            break;

        // return dispatch(handleThreadFollowChanged(msg));
        case WebsocketEvents.APPS_FRAMEWORK_REFRESH_BINDINGS:
            break;

        // return dispatch(handleRefreshAppsBindings());
    }
}
