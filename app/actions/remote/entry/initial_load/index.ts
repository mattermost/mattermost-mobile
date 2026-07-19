// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {dataRetentionCleanup, expiredBoRPostCleanup} from '@actions/local/systems';
import {fetchClassificationBanner} from '@actions/remote/classification';
import {entryInitialChannelId, handleAutotranslationChanges, handleInitialLoadNavigation} from '@actions/remote/entry/effects';
import {fetchGroupsForTeamIfConstrained} from '@actions/remote/groups';
import {openAllUnreadChannels, type MyPreferencesRequest} from '@actions/remote/preference';
import {fetchScheduledPosts} from '@actions/remote/scheduled_post';
import {fetchConfigAndLicense, fetchDataRetentionPolicy} from '@actions/remote/systems';
import {checkIsAgentsPluginEnabled} from '@agents/actions/remote/agents_status';
import {setAgentsVersionFromManifests} from '@agents/actions/remote/version';
import {loadConfigAndCallsIfEnabled} from '@calls/actions/calls';
import {General} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import {toApiChannel, toApiTeam, toApiTeamMembership, toApiUserProfile} from '@helpers/api/experience';
import AppsManager from '@managers/apps_manager';
import NetworkManager from '@managers/network_manager';
import {setPlaybooksVersionFromManifests} from '@playbooks/actions/remote/version';
import {getChannelById, prepareDeleteChannel, queryChannelsById, queryChannelsInfoById} from '@queries/servers/channel';
import {prepareEntryModels, truncateCrtRelatedTables} from '@queries/servers/entry';
import {getHasCRTChanged} from '@queries/servers/preference';
import {getCurrentUserId, getLastInitialLoad} from '@queries/servers/system';
import {prepareDeleteTeam, queryTeamsById, removeTeamsFromTeamHistory} from '@queries/servers/team';
import {queryUsersById} from '@queries/servers/user';
import ChannelsSyncStore from '@store/channels_sync_store';
import EphemeralStore from '@store/ephemeral_store';
import {isExperienceAPIEnabled} from '@utils/config';
import {logDebug, logError} from '@utils/log';
import {processIsCRTEnabled} from '@utils/thread';

import type {MyChannelsRequest} from '@actions/remote/channel';
import type {EntryResponse} from '@actions/remote/entry/types';
import type {MyTeamsRequest} from '@actions/remote/team';
import type {MyUserRequest} from '@actions/remote/user';

const idleCallbackHandles = new Map<string, number>();

export function cancelExperienceAPIEntryActions(serverUrl: string) {
    const handle = idleCallbackHandles.get(serverUrl);
    if (handle !== undefined) {
        cancelIdleCallback(handle);
        idleCallbackHandles.delete(serverUrl);
    }
}

async function setProductsPluginStatus(serverUrl: string, groupLabel?: RequestGroupLabel) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const [manifests, currentUserId] = await Promise.all([
            client.getPluginsManifests(),
            getCurrentUserId(database),
        ]);
        setPlaybooksVersionFromManifests(serverUrl, manifests);
        setAgentsVersionFromManifests(serverUrl, manifests);
        checkIsAgentsPluginEnabled(serverUrl);
        loadConfigAndCallsIfEnabled(serverUrl, currentUserId, manifests, groupLabel);
    } catch (e) {
        logError('setProductsPluginStatus', e);
    }
}

export async function runExperienceAPIEntryActions(serverUrl: string, initialTeamId: string, teamHasGroupConstraint: boolean, groupLabel?: RequestGroupLabel) {
    try {
        setProductsPluginStatus(serverUrl, groupLabel);

        if (teamHasGroupConstraint) {
            fetchGroupsForTeamIfConstrained(serverUrl, initialTeamId);
        }

        fetchClassificationBanner(serverUrl);
        fetchScheduledPosts(serverUrl, initialTeamId, true, groupLabel);

        fetchDataRetentionPolicy(serverUrl, false, groupLabel).then(() => {
            dataRetentionCleanup(serverUrl);
        });

        expiredBoRPostCleanup(serverUrl);

        cancelExperienceAPIEntryActions(serverUrl);
        const handle = requestIdleCallback(() => {
            idleCallbackHandles.delete(serverUrl);
            openAllUnreadChannels(serverUrl, groupLabel);
            AppsManager.refreshAppBindings(serverUrl, groupLabel);
        });
        idleCallbackHandles.set(serverUrl, handle);
    } catch (e) {
        logError('runExperienceAPIEntryActions', e);
    }
}

