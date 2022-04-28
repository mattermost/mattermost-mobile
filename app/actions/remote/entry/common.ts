// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchChannelStats, fetchMissingSidebarInfo, fetchMyChannelsForTeam, markChannelAsRead, MyChannelsRequest} from '@actions/remote/channel';
import {fetchPostsForChannel, fetchPostsForUnreadChannels} from '@actions/remote/post';
import {MyPreferencesRequest, fetchMyPreferences} from '@actions/remote/preference';
import {fetchConfigAndLicense} from '@actions/remote/systems';
import {fetchAllTeams, fetchMyTeams, fetchTeamsChannelsAndUnreadPosts, MyTeamsRequest} from '@actions/remote/team';
import {fetchMe, MyUserRequest, updateAllUsersSince} from '@actions/remote/user';
import {gqlEntry} from '@app/client/graphQL/entry';
import {gqlToClientChannel, gqlToClientChannelMembership, gqlToClientPreference, gqlToClientRole, gqlToClientSidebarCategory, gqlToClientTeam, gqlToClientTeamMembership, gqlToClientUser} from '@app/client/graphQL/types';
import {prepareModels} from '@app/queries/servers/entry';
import {isTablet} from '@app/utils/helpers';
import {Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {getPreferenceValue, getTeammateNameDisplaySetting} from '@helpers/api/preference';
import {selectDefaultTeam} from '@helpers/api/team';
import {DEFAULT_LOCALE} from '@i18n';
import NetworkManager from '@managers/network_manager';
import {getDeviceToken} from '@queries/app/global';
import {queryAllServers} from '@queries/app/servers';
import {queryAllChannels, queryAllChannelsForTeam} from '@queries/servers/channel';
import {getConfig, prepareCommonSystemValues} from '@queries/servers/system';
import {addChannelToTeamHistory, addTeamToTeamHistory, deleteMyTeams, getAvailableTeamIds, queryMyTeams, queryMyTeamsByIds, queryTeamsById} from '@queries/servers/team';
import ChannelModel from '@typings/database/models/servers/channel';
import TeamModel from '@typings/database/models/servers/team';
import {isDMorGM, selectDefaultChannelForTeam} from '@utils/channel';
import {isCRTEnabled} from '@utils/thread';

import {fetchNewThreads} from '../thread';

import type ClientError from '@client/rest/error';

export type AppEntryData = {
    initialTeamId: string;
    teamData: MyTeamsRequest;
    chData?: MyChannelsRequest;
    prefData: MyPreferencesRequest;
    meData: MyUserRequest;
    removeTeamIds?: string[];
    removeChannelIds?: string[];
}

export type AppEntryError = {
    error?: Error | ClientError | string;
}

export const teamsToRemove = async (serverUrl: string, removeTeamIds?: string[]) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return [];
    }

    const {database} = operator;
    if (removeTeamIds?.length) {
        // Immediately delete myTeams so that the UI renders only teams the user is a member of.
        const removeMyTeams = await queryMyTeamsByIds(database, removeTeamIds).fetch();
        if (removeMyTeams?.length) {
            await deleteMyTeams(operator, removeMyTeams);
            const ids = removeMyTeams.map((m) => m.id);
            const removeTeams = await queryTeamsById(database, ids).fetch();
            return removeTeams;
        }
    }

    return [];
};

