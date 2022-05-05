// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {switchToChannelById} from '@actions/remote/channel';
import {deferredAppEntryActions, entry} from '@actions/remote/entry/common';
import {fetchStatusByIds} from '@actions/remote/user';
import {Events, Screens, WebsocketEvents} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {queryActiveServer} from '@queries/app/servers';
import {getCurrentChannel} from '@queries/servers/channel';
import {getCommonSystemValues, getConfig, getWebSocketLastDisconnected, resetWebSocketLastDisconnected, setCurrentTeamAndChannelId} from '@queries/servers/system';
import {getCurrentTeam} from '@queries/servers/team';
import {getCurrentUser} from '@queries/servers/user';
import {dismissAllModals, popToRoot} from '@screens/navigation';
import EphemeralStore from '@store/ephemeral_store';
import {isTablet} from '@utils/helpers';

import {handleCategoryCreatedEvent, handleCategoryDeletedEvent, handleCategoryOrderUpdatedEvent, handleCategoryUpdatedEvent} from './category';
import {handleChannelConvertedEvent, handleChannelCreatedEvent,
    handleChannelDeletedEvent,
    handleChannelMemberUpdatedEvent,
    handleChannelUnarchiveEvent,
    handleChannelUpdatedEvent,
    handleChannelViewedEvent,
    handleDirectAddedEvent,
    handleUserAddedToChannelEvent,
    handleUserRemovedFromChannelEvent} from './channel';
import {handleOpenDialogEvent} from './integrations';
import {handleNewPostEvent, handlePostDeleted, handlePostEdited, handlePostUnread} from './posts';
import {handlePreferenceChangedEvent, handlePreferencesChangedEvent, handlePreferencesDeletedEvent} from './preferences';
import {handleAddCustomEmoji, handleReactionRemovedFromPostEvent, handleReactionAddedToPostEvent} from './reactions';
import {handleUserRoleUpdatedEvent, handleTeamMemberRoleUpdatedEvent, handleRoleUpdatedEvent} from './roles';
import {handleLicenseChangedEvent, handleConfigChangedEvent} from './system';
import {handleLeaveTeamEvent, handleUserAddedToTeamEvent, handleUpdateTeamEvent} from './teams';
import {handleThreadUpdatedEvent, handleThreadReadChangedEvent, handleThreadFollowChangedEvent} from './threads';
import {handleUserUpdatedEvent, handleUserTypingEvent} from './users';

// ESR: 5.37
const alreadyConnected = new Set<string>();

export async function handleFirstConnect(serverUrl: string) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }
    const {database} = operator;
    const config = await getConfig(database);
    const lastDisconnect = await getWebSocketLastDisconnected(database);

    // ESR: 5.37
    if (lastDisconnect && config?.EnableReliableWebSockets !== 'true' && alreadyConnected.has(serverUrl)) {
        handleReconnect(serverUrl);
        return;
    }

    alreadyConnected.add(serverUrl);
    resetWebSocketLastDisconnected(operator);
    fetchStatusByIds(serverUrl, ['me']);
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