export const buildTeamBadgeCounts = (teamUnreads: ExperienceUnreads[] | undefined, dc: ExperienceUnreads | undefined, isCRTEnabled: boolean): TeamBadgeCounts => {
    const pickMentionCount = (count: number = 0, countRoot: number = 0) => (isCRTEnabled ? countRoot : count);
    const teamBadgeTeams: Record<string, TeamBadge> = {};
    for (const u of teamUnreads ?? []) {
        if (!u.team_id) {
            continue;
        }
        teamBadgeTeams[u.team_id] = {
            mentionCount: pickMentionCount(u.mention_count, u.mention_count_root),
            hasUnreads: u.has_unreads,
            threadMentionCount: u.thread_mention_count ?? 0,
            threadHasUnreads: u.thread_has_unreads ?? false,
        };
    }
    return {
        teams: teamBadgeTeams,
        direct: {
            mentionCount: dc ? pickMentionCount(dc.mention_count, dc.mention_count_root) : 0,
            hasUnreads: dc?.has_unreads ?? false,
            threadMentionCount: dc?.thread_mention_count ?? 0,
            threadHasUnreads: dc?.thread_has_unreads ?? false,
        },
    };
};

export const entryInitialLoad = async (serverUrl: string, teamId?: string, channelId?: string, config?: ClientConfig, license?: ClientLicense, groupLabel?: RequestGroupLabel, runActions = true): Promise<EntryResponse> => {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        // Use the server-side timestamp from the last initial_load as the delta cursor.
        // This is distinct from SYSTEM_IDENTIFIERS.WEBSOCKET (set by doReconnect after WS sync).
        const since = await getLastInitialLoad(database);

        // Config/license must be fetched separately — needed for CRT detection, calls support,
        // display name settings, and version checks. Fetch in parallel with initial_load.
        const client = NetworkManager.getClient(serverUrl);
        const [confResp, initialLoad] = await Promise.all([
            client && license ? Promise.resolve({config, license, error: undefined}) : fetchConfigAndLicense(serverUrl, false, groupLabel),
            client.getInitialLoad(teamId, since, groupLabel),
        ]);

        if (confResp.error) {
            return {error: confResp.error};
        }

        // Fresh config is the source of truth. If the operator turned the experience
        // API off while the client thought it was on, flip the EphemeralStore flag
        // and redirect to the legacy entryRest path.
        if (!isExperienceAPIEnabled(confResp.config)) {
            EphemeralStore.setExperienceAPIEnabled(serverUrl, false);
            return {error: 'no environment api enabled'};
        }

        // initial_load always returns full preferences (no UpdateAt filtering).
        const prefData: MyPreferencesRequest = {
            preferences: initialLoad.preferences ?? [],
            tombstones: initialLoad.preference_tombstones,
        };

        const isCRTEnabled = Boolean(
            prefData.preferences?.length &&
            processIsCRTEnabled(
                prefData.preferences,
                confResp.config?.CollapsedThreads,
                confResp.config?.FeatureFlagCollapsedThreads,
                confResp.config?.Version,
            ),
        );

        if (prefData.preferences?.length) {
            const crtToggled = await getHasCRTChanged(database, prefData.preferences);
            if (crtToggled) {
                const {error} = await truncateCrtRelatedTables(serverUrl);
                if (error) {
                    throw new Error(`Resetting CRT on ${serverUrl} failed`);
                }

                // Re-fetch with since=0 to get a full snapshot after CRT table truncation.
                const freshLoad = await client.getInitialLoad(teamId, 0, groupLabel);
                Object.assign(initialLoad, freshLoad);
                prefData.preferences = freshLoad.preferences ?? [];
            }
        }

        // meData: undefined when me is null — delta mode, nothing changed, skip user write.
        let meData: MyUserRequest | undefined;
        if (initialLoad.me) {
            const [existingUser] = await queryUsersById(database, [initialLoad.me.id]).fetch();
            meData = {user: toApiUserProfile(initialLoad.me, existingUser)};
        }

        // teamData: map only if there are teams in the response (may be empty in delta).
        let teamData: MyTeamsRequest | undefined;
        if (initialLoad.teams?.length || initialLoad.team_members?.members?.length) {
            const teamIds = (initialLoad.teams ?? []).map((t) => t.id);
            const existingTeams = teamIds.length ? await queryTeamsById(database, teamIds).fetch() : [];
            const existingTeamsById = new Map(existingTeams.map((t) => [t.id, t]));

            teamData = {
                teams: (initialLoad.teams ?? []).map((t) => toApiTeam(t, existingTeamsById.get(t.id))),
                memberships: (initialLoad.team_members?.members ?? []).map(toApiTeamMembership),
            };
        }

        // The server resolves the active team — no client-side fallback needed.
        const activeTeam = initialLoad.active_team;
        const initialTeamId = activeTeam?.team?.id ?? '';

        // GM-to-private-channel conversion: the channel may already exist locally as a GM
        // but the server now reports it as private/public. Detect from active_team channels.
        let gmConverted = false;
        let initialChannelId = channelId ?? '';

        if (channelId) {
            const existingChannel = await getChannelById(database, channelId);
            if (existingChannel?.type === General.GM_CHANNEL) {
                const serverChannel = activeTeam?.channels?.find((c) => c.id === channelId);
                if (serverChannel?.type === General.PRIVATE_CHANNEL || serverChannel?.type === General.OPEN_CHANNEL) {
                    initialChannelId = channelId;
                    gmConverted = true;
                }
            }
        }

        // chData: map active_team channels/members/categories. Undefined if no active team.
        let chData: MyChannelsRequest | undefined;
        if (activeTeam) {
            const channelIds = (activeTeam.channels ?? []).map((c) => c.id);
            const existingChannels = channelIds.length ? await queryChannelsById(database, channelIds).fetch() : [];
            const existingChannelsById = new Map(existingChannels.map((c) => [c.id, c]));
            const existingChannelsInfo = channelIds.length ? await queryChannelsInfoById(database, channelIds).fetch() : [];
            const existingChannelsInfoById = new Map(existingChannelsInfo.map((c) => [c.id, c]));

            chData = {
                channels: (activeTeam.channels ?? []).map((c) => toApiChannel(c, existingChannelsById.get(c.id), existingChannelsInfoById.get(c.id))),
                memberships: (activeTeam.channel_members?.members ?? []) as unknown as ChannelMembership[],
                categories: activeTeam.sidebar_categories?.categories ?? [],
            };
        }

        if (activeTeam?.channel_members.removed_channel_ids?.includes(initialChannelId)) {
            initialChannelId = await entryInitialChannelId(
                database,
                initialChannelId,
                teamId,
                initialTeamId,
                meData?.user?.locale ?? initialLoad.me?.locale ?? '',
                chData?.channels,
                chData?.memberships,
            );
        }

        await handleAutotranslationChanges(serverUrl, meData, chData);

        // GM member counts: the server includes member_count only for GM channels.
        // Pass as overrides into prepareEntryModels → prepareAllMyChannels → buildChannelInfos
        // so the correct count is written in the same batch — no separate upsert needed.
        const memberCountOverrides: Record<string, number> = {};
        for (const c of activeTeam?.channels ?? []) {
            if (c.type === General.GM_CHANNEL && (c.member_count ?? 0) > 0) {
                memberCountOverrides[c.id] = c.member_count!;
            }
        }

        const removedTeamIds = initialLoad.team_members?.removed_team_ids ?? [];
        const removedChannelIds = activeTeam?.channel_members?.removed_channel_ids ?? [];

        if (removedTeamIds.length && teamData?.teams?.length) {
            const teamIds = new Set(removedTeamIds);
            teamData.teams = teamData.teams.filter((t) => !teamIds.has(t.id));
        }

        if (removedChannelIds.length && chData?.channels?.length) {
            const chanIds = new Set(removedChannelIds);
            chData.channels = chData.channels.filter((c) => !chanIds.has(c.id));
        }

        // Prepare and batch all models immediately — data must be persisted regardless
        // of whether the WebSocket ever connects (DDIL resilience).
        const modelPromises = await prepareEntryModels({operator, teamData, chData, prefData, meData, isCRTEnabled, memberCountOverrides});

        // Tombstones: remove teams and channels the server says are gone.
        if (removedTeamIds.length) {
            const teamsToDelete = await queryTeamsById(database, removedTeamIds).fetch();
            for (const team of teamsToDelete) {
                modelPromises.push(prepareDeleteTeam(serverUrl, team));
            }
            modelPromises.push(removeTeamsFromTeamHistory(operator, removedTeamIds, true));
        }
        if (removedChannelIds.length) {
            const channelsToDelete = await queryChannelsById(database, removedChannelIds).fetch();
            for (const channel of channelsToDelete) {
                modelPromises.push(prepareDeleteChannel(serverUrl, channel));
            }
        }

        const directProfiles = initialLoad.direct_profiles;
        if (directProfiles?.length) {
            modelPromises.push(operator.handleUsers({
                users: directProfiles,
                prepareRecordsOnly: true,
                statuses: initialLoad.statuses,
            }));
        }

        if (initialLoad.group_memberships) {
            const currentUserId = initialLoad.me?.id ?? meData?.user?.id ?? '';
            const {members = [], removed_group_ids: removedGroupIds = []} = initialLoad.group_memberships;
            modelPromises.push(operator.handleGroupMembershipsDelta({
                userId: currentUserId,
                addedGroupIds: members.map((m) => m.group_id),
                removedGroupIds,
                prepareRecordsOnly: true,
            }));
        }

        // Roles are included in the initial_load response — store them directly without
        // a separate network call. prepareRecordsOnly so we can batch with everything else.
        if (initialLoad.roles?.length) {
            modelPromises.push(operator.handleRole({
                roles: initialLoad.roles.map((r) => ({
                    id: r.id,
                    name: r.name,
                    create_at: r.create_at ?? 0,
                    update_at: r.update_at ?? 0,
                    delete_at: r.delete_at ?? 0,
                    permissions: r.permissions,
                } as Role)),
                prepareRecordsOnly: true,
            }));
        }

        // Build team badge counts blob — seeds non-active team badges before
        // deferredAppEntryActions fetches those teams' channels.
        const teamBadgeCounts = buildTeamBadgeCounts(initialLoad.team_unreads, initialLoad.direct_unreads, isCRTEnabled);

        // Batch timestamp, team badge counts, and current team id in a single handleSystem call.
        const systemRecords: Array<{id: string; value: unknown}> = [
            {id: SYSTEM_IDENTIFIERS.LAST_INITIAL_LOAD, value: initialLoad.timestamp},
            {id: SYSTEM_IDENTIFIERS.TEAM_BADGE_COUNTS, value: JSON.stringify(teamBadgeCounts)},
        ];
        if (initialTeamId) {
            // Seed the team load cursor for the active team so the first handleTeamChange
            // call uses the initial_load timestamp as a delta cursor instead of doing a full load.
            systemRecords.push({id: `${SYSTEM_IDENTIFIERS.LAST_TEAM_LOAD}_${initialTeamId}`, value: initialLoad.timestamp});
        }
        modelPromises.push(operator.handleSystem({systems: systemRecords, prepareRecordsOnly: true}));

        const models = (await Promise.all(modelPromises)).flat();
        if (models.length) {
            await operator.batchRecords(models, 'entryInitialLoad');
        }

        // Only the active team's channels were fully fetched and batched above.
        // Other teams' channels stay lazy until the user switches to them; their
        // badge observables continue reading from the TEAM_BADGE_COUNTS blob.
        if (initialTeamId) {
            ChannelsSyncStore.markChannelsFetched(serverUrl, initialTeamId);
        }

        // can_join_other_teams is computed server-side from the user's ListPublicTeams /
        // ListPrivateTeams permissions and team membership. Stored in EphemeralStore so the
        // "Join Another Team" UI doesn't have to wait for the deferred-actions queue.
        EphemeralStore.setCanJoinOtherTeams(serverUrl, initialLoad.can_join_other_teams);

        await handleInitialLoadNavigation(serverUrl, {
            currentTeamId: teamId ?? '',
            currentChannelId: channelId ?? '',
            initialTeamId,
            initialChannelId,
            removedTeamIds,
            removedChannelIds,
            gmConverted,
        });

        logDebug('entryInitialLoad models batched', groupLabel, models.length);

        if (runActions) {
            runExperienceAPIEntryActions(serverUrl, initialTeamId, activeTeam?.team.group_constrained ?? false, groupLabel);
        }

        return {models, initialChannelId, initialTeamId, prefData, teamData: teamData ?? {}, chData, meData, gmConverted};
    } catch (error) {
        logError('entryInitialLoad', groupLabel, error);
        return {error};
    }
};
