// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {markChannelAsViewed} from '@actions/local/channel';
import {dataRetentionCleanup, expiredBoRPostCleanup} from '@actions/local/systems';
import {markChannelAsRead} from '@actions/remote/channel';
import {fetchClassificationBanner} from '@actions/remote/classification';
import {
    entry,
    setExtraSessionProps,
} from '@actions/remote/entry/common';
import {deferredAppEntryActions} from '@actions/remote/entry/deferred';
import {handleAutotranslationChanges, handleEntryAfterLoadNavigation, handleInitialLoadNavigation} from '@actions/remote/entry/effects';
import {buildTeamBadgeCounts, entryInitialLoad, runExperienceAPIEntryActions} from '@actions/remote/entry/initial_load';
import {fetchPostsForChannel, fetchPostThread} from '@actions/remote/post';
import {openAllUnreadChannels} from '@actions/remote/preference';
import {autoUpdateTimezone, type MyUserRequest} from '@actions/remote/user';
import {checkIsAgentsPluginEnabled} from '@agents/actions/remote/agents_status';
import {handleAgentsReconnect} from '@agents/actions/websocket/reconnect';
import {loadConfigAndCalls} from '@calls/actions/calls';
import {isSupportedServerCalls} from '@calls/utils';
import {ActionType, Screens} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {toApiChannel, toApiTeam, toApiTeamMembership, toApiUserProfile} from '@helpers/api/experience';
import AppsManager from '@managers/apps_manager';
import NetworkManager from '@managers/network_manager';
import {handlePlaybookReconnect} from '@playbooks/actions/websocket/reconnect';
import {getActiveServerUrl} from '@queries/app/servers';
import {prepareDeleteChannel, queryChannelsById, queryChannelsInfoById} from '@queries/servers/channel';
import {prepareEntryModels} from '@queries/servers/entry';
import {getLastPostInThread} from '@queries/servers/post';
import {
    adjustThreadInBlob,
    clearTeamThreadsInBlob,
    decrementTeamBlob,
    getConfig,
    getCurrentChannelId,
    getCurrentTeamId,
    getLicense,
    getLastFullSync,
    getLastInitialLoad,
    incrementTeamBlob,
    migrateChannelFromDirectToTeamBlob,
    setLastFullSync,
    setLastInitialLoad,
    getConfigBooleanValue,
} from '@queries/servers/system';
import {prepareDeleteTeam, queryMyTeams, queryTeamLastChannelId, queryTeamsById, removeTeamsFromTeamHistory} from '@queries/servers/team';
import {getIsCRTEnabled} from '@queries/servers/thread';
import {getCurrentUser, queryUsersById} from '@queries/servers/user';
import ChannelsSyncStore from '@store/channels_sync_store';
import EphemeralStore from '@store/ephemeral_store';
import {NavigationStore} from '@store/navigation_store';
import SyncBlobQueue, {type QueuedBlobOp} from '@store/sync_blob_queue';
import {setTeamLoading} from '@store/team_load_store';
import ThreadsSyncStore from '@store/threads_sync_store';
import {getFullErrorMessage} from '@utils/errors';
import {isTablet} from '@utils/helpers';
import {logDebug, logError, logInfo, logWarning} from '@utils/log';

import type ClientError from '@client/rest/error';
import type {Model} from '@nozbe/watermelondb';

export async function handleFirstConnect(serverUrl: string, groupLabel?: BaseRequestGroupLabel) {
    setExtraSessionProps(serverUrl, groupLabel);
    autoUpdateTimezone(serverUrl, groupLabel);

    const activeServerUrl = await DatabaseManager.getActiveServerUrl();

    try {
        if (activeServerUrl !== serverUrl) {
            const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
            const experienceFlag = await getConfigBooleanValue(database, 'FeatureFlagEnableExperienceAPI');

            if (experienceFlag) {
                const teamId = await getCurrentTeamId(database);
                const initial = await entryInitialLoad(serverUrl, teamId, undefined, undefined, undefined, groupLabel, false);

                if ('error' in initial) {
                    logWarning('handleFirstConnect', 'entryInitialLoad error', initial.error);
                } else {
                    // only set the flag if there are no errors, that way the fallback would use the legacy path.
                    EphemeralStore.setExperienceAPIEnabled(serverUrl, experienceFlag);
                    return undefined;
                }
            }
        }
    } catch (e) {
        logError('handleFirstConnect', e);
    }

    return doReconnect(serverUrl, groupLabel);
}

