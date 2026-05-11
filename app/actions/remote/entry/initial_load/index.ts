// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {DeviceEventEmitter} from 'react-native';

import {entryInitialChannelId, handleAutotranslationChanges} from '@actions/remote/entry/effects';
import {fetchGroupsForTeamIfConstrained} from '@actions/remote/groups';
import {fetchScheduledPosts} from '@actions/remote/scheduled_post';
import {fetchConfigAndLicense} from '@actions/remote/systems';
import {Events, General} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getChannelById, prepareDeleteChannel, queryChannelsById} from '@queries/servers/channel';
import {prepareEntryModels, truncateCrtRelatedTables} from '@queries/servers/entry';
import {getHasCRTChanged} from '@queries/servers/preference';
import {getLastInitialLoad} from '@queries/servers/system';
import {getTeamById, prepareDeleteTeam, queryTeamsById, removeTeamsFromTeamHistory} from '@queries/servers/team';
import EphemeralStore from '@store/ephemeral_store';
import {logDebug, logError} from '@utils/log';
import {processIsCRTEnabled} from '@utils/thread';

import type {MyChannelsRequest} from '@actions/remote/channel';
import type {EntryResponse} from '@actions/remote/entry/types';
import type {MyPreferencesRequest} from '@actions/remote/preference';
import type {MyTeamsRequest} from '@actions/remote/team';
import type {MyUserRequest} from '@actions/remote/user';

