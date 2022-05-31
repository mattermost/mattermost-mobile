// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';

import {fetchMissingDirectChannelsInfo, fetchMyChannelsForTeam, MyChannelsRequest} from '@actions/remote/channel';
import {fetchPostsForUnreadChannels} from '@actions/remote/post';
import {MyPreferencesRequest, fetchMyPreferences} from '@actions/remote/preference';
import {fetchRoles} from '@actions/remote/role';
import {fetchConfigAndLicense} from '@actions/remote/systems';
import {fetchAllTeams, fetchMyTeams, fetchTeamsChannelsAndUnreadPosts, MyTeamsRequest} from '@actions/remote/team';
import {fetchNewThreads} from '@actions/remote/thread';
import {fetchMe, MyUserRequest, updateAllUsersSince} from '@actions/remote/user';
import {Preferences} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import {PUSH_PROXY_RESPONSE_NOT_AVAILABLE, PUSH_PROXY_RESPONSE_UNKNOWN, PUSH_PROXY_STATUS_NOT_AVAILABLE, PUSH_PROXY_STATUS_UNKNOWN, PUSH_PROXY_STATUS_VERIFIED} from '@constants/push_proxy';
import DatabaseManager from '@database/manager';
import {getPreferenceValue, getTeammateNameDisplaySetting} from '@helpers/api/preference';
import {selectDefaultTeam} from '@helpers/api/team';
import {DEFAULT_LOCALE} from '@i18n';
import NetworkManager from '@managers/network_manager';
import {getDeviceToken} from '@queries/app/global';
import {queryAllServers} from '@queries/app/servers';
import {queryAllChannelsForTeam, queryChannelsById} from '@queries/servers/channel';
import {prepareModels} from '@queries/servers/entry';
import {getConfig, getPushVerificationStatus, getWebSocketLastDisconnected} from '@queries/servers/system';
import {deleteMyTeams, getAvailableTeamIds, getNthLastChannelFromTeam, queryMyTeams, queryMyTeamsByIds, queryTeamsById} from '@queries/servers/team';
import {isDMorGM} from '@utils/channel';
import {processIsCRTEnabled} from '@utils/thread';

import type ClientError from '@client/rest/error';

export type AppEntryData = {
    initialTeamId: string;
    teamData: MyTeamsRequest;
    chData?: MyChannelsRequest;
    prefData: MyPreferencesRequest;
    meData: MyUserRequest;
    removeTeamIds?: string[];
    removeChannelIds?: string[];
    isCRTEnabled: boolean;
}

export type AppEntryError = {
    error: Error | ClientError | string;
}

export type EntryResponse = {
    models: Model[];
    initialTeamId: string;
    initialChannelId: string;
    prefData: MyPreferencesRequest;
    teamData: MyTeamsRequest;
    chData?: MyChannelsRequest;
    meData?: MyUserRequest;
} | {
    error: unknown;
}

const FETCH_MISSING_DM_TIMEOUT = 1000;

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

export const entry = async (serverUrl: string, teamId?: string, channelId?: string, since = 0): Promise<EntryResponse> => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const {database} = operator;

    const lastDisconnectedAt = since || await getWebSocketLastDisconnected(database);

    const fetchedData = await fetchAppEntryData(serverUrl, lastDisconnectedAt, teamId);
    if ('error' in fetchedData) {
        return {error: fetchedData.error};
    }

    const {initialTeamId, teamData, chData, prefData, meData, removeTeamIds, removeChannelIds, isCRTEnabled} = fetchedData;
    const error = teamData.error || chData?.error || prefData.error || meData.error;
    if (error) {
        return {error};
    }

    const rolesData = await fetchRoles(serverUrl, teamData.memberships, chData?.memberships, meData.user, true);

    let initialChannelId = channelId;
    if (!chData?.channels?.find((c) => c.id === channelId)) {
        initialChannelId = '';
    }
    if (initialTeamId !== teamId || !initialChannelId) {
        initialChannelId = await getNthLastChannelFromTeam(database, initialTeamId);
    }

    const removeTeams = await teamsToRemove(serverUrl, removeTeamIds);

    let removeChannels;
    if (removeChannelIds?.length) {
        removeChannels = await queryChannelsById(database, removeChannelIds).fetch();
    }

    const modelPromises = await prepareModels({operator, initialTeamId, removeTeams, removeChannels, teamData, chData, prefData, meData, isCRTEnabled});
    if (rolesData.roles?.length) {
        modelPromises.push(operator.handleRole({roles: rolesData.roles, prepareRecordsOnly: true}));
    }

    const models = await Promise.all(modelPromises);

    return {models: models.flat(), initialChannelId, initialTeamId, prefData, teamData, chData, meData};
};

