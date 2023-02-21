// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {storeConfigAndLicense} from '@actions/local/systems';
import {fetchGroupsForMember} from '@actions/remote/groups';
import {fetchPostsForUnreadChannels} from '@actions/remote/post';
import {fetchDataRetentionPolicy} from '@actions/remote/systems';
import {MyTeamsRequest, updateCanJoinTeams} from '@actions/remote/team';
import {syncTeamThreads} from '@actions/remote/thread';
import {autoUpdateTimezone, fetchProfilesInGroupChannels, updateAllUsersSince} from '@actions/remote/user';
import {gqlEntry, gqlEntryChannels, gqlOtherChannels} from '@client/graphQL/entry';
import {General, Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {getPreferenceValue} from '@helpers/api/preference';
import {selectDefaultTeam} from '@helpers/api/team';
import {queryAllChannels, queryAllChannelsForTeam} from '@queries/servers/channel';
import {prepareModels, truncateCrtRelatedTables} from '@queries/servers/entry';
import {getHasCRTChanged} from '@queries/servers/preference';
import {getConfig, getIsDataRetentionEnabled} from '@queries/servers/system';
import {filterAndTransformRoles, getMemberChannelsFromGQLQuery, getMemberTeamsFromGQLQuery, gqlToClientChannelMembership, gqlToClientPreference, gqlToClientSidebarCategory, gqlToClientTeamMembership, gqlToClientUser} from '@utils/graphql';
import {logDebug} from '@utils/log';
import {processIsCRTEnabled} from '@utils/thread';

import {teamsToRemove, FETCH_UNREADS_TIMEOUT, entryRest, EntryResponse, entryInitialChannelId, restDeferredAppEntryActions, getRemoveTeamIds} from './common';

import type {MyChannelsRequest} from '@actions/remote/channel';
import type ClientError from '@client/rest/error';
import type {Database} from '@nozbe/watermelondb';
import type ChannelModel from '@typings/database/models/servers/channel';

const FETCH_MISSING_GM_TIMEOUT = 2500;

export async function deferredAppEntryGraphQLActions(
    serverUrl: string,
    since: number,
    currentUserId: string,
    teamData: MyTeamsRequest,
    chData: MyChannelsRequest | undefined,
    preferences: PreferenceType[] | undefined,
    config: ClientConfig,
    initialTeamId?: string,
    initialChannelId?: string,
) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    const {database} = operator;

    setTimeout(() => {
        if (chData?.channels?.length && chData.memberships?.length) {
            // defer fetching posts for unread channels on initial team
            fetchPostsForUnreadChannels(serverUrl, chData.channels, chData.memberships, initialChannelId);
        }
    }, FETCH_UNREADS_TIMEOUT);

    if (preferences && processIsCRTEnabled(preferences, config.CollapsedThreads, config.FeatureFlagCollapsedThreads, config.Version)) {
        if (initialTeamId) {
            await syncTeamThreads(serverUrl, initialTeamId);
        }

        if (teamData.teams?.length) {
            for await (const team of teamData.teams) {
                if (team.id !== initialTeamId) {
                    // need to await here since GM/DM threads in different teams overlap
                    await syncTeamThreads(serverUrl, team.id);
                }
            }
        }
    }

    if (initialTeamId) {
        const result = await getChannelData(serverUrl, initialTeamId, currentUserId, true);
        if ('error' in result) {
            return result;
        }

        const removeChannels = await getRemoveChannels(database, result.chData, initialTeamId, false);

        const modelPromises = await prepareModels({operator, removeChannels, chData: result.chData}, true);

        const roles = filterAndTransformRoles(result.roles);
        if (roles.length) {
            modelPromises.push(operator.handleRole({roles, prepareRecordsOnly: true}));
        }
        const models = (await Promise.all(modelPromises)).flat();
        operator.batchRecords(models, 'deferredAppEntryActions');

        setTimeout(() => {
            if (result.chData?.channels?.length && result.chData.memberships?.length) {
                // defer fetching posts for unread channels on other teams
                fetchPostsForUnreadChannels(serverUrl, result.chData.channels, result.chData.memberships, initialChannelId);
            }
        }, FETCH_UNREADS_TIMEOUT);
    }

    // Fetch groups for current user
    fetchGroupsForMember(serverUrl, currentUserId);

    updateCanJoinTeams(serverUrl);
    updateAllUsersSince(serverUrl, since);

    // defer sidebar GM profiles
    setTimeout(async () => {
        const gmIds = chData?.channels?.reduce<Set<string>>((acc, v) => {
            if (v?.type === General.GM_CHANNEL) {
                acc.add(v.id);
            }
            return acc;
        }, new Set<string>());
        if (gmIds?.size) {
            fetchProfilesInGroupChannels(serverUrl, Array.from(gmIds));
        }
    }, FETCH_MISSING_GM_TIMEOUT);

    return {error: undefined};
}