export async function handleReconnect(serverUrl: string, groupLabel: BaseRequestGroupLabel = 'WebSocket Reconnect') {
    if (EphemeralStore.getExperienceAPIEnabled(serverUrl)) {
        return doSyncReconnect(serverUrl, groupLabel);
    }
    return doReconnect(serverUrl, groupLabel);
}

async function doSyncReconnect(serverUrl: string, groupLabel?: BaseRequestGroupLabel) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const isTabletDevice = isTablet();

        setTeamLoading(serverUrl, true);

        const [lastInitialLoad, lastFullSync, currentTeamId, currentChannelId] = await Promise.all([
            getLastInitialLoad(database),
            getLastFullSync(database),
            getCurrentTeamId(database),
            getCurrentChannelId(database),
        ]);

        const since = Math.max(lastInitialLoad, lastFullSync);

        // Build scope
        const mountedScreens = NavigationStore.getScreensInStack();
        const allTeams = await queryMyTeams(database).fetchIds();

        const loadedTeamIds = allTeams.filter((id) => ChannelsSyncStore.hasChannelsBeenFetched(serverUrl, id));
        const fallbackTeamIds = currentTeamId ? [currentTeamId] : [];
        const scope: SyncScope = {
            team_ids: loadedTeamIds.length > 0 ? loadedTeamIds : fallbackTeamIds,
        };

        // Determine scope when device is a tablet
        const history = await queryTeamLastChannelId(database, currentTeamId).fetch();
        const lastChannelId = history?.[0]?.channelIds[0];
        if (isTabletDevice) {
            const possibleActiveScreen: string[] = [Screens.GLOBAL_DRAFTS, Screens.PARTICIPANT_PLAYBOOKS, Screens.AGENT_CHAT];
            if (mountedScreens.includes(Screens.CHANNEL_LIST)) {
                if (lastChannelId === Screens.GLOBAL_THREADS) {
                    scope.global_threads_team_id = currentTeamId;
                } else if (lastChannelId && !possibleActiveScreen.includes(lastChannelId)) {
                    scope.active_channel_id = currentChannelId;
                }
            }
        }

        // Active thread
        const threadId = EphemeralStore.getCurrentThreadId();
        if (mountedScreens.includes(Screens.THREAD) && threadId) {
            scope.active_thread_id = threadId;
        }

        // Active channel
        if (mountedScreens.includes(Screens.CHANNEL) && currentChannelId) {
            scope.active_channel_id = currentChannelId;
        }

        // Global threads: either the screen is in stack (mobile)
        if (mountedScreens.includes(Screens.GLOBAL_THREADS) && currentTeamId) {
            scope.global_threads_team_id = currentTeamId;
        }

        const client = NetworkManager.getClient(serverUrl);
        let response: SyncResponse;
        SyncBlobQueue.beginSync(serverUrl);
        try {
            response = await client.reconnectSync({since, scope}, groupLabel);

            // Reset ThreadsSyncStore for loaded teams so badges use the refreshed blob
            ThreadsSyncStore.clearServer(serverUrl);

            // Batch all entity deltas
            await batchSyncResponse(serverUrl, database, operator, response, currentTeamId ?? '', currentChannelId ?? '');

            // Re-mark channels fetched for teams that received channel data
            for (const teamDelta of response.teams ?? []) {
                if (teamDelta.channels?.length) {
                    ChannelsSyncStore.markChannelsFetched(serverUrl, teamDelta.team_id);
                }
            }

            // Re-mark threads fetched for the global threads team if we got thread data
            if (response.threads_delta?.team_id) {
                ThreadsSyncStore.markThreadsFetched(serverUrl, response.threads_delta.team_id);
            }

            // Post-reconnect deferred work (same as cold start but without idle-callback cleanup concern)
            const activeTeam = response.teams?.find((t) => t.team_id === currentTeamId);
            const teamHasGroupConstraint = Boolean(activeTeam?.team?.group_constrained);
            runExperienceAPIEntryActions(serverUrl, currentTeamId ?? '', teamHasGroupConstraint, groupLabel);
        } catch (e) {
            // The sync never landed, so there's no snapshot to filter queued ops
            // against — replay them all, in order, as if no sync had started.
            await replayQueuedBlobOps(operator, SyncBlobQueue.endSync(serverUrl), 0);

            const clientError = e as ClientError;

            // 404 = old server, the endpoint doesn't exist there. Any other error means the
            // endpoint exists but the request failed, so falling back would only mask it.
            if (clientError?.status_code === 404) {
                logInfo('doSyncReconnect', 'falling back to legacy doReconnect', clientError?.status_code);
                EphemeralStore.setExperienceAPIEnabled(serverUrl, false);
                setTeamLoading(serverUrl, false);
                return doReconnect(serverUrl, groupLabel);
            }

            logError('doSyncReconnect', getFullErrorMessage(e));
        }
    } catch (e) {
        logError('doSyncReconnect', e);
    } finally {
        setTeamLoading(serverUrl, false);
    }

    return undefined;
}

