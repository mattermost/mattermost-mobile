// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Database, Model} from '@nozbe/watermelondb';

import {fetchMissingDirectChannelsInfo, fetchMyChannelsForTeam, MyChannelsRequest} from '@actions/remote/channel';
import {fetchGroupsForMember} from '@actions/remote/groups';
import {fetchPostsForUnreadChannels} from '@actions/remote/post';
import {MyPreferencesRequest, fetchMyPreferences} from '@actions/remote/preference';
import {fetchRoles} from '@actions/remote/role';
import {fetchConfigAndLicense} from '@actions/remote/systems';
import {fetchAllTeams, fetchMyTeams, fetchTeamsChannelsAndUnreadPosts, MyTeamsRequest} from '@actions/remote/team';
import {syncTeamThreads} from '@actions/remote/thread';
import {autoUpdateTimezone, fetchMe, MyUserRequest, updateAllUsersSince} from '@actions/remote/user';
import {gqlAllChannels} from '@client/graphQL/entry';
import {General, Preferences, Screens} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import {PUSH_PROXY_RESPONSE_NOT_AVAILABLE, PUSH_PROXY_RESPONSE_UNKNOWN, PUSH_PROXY_STATUS_NOT_AVAILABLE, PUSH_PROXY_STATUS_UNKNOWN, PUSH_PROXY_STATUS_VERIFIED} from '@constants/push_proxy';
import DatabaseManager from '@database/manager';
import {getPreferenceValue, getTeammateNameDisplaySetting} from '@helpers/api/preference';
import {selectDefaultTeam} from '@helpers/api/team';
import {DEFAULT_LOCALE} from '@i18n';
import NetworkManager from '@managers/network_manager';
import {getDeviceToken} from '@queries/app/global';
import {getAllServers} from '@queries/app/servers';
import {prepareMyChannelsForTeam, queryAllChannelsForTeam, queryChannelsById} from '@queries/servers/channel';
import {prepareModels, truncateCrtRelatedTables} from '@queries/servers/entry';
import {getHasCRTChanged} from '@queries/servers/preference';
import {getConfig, getCurrentUserId, getPushVerificationStatus, getWebSocketLastDisconnected} from '@queries/servers/system';
import {deleteMyTeams, getAvailableTeamIds, getTeamChannelHistory, queryMyTeams, queryMyTeamsByIds, queryTeamsById} from '@queries/servers/team';
import {getIsCRTEnabled} from '@queries/servers/thread';
import {isDMorGM, sortChannelsByDisplayName} from '@utils/channel';
import {getMemberChannelsFromGQLQuery, gqlToClientChannelMembership} from '@utils/graphql';
import {logDebug} from '@utils/log';
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

const FETCH_MISSING_DM_TIMEOUT = 2500;
export const FETCH_UNREADS_TIMEOUT = 2500;

export const getRemoveTeamIds = async (database: Database, teamData: MyTeamsRequest) => {
    const myTeams = await queryMyTeams(database).fetch();
    const joinedTeams = new Set(teamData.memberships?.filter((m) => m.delete_at === 0).map((m) => m.team_id));
    return myTeams.filter((m) => !joinedTeams.has(m.id)).map((m) => m.id);
};

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

