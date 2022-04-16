// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchChannelStats, fetchMissingSidebarInfo, fetchMyChannelsForTeam, markChannelAsRead, MyChannelsRequest} from '@actions/remote/channel';
import {fetchPostsForChannel, fetchPostsForUnreadChannels} from '@actions/remote/post';
import {MyPreferencesRequest, fetchMyPreferences} from '@actions/remote/preference';
import {fetchConfigAndLicense} from '@actions/remote/systems';
import {fetchAllTeams, fetchMyTeams, fetchTeamsChannelsAndUnreadPosts, MyTeamsRequest} from '@actions/remote/team';
import {fetchMe, MyUserRequest, updateAllUsersSince} from '@actions/remote/user';
import {Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {getPreferenceValue, getTeammateNameDisplaySetting} from '@helpers/api/preference';
import {selectDefaultTeam} from '@helpers/api/team';
import {DEFAULT_LOCALE} from '@i18n';
import NetworkManager from '@managers/network_manager';
import {queryAllServers} from '@queries/app/servers';
import {queryAllChannelsForTeam} from '@queries/servers/channel';
import {getConfig} from '@queries/servers/system';
import {deleteMyTeams, getAvailableTeamIds, queryMyTeams, queryMyTeamsByIds, queryTeamsById} from '@queries/servers/team';
import {isDMorGM} from '@utils/channel';
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
        return undefined;
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

    return undefined;
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
    initialTeamId?: string, initialChannelId?: string) {
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
        if (channelsToFetchProfiles.size) {
            const teammateDisplayNameSetting = getTeammateNameDisplaySetting(preferences || [], config, license);
            await fetchMissingSidebarInfo(serverUrl, Array.from(channelsToFetchProfiles), currentUserLocale, teammateDisplayNameSetting, currentUserId);
        }

        // defer fetching posts for unread channels on initial team
        fetchPostsForUnreadChannels(serverUrl, chData.channels, chData.memberships, initialChannelId);
    }

    // defer fetch channels and unread posts for other teams
    if (teamData.teams?.length && teamData.memberships?.length) {
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

export const syncOtherServers = async (serverUrl: string) => {
    const database = DatabaseManager.appDatabase?.database;
    if (database) {
        const servers = await queryAllServers(database);
        for (const server of servers) {
            if (server.url !== serverUrl && server.lastActiveAt > 0) {
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
