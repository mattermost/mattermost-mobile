// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {fetchMissingSidebarInfo, fetchMyChannelsForTeam} from '@actions/remote/channel';
import {fetchPostsSince} from '@actions/remote/post';
import {fetchMyPreferences} from '@actions/remote/preference';
import {fetchRoles} from '@actions/remote/role';
import {fetchConfigAndLicense} from '@actions/remote/systems';
import {fetchAllTeams, fetchMyTeams} from '@actions/remote/team';
import {fetchMe, updateAllUsersSinceLastDisconnect} from '@actions/remote/user';
import {General, WebsocketEvents} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import Events from '@constants/events';
import DatabaseManager from '@database/manager';
import {getTeammateNameDisplaySetting} from '@helpers/api/preference';
import {prepareMyChannelsForTeam} from '@queries/servers/channel';
import {queryCommonSystemValues, queryConfig, queryWebSocketLastDisconnected} from '@queries/servers/system';
import {queryCurrentUser} from '@queries/servers/user';

import {handleChannelDeletedEvent, handleUserAddedToChannelEvent, handleUserRemovedFromChannelEvent} from './channel';
import {handleNewPostEvent, handlePostDeleted, handlePostEdited, handlePostUnread} from './posts';
import {handlePreferenceChangedEvent, handlePreferencesChangedEvent, handlePreferencesDeletedEvent} from './preferences';
import {handleUserRoleUpdatedEvent, handleTeamMemberRoleUpdatedEvent, handleRoleUpdatedEvent} from './roles';
import {handleLeaveTeamEvent, handleUserAddedToTeamEvent, handleUpdateTeamEvent} from './teams';
import {handleUserUpdatedEvent} from './users';

import type {Model} from '@nozbe/watermelondb';

export async function handleFirstConnect(serverUrl: string) {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return;
    }
    const config = await queryConfig(database);
    const lastDisconnect = await queryWebSocketLastDisconnected(database);
    if (lastDisconnect && config.EnableReliableWebSockets !== 'true') {
        doReconnect(serverUrl);
        return;
    }

    doFirstConnect(serverUrl);
}

export function handleReconnect(serverUrl: string) {
    doReconnect(serverUrl);
}

export async function handleClose(serverUrl: string, lastDisconnect: number) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
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

function doFirstConnect(serverUrl: string) {
    updateAllUsersSinceLastDisconnect(serverUrl);
}