export const entryRest = async (serverUrl: string, teamId?: string, channelId?: string, since = 0): Promise<EntryResponse> => {
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

    const initialChannelId = await entryInitialChannelId(database, channelId, teamId, initialTeamId, meData?.user?.locale || '', chData?.channels, chData?.memberships);

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

export const fetchAppEntryData = async (serverUrl: string, sinceArg: number, initialTeamId = ''): Promise<AppEntryData | AppEntryError> => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }
    let since = sinceArg;
    const includeDeletedChannels = true;
    const fetchOnly = true;

    const confReq = await fetchConfigAndLicense(serverUrl);
    const prefData = await fetchMyPreferences(serverUrl, fetchOnly);
    const isCRTEnabled = Boolean(prefData.preferences && processIsCRTEnabled(prefData.preferences, confReq.config?.CollapsedThreads, confReq.config?.FeatureFlagCollapsedThreads));
    if (prefData.preferences) {
        const crtToggled = await getHasCRTChanged(database, prefData.preferences);
        if (crtToggled) {
            const currentServerUrl = await DatabaseManager.getActiveServerUrl();
            const isSameServer = currentServerUrl === serverUrl;
            if (isSameServer) {
                since = 0;
            }
            const {error} = await truncateCrtRelatedTables(serverUrl);
            if (error) {
                return {error: `Resetting CRT on ${serverUrl} failed`};
            }
        }
    }

    // Fetch in parallel teams / team membership / channels for current team / user preferences / user
    const promises: [Promise<MyTeamsRequest>, Promise<MyChannelsRequest | undefined>, Promise<MyUserRequest>] = [
        fetchMyTeams(serverUrl, fetchOnly),
        initialTeamId ? fetchMyChannelsForTeam(serverUrl, initialTeamId, includeDeletedChannels, since, fetchOnly, false, isCRTEnabled) : Promise.resolve(undefined),
        fetchMe(serverUrl, fetchOnly),
    ];

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

    const removeTeamIds = await getRemoveTeamIds(database, teamData);

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

export async function entryInitialChannelId(database: Database, requestedChannelId = '', requestedTeamId = '', initialTeamId: string, locale: string, channels?: Channel[], memberships?: ChannelMember[]) {
    const membershipIds = new Set(memberships?.map((m) => m.channel_id));
    const requestedChannel = channels?.find((c) => (c.id === requestedChannelId) && membershipIds.has(c.id));

    // If team and channel are the requested, return the channel
    if (initialTeamId === requestedTeamId && requestedChannel) {
        return requestedChannelId;
    }

    // DM or GMs don't care about changes in teams, so return directly
    if (requestedChannel && isDMorGM(requestedChannel)) {
        return requestedChannelId;
    }

    // Check if we are still members of any channel on the history
    const teamChannelHistory = await getTeamChannelHistory(database, initialTeamId);
    for (const c of teamChannelHistory) {
        if (membershipIds.has(c) || c === Screens.GLOBAL_THREADS) {
            return c;
        }
    }

    // Check if we are member of the default channel.
    const defaultChannel = channels?.find((c) => c.name === General.DEFAULT_CHANNEL && c.team_id === initialTeamId);
    const iAmMemberOfTheTeamDefaultChannel = Boolean(defaultChannel && membershipIds.has(defaultChannel.id));
    if (iAmMemberOfTheTeamDefaultChannel) {
        return defaultChannel!.id;
    }

    // Get the first channel of the list, based on the locale.
    const myFirstTeamChannel = channels?.filter((c) =>
        c.team_id === requestedTeamId &&
        c.type === General.OPEN_CHANNEL &&
        membershipIds.has(c.id),
    ).sort(sortChannelsByDisplayName.bind(null, locale))[0];
    return myFirstTeamChannel?.id || '';
}