async function doReconnect(serverUrl: string) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }

    const appDatabase = DatabaseManager.appDatabase?.database;
    if (!appDatabase) {
        return;
    }

    const {database} = operator;
    const tabletDevice = await isTablet();
    const lastDisconnectedAt = await getWebSocketLastDisconnected(database);
    resetWebSocketLastDisconnected(operator);
    const currentTeam = await getCurrentTeam(database);
    const currentChannel = await getCurrentChannel(database);

    const entryData = await entry(serverUrl, currentTeam?.id, currentChannel?.id, lastDisconnectedAt);
    if ('error' in entryData) {
        return;
    }
    const {models, initialTeamId, initialChannelId, prefData, teamData, chData} = entryData;

    let switchedToChannel = false;

    // if no longer a member of the current team or the current channel
    if (initialTeamId !== currentTeam?.id || initialChannelId !== currentChannel?.id) {
        const currentServer = await queryActiveServer(appDatabase);
        const isChannelScreenMounted = EphemeralStore.getNavigationComponents().includes(Screens.CHANNEL);
        if (serverUrl === currentServer?.url) {
            if (currentTeam && initialTeamId !== currentTeam.id) {
                DeviceEventEmitter.emit(Events.LEAVE_TEAM, {displayName: currentTeam.displayName});
                await dismissAllModals();
                await popToRoot();
            } else if (currentChannel && initialChannelId !== currentChannel.id && isChannelScreenMounted) {
                DeviceEventEmitter.emit(Events.LEAVE_CHANNEL, {displayName: currentChannel?.displayName});
                await dismissAllModals();
                await popToRoot();
            }

            if (tabletDevice && initialChannelId) {
                switchedToChannel = true;
                switchToChannelById(serverUrl, initialChannelId, initialTeamId);
            } else {
                setCurrentTeamAndChannelId(operator, initialTeamId, initialChannelId);
            }
        } else {
            setCurrentTeamAndChannelId(operator, initialTeamId, initialChannelId);
        }
    }

    await operator.batchRecords(models);

    const {id: currentUserId, locale: currentUserLocale} = (await getCurrentUser(database))!;
    const {config, license} = await getCommonSystemValues(database);
    await deferredAppEntryActions(serverUrl, lastDisconnectedAt, currentUserId, currentUserLocale, prefData.preferences, config, license, teamData, chData, initialTeamId, switchedToChannel ? initialChannelId : undefined);

    // https://mattermost.atlassian.net/browse/MM-41520
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

        case WebsocketEvents.CATEGORY_CREATED:
            handleCategoryCreatedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.CATEGORY_UPDATED:
            handleCategoryUpdatedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.CATEGORY_ORDER_UPDATED:
            handleCategoryOrderUpdatedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.CATEGORY_DELETED:
            handleCategoryDeletedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.CHANNEL_CREATED:
            handleChannelCreatedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.CHANNEL_DELETED:
            handleChannelDeletedEvent(serverUrl, msg);
            break;
        case WebsocketEvents.CHANNEL_UNARCHIVED:
            handleChannelUnarchiveEvent(serverUrl, msg);
            break;

        case WebsocketEvents.CHANNEL_UPDATED:
            handleChannelUpdatedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.CHANNEL_CONVERTED:
            handleChannelConvertedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.CHANNEL_VIEWED:
            handleChannelViewedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.CHANNEL_MEMBER_UPDATED:
            handleChannelMemberUpdatedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.CHANNEL_SCHEME_UPDATED:
            // Do nothing, handled by CHANNEL_UPDATED due to changes in the channel scheme.
            break;

        case WebsocketEvents.DIRECT_ADDED:
        case WebsocketEvents.GROUP_ADDED:
            handleDirectAddedEvent(serverUrl, msg);
            break;

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
            handleUserTypingEvent(serverUrl, msg);
            break;

        case WebsocketEvents.REACTION_ADDED:
            handleReactionAddedToPostEvent(serverUrl, msg);
            break;

        case WebsocketEvents.REACTION_REMOVED:
            handleReactionRemovedFromPostEvent(serverUrl, msg);
            break;

        case WebsocketEvents.EMOJI_ADDED:
            handleAddCustomEmoji(serverUrl, msg);
            break;

        case WebsocketEvents.LICENSE_CHANGED:
            handleLicenseChangedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.CONFIG_CHANGED:
            handleConfigChangedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.OPEN_DIALOG:
            handleOpenDialogEvent(serverUrl, msg);
            break;

        case WebsocketEvents.THREAD_UPDATED:
            handleThreadUpdatedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.THREAD_READ_CHANGED:
            handleThreadReadChangedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.THREAD_FOLLOW_CHANGED:
            handleThreadFollowChangedEvent(serverUrl, msg);
            break;

        case WebsocketEvents.APPS_FRAMEWORK_REFRESH_BINDINGS:
            break;

        // return dispatch(handleRefreshAppsBindings());
    }
}
