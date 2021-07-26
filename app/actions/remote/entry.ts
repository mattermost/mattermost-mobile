// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';

import {scheduleExpiredNotification} from '@actions/local/push_notification';
import {General, Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {getPreferenceValue, getTeammateNameDisplaySetting} from '@helpers/api/preference';
import {selectDefaultTeam} from '@helpers/api/team';
import NetworkManager from '@init/network_manager';
import {prepareMyChannelsForTeam} from '@queries/servers/channel';
import {prepareMyPreferences} from '@queries/servers/preference';
import {prepareCommonSystemValues} from '@queries/servers/system';
import {addChannelToTeamHistory, prepareMyTeams} from '@queries/servers/team';
import {selectDefaultChannelForTeam} from '@utils/channel';

import {fetchMissingSidebarInfo, fetchMyChannelsForTeam, MyChannelsRequest} from './channel';
import {fetchPostsForChannel, fetchPostsForUnreadChannels} from './post';
import {MyPreferencesRequest, fetchMyPreferences} from './preference';
import {fetchRolesIfNeeded} from './role';
import {ConfigAndLicenseRequest, fetchConfigAndLicense} from './systems';
import {fetchMyTeams, fetchTeamsChannelsAndUnreadPosts, MyTeamsRequest} from './team';

import type {Client} from '@client/rest';

type AfterLoginArgs = {
    serverUrl: string;
    user: UserProfile;
    deviceToken?: string;
}

export const loginEntry = async ({serverUrl, user, deviceToken}: AfterLoginArgs) => {
    const dt = Date.now();
    const database = DatabaseManager.serverDatabases[serverUrl]?.database;
    if (!database) {
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

        // Fetch in parallel server config & license / user preferences / teams / team membership / team unreads
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

        const modelPromises: Array<Promise<Model[]>> = [];
        const {operator} = DatabaseManager.serverDatabases[serverUrl];

        if (prefData.preferences) {
            const prefModel = prepareMyPreferences(operator, prefData.preferences!);
            if (prefModel) {
                modelPromises.push(prefModel);
            }
        }

        if (teamData.teams) {
            const teamModels = prepareMyTeams(operator, teamData.teams!, teamData.memberships!, teamData.unreads!);
            if (teamModels) {
                modelPromises.push(...teamModels);
            }
        }

        if (chData?.channels?.length) {
            const channelModels = await prepareMyChannelsForTeam(operator, initialTeam!.id, chData.channels, chData.memberships!);
            if (channelModels) {
                modelPromises.push(...channelModels);
            }
        }

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
        const {operator} = DatabaseManager.serverDatabases[serverUrl];
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
    // if (initialTeam) {
    //     await fetchGroupsForTeam(serverUrl, initialTeam.id);
    // }

    // defer fetch channels and unread posts for other teams
    if (teamData.teams?.length && teamData.memberships?.length) {
        fetchTeamsChannelsAndUnreadPosts(serverUrl, teamData.teams, teamData.memberships, initialTeam?.id);
    }
};