async function batchSyncResponse(
    serverUrl: string,
    database: ReturnType<typeof DatabaseManager.getServerDatabaseAndOperator>['database'],
    operator: ReturnType<typeof DatabaseManager.getServerDatabaseAndOperator>['operator'],
    response: SyncResponse,
    currentTeamId: string,
    currentChannelId: string,
) {
    const modelPromises: Array<Promise<Model[]>> = [];
    const isCRTEnabled = await getIsCRTEnabled(database);

    const changedTeams = response.teams?.filter((t) => t.team != null).map((t) => t.team!) ?? [];
    const teamIds = changedTeams.map((t) => t.id);
    const existingTeams = teamIds.length ? await queryTeamsById(database, teamIds).fetch() : [];
    const existingTeamsById = new Map(existingTeams.map((t) => [t.id, t]));

    const allMemberships = response.teams?.flatMap((t) => t.memberships ?? []).map(toApiTeamMembership) ?? [];

    const teamData = (changedTeams.length || allMemberships.length) ? {
        teams: changedTeams.map((t) => toApiTeam(t, existingTeamsById.get(t.id))),
        memberships: allMemberships,
    } : undefined;

    // Build chData: all team channels + DM/GM channels in one pass
    const allChannels = [
        ...(response.teams?.flatMap((t) => t.channels ?? []) ?? []),
        ...(response.direct_channels ?? []),
    ];

    const channelIds = allChannels.map((c) => c.id);
    const existingChannels = channelIds.length ? await queryChannelsById(database, channelIds).fetch() : [];
    const existingChannelsById = new Map(existingChannels.map((c) => [c.id, c]));
    const existingChannelsInfo = channelIds.length ? await queryChannelsInfoById(database, channelIds).fetch() : [];
    const existingChannelsInfoById = new Map(existingChannelsInfo.map((c) => [c.id, c]));

    const allChannelMemberships = [
        ...(response.teams?.flatMap((t) => t.channel_members?.members ?? []) ?? []),
        ...(response.direct_channel_members?.members ?? []),
    ] as unknown as ChannelMembership[];

    const removedChannelIds = response.teams?.flatMap((t) => t.channel_members?.removed_channel_ids ?? []) ?? [];

    const chData = (allChannels.length || allChannelMemberships.length) ? {
        channels: allChannels.map((c) => toApiChannel(c, existingChannelsById.get(c.id), existingChannelsInfoById.get(c.id))),
        memberships: allChannelMemberships,
        categories: [],
    } : undefined;

    const prefData = {
        preferences: response.preferences ?? [],
        tombstones: response.preference_tombstones,
    };

    let meData: MyUserRequest | undefined;
    if (response.me) {
        const [existingUser] = await queryUsersById(database, [response.me.id]).fetch();
        meData = {user: toApiUserProfile(response.me, existingUser)};
    }

    await handleAutotranslationChanges(serverUrl, meData, chData);

    const entryModels = await prepareEntryModels({operator, teamData, chData, prefData, meData, isCRTEnabled});
    modelPromises.push(...entryModels);

    // Roles
    if (response.roles?.length) {
        modelPromises.push(operator.handleRole({
            roles: response.roles.map((r) => ({
                id: r.id,
                name: r.name,
                create_at: r.create_at ?? 0,
                update_at: r.update_at ?? 0,
                delete_at: r.delete_at ?? 0,
                permissions: r.permissions,
            })) as Role[],
            prepareRecordsOnly: true,
        }));
    }

    // Group memberships
    if (response.group_memberships) {
        const currentUser = await getCurrentUser(database);
        if (currentUser) {
            modelPromises.push(operator.handleGroupMembershipsDelta({
                userId: currentUser.id,
                addedGroupIds: response.group_memberships.members?.map((m) => m.group_id) ?? [],
                removedGroupIds: response.group_memberships.removed_group_ids ?? [],
                prepareRecordsOnly: true,
            }));
        }
    }

    // Authors (post authors + DM partners)
    if (response.authors?.length) {
        modelPromises.push(operator.handleUsers({users: response.authors, prepareRecordsOnly: true}));
    }

    // Groups (@-mentioned in posts)
    if (response.groups?.length) {
        modelPromises.push(operator.handleGroups({groups: response.groups, prepareRecordsOnly: true}));
    }

    // Posts from active channel and/or thread
    if (response.posts?.length) {
        const postMap: Record<string, Post> = {};
        for (const p of response.posts) {
            postMap[p.id] = p;
        }
        const chOrder = response.active_channel?.posts_order ?? [];
        const thOrder = response.active_thread?.posts_order ?? [];
        const allIds = Array.from(new Set([...chOrder, ...thOrder]));
        const posts = allIds.map((id) => postMap[id]).filter(Boolean) as Post[];
        if (posts.length) {
            modelPromises.push(operator.handlePosts({
                actionType: ActionType.POSTS.RECEIVED_SINCE,
                order: chOrder,
                posts,
                prepareRecordsOnly: true,
            }));
        }
    }

    // Removed team tombstones
    if (response.removed_team_ids?.length) {
        const teamsToDelete = await queryTeamsById(database, response.removed_team_ids).fetch();
        for (const team of teamsToDelete) {
            modelPromises.push(prepareDeleteTeam(serverUrl, team));
        }
        modelPromises.push(removeTeamsFromTeamHistory(operator, response.removed_team_ids, true));
    }

    // Removed channel tombstones
    if (removedChannelIds.length) {
        const channelsToDelete = await queryChannelsById(database, removedChannelIds).fetch();
        for (const channel of channelsToDelete) {
            modelPromises.push(prepareDeleteChannel(serverUrl, channel));
        }
    }

    const teamBadgeCounts = buildTeamBadgeCounts(
        response.teams_unreads,
        response.direct_unreads,
        isCRTEnabled,
    );
    modelPromises.push(operator.handleSystem({
        systems: [{id: SYSTEM_IDENTIFIERS.TEAM_BADGE_COUNTS, value: JSON.stringify(teamBadgeCounts)}],
        prepareRecordsOnly: true,
    }));

    // Advance initial_load cursor
    modelPromises.push(setLastInitialLoad(operator, response.timestamp, true));

    const models = (await Promise.all(modelPromises)).flat();
    if (models.length) {
        await operator.batchRecords(models, 'doSyncReconnect');
    }

    await replayQueuedBlobOps(operator, SyncBlobQueue.endSync(serverUrl), response.timestamp);

    // Navigation corrections after batch — handles removed teams/channels
    const initialTeamId = response.teams?.find((t) => t.team_id === currentTeamId)?.team_id ?? currentTeamId;
    await handleInitialLoadNavigation(serverUrl, {
        currentTeamId,
        currentChannelId,
        initialTeamId,
        initialChannelId: currentChannelId,
        removedTeamIds: response.removed_team_ids ?? [],
        removedChannelIds,
        gmConverted: false,
    });
}