const getRemoveChannels = async (database: Database, chData: MyChannelsRequest | undefined, initialTeamId: string, singleTeam: boolean) => {
    const removeChannels: ChannelModel[] = [];
    if (chData?.channels) {
        const fetchedChannelIds = chData.channels?.map((channel) => channel.id);

        const query = singleTeam ? queryAllChannelsForTeam(database, initialTeamId) : queryAllChannels(database);
        const channels = await query.fetch();

        for (const channel of channels) {
            const excludeCondition = singleTeam ? true : channel.teamId !== initialTeamId && channel.teamId !== '';
            if (excludeCondition && !fetchedChannelIds?.includes(channel.id)) {
                removeChannels.push(channel);
            }
        }
    }

    return removeChannels;
};

const getChannelData = async (serverUrl: string, initialTeamId: string, userId: string, exclude: boolean): Promise<{chData: MyChannelsRequest; roles: Array<Partial<GQLRole>|undefined>} | {error: unknown}> => {
    let response;
    try {
        const request = exclude ? gqlOtherChannels : gqlEntryChannels;
        response = await request(serverUrl, initialTeamId);
    } catch (error) {
        return {error: (error as ClientError).message};
    }

    if ('error' in response) {
        return {error: response.error};
    }

    if ('errors' in response && response.errors?.length) {
        return {error: response.errors[0].message};
    }

    const channelsFetchedData = response.data;

    const chData = {
        channels: getMemberChannelsFromGQLQuery(channelsFetchedData),
        memberships: channelsFetchedData.channelMembers?.map((m) => gqlToClientChannelMembership(m, userId)),
        categories: channelsFetchedData.sidebarCategories?.map((c) => gqlToClientSidebarCategory(c, '')),
    };
    const roles = channelsFetchedData.channelMembers?.map((m) => m.roles).flat() || [];

    return {chData, roles};
};

