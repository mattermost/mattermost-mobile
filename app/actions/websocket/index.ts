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
import {autoUpdateTimezone} from '@actions/remote/user';
import {checkIsAgentsPluginEnabled} from '@agents/actions/remote/agents_status';
import {handleAgentsReconnect} from '@agents/actions/websocket/reconnect';
import {loadConfigAndCalls} from '@calls/actions/calls';
import {isSupportedServerCalls} from '@calls/utils';
import {ActionType, Screens} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import AppsManager from '@managers/apps_manager';
import NetworkManager from '@managers/network_manager';
import {handlePlaybookReconnect} from '@playbooks/actions/websocket/reconnect';
import {getActiveServerUrl} from '@queries/app/servers';
import {prepareEntryModels} from '@queries/servers/entry';
import {getLastPostInThread} from '@queries/servers/post';
import {
    getConfig,
    getCurrentChannelId,
    getCurrentTeamId,
    getLicense,
    getLastFullSync,
    getLastInitialLoad,
    setLastFullSync,
    setLastInitialLoad,
    getConfigBooleanValue,
} from '@queries/servers/system';
import {queryMyTeams, queryTeamLastChannelId} from '@queries/servers/team';
import {getIsCRTEnabled} from '@queries/servers/thread';
import {getCurrentUser} from '@queries/servers/user';
import ChannelsSyncStore from '@store/channels_sync_store';
import EphemeralStore from '@store/ephemeral_store';
import {NavigationStore} from '@store/navigation_store';
import {setTeamLoading} from '@store/team_load_store';
import ThreadsSyncStore from '@store/threads_sync_store';
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
        const lastChannelId = history?.[0].channelIds[0];
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
            const clientError = e as ClientError;

            // 404 = old server (endpoint doesn't exist), 501 = ExperienceAPI disabled
            if (clientError?.status_code === 404) {
                logInfo('doSyncReconnect', 'falling back to legacy doReconnect', clientError?.status_code);
                EphemeralStore.setExperienceAPIEnabled(serverUrl, false);
                setTeamLoading(serverUrl, false);
                return doReconnect(serverUrl, groupLabel);
            }
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

    // Build teamData: merge InitialLoadTeam fields onto existing DB records to preserve
    // fields not carried by the compact sync response (description, email, etc.)
    const changedTeamIds = response.teams?.filter((t) => t.team != null).map((t) => t.team!.id) ?? [];
    let changedTeams: Team[] = [];
    if (changedTeamIds.length) {
        const {queryTeamsById} = await import('@queries/servers/team');
        const existingTeams = await queryTeamsById(database, changedTeamIds).fetch();
        const existingTeamMap = new Map(existingTeams.map((t) => [t.id, t]));

        changedTeams = response.teams!.filter((t) => t.team != null).map((t) => {
            const ex = existingTeamMap.get(t.team!.id);
            return {
                id: t.team!.id,
                create_at: t.team!.create_at ?? 0,
                update_at: t.team!.update_at ?? 0,
                delete_at: t.team!.delete_at ?? 0,
                display_name: t.team!.display_name,
                name: t.team!.name,
                type: t.team!.type,
                invite_id: t.team!.invite_id ?? ex?.inviteId ?? '',
                group_constrained: t.team!.group_constrained ?? false,
                last_team_icon_update: t.team!.last_team_icon_update ?? ex?.lastTeamIconUpdatedAt ?? 0,

                // Preserve fields not in InitialLoadTeam from existing DB record
                description: ex?.description ?? '',
                allowed_domains: ex?.allowedDomains ?? '',
                allow_open_invite: ex?.isAllowOpenInvite ?? false,

                // Fields not stored in mobile DB — always empty
                email: '',
                company_name: '',
                scheme_id: '',
                policy_id: null,
            };
        }) as unknown as Team[];
    }

    const allMemberships = response.teams?.flatMap((t) => t.memberships ?? []).map((m) => ({
        team_id: m.team_id,
        user_id: m.user_id,
        roles: m.roles,
        delete_at: m.delete_at,
        scheme_guest: m.scheme_guest,
        scheme_user: m.scheme_user,
        scheme_admin: m.scheme_admin,
        mention_count: 0,
        msg_count: 0,
    })) ?? [];

    const teamData = (changedTeams.length || allMemberships.length) ? {
        teams: changedTeams,
        memberships: allMemberships as unknown as TeamMembership[],
    } : undefined;

    // Build chData: all team channels + DM/GM channels in one pass
    const allChannels = [
        ...(response.teams?.flatMap((t) => t.channels ?? []) ?? []),
        ...(response.direct_channels ?? []),
    ] as unknown as Channel[];

    const allChannelMemberships = [
        ...(response.teams?.flatMap((t) => t.channel_members?.members ?? []) ?? []),
        ...(response.direct_channel_members?.members ?? []),
    ] as unknown as ChannelMembership[];

    const removedChannelIds = response.teams?.flatMap((t) => t.channel_members?.removed_channel_ids ?? []) ?? [];

    const chData = (allChannels.length || allChannelMemberships.length) ? {
        channels: allChannels,
        memberships: allChannelMemberships,
        categories: [],
    } : undefined;

    const prefData = {
        preferences: response.preferences ?? [],
        tombstones: response.preference_tombstones,
    };
    const meData = response.me ? {user: response.me} : undefined;

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
        const {queryTeamsById, prepareDeleteTeam, removeTeamsFromTeamHistory} = await import('@queries/servers/team');
        const teamsToDelete = await queryTeamsById(database, response.removed_team_ids).fetch();
        for (const team of teamsToDelete) {
            modelPromises.push(prepareDeleteTeam(serverUrl, team));
        }
        modelPromises.push(removeTeamsFromTeamHistory(operator, response.removed_team_ids, true));
    }

    // Update TEAM_BADGE_COUNTS blob using all_teams_unreads which covers every team
    // the user belongs to, not just the scoped ones in teams[].
    const teamsForBadge = response.teams_unreads?.map((u) => ({
        id: u.team_id,
        mention_count: u.mention_count,
        mention_count_root: u.mention_count_root ?? 0,
        has_unreads: u.has_unreads,
        thread_mention_count: u.thread_mention_count ?? 0,
        thread_has_unreads: u.thread_has_unreads ?? false,
    } as unknown as InitialLoadTeam));
    const teamBadgeCounts = buildTeamBadgeCounts(
        teamsForBadge,
        response.direct_channel_counts,
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
