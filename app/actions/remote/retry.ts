// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {storeConfig} from '@actions/local/systems';
import {Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {getPreferenceValue, getTeammateNameDisplaySetting} from '@helpers/api/preference';
import {selectDefaultTeam} from '@helpers/api/team';
import NetworkManager from '@managers/network_manager';
import {prepareCategoriesAndCategoriesChannels} from '@queries/servers/categories';
import {prepareMyChannelsForTeam} from '@queries/servers/channel';
import {prepareMyPreferences, queryDisplayNamePreferences} from '@queries/servers/preference';
import {prepareCommonSystemValues, getConfig, getLicense} from '@queries/servers/system';
import {prepareMyTeams} from '@queries/servers/team';
import {getCurrentUser} from '@queries/servers/user';
import {isDMorGM, selectDefaultChannelForTeam} from '@utils/channel';

import {fetchMissingDirectChannelsInfo, fetchMyChannelsForTeam, type MyChannelsRequest} from './channel';
import {fetchPostsForChannel} from './post';
import {fetchMyPreferences, type MyPreferencesRequest} from './preference';
import {fetchRolesIfNeeded} from './role';
import {type ConfigAndLicenseRequest, fetchConfigAndLicense} from './systems';
import {fetchMyTeams, type MyTeamsRequest} from './team';

import type {Model} from '@nozbe/watermelondb';
import type TeamModel from '@typings/database/models/servers/team';

export async function retryInitialTeamAndChannel(serverUrl: string) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    const {database} = operator;

    try {
        NetworkManager.getClient(serverUrl);
    } catch (error) {
        return {error};
    }

    try {
        let initialTeam: Team|TeamModel|undefined;
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
            const teamOrderPreference = getPreferenceValue<string>(prefData.preferences!, Preferences.CATEGORIES.TEAMS_ORDER, '', '');
            const teamRoles: string[] = [];
            const teamMembers = new Set<string>();

            teamData.memberships?.forEach((tm) => {
                teamRoles.push(...tm.roles.split(' '));
                teamMembers.add(tm.team_id);
            });

            const myTeams = teamData.teams!.filter((t) => teamMembers.has(t.id));
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

        const models: Model[] = (await Promise.all([
            prepareMyPreferences(operator, prefData.preferences!),
            storeConfig(serverUrl, clData.config, true),
            ...prepareMyTeams(operator, teamData.teams!, teamData.memberships!),
            ...await prepareMyChannelsForTeam(operator, initialTeam.id, chData!.channels!, chData!.memberships!),
            prepareCategoriesAndCategoriesChannels(operator, chData!.categories!, true),

            prepareCommonSystemValues(
                operator,
                {
                    license: clData.license!,
                    currentTeamId: initialTeam?.id,
                    currentChannelId: initialChannel?.id,
                },
            ),
        ])).flat();

        await operator.batchRecords(models, 'retryInitialTeamAndChannel');

        const directChannels = chData!.channels!.filter(isDMorGM);
        const channelsToFetchProfiles = new Set<Channel>(directChannels);
        if (channelsToFetchProfiles.size) {
            const teammateDisplayNameSetting = getTeammateNameDisplaySetting(prefData.preferences || [], clData.config?.LockTeammateNameDisplay, clData.config?.TeammateNameDisplay, clData.license);
            fetchMissingDirectChannelsInfo(serverUrl, Array.from(channelsToFetchProfiles), user.locale, teammateDisplayNameSetting, user.id);
        }

        fetchPostsForChannel(serverUrl, initialChannel.id);

        return {error: false};
    } catch (error) {
        return {error: true};
    }
}

export async function retryInitialChannel(serverUrl: string, teamId: string) {
    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    const {database} = operator;

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

        const prefs = await queryDisplayNamePreferences(database, Preferences.NAME_NAME_FORMAT).fetch();
        const preferences: PreferenceType[] = prefs.map((p) => ({
            category: p.category,
            name: p.name,
            user_id: p.userId,
            value: p.value,
        }));
        const license = await getLicense(database);
        const config = await getConfig(database);

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

        const models: Model[] = (await Promise.all([
            ...await prepareMyChannelsForTeam(operator, teamId, chData!.channels!, chData!.memberships!),
            prepareCategoriesAndCategoriesChannels(operator, chData!.categories!, true),
            prepareCommonSystemValues(operator, {currentChannelId: initialChannel?.id}),
        ])).flat();

        await operator.batchRecords(models, 'retryInitialChannel');

        const directChannels = chData!.channels!.filter(isDMorGM);
        const channelsToFetchProfiles = new Set<Channel>(directChannels);
        if (channelsToFetchProfiles.size) {
            const teammateDisplayNameSetting = getTeammateNameDisplaySetting(preferences || [], config.LockTeammateNameDisplay, config.TeammateNameDisplay, license);
            fetchMissingDirectChannelsInfo(serverUrl, Array.from(channelsToFetchProfiles), user.locale, teammateDisplayNameSetting, user.id);
        }

        fetchPostsForChannel(serverUrl, initialChannel.id);

        return {error: false};
    } catch (error) {
        return {error: true};
    }
}