export const entryGQL = async (serverUrl: string, currentTeamId?: string, currentChannelId?: string): Promise<EntryResponse> => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    const {database} = operator;

    let response;
    try {
        response = await gqlEntry(serverUrl);
    } catch (error) {
        return {error: (error as ClientError).message};
    }

    if ('error' in response) {
        return {error: response.error};
    }

    if ('errors' in response && response.errors?.length) {
        return {error: response.errors[0].message};
    }

    const fetchedData = response.data;

    const config = fetchedData.config || {} as ClientConfig;
    const license = fetchedData.license || {} as ClientLicense;
    await storeConfigAndLicense(serverUrl, config, license);

    const meData = {
        user: gqlToClientUser(fetchedData.user!),
    };

    const allTeams = getMemberTeamsFromGQLQuery(fetchedData);
    const allTeamMemberships = fetchedData.teamMembers.map((m) => gqlToClientTeamMembership(m, meData.user.id));

    const [nonArchivedTeams, archivedTeamIds] = allTeams.reduce((acc, t) => {
        if (t.delete_at) {
            acc[1].add(t.id);
            return acc;
        }
        return [[...acc[0], t], acc[1]];
    }, [[], new Set<string>()]);

    const nonArchivedTeamMemberships = allTeamMemberships.filter((m) => !archivedTeamIds.has(m.team_id));

    const teamData = {
        teams: nonArchivedTeams,
        memberships: nonArchivedTeamMemberships,
    };

    const prefData = {
        preferences: fetchedData.user?.preferences?.map(gqlToClientPreference),
    };

    if (prefData.preferences) {
        const crtToggled = await getHasCRTChanged(database, prefData.preferences);
        if (crtToggled) {
            const {error} = await truncateCrtRelatedTables(serverUrl);
            if (error) {
                return {error: `Resetting CRT on ${serverUrl} failed`};
            }
        }
    }

    let initialTeamId = currentTeamId;
    if (!teamData.teams.length) {
        initialTeamId = '';
    } else if (!initialTeamId || !teamData.teams.find((t) => t.id === currentTeamId && t.delete_at === 0)) {
        const teamOrderPreference = getPreferenceValue<string>(prefData.preferences || [], Preferences.CATEGORIES.TEAMS_ORDER, '', '');
        initialTeamId = selectDefaultTeam(teamData.teams, meData.user.locale, teamOrderPreference, config.ExperimentalPrimaryTeam)?.id || '';
    }
    const gqlRoles = [
        ...fetchedData.user?.roles || [],
        ...fetchedData.teamMembers?.map((m) => m.roles).flat() || [],
    ];

    let chData;
    if (initialTeamId) {
        const result = await getChannelData(serverUrl, initialTeamId, meData.user.id, false);
        if ('error' in result) {
            return result;
        }

        chData = result.chData;
        gqlRoles.push(...result.roles);
    }

    const roles = filterAndTransformRoles(gqlRoles);

    const initialChannelId = await entryInitialChannelId(database, currentChannelId, currentTeamId, initialTeamId, meData.user.id, chData?.channels, chData?.memberships);
    const removeChannels = await getRemoveChannels(database, chData, initialTeamId, true);
    const removeTeamIds = await getRemoveTeamIds(database, teamData);
    const removeTeams = await teamsToRemove(serverUrl, removeTeamIds);

    const modelPromises = await prepareModels({operator, initialTeamId, removeTeams, removeChannels, teamData, chData, prefData, meData}, true);
    if (roles.length) {
        modelPromises.push(operator.handleRole({roles, prepareRecordsOnly: true}));
    }
    const models = (await Promise.all(modelPromises)).flat();
    return {models, initialTeamId, initialChannelId, prefData, teamData, chData, meData};
};

export const entry = async (serverUrl: string, teamId?: string, channelId?: string, since = 0): Promise<EntryResponse> => {
    const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
    const config = await getConfig(database);
    let result;
    if (config?.FeatureFlagGraphQL === 'true') {
        result = await entryGQL(serverUrl, teamId, channelId);
        if ('error' in result) {
            logDebug('Error using GraphQL, trying REST', result.error);
            result = entryRest(serverUrl, teamId, channelId, since);
        }
    } else {
        result = entryRest(serverUrl, teamId, channelId, since);
    }

    // Fetch data retention policies
    const isDataRetentionEnabled = await getIsDataRetentionEnabled(database);
    if (isDataRetentionEnabled) {
        fetchDataRetentionPolicy(serverUrl);
    }

    return result;
};

export async function deferredAppEntryActions(
    serverUrl: string, since: number, currentUserId: string, currentUserLocale: string, preferences: PreferenceType[] | undefined,
    config: ClientConfig, license: ClientLicense | undefined, teamData: MyTeamsRequest, chData: MyChannelsRequest | undefined,
    initialTeamId?: string, initialChannelId?: string) {
    let result;
    if (config?.FeatureFlagGraphQL === 'true') {
        result = await deferredAppEntryGraphQLActions(serverUrl, since, currentUserId, teamData, chData, preferences, config, initialTeamId, initialChannelId);
        if (result.error) {
            logDebug('Error using GraphQL, trying REST', result.error);
            result = restDeferredAppEntryActions(serverUrl, since, currentUserId, currentUserLocale, preferences, config, license, teamData, chData, initialTeamId, initialChannelId);
        }
    } else {
        result = restDeferredAppEntryActions(serverUrl, since, currentUserId, currentUserLocale, preferences, config, license, teamData, chData, initialTeamId, initialChannelId);
    }

    autoUpdateTimezone(serverUrl);

    return result;
}
