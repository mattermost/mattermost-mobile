// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchMissingSidebarInfo, switchToChannelById} from '@actions/remote/channel';
import {AppEntryData, AppEntryError, fetchAppEntryData} from '@actions/remote/entry/common';
import {fetchGroupsForTeam} from '@actions/remote/group';
import {fetchPostsForUnreadChannels, fetchPostsSince} from '@actions/remote/post';
import {fetchRoles} from '@actions/remote/role';
import {fetchConfigAndLicense} from '@actions/remote/systems';
import {fetchAllTeams, fetchTeamsChannelsAndUnreadPosts} from '@actions/remote/team';
import {updateAllUsersSince} from '@actions/remote/user';
import {General, WebsocketEvents} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getTeammateNameDisplaySetting} from '@helpers/api/preference';
import {queryChannelsById, queryDefaultChannelForTeam} from '@queries/servers/channel';
import {prepareModels} from '@queries/servers/entry';
import {queryCommonSystemValues, queryConfig, queryCurrentChannelId, queryWebSocketLastDisconnected, resetWebSocketLastDisconnected, setCurrentTeamAndChannelId} from '@queries/servers/system';
import {deleteMyTeams, queryTeamsById} from '@queries/servers/team';
import {isTablet} from '@utils/helpers';

import {handleChannelDeletedEvent, handleUserAddedToChannelEvent, handleUserRemovedFromChannelEvent} from './channel';
import {handleNewPostEvent, handlePostDeleted, handlePostEdited, handlePostUnread} from './posts';
import {handlePreferenceChangedEvent, handlePreferencesChangedEvent, handlePreferencesDeletedEvent} from './preferences';
import {handleAddCustomEmoji, handleReactionRemovedFromPostEvent, handleReactionAddedToPostEvent} from './reactions';
import {handleUserRoleUpdatedEvent, handleTeamMemberRoleUpdatedEvent, handleRoleUpdatedEvent} from './roles';
import {handleLeaveTeamEvent, handleUserAddedToTeamEvent, handleUpdateTeamEvent} from './teams';
import {handleUserUpdatedEvent, handleUserTypingEvent} from './users';

// ESR: 5.37
const alreadyConnected = new Set<string>();

export async function handleFirstConnect(serverUrl: string) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }
    const config = await queryConfig(operator.database);
    const lastDisconnect = await queryWebSocketLastDisconnected(operator.database);

    // ESR: 5.37
    if (lastDisconnect && config.EnableReliableWebSockets !== 'true' && alreadyConnected.has(serverUrl)) {
        handleReconnect(serverUrl);
        return;
    }

    alreadyConnected.add(serverUrl);
    resetWebSocketLastDisconnected(operator);
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

    const {database} = operator;
    const tabletDevice = await isTablet();
    const system = await queryCommonSystemValues(database);
    const lastDisconnectedAt = await queryWebSocketLastDisconnected(database);

    resetWebSocketLastDisconnected(operator);
    let {config, license} = await fetchConfigAndLicense(serverUrl);
    if (!config) {
        config = system.config;
    }

    if (!license) {
        license = system.license;
    }

    const fetchedData = await fetchAppEntryData(serverUrl, lastDisconnectedAt, system.currentTeamId);
    const fetchedError = (fetchedData as AppEntryError).error;

    if (fetchedError) {
        return;
    }

    const {initialTeamId, teamData, chData, prefData, meData, removeTeamIds, removeChannelIds} = fetchedData as AppEntryData;
    const rolesData = await fetchRoles(serverUrl, teamData.memberships, chData?.memberships, meData.user, true);

    if (chData?.channels?.length) {
        const teammateDisplayNameSetting = getTeammateNameDisplaySetting(prefData.preferences || [], config, license);
        let directChannels: Channel[];
        [chData.channels, directChannels] = chData.channels.reduce(([others, direct], c: Channel) => {
            if (c.type === General.DM_CHANNEL || c.type === General.GM_CHANNEL) {
                direct.push(c);
            } else {
                others.push(c);
            }

            return [others, direct];
        }, [[], []] as Channel[][]);

        if (directChannels.length) {
            await fetchMissingSidebarInfo(serverUrl, directChannels, meData.user?.locale, teammateDisplayNameSetting, system.currentUserId, true);
            chData.channels.push(...directChannels);
        }
    }

    // if no longer a member of the current team
    if (initialTeamId !== system.currentTeamId) {
        let cId = '';
        if (tabletDevice) {
            if (!cId) {
                const channel = await queryDefaultChannelForTeam(database, initialTeamId);
                if (channel) {
                    cId = channel.id;
                }
            }
            switchToChannelById(serverUrl, cId, initialTeamId);
        } else {
            setCurrentTeamAndChannelId(operator, initialTeamId, cId);
        }
    }

    let removeTeams;
    if (removeTeamIds?.length) {
        // Immediately delete myTeams so that the UI renders only teams the user is a member of.
        removeTeams = await queryTeamsById(database, removeTeamIds);
        await deleteMyTeams(operator, removeTeams!);
    }

    let removeChannels;
    if (removeChannelIds?.length) {
        removeChannels = await queryChannelsById(database, removeChannelIds);
    }

    const modelPromises = await prepareModels({operator, initialTeamId, removeTeams, removeChannels, teamData, chData, prefData, meData});
    if (rolesData.roles?.length) {
        modelPromises.push(operator.handleRole({roles: rolesData.roles, prepareRecordsOnly: true}));
    }

    if (modelPromises.length) {
        const models = await Promise.all(modelPromises);
        const flattenedModels = models.flat();
        if (flattenedModels?.length > 0) {
            try {
                await operator.batchRecords(flattenedModels);
            } catch {
                // eslint-disable-next-line no-console
                console.log('FAILED TO BATCH WS reconnection');
            }
        }
    }

    const currentChannelId = await queryCurrentChannelId(database);
    if (currentChannelId) {
        // https://mattermost.atlassian.net/browse/MM-40098
        fetchPostsSince(serverUrl, currentChannelId, lastDisconnectedAt);

        // defer fetching posts for unread channels on initial team
        if (chData?.channels && chData.memberships) {
            fetchPostsForUnreadChannels(serverUrl, chData.channels, chData.memberships, currentChannelId);
        }
    }

    if (initialTeamId) {
        fetchGroupsForTeam(serverUrl, initialTeamId, lastDisconnectedAt);
    }

    // defer fetch channels and unread posts for other teams
    if (teamData.teams?.length && teamData.memberships?.length) {
        await fetchTeamsChannelsAndUnreadPosts(serverUrl, lastDisconnectedAt, teamData.teams, teamData.memberships, initialTeamId);
    }

    fetchAllTeams(serverUrl);
    updateAllUsersSince(serverUrl, lastDisconnectedAt);

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
            handleUserTypingEvent(serverUrl, msg);
            break;
        case WebsocketEvents.HELLO:
            break;

        // handleHelloEvent(msg);
        // break;
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