function replayBlobOp(operator: ReturnType<typeof DatabaseManager.getServerDatabaseAndOperator>['operator'], q: QueuedBlobOp) {
    switch (q.op) {
        case 'increment':
            return incrementTeamBlob(operator, q.teamId, q.mentionDelta, q.threadMentionDelta);
        case 'decrement':
            return decrementTeamBlob(operator, q.teamId, q.clearedMentions, q.clearedThreadMentions);
        case 'adjustThread':
            return adjustThreadInBlob(operator, q.teamId, q.mentionDelta, q.hasUnreadsAfter);
        case 'clearThreads':
            return clearTeamThreadsInBlob(operator, q.teamId);
        case 'migrateDirectToTeam':
            return migrateChannelFromDirectToTeamBlob(operator, q.teamId, q.mentionCount, q.hasUnreads);
        default:
            return Promise.resolve();
    }
}

// Sequential chain — each blob op reads then writes the same System row, so
// they must not run concurrently
async function replayQueuedBlobOps(
    operator: ReturnType<typeof DatabaseManager.getServerDatabaseAndOperator>['operator'],
    queued: QueuedBlobOp[],
    snapshotTimestamp: number,
) {
    await queued.reduce(async (chain, q) => {
        await chain;
        if (q.eventTimestamp > snapshotTimestamp) {
            await replayBlobOp(operator, q);
        }
    }, Promise.resolve());
}

