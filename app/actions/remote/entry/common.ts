// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';

import {fetchMissingDirectChannelsInfo, fetchMyChannelsForTeam, MyChannelsRequest, switchToChannelById} from '@actions/remote/channel';
import {fetchPostsForUnreadChannels} from '@actions/remote/post';
import {MyPreferencesRequest, fetchMyPreferences} from '@actions/remote/preference';
import {fetchRoles} from '@actions/remote/role';
import {fetchConfigAndLicense} from '@actions/remote/systems';
import {fetchAllTeams, fetchMyTeams, fetchTeamsChannelsAndUnreadPosts, MyTeamsRequest} from '@actions/remote/team';
import {fetchAndSwitchToThread, fetchNewThreads} from '@actions/remote/thread';
import {fetchMe, MyUserRequest, updateAllUsersSince} from '@actions/remote/user';
import {gqlAllChannels} from '@client/graphQL/entry';
import {Preferences, Screens} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import {PUSH_PROXY_RESPONSE_NOT_AVAILABLE, PUSH_PROXY_RESPONSE_UNKNOWN, PUSH_PROXY_STATUS_NOT_AVAILABLE, PUSH_PROXY_STATUS_UNKNOWN, PUSH_PROXY_STATUS_VERIFIED} from '@constants/push_proxy';
import DatabaseManager from '@database/manager';
import {getPreferenceValue, getTeammateNameDisplaySetting} from '@helpers/api/preference';
import {selectDefaultTeam} from '@helpers/api/team';
import {DEFAULT_LOCALE} from '@i18n';
import NetworkManager from '@managers/network_manager';
import {getDeviceToken} from '@queries/app/global';
import {queryAllServers} from '@queries/app/servers';
import {getMyChannel, prepareMyChannelsForTeam, queryAllChannelsForTeam, queryChannelsById} from '@queries/servers/channel';
import {prepareModels, truncateCrtRelatedTables} from '@queries/servers/entry';
import {getHasCRTChanged} from '@queries/servers/preference';
import {getConfig, getCurrentUserId, getPushVerificationStatus, getWebSocketLastDisconnected, setCurrentTeamAndChannelId} from '@queries/servers/system';
import {deleteMyTeams, getAvailableTeamIds, getMyTeamById, getNthLastChannelFromTeam, queryMyTeams, queryMyTeamsByIds, queryTeamsById} from '@queries/servers/team';
import {getIsCRTEnabled} from '@queries/servers/thread';
import NavigationStore from '@store/navigation_store';
import {isDMorGM} from '@utils/channel';
import {getMemberChannelsFromGQLQuery, gqlToClientChannelMembership} from '@utils/graphql';
import {isTablet} from '@utils/helpers';
import {logDebug} from '@utils/log';
import {emitNotificationError} from '@utils/notification';
import {processIsCRTEnabled} from '@utils/thread';

import {fetchGroupsForMember} from '../groups';

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
    const isCRTEnabled = Boolean(prefData.preferences && processIsCRTEnabled(prefData.preferences, confReq.config));
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

    await fetchAllTeams(serverUrl);
    await updateAllUsersSince(serverUrl, since);

    // Fetch groups for current user
    fetchGroupsForMember(serverUrl, currentUserId);

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
                syncAllChannelMembersAndThreads(server.url);
            }
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

    const response = await gqlAllChannels(serverUrl);
    if ('error' in response) {
        return response.error;
    }

    if (response.errors) {
        return response.errors[0].message;
    }

    const userId = await getCurrentUserId(operator.database);

    const channels = getMemberChannelsFromGQLQuery(response.data);
    const memberships = response.data.channelMembers?.map((m) => gqlToClientChannelMembership(m, userId));

    if (channels && memberships) {
        const modelPromises = await prepareMyChannelsForTeam(operator, '', channels, memberships, undefined, true);
        const models = (await Promise.all(modelPromises)).flat();
        if (models.length) {
            operator.batchRecords(models);
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
        for (const myTeam of myTeams) {
            fetchMyChannelsForTeam(serverUrl, myTeam.id, false, 0, false, excludeDirect);
            excludeDirect = true;
            if (preferences && processIsCRTEnabled(preferences, config)) {
                fetchNewThreads(serverUrl, myTeam.id, false);
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

export async function handleNotificationNavigation(serverUrl: string, selectedChannelId: string, selectedTeamId: string, notificationChannelId: string, notificationTeamId: string, rootId = '') {
    try {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const myChannel = await getMyChannel(database, selectedChannelId);
        const myTeam = await getMyTeamById(database, selectedTeamId);
        const isCRTEnabled = await getIsCRTEnabled(database);
        const isThreadNotification = isCRTEnabled && Boolean(rootId);

        let switchedToScreen = false;
        let switchedToChannel = false;
        if (myChannel && myTeam) {
            if (isThreadNotification) {
                await fetchAndSwitchToThread(serverUrl, rootId, true);
            } else {
                switchedToChannel = true;
                await switchToChannelById(serverUrl, selectedChannelId, selectedTeamId);
            }
            switchedToScreen = true;
        }

        if (!switchedToScreen) {
            const isTabletDevice = await isTablet();
            if (isTabletDevice || (notificationChannelId === selectedChannelId)) {
                // Make switch again to get the missing data and make sure the team is the correct one
                switchedToScreen = true;
                if (isThreadNotification) {
                    await fetchAndSwitchToThread(serverUrl, rootId, true);
                } else {
                    switchedToChannel = true;
                    await switchToChannelById(serverUrl, notificationChannelId, notificationTeamId);
                }
            } else if (notificationTeamId !== selectedTeamId || notificationChannelId !== selectedChannelId) {
                // If in the end the selected team or channel is different than the one from the notification
                // we switch again
                await setCurrentTeamAndChannelId(operator, selectedTeamId, selectedChannelId);
            }
        }

        if (notificationTeamId !== selectedTeamId) {
            emitNotificationError('Team');
        } else if (notificationChannelId !== selectedChannelId) {
            emitNotificationError('Channel');
        }

        // Waiting for the screen to display fixes a race condition when fetching and storing data
        if (switchedToChannel) {
            await NavigationStore.waitUntilScreenHasLoaded(Screens.CHANNEL);
        } else if (switchedToScreen && isThreadNotification) {
            await NavigationStore.waitUntilScreenHasLoaded(Screens.THREAD);
        }

        return {};
    } catch (error) {
        return {error};
    }
}
