// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {chunk} from 'lodash';
import {DeviceEventEmitter} from 'react-native';

import {removeUserFromTeam as localRemoveUserFromTeam} from '@actions/local/team';
import {fetchScheduledPosts} from '@actions/remote/scheduled_post';
import {PER_PAGE_DEFAULT} from '@client/rest/constants';
import {Events} from '@constants';
import DatabaseManager from '@database/manager';
import {removeDuplicatesModels} from '@helpers/database';
import NetworkManager from '@managers/network_manager';
import {getActiveServerUrl} from '@queries/app/servers';
import {prepareCategoriesAndCategoriesChannels} from '@queries/servers/categories';
import {prepareMyChannelsForTeam, getDefaultChannelForTeam, prepareDeleteChannel, queryChannelsById, queryMyChannelsByTeam, queryAllChannelsForTeam} from '@queries/servers/channel';
import {prepareEntryModels} from '@queries/servers/entry';
import {prepareCommonSystemValues, getCurrentTeamId, getCurrentUserId, getLastTeamLoad, setLastTeamLoad} from '@queries/servers/system';
import {addTeamToTeamHistory, prepareDeleteTeam, prepareMyTeams, getNthLastChannelFromTeam, queryTeamsById, getLastTeam, getTeamById, removeTeamFromTeamHistory} from '@queries/servers/team';
import {getIsCRTEnabled} from '@queries/servers/thread';
import {navigateToRoot} from '@screens/navigation';
import ChannelsSyncStore from '@store/channels_sync_store';
import EphemeralStore from '@store/ephemeral_store';
import {setTeamLoading} from '@store/team_load_store';
import {getFullErrorMessage, isErrorWithStatusCode} from '@utils/errors';
import {isTablet} from '@utils/helpers';
import {logDebug} from '@utils/log';

import {fetchMyChannelsForTeam, switchToChannelById} from './channel';
import {fetchGroupsForTeamIfConstrained} from './groups';
import {fetchPostsForChannel} from './post';
import {fetchRolesIfNeeded} from './role';
import {forceLogoutIfNecessary} from './session';
import {syncThreadsIfNeeded} from './thread';

import type {Client} from '@client/rest';
import type {Model} from '@nozbe/watermelondb';

export type MyTeamsRequest = {
    teams?: Team[];
    memberships?: TeamMembership[];
    error?: unknown;
}

export async function addCurrentUserToTeam(serverUrl: string, teamId: string, fetchOnly = false) {
    let database;
    try {
        database = DatabaseManager.getServerDatabaseAndOperator(serverUrl).database;
    } catch (error) {
        return {error};
    }

    const currentUserId = await getCurrentUserId(database);

    if (!currentUserId) {
        return {error: 'no current user'};
    }
    return addUserToTeam(serverUrl, teamId, currentUserId, fetchOnly);
}

export async function addUserToTeam(serverUrl: string, teamId: string, userId: string, fetchOnly = false) {
    let loadEventSent = false;
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        EphemeralStore.startAddingToTeam(teamId);
        const team = await client.getTeam(teamId);
        const member = await client.addToTeam(teamId, userId);

        if (!fetchOnly) {
            setTeamLoading(serverUrl, true);
            loadEventSent = true;

            fetchRolesIfNeeded(serverUrl, member.roles.split(' '));
            const {channels, memberships: channelMembers, categories} = await fetchMyChannelsForTeam(serverUrl, teamId, false, 0, true);
            const myTeams: MyTeam[] = [{
                id: member.team_id,
                roles: member.roles,
            }];

            const models: Model[] = (await Promise.all([
                operator.handleTeam({teams: [team], prepareRecordsOnly: true}),
                operator.handleMyTeam({myTeams, prepareRecordsOnly: true}),
                operator.handleTeamMemberships({teamMemberships: [member], prepareRecordsOnly: true}),
                ...await prepareMyChannelsForTeam(operator, teamId, channels || [], channelMembers || []),
                prepareCategoriesAndCategoriesChannels(operator, categories || [], true),
            ])).flat();

            await operator.batchRecords(models, 'addUserToTeam');
            setTeamLoading(serverUrl, false);
            loadEventSent = false;

            if (isTablet()) {
                const channel = await getDefaultChannelForTeam(database, teamId);
                if (channel) {
                    fetchPostsForChannel(serverUrl, channel.id);
                }
            }
        }
        EphemeralStore.finishAddingToTeam(teamId);
        updateCanJoinTeams(serverUrl);
        return {member};
    } catch (error) {
        logDebug('error on addUserToTeam', getFullErrorMessage(error));
        if (loadEventSent) {
            setTeamLoading(serverUrl, false);
        }
        EphemeralStore.finishAddingToTeam(teamId);
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export async function addUsersToTeam(serverUrl: string, teamId: string, userIds: string[], fetchOnly = false): Promise<{members: TeamMemberWithError[]; error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        EphemeralStore.startAddingToTeam(teamId);

        const members = await client.addUsersToTeamGracefully(teamId, userIds);

        if (!fetchOnly) {
            const teamMemberships: TeamMembership[] = [];
            const roles = [];

            for (const {member} of members) {
                teamMemberships.push(member);
                roles.push(...member.roles.split(' '));
            }

            fetchRolesIfNeeded(serverUrl, Array.from(new Set(roles)));

            if (operator) {
                await operator.handleTeamMemberships({teamMemberships, prepareRecordsOnly: true});
            }
        }

        EphemeralStore.finishAddingToTeam(teamId);
        return {members};
    } catch (error) {
        logDebug('error on addUsersToTeam', getFullErrorMessage(error));
        if (EphemeralStore.isAddingToTeam(teamId)) {
            EphemeralStore.finishAddingToTeam(teamId);
        }

        forceLogoutIfNecessary(serverUrl, error);
        return {members: [], error};
    }
}