export async function restDeferredAppEntryActions(
    serverUrl: string, since: number, currentUserId: string, currentUserLocale: string, preferences: PreferenceType[] | undefined,
    config: ClientConfig, license: ClientLicense | undefined, teamData: MyTeamsRequest, chData: MyChannelsRequest | undefined,
    initialTeamId?: string, initialChannelId?: string) {
    // defer sidebar DM & GM profiles
    let channelsToFetchProfiles: Set<Channel>|undefined;
    setTimeout(async () => {
        if (chData?.channels?.length && chData.memberships?.length) {
            const directChannels = chData.channels.filter(isDMorGM);
            channelsToFetchProfiles = new Set<Channel>(directChannels);

            // defer fetching posts for unread channels on initial team
            fetchPostsForUnreadChannels(serverUrl, chData.channels, chData.memberships, initialChannelId, true);
        }
    }, FETCH_UNREADS_TIMEOUT);

    // defer fetch channels and unread posts for other teams
    if (teamData.teams?.length && teamData.memberships?.length) {
        fetchTeamsChannelsAndUnreadPosts(serverUrl, since, teamData.teams, teamData.memberships, initialTeamId);
    }

    if (preferences && processIsCRTEnabled(preferences, config.CollapsedThreads, config.FeatureFlagCollapsedThreads)) {
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

    await fetchAllTeams(serverUrl);
    await updateAllUsersSince(serverUrl, since);

    // Fetch groups for current user
    fetchGroupsForMember(serverUrl, currentUserId);

    setTimeout(async () => {
        if (channelsToFetchProfiles?.size) {
            const teammateDisplayNameSetting = getTeammateNameDisplaySetting(preferences || [], config.LockTeammateNameDisplay, config.TeammateNameDisplay, license);
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

    const deviceToken = await getDeviceToken();
    if (deviceToken) {
        client.attachDevice(deviceToken);
    }

    return {error: undefined};
};

export const syncOtherServers = async (serverUrl: string) => {
    const servers = await getAllServers();
    for (const server of servers) {
        if (server.url !== serverUrl && server.lastActiveAt > 0) {
            registerDeviceToken(server.url);
            syncAllChannelMembersAndThreads(server.url);
            autoUpdateTimezone(server.url);
        }
    }
};

const syncAllChannelMembersAndThreads = async (serverUrl: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return;
    }

    const config = await getConfig(database);

    if (config?.FeatureFlagGraphQL === 'true') {
        const error = await graphQLSyncAllChannelMembers(serverUrl);
        if (error) {
            logDebug('failed graphQL, falling back to rest', error);
            restSyncAllChannelMembers(serverUrl);
        }
    } else {
        restSyncAllChannelMembers(serverUrl);
    }
};

const graphQLSyncAllChannelMembers = async (serverUrl: string) => {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return 'Server database not found';
    }

    const {database} = operator;

    const response = await gqlAllChannels(serverUrl);
    if ('error' in response) {
        return response.error;
    }

    if (response.errors) {
        return response.errors[0].message;
    }

    const userId = await getCurrentUserId(database);

    const channels = getMemberChannelsFromGQLQuery(response.data);
    const memberships = response.data.channelMembers?.map((m) => gqlToClientChannelMembership(m, userId));

    if (channels && memberships) {
        const modelPromises = await prepareMyChannelsForTeam(operator, '', channels, memberships, undefined, true);
        const models = (await Promise.all(modelPromises)).flat();
        if (models.length) {
            await operator.batchRecords(models);
        }
    }

    const isCRTEnabled = await getIsCRTEnabled(database);
    if (isCRTEnabled) {
        const myTeams = await queryMyTeams(operator.database).fetch();
        for await (const myTeam of myTeams) {
            // need to await here since GM/DM threads in different teams overlap
            await syncTeamThreads(serverUrl, myTeam.id);
        }
    }

    return '';
};

const restSyncAllChannelMembers = async (serverUrl: string) => {
    let client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch {
        return;
    }

    try {
        const myTeams = await client.getMyTeams();
        const preferences = await client.getMyPreferences();
        const config = await client.getClientConfigOld();

        let excludeDirect = false;
        for await (const myTeam of myTeams) {
            fetchMyChannelsForTeam(serverUrl, myTeam.id, false, 0, false, excludeDirect);
            excludeDirect = true;
            if (preferences && processIsCRTEnabled(preferences, config.CollapsedThreads, config.FeatureFlagCollapsedThreads)) {
                // need to await here since GM/DM threads in different teams overlap
                await syncTeamThreads(serverUrl, myTeam.id);
            }
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

    const deviceId = await getDeviceToken();
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