async function doReconnect(serverUrl: string) {
    const database = DatabaseManager.serverDatabases[serverUrl];
    if (!database) {
        return;
    }

    const system = await queryCommonSystemValues(database.database);
    const lastDisconnectedAt = await queryWebSocketLastDisconnected(database.database);

    // TODO consider fetch only and batch all the results.
    await fetchMe(serverUrl);
    await fetchMyPreferences(serverUrl);
    const {config} = await fetchConfigAndLicense(serverUrl);
    const {memberships: teamMemberships, error: teamMembershipsError} = await fetchMyTeams(serverUrl);
    const {currentChannelId, currentUserId, currentTeamId, license} = system;
    const currentTeamMembership = teamMemberships?.find((tm) => tm.team_id === currentTeamId && tm.delete_at === 0);

    let channelMemberships: ChannelMembership[] | undefined;
    if (currentTeamMembership) {
        const {memberships, channels, error} = await fetchMyChannelsForTeam(serverUrl, currentTeamMembership.team_id, true, lastDisconnectedAt);
        if (error) {
            DeviceEventEmitter.emit(Events.TEAM_LOAD_ERROR, serverUrl, error);
            return;
        }
        const currentUser = await queryCurrentUser(database.database);
        const preferences = currentUser ? (await currentUser.preferences.fetch()) : [];
        const teammateDisplayNameSetting = getTeammateNameDisplaySetting(preferences || [], system.config, license);
        const directChannels = channels?.filter((c) => c.type === General.DM_CHANNEL || c.type === General.GM_CHANNEL);
        if (directChannels?.length) {
            await fetchMissingSidebarInfo(serverUrl, directChannels, currentUser?.locale, teammateDisplayNameSetting, currentUserId);
        }

        const modelPromises: Array<Promise<Model[]>> = [];
        const prepare = await prepareMyChannelsForTeam(database.operator, currentTeamMembership.team_id, channels!, memberships!);
        if (prepare) {
            modelPromises.push(...prepare);
        }
        if (modelPromises.length) {
            const models = await Promise.all(modelPromises);
            const flattenedModels = models.flat();
            if (flattenedModels?.length > 0) {
                try {
                    await database.operator.batchRecords(flattenedModels);
                } catch {
                    // eslint-disable-next-line no-console
                    console.log('FAILED TO BATCH CHANNELS');
                }
            }
        }

        channelMemberships = memberships;

        if (currentChannelId) {
            const stillMemberOfCurrentChannel = memberships?.find((cm) => cm.channel_id === currentChannelId);
            const channelStillExist = channels?.find((c) => c.id === currentChannelId);
            const viewArchivedChannels = config?.ExperimentalViewArchivedChannels === 'true';

            if (!stillMemberOfCurrentChannel) {
                handleUserRemovedFromChannelEvent(serverUrl, {data: {user_id: currentUserId, channel_id: currentChannelId}});
            } else if (!channelStillExist ||
                (!viewArchivedChannels && channelStillExist.delete_at !== 0)
            ) {
                handleChannelDeletedEvent(serverUrl, {data: {user_id: currentUserId, channel_id: currentChannelId}} as WebSocketMessage);
            } else {
                // TODO Differentiate between post and thread, to fetch the thread posts
                fetchPostsSince(serverUrl, currentChannelId, lastDisconnectedAt);
            }
        }

        // TODO Consider global thread screen to update global threads
    } else if (!teamMembershipsError) {
        handleLeaveTeamEvent(serverUrl, {data: {user_id: currentUserId, team_id: currentTeamId}} as WebSocketMessage);
    }

    fetchRoles(serverUrl, teamMemberships, channelMemberships);
    fetchAllTeams(serverUrl);

    // TODO Fetch App bindings?

    updateAllUsersSinceLastDisconnect(serverUrl);
}

export async function handleEvent(serverUrl: string, msg: WebSocketMessage) {
    switch (msg.event) {
        case WebsocketEvents.POSTED:
        case WebsocketEvents.EPHEMERAL_MESSAGE:
            handleNewPostEvent(serverUrl, msg);
            break;

        case WebsocketEvents.POST_EDITED:
            handlePostEdited(serverUrl, msg);
            break;

        case WebsocketEvents.POST_DELETED:
            handlePostDeleted(serverUrl, msg);
            break;

        case WebsocketEvents.POST_UNREAD:
            handlePostUnread(serverUrl, msg);
            break;

        case WebsocketEvents.LEAVE_TEAM:
            handleLeaveTeamEvent(serverUrl, msg);
            break;
        case WebsocketEvents.UPDATE_TEAM:
            handleUpdateTeamEvent(serverUrl, msg);
            break;
        case WebsocketEvents.ADDED_TO_TEAM:
            handleUserAddedToTeamEvent(serverUrl, msg);
            break;

        case WebsocketEvents.USER_ADDED:
            handleUserAddedToChannelEvent(serverUrl, msg);
            break;
        case WebsocketEvents.USER_REMOVED:
            handleUserRemovedFromChannelEvent(serverUrl, msg);
            break;
        case WebsocketEvents.USER_UPDATED:
            handleUserUpdatedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.ROLE_UPDATED:
            handleRoleUpdatedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.USER_ROLE_UPDATED:
            handleUserRoleUpdatedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.MEMBERROLE_UPDATED:
            handleTeamMemberRoleUpdatedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.CHANNEL_CREATED:
            break;

        // return dispatch(handleChannelCreatedEvent(msg));
        case WebsocketEvents.CHANNEL_DELETED:
            handleChannelDeletedEvent(serverUrl, msg);
            break;
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
            handlePreferenceChangedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.PREFERENCES_CHANGED:
            handlePreferencesChangedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.PREFERENCES_DELETED:
            handlePreferencesDeletedEvent(serverUrl, msg);
            break;

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