export async function sendEmailInvitesToTeam(serverUrl: string, teamId: string, emails: string[]): Promise<{members: TeamInviteWithError[]; error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const members = await client.sendEmailInvitesToTeamGracefully(teamId, emails);

        return {members, error: undefined};
    } catch (error) {
        logDebug('error on sendEmailInvitesToTeam', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {members: [], error};
    }
}

export async function sendGuestEmailInvitesToTeam(serverUrl: string, teamId: string, emails: string[], channels: string[], message = '', guestMagicLink = false): Promise<{members: TeamInviteWithError[]; error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const members = await client.sendGuestEmailInvitesToTeamGracefully(teamId, emails, channels, message, guestMagicLink);

        return {members, error: undefined};
    } catch (error) {
        logDebug('error on sendGuestEmailInvitesToTeam', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {members: [], error};
    }
}

export async function fetchMyTeams(serverUrl: string, fetchOnly = false, groupLabel?: RequestGroupLabel): Promise<MyTeamsRequest> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const [teams, memberships]: [Team[], TeamMembership[]] = await Promise.all([
            client.getMyTeams(groupLabel),
            client.getMyTeamMembers(groupLabel),
        ]);

        if (!fetchOnly) {
            const modelPromises: Array<Promise<Model[]>> = [];
            if (operator) {
                const removeTeamIds = new Set(memberships.filter((m) => m.delete_at > 0).map((m) => m.team_id));
                const remainingTeams = teams.filter((t) => !removeTeamIds.has(t.id));
                const prepare = prepareMyTeams(operator, remainingTeams, memberships);
                if (prepare) {
                    modelPromises.push(...prepare);
                }

                if (removeTeamIds.size) {
                    // Immediately delete myTeams so that the UI renders only teams the user is a member of.
                    const removeTeams = await queryTeamsById(database, Array.from(removeTeamIds)).fetch();
                    removeTeams.forEach((team) => {
                        modelPromises.push(prepareDeleteTeam(serverUrl, team));
                    });
                }

                if (modelPromises.length) {
                    const models = await Promise.all(modelPromises);
                    const flattenedModels = models.flat();
                    if (flattenedModels.length > 0) {
                        await operator.batchRecords(flattenedModels, 'fetchMyTeams');
                    }
                }
            }
        }

        return {teams, memberships};
    } catch (error) {
        logDebug('error on fetchMyTeams', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export async function fetchTeamById(serverUrl: string, teamId: string) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const team = await client.getTeam(teamId);
        return {team};
    } catch (error) {
        logDebug('error on fetchTeamById', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export async function fetchMyTeam(serverUrl: string, teamId: string, fetchOnly = false, groupLabel?: RequestGroupLabel): Promise<MyTeamsRequest> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const [team, membership] = await Promise.all([
            client.getTeam(teamId, groupLabel),
            client.getTeamMember(teamId, 'me', groupLabel),
        ]);
        if (!fetchOnly) {
            const modelPromises = prepareMyTeams(operator, [team], [membership]);
            if (modelPromises.length) {
                const models = await Promise.all(modelPromises);
                const flattenedModels = models.flat();
                if (flattenedModels?.length > 0) {
                    await operator.batchRecords(flattenedModels, 'fetchMyTeam');
                }
            }
        }

        return {teams: [team], memberships: [membership]};
    } catch (error) {
        logDebug('error on fetchMyTeam', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export const fetchAllTeams = async (serverUrl: string, page = 0, perPage = PER_PAGE_DEFAULT): Promise<{teams?: Team[]; error?: unknown}> => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const teams = await client.getTeams(page, perPage);
        return {teams};
    } catch (error) {
        logDebug('error on fetchAllTeams', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

const recCanJoinTeams = async (client: Client, myTeamsIds: Set<string>, page: number, groupLabel?: RequestGroupLabel): Promise<boolean> => {
    const fetchedTeams = await client.getTeams(page, PER_PAGE_DEFAULT, false, groupLabel);
    if (fetchedTeams.find((t) => !myTeamsIds.has(t.id) && t.delete_at === 0)) {
        return true;
    }

    if (fetchedTeams.length === PER_PAGE_DEFAULT) {
        return recCanJoinTeams(client, myTeamsIds, page + 1, groupLabel);
    }

    return false;
};

const LOAD_MORE_THRESHOLD = 10;
export async function fetchTeamsForComponent(
    serverUrl: string,
    page: number,
    joinedIds?: Set<string>,
    alreadyLoaded: Team[] = [],
): Promise<{teams: Team[]; hasMore: boolean; page: number}> {
    let hasMore = true;
    const {teams, error} = await fetchAllTeams(serverUrl, page, PER_PAGE_DEFAULT);
    if (error || !teams || teams.length < PER_PAGE_DEFAULT) {
        hasMore = false;
    }

    if (error) {
        return {teams: alreadyLoaded, hasMore, page};
    }

    if (teams?.length) {
        const notJoinedTeams = joinedIds ? teams.filter((t) => !joinedIds.has(t.id)) : teams;
        alreadyLoaded.push(...notJoinedTeams);

        if (teams.length < PER_PAGE_DEFAULT) {
            hasMore = false;
        }

        if (
            hasMore &&
            (alreadyLoaded.length > LOAD_MORE_THRESHOLD)
        ) {
            return fetchTeamsForComponent(serverUrl, page + 1, joinedIds, alreadyLoaded);
        }

        return {teams: alreadyLoaded, hasMore, page: page + 1};
    }

    return {teams: alreadyLoaded, hasMore: false, page};
}

export const updateCanJoinTeams = async (serverUrl: string, groupLabel?: RequestGroupLabel) => {
    try {
        const client = NetworkManager.getClient(serverUrl);

        const myTeams = await client.getMyTeams(groupLabel);
        const myTeamsIds = new Set(myTeams.map((m) => m.id));

        const canJoin = await recCanJoinTeams(client, myTeamsIds, 0, groupLabel);

        EphemeralStore.setCanJoinOtherTeams(serverUrl, canJoin);
        return {};
    } catch (error) {
        // Preserve the last known value on transient failures so a spotty
        // connection doesn't hide the Join Team affordance for users who can
        // legitimately join. The ephemeral store defaults to false, so this
        // only retains a previously-computed value.
        logDebug('error on updateCanJoinTeams', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export const fetchTeamsThreads = async (
    serverUrl: string, since: number, teams: Team[], isCRTEnabled?: boolean, fetchOnly = false, groupLabel?: RequestGroupLabel,
) => {
    try {
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const result: Model[] = [];

        // process up to 15 teams at a time
        const chunks = chunk(teams, 15);
        for await (const myTeams of chunks) {
            const models: Model[] = [];
            const threads = await syncThreadsIfNeeded(serverUrl, isCRTEnabled ?? false, myTeams, true, groupLabel);
            if (threads.models) {
                models.push(...threads.models);
            }

            if (!fetchOnly && models.length) {
                await operator.batchRecords(removeDuplicatesModels(models), 'fetchTeamsThreads');
            }

            if (models.length) {
                result.push(...models);
            }
        }

        return {error: undefined, models: result};
    } catch (error) {
        logDebug('error on fetchTeamsThreads', getFullErrorMessage(error));
        return {error};
    }
};

export async function fetchTeamByName(serverUrl: string, teamName: string, fetchOnly = false) {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const team = await client.getTeamByName(teamName);

        if (!fetchOnly) {
            const models = await operator.handleTeam({teams: [team], prepareRecordsOnly: true});
            await operator.batchRecords(models, 'fetchTeamByName');
        }

        return {team};
    } catch (error) {
        logDebug('error on fetchTeamByName', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
}

export const removeCurrentUserFromTeam = async (serverUrl: string, teamId: string, fetchOnly = false) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const userId = await getCurrentUserId(database);
        return removeUserFromTeam(serverUrl, teamId, userId, fetchOnly);
    } catch (error) {
        return {error};
    }
};

export const removeUserFromTeam = async (serverUrl: string, teamId: string, userId: string, fetchOnly = false) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        await client.removeFromTeam(teamId, userId);

        if (!fetchOnly) {
            localRemoveUserFromTeam(serverUrl, teamId);
            updateCanJoinTeams(serverUrl);
        }

        return {};
    } catch (error) {
        logDebug('error on removeUserFromTeam', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {error};
    }
};

export async function fetchTeamLoad(serverUrl: string, teamId: string, isCRTEnabled: boolean): Promise<{error?: unknown}> {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const client = NetworkManager.getClient(serverUrl);

        const since = await getLastTeamLoad(database, teamId);

        const teamLoad: TeamLoadResponse = await client.getTeamLoad(teamId, since || undefined);

        const chData = {
            channels: teamLoad.channels.map((c) => ({
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
                group_constrained: c.group_constrained,
                shared: c.shared,
                total_msg_count_root: c.total_msg_count_root ?? 0,
                last_root_post_at: c.last_root_post_at ?? 0,
                policy_enforced: c.policy_enforced ?? false,
                header: '',
                purpose: '',
                scheme_id: '',
                props: null,
            } as unknown as Channel)),
            memberships: teamLoad.channel_members.members.map((m) => ({
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
                notify_props: m.notify_props,
            } as ChannelMembership)),
            categories: teamLoad.sidebar_categories?.categories ?? [],
        };

        const memberCountOverrides: Record<string, number> = {};
        for (const c of teamLoad.channels) {
            if (c.type === 'G' && (c.member_count ?? 0) > 0) {
                memberCountOverrides[c.id] = c.member_count!;
            }
        }

        // Filter out removed channels before preparing models — avoids preparing
        // the same channel both as a live record and a tombstone in the same batch.
        const removedChannelIds = teamLoad.channel_members.removed_channel_ids ?? [];
        if (removedChannelIds.length && chData.channels.length) {
            const chanIds = new Set(removedChannelIds);
            chData.channels = chData.channels.filter((c) => !chanIds.has(c.id));
        }

        const modelPromises = await prepareEntryModels({operator, chData, isCRTEnabled, memberCountOverrides});

        // Tombstones: remove channels the user left since the cursor.
        if (removedChannelIds.length) {
            const channelsToDelete = await queryChannelsById(database, removedChannelIds).fetch();
            for (const channel of channelsToDelete) {
                modelPromises.push(prepareDeleteChannel(serverUrl, channel));
            }
        }

        // Roles from the team load response.
        if (teamLoad.roles?.length) {
            modelPromises.push(operator.handleRole({
                roles: teamLoad.roles.map((r) => ({
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

        // Persist cursors alongside the data in the same batch.
        modelPromises.push(setLastTeamLoad(operator, teamId, teamLoad.timestamp, true));

        const models = (await Promise.all(modelPromises)).flat();
        if (models.length) {
            await operator.batchRecords(models, 'fetchTeamLoad');
        }

        // All of this team's channels are now in the DB — flip the gate so the
        // badge observable can switch from the TEAM_BADGE_COUNTS blob to the DB sum.
        ChannelsSyncStore.markChannelsFetched(serverUrl, teamId);

        return {};
    } catch (error) {
        logDebug('error on fetchTeamLoad', getFullErrorMessage(error));
        if (isErrorWithStatusCode(error) && error.status_code === 403) {
            // Team deleted, user removed, or no longer a member — clean up local data.
            await localRemoveUserFromTeam(serverUrl, teamId);
            await handleKickFromTeam(serverUrl, teamId);
        } else {
            forceLogoutIfNecessary(serverUrl, error);
        }
        return {error};
    }
}

export async function handleTeamChange(serverUrl: string, teamId: string) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: 'no database'};
    }
    const {database} = operator;

    const currentTeamId = await getCurrentTeamId(database);

    if (currentTeamId === teamId) {
        return {};
    }

    let channelId = '';
    const teamHasChannels = (await queryAllChannelsForTeam(database, teamId).fetch()).length > 0;
    if (!teamHasChannels) {
        DeviceEventEmitter.emit(Events.TEAM_SWITCH, true);
    }

    if (EphemeralStore.getExperienceAPIEnabled(serverUrl)) {
        // Fetch channels + members + sidebar for this team before completing the switch
        // so the channel list is populated when the screen appears.
        const isCRTEnabled = await getIsCRTEnabled(database);
        const hasChannels = (await queryMyChannelsByTeam(database, teamId).fetch()).length > 0;
        if (hasChannels) {
            fetchTeamLoad(serverUrl, teamId, isCRTEnabled);
        } else {
            const result = await fetchTeamLoad(serverUrl, teamId, isCRTEnabled);
            if (result.error) {
                // fetchTeamLoad already cleaned up local data and navigated away on 403.
                DeviceEventEmitter.emit(Events.TEAM_SWITCH, false);
                return {error: result.error};
            }
        }
    }

    if (isTablet()) {
        channelId = await getNthLastChannelFromTeam(database, teamId);
        if (channelId) {
            await switchToChannelById(serverUrl, channelId, teamId);
            DeviceEventEmitter.emit(Events.TEAM_SWITCH, false);
            return {};
        }
    }

    const models = [];
    const system = await prepareCommonSystemValues(operator, {currentChannelId: channelId, currentTeamId: teamId, lastUnreadChannelId: ''});
    if (system?.length) {
        models.push(...system);
    }
    const history = await addTeamToTeamHistory(operator, teamId, true);
    if (history.length) {
        models.push(...history);
    }

    if (models.length) {
        await operator.batchRecords(models, 'handleTeamChange');
    }

    DeviceEventEmitter.emit(Events.TEAM_SWITCH, false);

    // Fetch Groups + GroupTeams
    fetchGroupsForTeamIfConstrained(serverUrl, teamId);
    fetchScheduledPosts(serverUrl, teamId, false);
    return {};
}

export async function handleKickFromTeam(serverUrl: string, teamId: string) {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const currentTeamId = await getCurrentTeamId(database);
        if (currentTeamId !== teamId) {
            return {};
        }

        const currentServer = await getActiveServerUrl();
        if (currentServer === serverUrl) {
            const team = await getTeamById(database, teamId);
            DeviceEventEmitter.emit(Events.LEAVE_TEAM, team?.displayName);
            await navigateToRoot();
        }

        await removeTeamFromTeamHistory(operator, teamId);
        const teamToJumpTo = await getLastTeam(database, teamId);
        if (teamToJumpTo) {
            await handleTeamChange(serverUrl, teamToJumpTo);
        }

        return {};

        // Resetting to team select handled by the home screen
    } catch (error) {
        logDebug('Failed to kick user from team', error);
        return {error};
    }
}

export async function getTeamMembersByIds(serverUrl: string, teamId: string, userIds: string[], fetchOnly?: boolean): Promise<{members: TeamMembership[]; error?: unknown}> {
    try {
        const client = NetworkManager.getClient(serverUrl);
        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const members = await client.getTeamMembersByIds(teamId, userIds);

        if (!fetchOnly) {
            const roles = [];

            for (const {roles: memberRoles} of members) {
                roles.push(...memberRoles.split(' '));
            }

            fetchRolesIfNeeded(serverUrl, Array.from(new Set(roles)));

            await operator.handleTeamMemberships({teamMemberships: members, prepareRecordsOnly: true});
        }

        return {members};
    } catch (error) {
        logDebug('error on getTeamMembersByIds', getFullErrorMessage(error));
        forceLogoutIfNecessary(serverUrl, error);
        return {members: [], error};
    }
}

export const buildTeamIconUrl = (serverUrl: string, teamId: string, timestamp = 0) => {
    try {
        const client = NetworkManager.getClient(serverUrl);
        return client.getTeamIconUrl(teamId, timestamp);
    } catch (error) {
        return '';
    }
};
