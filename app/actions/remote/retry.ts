// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {General, Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {getPreferenceValue, getTeammateNameDisplaySetting} from '@helpers/api/preference';
import {selectDefaultTeam} from '@helpers/api/team';
import NetworkManager from '@init/network_manager';
import {prepareMyChannelsForTeam} from '@queries/servers/channel';
import {prepareMyPreferences, queryPreferencesByCategoryAndName} from '@queries/servers/preference';
import {prepareCommonSystemValues, getCommonSystemValues} from '@queries/servers/system';
import {prepareMyTeams} from '@queries/servers/team';
import {getCurrentUser} from '@queries/servers/user';
import {selectDefaultChannelForTeam} from '@utils/channel';

import {fetchMissingSidebarInfo, fetchMyChannelsForTeam, MyChannelsRequest} from './channel';
import {fetchPostsForChannel} from './post';
import {fetchMyPreferences, MyPreferencesRequest} from './preference';
import {fetchRolesIfNeeded} from './role';
import {ConfigAndLicenseRequest, fetchConfigAndLicense} from './systems';
import {fetchMyTeams, MyTeamsRequest} from './team';

import type {Model} from '@nozbe/watermelondb';

export const retryInitialTeamAndChannel = async (serverUrl: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        let initialTeam: Team|undefined;
        let initialChannel: Channel|undefined;

        const user = await getCurrentUser(database);
        if (!user) {
            return {error: true};
        }

        // Fetch in parallel server config & license / user preferences / teams / team membership
        const promises: [Promise<ConfigAndLicenseRequest>, Promise<MyPreferencesRequest>, Promise<MyTeamsRequest>] = [
            fetchConfigAndLicense(serverUrl, true),
            fetchMyPreferences(serverUrl, true),
            fetchMyTeams(serverUrl, true),
        ];

        const [clData, prefData, teamData] = await Promise.all(promises);
        let chData: MyChannelsRequest|undefined;

        // select initial team
        if (!clData.error && !prefData.error && !teamData.error) {
            const teamOrderPreference = getPreferenceValue(prefData.preferences!, Preferences.TEAMS_ORDER, '', '') as string;
            const teamRoles: string[] = [];
            const teamMembers: string[] = [];

            teamData.memberships?.forEach((tm) => {
                teamRoles.push(...tm.roles.split(' '));
                teamMembers.push(tm.team_id);
            });

            const myTeams = teamData.teams!.filter((t) => teamMembers?.includes(t.id));
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

        if (!initialTeam || !initialChannel) {
            return {error: true};
        }

        const modelPromises: Array<Promise<Model[]>> = [];
        const {operator} = DatabaseManager.serverDatabases[serverUrl];

        const prefModel = prepareMyPreferences(operator, prefData.preferences!);
        if (prefModel) {
            modelPromises.push(prefModel);
        }

        const teamModels = prepareMyTeams(operator, teamData.teams!, teamData.memberships!);
        if (teamModels) {
            modelPromises.push(...teamModels);
        }

        const channelModels = await prepareMyChannelsForTeam(operator, initialTeam!.id, chData!.channels!, chData!.memberships!);
        if (channelModels) {
            modelPromises.push(...channelModels);
        }

        const systemModels = prepareCommonSystemValues(
            operator,
            {
                config: clData.config!,
                license: clData.license!,
                currentTeamId: initialTeam?.id,
                currentChannelId: initialChannel?.id,
            },
        );

        if (systemModels) {
            modelPromises.push(systemModels);
        }

        const models = await Promise.all(modelPromises);
        await operator.batchRecords(models.flat());

        const directChannels = chData!.channels!.filter((c) => c.type === General.DM_CHANNEL || c.type === General.GM_CHANNEL);
        const channelsToFetchProfiles = new Set<Channel>(directChannels);
        if (channelsToFetchProfiles.size) {
            const teammateDisplayNameSetting = getTeammateNameDisplaySetting(prefData.preferences || [], clData.config, clData.license);
            fetchMissingSidebarInfo(serverUrl, Array.from(channelsToFetchProfiles), user.locale, teammateDisplayNameSetting, user.id);
        }

        fetchPostsForChannel(serverUrl, initialChannel.id);

        return {error: false};
    } catch (error) {
        return {error: true};
    }
};

export const retryInitialChannel = async (serverUrl: string, teamId: string) => {
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        let initialChannel: Channel|undefined;
        const rolesToFetch = new Set<string>();

        const user = await getCurrentUser(database);
        if (!user) {
            return {error: true};
        }

        const prefs = await queryPreferencesByCategoryAndName(database, Preferences.CATEGORY_DISPLAY_SETTINGS, Preferences.NAME_NAME_FORMAT).fetch();
        const preferences: PreferenceType[] = prefs.map((p) => ({
            category: p.category,
            name: p.name,
            user_id: p.userId,
            value: p.value,
        }));
        const {config, license} = await getCommonSystemValues(database);

        // fetch channels / channel membership for initial team
        const chData = await fetchMyChannelsForTeam(serverUrl, teamId, false, 0, true);
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
            initialChannel = selectDefaultChannelForTeam(channels!, memberships!, teamId, rData.roles, user.locale);
        }

        if (!initialChannel) {
            return {error: true};
        }

        const modelPromises: Array<Promise<Model[]>> = [];
        const {operator} = DatabaseManager.serverDatabases[serverUrl];

        const channelModels = await prepareMyChannelsForTeam(operator, teamId, chData!.channels!, chData!.memberships!);
        if (channelModels) {
            modelPromises.push(...channelModels);
        }

        const systemModels = prepareCommonSystemValues(
            operator,
            {
                currentChannelId: initialChannel?.id,
            },
        );

        if (systemModels) {
            modelPromises.push(systemModels);
        }

        const models = await Promise.all(modelPromises);
        await operator.batchRecords(models.flat());

        const directChannels = chData!.channels!.filter((c) => c.type === General.DM_CHANNEL || c.type === General.GM_CHANNEL);
        const channelsToFetchProfiles = new Set<Channel>(directChannels);
        if (channelsToFetchProfiles.size) {
            const teammateDisplayNameSetting = getTeammateNameDisplaySetting(preferences || [], config, license);
            fetchMissingSidebarInfo(serverUrl, Array.from(channelsToFetchProfiles), user.locale, teammateDisplayNameSetting, user.id);
        }

        fetchPostsForChannel(serverUrl, initialChannel.id);

        return {error: false};
    } catch (error) {
        return {error: true};
    }
};