export const fetchAppEntryData = async (serverUrl: string, since: number, initialTeamId: string): Promise<AppEntryData | AppEntryError> => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    const includeDeletedChannels = true;
    const fetchOnly = true;

    await fetchConfigAndLicense(serverUrl);

    // Fetch in parallel teams / team membership / channels for current team / user preferences / user
    const promises: [Promise<MyTeamsRequest>, Promise<MyChannelsRequest | undefined>, Promise<MyPreferencesRequest>, Promise<MyUserRequest>] = [
        fetchMyTeams(serverUrl, fetchOnly),
        initialTeamId ? fetchMyChannelsForTeam(serverUrl, initialTeamId, includeDeletedChannels, since, fetchOnly) : Promise.resolve(undefined),
        fetchMyPreferences(serverUrl, fetchOnly),
        fetchMe(serverUrl, fetchOnly),
    ];

    const removeTeamIds: string[] = [];
    const resolution = await Promise.all(promises);
    const [teamData, , prefData, meData] = resolution;
    let [, chData] = resolution;

    if (!initialTeamId && teamData.teams?.length && teamData.memberships?.length) {
        // If no initial team was set in the database but got teams in the response
        const config = await getConfig(database);
        const teamOrderPreference = getPreferenceValue(prefData.preferences || [], Preferences.TEAMS_ORDER, '', '') as string;
        const teamMembers = new Set(teamData.memberships.filter((m) => m.delete_at === 0).map((m) => m.team_id));
        const myTeams = teamData.teams!.filter((t) => teamMembers.has(t.id));
        const defaultTeam = selectDefaultTeam(myTeams, meData.user?.locale || DEFAULT_LOCALE, teamOrderPreference, config?.ExperimentalPrimaryTeam);
        if (defaultTeam?.id) {
            chData = await fetchMyChannelsForTeam(serverUrl, defaultTeam.id, includeDeletedChannels, since, fetchOnly);
        }
    }

    const removedFromTeam = teamData.memberships?.filter((m) => m.delete_at > 0);
    if (removedFromTeam?.length) {
        removeTeamIds.push(...removedFromTeam.map((m) => m.team_id));
    }

    let data: AppEntryData = {
        initialTeamId,
        teamData,
        chData,
        prefData,
        meData,
        removeTeamIds,
    };

    if (teamData.teams?.length === 0 && !teamData.error) {
        // User is no longer a member of any team
        const myTeams = await queryMyTeams(database).fetch();
        removeTeamIds.push(...(myTeams.map((myTeam) => myTeam.id) || []));

        return {
            ...data,
            initialTeamId: '',
            removeTeamIds,
        };
    }

    const inTeam = teamData.teams?.find((t) => t.id === initialTeamId);
    const chError = chData?.error as ClientError | undefined;
    if ((!inTeam && !teamData.error) || chError?.status_code === 403) {
        // User is no longer a member of the current team
        if (!removeTeamIds.includes(initialTeamId)) {
            removeTeamIds.push(initialTeamId);
        }

        const availableTeamIds = await getAvailableTeamIds(database, initialTeamId, teamData.teams, prefData.preferences, meData.user?.locale);
        const alternateTeamData = await fetchAlternateTeamData(serverUrl, availableTeamIds, removeTeamIds, includeDeletedChannels, since, fetchOnly);

        data = {
            ...data,
            ...alternateTeamData,
        };
    }

    if (data.chData?.channels) {
        const removeChannelIds: string[] = [];
        const fetchedChannelIds = new Set(data.chData.channels.map((channel) => channel.id));

        const channels = await queryAllChannelsForTeam(database, initialTeamId).fetch();
        for (const channel of channels) {
            if (!fetchedChannelIds.has(channel.id)) {
                removeChannelIds.push(channel.id);
            }
        }

        data = {
            ...data,
            removeChannelIds,
        };
    }

    return data;
};

export const fetchAlternateTeamData = async (
    serverUrl: string, availableTeamIds: string[], removeTeamIds: string[],
    includeDeleted = true, since = 0, fetchOnly = false) => {
    let initialTeamId = '';
    let chData;

    for (const teamId of availableTeamIds) {
        // eslint-disable-next-line no-await-in-loop
        chData = await fetchMyChannelsForTeam(serverUrl, teamId, includeDeleted, since, fetchOnly);
        const chError = chData.error as ClientError | undefined;
        if (chError?.status_code === 403) {
            removeTeamIds.push(teamId);
        } else {
            initialTeamId = teamId;
            break;
        }
    }

    if (chData) {
        return {initialTeamId, chData, removeTeamIds};
    }

    return {initialTeamId, removeTeamIds};
};

export async function deferredAppEntryActions(
    serverUrl: string, since: number, currentUserId: string, currentUserLocale: string, preferences: PreferenceType[] | undefined,
    config: ClientConfig, license: ClientLicense, teamData: MyTeamsRequest, chData: MyChannelsRequest | undefined,
    initialTeamId?: string, initialChannelId?: string, useGraphQL = false) {
    // defer fetching posts for initial channel
    if (initialChannelId) {
        fetchPostsForChannel(serverUrl, initialChannelId);
        markChannelAsRead(serverUrl, initialChannelId);
        fetchChannelStats(serverUrl, initialChannelId);
    }

    // defer sidebar DM & GM profiles
    if (chData?.channels?.length && chData.memberships?.length) {
        const directChannels = chData.channels.filter(isDMorGM);
        const channelsToFetchProfiles = new Set<Channel>(directChannels);
        if (!useGraphQL && channelsToFetchProfiles.size) {
            const teammateDisplayNameSetting = getTeammateNameDisplaySetting(preferences || [], config, license);
            await fetchMissingSidebarInfo(serverUrl, Array.from(channelsToFetchProfiles), currentUserLocale, teammateDisplayNameSetting, currentUserId);
        }

        // defer fetching posts for unread channels on initial team
        fetchPostsForUnreadChannels(serverUrl, chData.channels, chData.memberships, initialChannelId);
    }

    // defer fetch channels and unread posts for other teams
    if (!useGraphQL && teamData.teams?.length && teamData.memberships?.length) {
        await fetchTeamsChannelsAndUnreadPosts(serverUrl, since, teamData.teams, teamData.memberships, initialTeamId);
    }

    if (preferences && isCRTEnabled(preferences, config)) {
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
    updateAllUsersSince(serverUrl, since);
}

export const registerDeviceToken = async (serverUrl: string) => {
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    const appDatabase = DatabaseManager.appDatabase?.database;
    if (appDatabase) {
        const deviceToken = await getDeviceToken(appDatabase);
        if (deviceToken) {
            client.attachDevice(deviceToken);
        }
    }

    return {error: undefined};
};

export const syncOtherServers = async (serverUrl: string) => {
    const database = DatabaseManager.appDatabase?.database;
    if (database) {
        const servers = await queryAllServers(database);
        for (const server of servers) {
            if (server.url !== serverUrl && server.lastActiveAt > 0) {
                registerDeviceToken(server.url);
                syncAllChannelMembers(server.url);
            }
        }
    }
};

const syncAllChannelMembers = async (serverUrl: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return;
    }

    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch {
        return;
    }

    try {
        const myTeams = await client.getMyTeams();
        let excludeDirect = false;
        for (const myTeam of myTeams) {
            fetchMyChannelsForTeam(serverUrl, myTeam.id, false, 0, false, excludeDirect);
            excludeDirect = true;
        }
    } catch {
        // Do nothing
    }
};

