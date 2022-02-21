// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Model} from '@nozbe/watermelondb';

import {fetchMyChannelsForTeam, MyChannelsRequest} from '@actions/remote/channel';
import {MyPreferencesRequest, fetchMyPreferences} from '@actions/remote/preference';
import {fetchRolesIfNeeded, RolesRequest} from '@actions/remote/role';
import {getSessions} from '@actions/remote/session';
import {ConfigAndLicenseRequest, fetchConfigAndLicense} from '@actions/remote/systems';
import {fetchMyTeams, MyTeamsRequest} from '@actions/remote/team';
import {Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {getPreferenceValue} from '@helpers/api/preference';
import {selectDefaultTeam} from '@helpers/api/team';
import NetworkManager from '@init/network_manager';
import {prepareModels} from '@queries/servers/entry';
import {prepareCommonSystemValues} from '@queries/servers/system';
import {addChannelToTeamHistory, addTeamToTeamHistory} from '@queries/servers/team';
import {selectDefaultChannelForTeam} from '@utils/channel';
import {isTablet} from '@utils/helpers';
import {scheduleExpiredNotification} from '@utils/notification';

import {deferredAppEntryActions} from './common';

import type {Client} from '@client/rest';

type AfterLoginArgs = {
    serverUrl: string;
    user: UserProfile;
    deviceToken?: string;
}

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
        const isTabletDevice = await isTablet();
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
        let rData: RolesRequest|undefined;

        // schedule local push notification if needed
        if (clData.config) {
            if (clData.config.ExtendSessionLengthWithActivity !== 'true') {
                const timeOut = setTimeout(async () => {
                    clearTimeout(timeOut);
                    let sessions: Session[]|undefined;

                    try {
                        sessions = await getSessions(serverUrl, 'me');
                    } catch (e) {
                        // eslint-disable-next-line no-console
                        console.warn('Failed to get user sessions', e);
                        return;
                    }

                    if (sessions && Array.isArray(sessions)) {
                        scheduleExpiredNotification(sessions, clData.config?.SiteName || serverUrl, user.locale);
                    }
                }, 500);
            }
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
                    rData = await fetchRolesIfNeeded(serverUrl, Array.from(rolesToFetch), true);

                    // select initial channel only on Tablets
                    if (isTabletDevice) {
                        initialChannel = selectDefaultChannelForTeam(channels!, memberships!, initialTeam!.id, rData.roles, user.locale);
                    }
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

        if (initialTeam) {
            const th = addTeamToTeamHistory(operator, initialTeam.id, true);
            modelPromises.push(th);
        }

        if (initialTeam && initialChannel) {
            try {
                const tch = addChannelToTeamHistory(operator, initialTeam.id, initialChannel.id, true);
                modelPromises.push(tch);
            } catch {
                // do nothing
            }
        }

        if (rData?.roles?.length) {
            const roles = operator.handleRole({roles: rData.roles, prepareRecordsOnly: true});
            modelPromises.push(roles);
        }

        const models = await Promise.all(modelPromises);
        if (models.length) {
            await operator.batchRecords(models.flat() as Model[]);
        }

        const config = clData.config || {} as ClientConfig;
        const license = clData.license || {} as ClientLicense;
        deferredAppEntryActions(serverUrl, 0, user.id, user.locale, prefData.preferences, config, license, teamData, chData, initialTeam?.id, initialChannel?.id);

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