async function doReconnect(serverUrl: string, groupLabel?: BaseRequestGroupLabel) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return new Error('cannot find server database');
    }

    const appDatabase = DatabaseManager.appDatabase?.database;
    if (!appDatabase) {
        return new Error('cannot find app database');
    }

    const {database} = operator;

    try {
        const lastFullSync = await getLastFullSync(database);
        const now = Date.now();

        const currentTeamId = await getCurrentTeamId(database);
        const currentChannelId = await getCurrentChannelId(database);

        setTeamLoading(serverUrl, true);
        if (!EphemeralStore.getExperienceAPIEnabled(serverUrl)) {
            const entryData = await entry(serverUrl, currentTeamId, currentChannelId, lastFullSync, undefined, undefined, groupLabel);
            if ('error' in entryData) {
                return entryData.error;
            }
            const {models, initialTeamId, initialChannelId, prefData, teamData, chData, meData, gmConverted} = entryData;

            await handleEntryAfterLoadNavigation(serverUrl, teamData.memberships || [], chData?.memberships || [], currentTeamId || '', currentChannelId || '', initialTeamId, initialChannelId, gmConverted);

            const dt = Date.now();
            if (models?.length) {
                await operator.batchRecords(models, 'doReconnect');
            }

            logInfo('WEBSOCKET RECONNECT MODELS BATCHING TOOK', `${Date.now() - dt}ms`);

            await fetchPostDataIfNeeded(serverUrl, groupLabel);

            const {id: currentUserId, locale: currentUserLocale} = (await getCurrentUser(database))!;
            const license = await getLicense(database);
            const config = await getConfig(database);

            handlePlaybookReconnect(serverUrl);
            handleAgentsReconnect(serverUrl);

            if (isSupportedServerCalls(config?.Version)) {
                loadConfigAndCalls(serverUrl, currentUserId, groupLabel);
            }

            checkIsAgentsPluginEnabled(serverUrl);
            fetchClassificationBanner(serverUrl);

            await deferredAppEntryActions(serverUrl, lastFullSync, currentUserId, currentUserLocale, prefData.preferences, config, license, teamData, chData, meData, initialTeamId, undefined, groupLabel);

            await setLastFullSync(operator, now);

            openAllUnreadChannels(serverUrl, groupLabel);

            dataRetentionCleanup(serverUrl);

            expiredBoRPostCleanup(serverUrl);

            AppsManager.refreshAppBindings(serverUrl, groupLabel);
        }
    } finally {
        setTeamLoading(serverUrl, false);
    }

    return undefined;
}

async function fetchPostDataIfNeeded(serverUrl: string, groupLabel?: RequestGroupLabel) {
    try {
        const isActiveServer = (await getActiveServerUrl()) === serverUrl;
        if (!isActiveServer) {
            return;
        }

        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const currentChannelId = await getCurrentChannelId(database);
        const isCRTEnabled = await getIsCRTEnabled(database);
        const mountedScreens = NavigationStore.getScreensInStack();
        const isChannelScreenMounted = mountedScreens.includes(Screens.CHANNEL);
        const isThreadScreenMounted = mountedScreens.includes(Screens.THREAD);
        const tabletDevice = isTablet();

        if (isCRTEnabled && isThreadScreenMounted) {
            // Fetch new posts in the thread only when CRT is enabled,
            // for non-CRT fetchPostsForChannel includes posts in the thread
            const rootId = EphemeralStore.getCurrentThreadId();
            if (rootId) {
                const lastPost = await getLastPostInThread(database, rootId);
                if (lastPost) {
                    if (lastPost) {
                        const options: FetchPaginatedThreadOptions = {};
                        options.fromCreateAt = lastPost.createAt;
                        options.fromPost = lastPost.id;
                        options.direction = 'down';
                        await fetchPostThread(serverUrl, rootId, options, false, groupLabel);
                    }
                }
            }
        }

        if (currentChannelId && (isChannelScreenMounted || tabletDevice)) {
            await fetchPostsForChannel(serverUrl, currentChannelId, false, false, groupLabel);
            markChannelAsRead(serverUrl, currentChannelId, false, groupLabel);
            if (!EphemeralStore.wasNotificationTapped()) {
                markChannelAsViewed(serverUrl, currentChannelId, true);
            }
            EphemeralStore.setNotificationTapped(false);
        }
    } catch (error) {
        logDebug('could not fetch needed post after WS reconnect', error);
    }
}