export const graphQLCommon = async (serverUrl: string, syncDatabase: boolean, currentTeamId: string, currentChannelId: string) => {
    console.log('using graphQL');
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
        console.log('error1', response);
        return {error: response.error};
    }

    if ('errors' in response && response.errors?.length) {
        console.log('error2', response);
        return {error: response.errors[0].message};
    }

    const fetchedData = response.data;

    const config = fetchedData.config || {} as ClientConfig;
    const license = fetchedData.license || {} as ClientLicense;

    const teamData = {
        teams: fetchedData.teamMembers.map((m) => gqlToClientTeam(m.team!)),
        memberships: fetchedData.teamMembers.map((m) => gqlToClientTeamMembership(m)),
    };

    const chData = {
        channels: fetchedData.channelMembers?.map((m) => gqlToClientChannel(m.channel!)),
        memberships: fetchedData.channelMembers?.map((m) => gqlToClientChannelMembership(m)),
        categories: fetchedData.teamMembers.map((m) => m.sidebarCategories!.map((c) => gqlToClientSidebarCategory(c, m.team!.id!))).flat(),
    };

    const prefData = {
        preferences: fetchedData.user?.preferences?.map((p) => gqlToClientPreference(p)),
    };

    const meData = {
        user: gqlToClientUser(fetchedData.user!),
    };

    const roles = [
        ...fetchedData.user?.roles || [],
        ...fetchedData.channelMembers?.map((m) => m.roles).flat() || [],
        ...fetchedData.teamMembers?.map((m) => m.roles).flat() || [],
    ].filter((v, i, a) => a.slice(0, i).find((v2) => v?.name === v2?.name)).map((r) => gqlToClientRole(r!));

    let removeTeams: TeamModel[] = [];
    const removeChannels: ChannelModel[] = [];

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

        if (chData?.channels) {
            const fetchedChannelIds = chData.channels.map((channel) => channel.id);

            const channels = await queryAllChannels(database).fetch();
            for (const channel of channels) {
                if (!fetchedChannelIds.includes(channel.id)) {
                    removeChannels.push(channel);
                }
            }
        }
    }

    let initialTeamId = currentTeamId;
    if (!teamData.teams.length) {
        initialTeamId = '';
    } else if (!initialTeamId || !teamData.teams.find((t) => t.id === currentTeamId)) {
        const teamOrderPreference = getPreferenceValue(prefData.preferences!, Preferences.TEAMS_ORDER, '', '') as string;
        initialTeamId = selectDefaultTeam(teamData.teams, meData.user.locale, teamOrderPreference, config.ExperimentalPrimaryTeam)?.id || '';
    }
    console.log('initial team id', initialTeamId);

    let initialChannelId = currentChannelId;
    if (initialTeamId !== currentTeamId || !chData.channels?.find((c) => c.id === currentChannelId)) {
        initialChannelId = '';
        if (isTabletDevice && chData.channels && chData.memberships) {
            initialChannelId = selectDefaultChannelForTeam(chData.channels, chData.memberships, initialTeamId, roles, meData.user.locale)?.id || '';
        }
    }

    const modelPromises = await prepareModels({operator, initialTeamId, removeTeams, removeChannels, teamData, chData, prefData, meData});
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

    deferredAppEntryActions(serverUrl, 0, meData.user.id, meData.user.locale, prefData.preferences, config, license, teamData, chData, initialTeamId, initialChannelId, true);

    const timeElapsed = Date.now() - dt;
    console.log('Time elapsed', Date.now() - dt);
    return {time: timeElapsed, hasTeams: Boolean(teamData.teams.length), userId: meData.user.id};
};
