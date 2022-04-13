// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {markChannelAsViewed} from '@actions/local/channel';
import {fetchMissingSidebarInfo, markChannelAsRead, switchToChannelById} from '@actions/remote/channel';
import {AppEntryData, AppEntryError, fetchAppEntryData, teamsToRemove} from '@actions/remote/entry/common';
import {fetchPostsForUnreadChannels, fetchPostsSince} from '@actions/remote/post';
import {fetchRoles} from '@actions/remote/role';
import {fetchConfigAndLicense} from '@actions/remote/systems';
import {fetchAllTeams, fetchTeamsChannelsAndUnreadPosts} from '@actions/remote/team';
import {fetchNewThreads} from '@actions/remote/thread';
import {fetchStatusByIds, updateAllUsersSince} from '@actions/remote/user';
import {Screens, WebsocketEvents} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {getTeammateNameDisplaySetting} from '@helpers/api/preference';
import {queryChannelsById, getDefaultChannelForTeam} from '@queries/servers/channel';
import {prepareModels} from '@queries/servers/entry';
import {getCommonSystemValues, getConfig, getCurrentChannelId, getWebSocketLastDisconnected, resetWebSocketLastDisconnected, setCurrentTeamAndChannelId} from '@queries/servers/system';
import EphemeralStore from '@store/ephemeral_store';
import {isDMorGM} from '@utils/channel';
import {isTablet} from '@utils/helpers';
import {isCRTEnabled} from '@utils/thread';

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

    const {database} = operator;
    const tabletDevice = await isTablet();
    const system = await getCommonSystemValues(database);
    const lastDisconnectedAt = await getWebSocketLastDisconnected(database);

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
    const profiles: UserProfile[] = [];

    if (chData?.channels?.length) {
        const teammateDisplayNameSetting = getTeammateNameDisplaySetting(prefData.preferences || [], config, license);
        let direct: Channel[];
        [chData.channels, direct] = chData.channels.reduce(([others, channels], c: Channel) => {
            if (isDMorGM(c)) {
                channels.push(c);
            } else {
                others.push(c);
            }

            return [others, channels];
        }, [[], []] as Channel[][]);

        if (direct.length) {
            const {directChannels, users} = await fetchMissingSidebarInfo(serverUrl, direct, meData.user?.locale, teammateDisplayNameSetting, system.currentUserId, true);
            if (directChannels?.length) {
                chData.channels.push(...directChannels);
            }
            if (users?.length) {
                profiles.push(...users);
            }
        }
    }

    // if no longer a member of the current team
    if (initialTeamId !== system.currentTeamId) {
        let cId = '';
        if (tabletDevice) {
            if (!cId) {
                const channel = await getDefaultChannelForTeam(database, initialTeamId);
                if (channel) {
                    cId = channel.id;
                }
            }
            switchToChannelById(serverUrl, cId, initialTeamId);
        } else {
            setCurrentTeamAndChannelId(operator, initialTeamId, cId);
        }
    }

    const removeTeams = await teamsToRemove(serverUrl, removeTeamIds);

    let removeChannels;
    if (removeChannelIds?.length) {
        removeChannels = await queryChannelsById(database, removeChannelIds).fetch();
    }

    const modelPromises = await prepareModels({operator, initialTeamId, removeTeams, removeChannels, teamData, chData, prefData, meData});
    if (rolesData.roles?.length) {
        modelPromises.push(operator.handleRole({roles: rolesData.roles, prepareRecordsOnly: true}));
    }

    if (profiles.length) {
        modelPromises.push(operator.handleUsers({users: profiles, prepareRecordsOnly: true}));
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

    const currentChannelId = await getCurrentChannelId(database);
    if (currentChannelId) {
        // https://mattermost.atlassian.net/browse/MM-40098
        fetchPostsSince(serverUrl, currentChannelId, lastDisconnectedAt);

        const isChannelScreenMounted = EphemeralStore.getNavigationComponents().includes(Screens.CHANNEL);

        if (isChannelScreenMounted || tabletDevice) {
            markChannelAsRead(serverUrl, currentChannelId);
            markChannelAsViewed(serverUrl, currentChannelId);
        }

        // defer fetching posts for unread channels on initial team
        if (chData?.channels && chData.memberships) {
            fetchPostsForUnreadChannels(serverUrl, chData.channels, chData.memberships, currentChannelId);
        }
    }

    // defer fetch channels and unread posts for other teams
    if (teamData.teams?.length && teamData.memberships?.length) {
        await fetchTeamsChannelsAndUnreadPosts(serverUrl, lastDisconnectedAt, teamData.teams, teamData.memberships, initialTeamId);
    }

    if (prefData.preferences && isCRTEnabled(prefData.preferences, config)) {
        if (initialTeamId) {
            await fetchNewThreads(serverUrl, initialTeamId, false);
        }

        if (teamData.teams?.length) {
            for await (const team of teamData.teams) {
                if (team.id !== initialTeamId) {
                    // need to await here since GM/DM threads in different teams overlap
                    await fetchNewThreads(serverUrl, team.id, false);
                }
            }
        }
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
