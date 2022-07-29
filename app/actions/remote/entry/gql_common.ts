// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database} from '@nozbe/watermelondb';

import {markChannelAsRead, MyChannelsRequest} from '@actions/remote/channel';
import {fetchGroupsForMember} from '@actions/remote/groups';
import {fetchPostsForChannel, fetchPostsForUnreadChannels} from '@actions/remote/post';
import {MyTeamsRequest} from '@actions/remote/team';
import {fetchNewThreads} from '@actions/remote/thread';
import {MyUserRequest, updateAllUsersSince} from '@actions/remote/user';
import {gqlEntry, gqlEntryChannels, gqlOtherChannels} from '@client/graphQL/entry';
import {Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {getPreferenceValue} from '@helpers/api/preference';
import {selectDefaultTeam} from '@helpers/api/team';
import {queryAllChannels, queryAllChannelsForTeam} from '@queries/servers/channel';
import {prepareModels, truncateCrtRelatedTables} from '@queries/servers/entry';
import {getHasCRTChanged} from '@queries/servers/preference';
import {prepareCommonSystemValues} from '@queries/servers/system';
import {addChannelToTeamHistory, addTeamToTeamHistory, queryMyTeams} from '@queries/servers/team';
import {selectDefaultChannelForTeam} from '@utils/channel';
import {filterAndTransformRoles, getMemberChannelsFromGQLQuery, getMemberTeamsFromGQLQuery, gqlToClientChannelMembership, gqlToClientPreference, gqlToClientSidebarCategory, gqlToClientTeamMembership, gqlToClientUser} from '@utils/graphql';
import {isTablet} from '@utils/helpers';
import {processIsCRTEnabled} from '@utils/thread';

import {teamsToRemove, FETCH_UNREADS_TIMEOUT} from './common';

import type ClientError from '@client/rest/error';
import type ChannelModel from '@typings/database/models/servers/channel';
import type TeamModel from '@typings/database/models/servers/team';

export async function deferredAppEntryGraphQLActions(
    serverUrl: string,
    since: number,
    meData: MyUserRequest,
    teamData: MyTeamsRequest,
    chData: MyChannelsRequest | undefined,
    isTabletDevice: boolean,
    initialTeamId?: string,
    initialChannelId?: string,
    isCRTEnabled = false,
    syncDatabase?: boolean,
) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    const {database} = operator;

    // defer fetching posts for initial channel
    if (initialChannelId && isTabletDevice) {
        fetchPostsForChannel(serverUrl, initialChannelId);
        markChannelAsRead(serverUrl, initialChannelId);
    }

    setTimeout(() => {
        if (chData?.channels?.length && chData.memberships?.length) {
            // defer fetching posts for unread channels on initial team
            fetchPostsForUnreadChannels(serverUrl, chData.channels, chData.memberships, initialChannelId);
        }
    }, FETCH_UNREADS_TIMEOUT);

    if (isCRTEnabled) {
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

    if (initialTeamId) {
        const result = await getChannelData(serverUrl, initialTeamId, meData.user!.id, true);
        if ('error' in result) {
            return result;
        }

        const removeChannels = await getRemoveChannels(database, result.chData, initialTeamId, false, syncDatabase);

        const modelPromises = await prepareModels({operator, removeChannels, chData: result.chData}, true);

        modelPromises.push(operator.handleRole({roles: filterAndTransformRoles(result.roles), prepareRecordsOnly: true}));
        const models = (await Promise.all(modelPromises)).flat();
        operator.batchRecords(models);

        setTimeout(() => {
            if (result.chData?.channels?.length && result.chData.memberships?.length) {
                // defer fetching posts for unread channels on other teams
                fetchPostsForUnreadChannels(serverUrl, result.chData.channels, result.chData.memberships, initialChannelId);
            }
        }, FETCH_UNREADS_TIMEOUT);
    }

    if (meData.user?.id) {
        // Fetch groups for current user
        fetchGroupsForMember(serverUrl, meData.user?.id);
    }

    updateAllUsersSince(serverUrl, since);

    return {};
}

const getRemoveChannels = async (database: Database, chData: MyChannelsRequest | undefined, initialTeamId: string, singleTeam: boolean, syncDatabase?: boolean) => {
    const removeChannels: ChannelModel[] = [];
    if (syncDatabase) {
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

export const graphQLCommon = async (serverUrl: string, syncDatabase: boolean, currentTeamId: string, currentChannelId: string, isUpgrade = false) => {
    const dt = Date.now();

    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    const {database} = operator;

    const isTabletDevice = await isTablet();

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

    const meData = {
        user: gqlToClientUser(fetchedData.user!),
    };

    const teamData = {
        teams: getMemberTeamsFromGQLQuery(fetchedData),
        memberships: fetchedData.teamMembers.map((m) => gqlToClientTeamMembership(m, meData.user.id)),
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

    if (isUpgrade && meData?.user) {
        const me = await prepareCommonSystemValues(operator, {currentUserId: meData.user.id});
        if (me?.length) {
            await operator.batchRecords(me);
        }
    }

    let initialTeamId = currentTeamId;
    if (!teamData.teams.length) {
        initialTeamId = '';
    } else if (!initialTeamId || !teamData.teams.find((t) => t.id === currentTeamId)) {
        const teamOrderPreference = getPreferenceValue(prefData.preferences || [], Preferences.TEAMS_ORDER, '', '') as string;
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

    let initialChannelId = currentChannelId;
    if (initialTeamId !== currentTeamId || !chData?.channels?.find((c) => c.id === currentChannelId)) {
        initialChannelId = '';
        if (isTabletDevice && chData?.channels && chData.memberships) {
            initialChannelId = selectDefaultChannelForTeam(chData.channels, chData.memberships, initialTeamId, roles, meData.user.locale)?.id || '';
        }
    }

    let removeTeams: TeamModel[] = [];
    const removeChannels = await getRemoveChannels(database, chData, initialTeamId, true, syncDatabase);

    if (syncDatabase) {
        const removeTeamIds = [];

        const removedFromTeam = teamData.memberships?.filter((m) => m.delete_at > 0);
        if (removedFromTeam?.length) {
            removeTeamIds.push(...removedFromTeam.map((m) => m.team_id));
        }

        if (teamData.teams?.length === 0) {
            // User is no longer a member of any team
            const myTeams = await queryMyTeams(database).fetch();
            removeTeamIds.push(...(myTeams?.map((myTeam) => myTeam.id) || []));
        }

        removeTeams = await teamsToRemove(serverUrl, removeTeamIds);
    }

    const modelPromises = await prepareModels({operator, initialTeamId, removeTeams, removeChannels, teamData, chData, prefData, meData}, true);
    modelPromises.push(operator.handleRole({roles, prepareRecordsOnly: true}));
    modelPromises.push(prepareCommonSystemValues(
        operator,
        {
            config,
            license,
            currentTeamId: initialTeamId,
            currentChannelId: initialChannelId,
        },
    ));

    if (initialTeamId && initialTeamId !== currentTeamId) {
        const th = addTeamToTeamHistory(operator, initialTeamId, true);
        modelPromises.push(th);
    }

    if (initialTeamId !== currentTeamId && initialChannelId) {
        try {
            const tch = addChannelToTeamHistory(operator, initialTeamId, initialChannelId, true);
            modelPromises.push(tch);
        } catch {
            // do nothing
        }
    }

    const models = await Promise.all(modelPromises);
    if (models.length) {
        await operator.batchRecords(models.flat());
    }

    const isCRTEnabled = Boolean(prefData.preferences && processIsCRTEnabled(prefData.preferences, config));
    deferredAppEntryGraphQLActions(serverUrl, 0, meData, teamData, chData, isTabletDevice, initialTeamId, initialChannelId, isCRTEnabled, syncDatabase);

    const timeElapsed = Date.now() - dt;
    return {time: timeElapsed, hasTeams: Boolean(teamData.teams.length), userId: meData.user.id, error: undefined};
};
