// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchMyChannelsForTeam, MyChannelsRequest} from '@actions/remote/channel';
import {MyPreferencesRequest, fetchMyPreferences} from '@actions/remote/preference';
import {fetchRolesIfNeeded, RolesRequest} from '@actions/remote/role';
import {getSessions} from '@actions/remote/session';
import {ConfigAndLicenseRequest, fetchConfigAndLicense} from '@actions/remote/systems';
import {fetchMyTeams, MyTeamsRequest} from '@actions/remote/team';
import {gqlLogin} from '@client/graphQL/entry';
import {gqlToClientChannel, gqlToClientChannelMembership, gqlToClientPreference, gqlToClientRole, gqlToClientSidebarCategory, gqlToClientTeam, gqlToClientTeamMembership} from '@client/graphQL/types';
import ClientError from '@client/rest/error';
import {Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {getPreferenceValue} from '@helpers/api/preference';
import {selectDefaultTeam} from '@helpers/api/team';
import NetworkManager from '@managers/network_manager';
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

type SpecificAfterLoginArgs = {
    serverUrl: string;
    user: UserProfile;
    clData: ConfigAndLicenseRequest;
}

export async function loginEntry({serverUrl, user, deviceToken}: AfterLoginArgs): Promise<{error?: any; hasTeams?: boolean; time?: number}> {
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
        const clData = await fetchConfigAndLicense(serverUrl, true);
        if (clData.error) {
            return {error: clData.error};
        }

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

        if (clData.config?.FeatureFlagGraphQL === 'true') {
            return gqlLoginEntry({serverUrl, user, clData});
        }

        return restLoginEntry({serverUrl, user, clData});
    } catch (error) {
        return {error};
    }
}

const gqlLoginEntry = async ({serverUrl, user, clData}: SpecificAfterLoginArgs) => {
    console.log('using graphQL');
    const dt = Date.now();
    const time = Date.now();

    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    const isTabletDevice = await isTablet();

    let response;
    try {
        response = await gqlLogin(serverUrl);
    } catch (error) {
        return {error: (error as ClientError).message};
    }

    if ('error' in response) {
        return {error: response.error};
    }

    if ('errors' in response && response.errors?.length) {
        return {error: response.errors[0].message};
    }

    const fetchedData = response.data;

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

    const rolesData = {
        roles: [
            ...fetchedData.user?.roles || [],
            ...fetchedData.channelMembers?.map((m) => m.roles).flat() || [],
            ...fetchedData.teamMembers?.map((m) => m.roles).flat() || [],
        ].filter((v, i, a) => a.slice(0, i).find((v2) => v?.name === v2?.name)).map((r) => gqlToClientRole(r!)),
    };

    const teamOrderPreference = getPreferenceValue(prefData.preferences!, Preferences.TEAMS_ORDER, '', '') as string;

    const initialTeam = selectDefaultTeam(teamData.teams, user.locale, teamOrderPreference, clData.config?.ExperimentalPrimaryTeam);
    let initialChannel: Channel|undefined;

    if (initialTeam) {
        if (chData.channels?.length && chData.memberships?.length) {
            const {channels, memberships} = chData;

            // select initial channel only on Tablets
            if (isTabletDevice) {
                initialChannel = selectDefaultChannelForTeam(channels!, memberships!, initialTeam!.id, rolesData.roles, user.locale);
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

    if (rolesData?.roles?.length) {
        const roles = operator.handleRole({roles: rolesData.roles, prepareRecordsOnly: true});
        modelPromises.push(roles);
    }

    const models = await Promise.all(modelPromises);
    if (models.length) {
        await operator.batchRecords(models.flat());
    }

    const config = clData.config || {} as ClientConfig;
    const license = clData.license || {} as ClientLicense;
    deferredAppEntryActions(serverUrl, 0, user.id, user.locale, prefData.preferences, config, license, teamData, chData, initialTeam?.id, initialChannel?.id, true);

    console.log('Time elapsed', Date.now() - time);
    return {time: Date.now() - dt, hasTeams: Boolean((teamData.teams?.length || 0) > 0)};
};

const restLoginEntry = async ({serverUrl, user, clData}: SpecificAfterLoginArgs) => {
    const dt = Date.now();
    console.log('using rest');
    const time = Date.now();

    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }

    try {
        const isTabletDevice = await isTablet();
        let initialTeam: Team|undefined;
        let initialChannel: Channel|undefined;
        let myTeams: Team[]|undefined;

        // Fetch in parallel server config & license / user preferences / teams / team membership
        const promises: [Promise<MyPreferencesRequest>, Promise<MyTeamsRequest>] = [
            fetchMyPreferences(serverUrl, true),
            fetchMyTeams(serverUrl, true),
        ];

        const [prefData, teamData] = await Promise.all(promises);
        let chData: MyChannelsRequest|undefined;
        let rData: RolesRequest|undefined;

        // select initial team
        if (!prefData.error && !teamData.error) {
            const teamOrderPreference = getPreferenceValue(prefData.preferences!, Preferences.TEAMS_ORDER, '', '') as string;
            const teamRoles: string[] = [];
            const teamMembers = new Set<string>();

            teamData.memberships?.forEach((tm) => {
                teamRoles.push(...tm.roles.split(' '));
                teamMembers.add(tm.team_id);
            });

            myTeams = teamData.teams!.filter((t) => teamMembers.has(t.id));
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
        await operator.batchRecords(models.flat());

        const config = clData.config || {} as ClientConfig;
        const license = clData.license || {} as ClientLicense;
        deferredAppEntryActions(serverUrl, 0, user.id, user.locale, prefData.preferences, config, license, teamData, chData, initialTeam?.id, initialChannel?.id);

        const error = clData.error || prefData.error || teamData.error || chData?.error;
        console.log('Time elapsed', Date.now() - time);
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
        console.log('Time elapsed', Date.now() - time);
        return {error};
    }
};