export const fetchAppEntryData = async (serverUrl: string, since: number, initialTeamId = ''): Promise<AppEntryData | AppEntryError> => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    const includeDeletedChannels = true;
    const fetchOnly = true;

    const confReq = await fetchConfigAndLicense(serverUrl);
    const prefData = await fetchMyPreferences(serverUrl, fetchOnly);
    const isCRTEnabled = Boolean(prefData.preferences && processIsCRTEnabled(prefData.preferences, confReq.config));

    // Fetch in parallel teams / team membership / channels for current team / user preferences / user
    const promises: [Promise<MyTeamsRequest>, Promise<MyChannelsRequest | undefined>, Promise<MyUserRequest>] = [
        fetchMyTeams(serverUrl, fetchOnly),
        initialTeamId ? fetchMyChannelsForTeam(serverUrl, initialTeamId, includeDeletedChannels, since, fetchOnly, false, isCRTEnabled) : Promise.resolve(undefined),
        fetchMe(serverUrl, fetchOnly),
    ];

    const removeTeamIds: string[] = [];
    const resolution = await Promise.all(promises);
    const [teamData, , meData] = resolution;
    let [, chData] = resolution;

    if (!initialTeamId && teamData.teams?.length && teamData.memberships?.length) {
        // If no initial team was set in the database but got teams in the response
        const config = await getConfig(database);
        const teamOrderPreference = getPreferenceValue(prefData.preferences || [], Preferences.TEAMS_ORDER, '', '') as string;
        const teamMembers = new Set(teamData.memberships.filter((m) => m.delete_at === 0).map((m) => m.team_id));
        const myTeams = teamData.teams!.filter((t) => teamMembers.has(t.id));
        const defaultTeam = selectDefaultTeam(myTeams, meData.user?.locale || DEFAULT_LOCALE, teamOrderPreference, config?.ExperimentalPrimaryTeam);
        if (defaultTeam?.id) {
            chData = await fetchMyChannelsForTeam(serverUrl, defaultTeam.id, includeDeletedChannels, since, fetchOnly, false, isCRTEnabled);
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
        isCRTEnabled,
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
        const alternateTeamData = await fetchAlternateTeamData(serverUrl, availableTeamIds, removeTeamIds, includeDeletedChannels, since, fetchOnly, isCRTEnabled);

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
    includeDeleted = true, since = 0, fetchOnly = false, isCRTEnabled?: boolean) => {
    let initialTeamId = '';
    let chData;

    for (const teamId of availableTeamIds) {
        // eslint-disable-next-line no-await-in-loop
        chData = await fetchMyChannelsForTeam(serverUrl, teamId, includeDeleted, since, fetchOnly, false, isCRTEnabled);
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
    // defer sidebar DM & GM profiles
    let channelsToFetchProfiles: Set<Channel>|undefined;
    if (chData?.channels?.length && chData.memberships?.length) {
        const directChannels = chData.channels.filter(isDMorGM);
        channelsToFetchProfiles = new Set<Channel>(directChannels);

        // defer fetching posts for unread channels on initial team
        fetchPostsForUnreadChannels(serverUrl, chData.channels, chData.memberships, initialChannelId);
    }

    // defer fetch channels and unread posts for other teams
    if (teamData.teams?.length && teamData.memberships?.length) {
        fetchTeamsChannelsAndUnreadPosts(serverUrl, since, teamData.teams, teamData.memberships, initialTeamId);
    }

    if (preferences && processIsCRTEnabled(preferences, config)) {
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
    setTimeout(async () => {
        if (channelsToFetchProfiles?.size) {
            const teammateDisplayNameSetting = getTeammateNameDisplaySetting(preferences || [], config, license);
            fetchMissingDirectChannelsInfo(serverUrl, Array.from(channelsToFetchProfiles), currentUserLocale, teammateDisplayNameSetting, currentUserId);
        }
    }, FETCH_MISSING_DM_TIMEOUT);
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

export async function verifyPushProxy(serverUrl: string) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return;
    }

    const {database} = operator;

    const ppVerification = await getPushVerificationStatus(database);
    if (
        ppVerification !== PUSH_PROXY_STATUS_UNKNOWN &&
        ppVerification !== ''
    ) {
        return;
    }

    const appDatabase = DatabaseManager.appDatabase?.database;
    if (!appDatabase) {
        return;
    }

    const deviceId = await getDeviceToken(appDatabase);
    if (!deviceId) {
        return;
    }

    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (err) {
        return;
    }

    try {
        const response = await client.ping(deviceId);
        const canReceiveNotifications = response?.data?.CanReceiveNotifications;
        switch (canReceiveNotifications) {
            case PUSH_PROXY_RESPONSE_NOT_AVAILABLE:
                operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.PUSH_VERIFICATION_STATUS, value: PUSH_PROXY_STATUS_NOT_AVAILABLE}], prepareRecordsOnly: false});
                return;
            case PUSH_PROXY_RESPONSE_UNKNOWN:
                return;
            default:
                operator.handleSystem({systems: [{id: SYSTEM_IDENTIFIERS.PUSH_VERIFICATION_STATUS, value: PUSH_PROXY_STATUS_VERIFIED}], prepareRecordsOnly: false});
        }
    } catch (err) {
        // Do nothing
    }
}
