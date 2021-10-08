// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';

import {scheduleExpiredNotification} from '@actions/local/push_notification';
import {General, Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {getPreferenceValue, getTeammateNameDisplaySetting} from '@helpers/api/preference';
import {selectDefaultTeam} from '@helpers/api/team';
import {DEFAULT_LOCALE} from '@i18n';
import NetworkManager from '@init/network_manager';
import {queryAllChannelsForTeam, queryChannelsById} from '@queries/servers/channel';
import {prepareModels} from '@queries/servers/entry';
import {prepareCommonSystemValues, queryCommonSystemValues, queryConfig, queryCurrentTeamId, queryWebSocketLastDisconnected, setCurrentTeamAndChannelId} from '@queries/servers/system';
import {addChannelToTeamHistory, deleteMyTeams, queryAvailableTeamIds, queryMyTeams, queryTeamsById} from '@queries/servers/team';
import {queryCurrentUser} from '@queries/servers/user';
import {selectDefaultChannelForTeam} from '@utils/channel';
import {deleteV1Data} from '@utils/file';

import {fetchMissingSidebarInfo, fetchMyChannelsForTeam, MyChannelsRequest} from './channel';
import {fetchGroupsForTeam} from './group';
import {fetchPostsForChannel, fetchPostsForUnreadChannels} from './post';
import {MyPreferencesRequest, fetchMyPreferences} from './preference';
import {fetchRoles, fetchRolesIfNeeded} from './role';
import {ConfigAndLicenseRequest, fetchConfigAndLicense} from './systems';
import {fetchMyTeams, fetchTeamsChannelsAndUnreadPosts, MyTeamsRequest} from './team';
import {fetchMe, MyUserRequest} from './user';

import type {Client} from '@client/rest';
import type ClientError from '@client/rest/error';

type AfterLoginArgs = {
    serverUrl: string;
    user: UserProfile;
    deviceToken?: string;
}

type AppEntryData = {
    initialTeamId: string;
    teamData: MyTeamsRequest;
    chData?: MyChannelsRequest;
    prefData: MyPreferencesRequest;
    meData: MyUserRequest;
    removeTeamIds?: string[];
    removeChannelIds?: string[];
}

type AppEntryError = {
    error?: Error | ClientError | string;
}

export const appEntry = async (serverUrl: string) => {
    const dt = Date.now();

    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    const {database} = operator;

    const currentTeamId = await queryCurrentTeamId(database);
    const fetchedData = await fetchAppEntryData(serverUrl, currentTeamId);
    const fetchedError = (fetchedData as AppEntryError).error;

    if (fetchedError) {
        return {error: fetchedError, time: Date.now() - dt};
    }

    const {initialTeamId, teamData, chData, prefData, meData, removeTeamIds, removeChannelIds} = fetchedData as AppEntryData;

    if (initialTeamId !== currentTeamId) {
        // Immediately set the new team as the current team in the database so that the UI
        // renders the correct team.
        setCurrentTeamAndChannelId(operator, initialTeamId, '');
    }

    let removeTeams;
    if (removeTeamIds?.length) {
        // Immediately delete myTeams so that the UI renders only teams the user is a member of.
        removeTeams = await queryTeamsById(database, removeTeamIds);
        await deleteMyTeams(operator, removeTeams!);
    }

    fetchRoles(serverUrl, teamData?.memberships, chData?.memberships, meData?.user);

    let removeChannels;
    if (removeChannelIds?.length) {
        removeChannels = await queryChannelsById(database, removeChannelIds);
    }

    const modelPromises = await prepareModels({operator, initialTeamId, removeTeams, removeChannels, teamData, chData, prefData, meData});
    const models = await Promise.all(modelPromises);
    if (models.length) {
        await operator.batchRecords(models.flat() as Model[]);
    }

    const {id: currentUserId, locale: currentUserLocale} = meData.user || (await queryCurrentUser(database))!;
    const {config, license} = await queryCommonSystemValues(database);
    deferredAppEntryActions(serverUrl, currentUserId, currentUserLocale, prefData.preferences, config, license, teamData, chData, initialTeamId);

    const error = teamData.error || chData?.error || prefData.error || meData.error;
    return {error, time: Date.now() - dt, userId: meData?.user?.id};
};

export const loginEntry = async ({serverUrl, user, deviceToken}: AfterLoginArgs) => {
    const dt = Date.now();
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    let client: Client;
    try {
        client = NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    if (deviceToken) {
        try {
            client.attachDevice(deviceToken);
        } catch {
            // do nothing, the token could've failed to attach to the session but is not a blocker
        }
    }

    try {
        let initialTeam: Team|undefined;
        let initialChannel: Channel|undefined;
        let myTeams: Team[]|undefined;

        // Fetch in parallel server config & license / user preferences / teams / team membership
        const promises: [Promise<ConfigAndLicenseRequest>, Promise<MyPreferencesRequest>, Promise<MyTeamsRequest>] = [
            fetchConfigAndLicense(serverUrl, true),
            fetchMyPreferences(serverUrl, true),
            fetchMyTeams(serverUrl, true),
        ];

        const [clData, prefData, teamData] = await Promise.all(promises);
        let chData: MyChannelsRequest|undefined;

        // schedule local push notification if needed
        if (clData.config) {
            scheduleExpiredNotification(serverUrl, clData.config, user.id, user.locale);
        }

        // select initial team
        if (!clData.error && !prefData.error && !teamData.error) {
            const teamOrderPreference = getPreferenceValue(prefData.preferences!, Preferences.TEAMS_ORDER, '', '') as string;
            const teamRoles: string[] = [];
            const teamMembers: string[] = [];

            teamData.memberships?.forEach((tm) => {
                teamRoles.push(...tm.roles.split(' '));
                teamMembers.push(tm.team_id);
            });

            myTeams = teamData.teams!.filter((t) => teamMembers?.includes(t.id));
            initialTeam = selectDefaultTeam(myTeams, user.locale, teamOrderPreference, clData.config?.ExperimentalPrimaryTeam);

            if (initialTeam) {
                const rolesToFetch = new Set<string>([...user.roles.split(' '), ...teamRoles]);

                // fetch channels / channel membership for initial team
                chData = await fetchMyChannelsForTeam(serverUrl, initialTeam.id, false, 0, true);
                if (chData.channels?.length && chData.memberships?.length) {
                    const {channels, memberships} = chData;
                    const channelIds = new Set(channels?.map((c) => c.id));
                    for (let i = 0; i < memberships!.length; i++) {
                        const member = memberships[i];
                        if (channelIds.has(member.channel_id)) {
                            member.roles.split(' ').forEach(rolesToFetch.add, rolesToFetch);
                        }
                    }

                    // fetch user roles
                    const rData = await fetchRolesIfNeeded(serverUrl, Array.from(rolesToFetch));

                    // select initial channel
                    initialChannel = selectDefaultChannelForTeam(channels!, memberships!, initialTeam!.id, rData.roles, user.locale);
                }
            }
        }

        const modelPromises = await prepareModels({operator, teamData, chData, prefData, initialTeamId: initialTeam?.id});

        const systemModels = prepareCommonSystemValues(
            operator,
            {
                config: clData.config || ({} as ClientConfig),
                license: clData.license || ({} as ClientLicense),
                currentTeamId: initialTeam?.id || '',
                currentChannelId: initialChannel?.id || '',
            },
        );
        if (systemModels) {
            modelPromises.push(systemModels);
        }

        if (initialTeam && initialChannel) {
            try {
                const tch = addChannelToTeamHistory(operator, initialTeam.id, initialChannel.id, true);
                modelPromises.push(tch);
            } catch {
                // do nothing
            }
        }

        const models = await Promise.all(modelPromises);
        if (models.length) {
            await operator.batchRecords(models.flat() as Model[]);
        }

        deferredLoginActions(serverUrl, user, prefData, clData, teamData, chData, initialTeam, initialChannel);

        const error = clData.error || prefData.error || teamData.error || chData?.error;
        return {error, time: Date.now() - dt, hasTeams: Boolean((myTeams?.length || 0) > 0 && !teamData.error)};
    } catch (error) {
        const systemModels = await prepareCommonSystemValues(operator, {
            config: ({} as ClientConfig),
            license: ({} as ClientLicense),
            currentTeamId: '',
            currentChannelId: '',
        });
        if (systemModels) {
            await operator.batchRecords(systemModels);
        }

        return {error};
    }
};

export const upgradeEntry = async (serverUrl: string) => {
    const dt = Date.now();
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const configAndLicense = await fetchConfigAndLicense(serverUrl, false);
        const entry = await appEntry(serverUrl);

        const error = configAndLicense.error || entry.error;

        if (!error) {
            const models = await prepareCommonSystemValues(operator, {currentUserId: entry.userId});
            if (models?.length) {
                await operator.batchRecords(models);
            }
            DatabaseManager.setActiveServerDatabase(serverUrl);
            deleteV1Data();
        }

        return {error, time: Date.now() - dt};
    } catch (e) {
        return {error: e, time: Date.now() - dt};
    }
};

const fetchAppEntryData = async (serverUrl: string, initialTeamId: string): Promise<AppEntryData | AppEntryError> => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    const lastDisconnected = await queryWebSocketLastDisconnected(database);
    const includeDeletedChannels = true;
    const fetchOnly = true;

    // Fetch in parallel teams / team membership / channels for current team / user preferences / user
    const promises: [Promise<MyTeamsRequest>, Promise<MyChannelsRequest | undefined>, Promise<MyPreferencesRequest>, Promise<MyUserRequest>] = [
        fetchMyTeams(serverUrl, fetchOnly),
        initialTeamId ? fetchMyChannelsForTeam(serverUrl, initialTeamId, includeDeletedChannels, lastDisconnected, fetchOnly) : Promise.resolve(undefined),
        fetchMyPreferences(serverUrl, fetchOnly),
        fetchMe(serverUrl, fetchOnly),
    ];

    const resolution = await Promise.all(promises);
    const [teamData, , prefData, meData] = resolution;
    let [, chData] = resolution;

    if (!initialTeamId && teamData.teams?.length && teamData.memberships?.length) {
        // If no initial team was set in the database but got teams in the response
        const config = await queryConfig(database);
        const teamOrderPreference = getPreferenceValue(prefData.preferences || [], Preferences.TEAMS_ORDER, '', '') as string;
        const teamMembers = teamData.memberships.map((m) => m.team_id);
        const myTeams = teamData.teams!.filter((t) => teamMembers?.includes(t.id));
        const defaultTeam = selectDefaultTeam(myTeams, meData.user?.locale || DEFAULT_LOCALE, teamOrderPreference, config.ExperimentalPrimaryTeam);
        if (defaultTeam?.id) {
            chData = await fetchMyChannelsForTeam(serverUrl, defaultTeam.id, includeDeletedChannels, lastDisconnected, fetchOnly);
        }
    }

    let data: AppEntryData = {
        initialTeamId,
        teamData,
        chData,
        prefData,
        meData,
    };

    if (teamData.teams?.length === 0) {
        // User is no longer a member of any team
        const myTeams = await queryMyTeams(database);
        const removeTeamIds: string[] = myTeams?.map((myTeam) => myTeam.id) || [];

        return {
            ...data,
            initialTeamId: '',
            removeTeamIds,
        };
    }

    const inTeam = teamData.teams?.find((t) => t.id === initialTeamId);
    const chError = chData?.error as ClientError | undefined;
    if (!inTeam || chError?.status_code === 403) {
        // User is no longer a member of the current team
        const removeTeamIds = [initialTeamId];

        const availableTeamIds = await queryAvailableTeamIds(database, initialTeamId, teamData.teams, prefData.preferences, meData.user?.locale);
        const alternateTeamData = await fetchAlternateTeamData(serverUrl, availableTeamIds, removeTeamIds, includeDeletedChannels, lastDisconnected, fetchOnly);

        data = {
            ...data,
            ...alternateTeamData,
        };
    }

    if (data.chData?.channels) {
        const removeChannelIds: string[] = [];
        const fetchedChannelIds = data.chData.channels.map((channel) => channel.id);

        const channels = await queryAllChannelsForTeam(database, initialTeamId);
        for (const channel of channels) {
            if (!fetchedChannelIds.includes(channel.id)) {
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

const fetchAlternateTeamData = async (serverUrl: string, availableTeamIds: string[], removeTeamIds: string[], includeDeleted = true, since = 0, fetchOnly = false) => {
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

const deferredAppEntryActions = async (
    serverUrl: string, currentUserId: string, currentUserLocale: string, preferences: PreferenceType[] | undefined, config: ClientConfig, license: ClientLicense, teamData: MyTeamsRequest,
    chData: MyChannelsRequest | undefined, initialTeamId: string) => {
    // defer sidebar DM & GM profiles
    if (chData?.channels?.length && chData.memberships?.length) {
        const directChannels = chData.channels.filter((c) => c.type === General.DM_CHANNEL || c.type === General.GM_CHANNEL);
        const channelsToFetchProfiles = new Set<Channel>(directChannels);
        if (channelsToFetchProfiles.size) {
            const teammateDisplayNameSetting = getTeammateNameDisplaySetting(preferences || [], config, license);
            await fetchMissingSidebarInfo(serverUrl, Array.from(channelsToFetchProfiles), currentUserLocale, teammateDisplayNameSetting, currentUserId);
        }

        // defer fetching posts for unread channels on initial team
        fetchPostsForUnreadChannels(serverUrl, chData.channels, chData.memberships);
    }

    // defer groups for team
    if (initialTeamId) {
        await fetchGroupsForTeam(serverUrl, initialTeamId);
    }

    // defer fetch channels and unread posts for other teams
    if (teamData.teams?.length && teamData.memberships?.length) {
        fetchTeamsChannelsAndUnreadPosts(serverUrl, teamData.teams, teamData.memberships, initialTeamId);
    }
};

const deferredLoginActions = async (
    serverUrl: string, user: UserProfile, prefData: MyPreferencesRequest, clData: ConfigAndLicenseRequest, teamData: MyTeamsRequest,
    chData?: MyChannelsRequest, initialTeam?: Team, initialChannel?: Channel) => {
    // defer fetching posts for initial channel
    if (initialChannel) {
        fetchPostsForChannel(serverUrl, initialChannel.id);
    }

    // defer sidebar DM & GM profiles
    if (chData?.channels?.length && chData.memberships?.length) {
        const directChannels = chData.channels.filter((c) => c.type === General.DM_CHANNEL || c.type === General.GM_CHANNEL);
        const channelsToFetchProfiles = new Set<Channel>(directChannels);
        if (channelsToFetchProfiles.size) {
            const teammateDisplayNameSetting = getTeammateNameDisplaySetting(prefData.preferences || [], clData.config, clData.license);
            await fetchMissingSidebarInfo(serverUrl, Array.from(channelsToFetchProfiles), user.locale, teammateDisplayNameSetting, user.id);
        }

        // defer fetching posts for unread channels on initial team
        fetchPostsForUnreadChannels(serverUrl, chData.channels, chData.memberships, initialChannel?.id);
    }

    // defer groups for team
    if (initialTeam) {
        await fetchGroupsForTeam(serverUrl, initialTeam.id);
    }

    // defer fetch channels and unread posts for other teams
    if (teamData.teams?.length && teamData.memberships?.length) {
        fetchTeamsChannelsAndUnreadPosts(serverUrl, teamData.teams, teamData.memberships, initialTeam?.id);
    }
};