const buildTeamBadgeCounts = (teams: InitialLoadTeam[] | undefined, dc: InitialLoadDirectCounts | undefined, isCRTEnabled: boolean): TeamBadgeCounts => {
    const pickMentionCount = (count: number = 0, countRoot: number = 0) => (isCRTEnabled ? countRoot : count);
    const teamBadgeTeams: Record<string, TeamBadge> = {};
    for (const t of teams ?? []) {
        teamBadgeTeams[t.id] = {
            mentionCount: pickMentionCount(t.mention_count, t.mention_count_root),
            hasUnreads: t.has_unreads,
            threadMentionCount: t.thread_mention_count ?? 0,
            threadHasUnreads: t.thread_has_unreads ?? false,
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

export const entryInitialLoad = async (serverUrl: string, teamId?: string, channelId?: string, config?: ClientConfig, license?: ClientLicense, groupLabel?: RequestGroupLabel): Promise<EntryResponse> => {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        // Use the server-side timestamp from the last initial_load as the delta cursor.
        // This is distinct from SYSTEM_IDENTIFIERS.WEBSOCKET (set by doReconnect after WS sync).
        const since = await getLastInitialLoad(database);
        const currentTeam = await getTeamById(database, teamId || '');

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

        // initial_load always returns full preferences (no UpdateAt filtering).
        const prefData: MyPreferencesRequest = {preferences: initialLoad.preferences ?? []};

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
        const meData: MyUserRequest | undefined = initialLoad.me ? {
            user: {
                id: initialLoad.me.id,
                create_at: initialLoad.me.create_at ?? 0,
                update_at: initialLoad.me.update_at ?? 0,
                delete_at: initialLoad.me.delete_at,
                username: initialLoad.me.username,
                auth_service: initialLoad.me.auth_service,
                email: initialLoad.me.email,
                nickname: initialLoad.me.nickname,
                first_name: initialLoad.me.first_name,
                last_name: initialLoad.me.last_name,
                position: initialLoad.me.position,
                roles: initialLoad.me.roles,
                props: initialLoad.me.props ?? {},
                notify_props: initialLoad.me.notify_props ?? {} as UserNotifyProps,
                last_picture_update: initialLoad.me.last_picture_update ?? 0,
                locale: initialLoad.me.locale,
                timezone: initialLoad.me.timezone,
                terms_of_service_id: initialLoad.me.terms_of_service_id,
                terms_of_service_create_at: initialLoad.me.terms_of_service_create_at,
            } as UserProfile,
        } : undefined;

        // teamData: map only if there are teams in the response (may be empty in delta).
        const teamData: MyTeamsRequest | undefined = initialLoad.teams?.length || initialLoad.team_members?.members?.length ? {
            teams: (initialLoad.teams ?? []).map((t) => ({
                id: t.id,
                create_at: t.create_at ?? 0,
                update_at: t.update_at ?? 0,
                delete_at: t.delete_at ?? 0,
                display_name: t.display_name,
                name: t.name,
                type: t.type,
                invite_id: t.invite_id ?? '',
                group_constrained: t.group_constrained ?? false,
                last_team_icon_update: t.last_team_icon_update ?? 0,
                description: '',
                email: '',
                company_name: '',
                allowed_domains: '',
                allow_open_invite: false,
                scheme_id: '',
                policy_id: null,
            } as unknown as Team)),
            memberships: (initialLoad.team_members?.members ?? []).map((m) => ({
                team_id: m.team_id,
                user_id: m.user_id,
                roles: m.roles,
                delete_at: m.delete_at,
                scheme_guest: m.scheme_guest,
                scheme_user: m.scheme_user,
                scheme_admin: m.scheme_admin,
                mention_count: 0,
                msg_count: 0,
            } as TeamMembership)),
        } : undefined;

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
        const chData: MyChannelsRequest | undefined = activeTeam ? {
            channels: (activeTeam.channels ?? []).map((c) => ({
                id: c.id,
                create_at: c.create_at ?? 0,
                update_at: c.update_at ?? 0,
                delete_at: c.delete_at ?? 0,
                team_id: c.team_id,
                type: c.type,
                display_name: c.display_name,
                name: c.name,
                last_post_at: c.last_post_at,
                total_msg_count: c.total_msg_count,
                creator_id: c.creator_id ?? '',
                group_constrained: c.group_constrained ?? false,
                shared: c.shared ?? false,
                total_msg_count_root: c.total_msg_count_root ?? 0,
                last_root_post_at: c.last_root_post_at ?? 0,
                policy_enforced: c.policy_enforced ?? false,
                header: '',
                purpose: '',
                extra_update_at: 0,
                scheme_id: '',
                props: null,
            } as unknown as Channel)),
            memberships: (activeTeam.channel_members?.members ?? []).map((m) => ({
                channel_id: m.channel_id,
                user_id: m.user_id,
                roles: m.roles,
                last_viewed_at: m.last_viewed_at,
                msg_count: m.msg_count,
                mention_count: m.mention_count,
                mention_count_root: m.mention_count_root,
                urgent_mention_count: m.urgent_mention_count,
                msg_count_root: m.msg_count_root,
                last_update_at: m.last_update_at,
                scheme_guest: m.scheme_guest,
                scheme_user: m.scheme_user,
                scheme_admin: m.scheme_admin,
                autotranslation_disabled: m.autotranslation_disabled,
                notify_props: m.notify_props,
            } as ChannelMembership)),
            categories: activeTeam.sidebar_categories?.categories ?? [],
        } : undefined;

        initialChannelId = await entryInitialChannelId(
            database,
            initialChannelId,
            teamId,
            initialTeamId,
            meData?.user?.locale ?? initialLoad.me?.locale ?? '',
            chData?.channels,
            chData?.memberships,
        );

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
            modelPromises.push(operator.handleUsers({users: directProfiles, prepareRecordsOnly: true}));
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
        const teamBadgeCounts = buildTeamBadgeCounts(initialLoad.teams, initialLoad.direct_channel_counts, isCRTEnabled);

        // Batch timestamp, team badge counts, and current team id in a single handleSystem call.
        const systemRecords: Array<{id: string; value: unknown}> = [
            {id: SYSTEM_IDENTIFIERS.LAST_INITIAL_LOAD, value: initialLoad.timestamp},
            {id: SYSTEM_IDENTIFIERS.TEAM_BADGE_COUNTS, value: JSON.stringify(teamBadgeCounts)},
        ];
        if (initialTeamId) {
            systemRecords.push({id: SYSTEM_IDENTIFIERS.CURRENT_TEAM_ID, value: initialTeamId});

            // Seed the team load cursor for the active team so the first handleTeamChange
            // call uses the initial_load timestamp as a delta cursor instead of doing a full load.
            systemRecords.push({id: `${SYSTEM_IDENTIFIERS.LAST_TEAM_LOAD}_${initialTeamId}`, value: initialLoad.timestamp});
        }
        modelPromises.push(operator.handleSystem({systems: systemRecords, prepareRecordsOnly: true}));

        const models = (await Promise.all(modelPromises)).flat();
        if (models.length) {
            await operator.batchRecords(models, 'entryInitialLoad');
        }

        // can_join_other_teams is computed server-side from the user's ListPublicTeams /
        // ListPrivateTeams permissions and team membership. Stored in EphemeralStore so the
        // "Join Another Team" UI doesn't have to wait for the deferred-actions queue.
        EphemeralStore.setCanJoinOtherTeams(serverUrl, initialLoad.can_join_other_teams);

        if (activeTeam?.team.group_constrained) {
            fetchGroupsForTeamIfConstrained(serverUrl, initialTeamId);
        }

        fetchScheduledPosts(serverUrl, initialTeamId, true, groupLabel);

        if (initialTeamId && currentTeam && initialTeamId !== teamId) {
            DeviceEventEmitter.emit(Events.LEAVE_TEAM, currentTeam?.displayName);
        }

        logDebug('entryInitialLoad models batched', groupLabel, models.length);

        return {models, initialChannelId, initialTeamId, prefData, teamData: teamData ?? {}, chData, meData, gmConverted};
    } catch (error) {
        logError('entryInitialLoad', groupLabel, error);
        return {error};
    }
};
