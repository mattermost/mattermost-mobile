// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {markChannelAsRead, MyChannelsRequest} from '@actions/remote/channel';
import {fetchPostsForChannel, fetchPostsForUnreadChannels} from '@actions/remote/post';
import {fetchAllTeams, MyTeamsRequest} from '@actions/remote/team';
import {updateAllUsersSince} from '@actions/remote/user';
import {gqlEntry} from '@client/graphQL/entry';
import {gqlToClientChannel, gqlToClientChannelMembership, gqlToClientChannelStats, gqlToClientPreference, gqlToClientRole, gqlToClientSidebarCategory, gqlToClientTeam, gqlToClientTeamMembership, gqlToClientUser} from '@client/graphQL/types';
import {Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {getPreferenceValue} from '@helpers/api/preference';
import {selectDefaultTeam} from '@helpers/api/team';
import {queryAllChannels} from '@queries/servers/channel';
import {prepareModels} from '@queries/servers/entry';
import {prepareCommonSystemValues} from '@queries/servers/system';
import {addChannelToTeamHistory, addTeamToTeamHistory, queryMyTeams} from '@queries/servers/team';
import {selectDefaultChannelForTeam} from '@utils/channel';
import {isTablet} from '@utils/helpers';
import {processIsCRTEnabled} from '@utils/thread';

import {fetchNewThreads} from '../thread';

import {teamsToRemove} from './common';

import type ClientError from '@client/rest/error';
import type ChannelModel from '@typings/database/models/servers/channel';
import type TeamModel from '@typings/database/models/servers/team';

export async function deferredAppEntryGraphQLActions(
    serverUrl: string,
    since: number,
    preferences: PreferenceType[] | undefined,
    config: ClientConfig,
    teamData: MyTeamsRequest,
    chData: MyChannelsRequest | undefined,
    isTabletDevice: boolean,
    initialTeamId?: string,
    initialChannelId?: string,
    isCRTEnabled = false,
) {
    // defer fetching posts for initial channel
    if (initialChannelId && isTabletDevice) {
        fetchPostsForChannel(serverUrl, initialChannelId);
        markChannelAsRead(serverUrl, initialChannelId);
    }

    // defer sidebar DM & GM profiles
    if (chData?.channels?.length && chData.memberships?.length) {
        // defer fetching posts for unread channels on initial team
        fetchPostsForUnreadChannels(serverUrl, chData.channels, chData.memberships, initialChannelId);
    }

    if (isCRTEnabled) {
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

export const graphQLCommon = async (serverUrl: string, syncDatabase: boolean, currentTeamId: string, currentChannelId: string, isUpgrade = false) => {
    console.log('using graphQL');
    const dt = Date.now();

    const operator = DatabaseManager.serverDatabases[serverUrl]?.operator;
    if (!operator) {
        return {error: `${serverUrl} database not found`};
    }
    const {database} = operator;

    const isTabletDevice = await isTablet();

    let time = Date.now();
    let response;
    try {
        response = await gqlEntry(serverUrl);
    } catch (error) {
        return {error: (error as ClientError).message};
    }
    console.log('fetch', Date.now() - time);

    if ('error' in response) {
        console.log('error1', response);
        return {error: response.error};
    }

    if ('errors' in response && response.errors?.length) {
        console.log('error2', response);
        return {error: response.errors[0].message};
    }

    const fetchedData = response.data;

    const config = fetchedData.config || {} as ClientConfig;
    const license = fetchedData.license || {} as ClientLicense;

    const teamData = {
        teams: fetchedData.teamMembers.map((m) => gqlToClientTeam(m.team!)),
        memberships: fetchedData.teamMembers.map((m) => gqlToClientTeamMembership(m)),
    };

    const chData = {
        channels: fetchedData.channelMembers?.map((m) => gqlToClientChannel(m.channel!)),
        stats: fetchedData.channelMembers?.map((m) => gqlToClientChannelStats(m.channel!)),
        memberships: fetchedData.channelMembers?.map((m) => gqlToClientChannelMembership(m)),
        categories: fetchedData.teamMembers.map((m) => m.sidebarCategories!.map((c) => gqlToClientSidebarCategory(c, m.team!.id!))).flat(),
    };

    const prefData = {
        preferences: fetchedData.user?.preferences?.map((p) => gqlToClientPreference(p)),
    };

    const meData = {
        user: gqlToClientUser(fetchedData.user!),
    };

    const roles = [
        ...fetchedData.user?.roles || [],
        ...fetchedData.channelMembers?.map((m) => m.roles).flat() || [],
        ...fetchedData.teamMembers?.map((m) => m.roles).flat() || [],
    ].filter((v, i, a) => a.slice(0, i).find((v2) => v?.name === v2?.name)).map((r) => gqlToClientRole(r!));

    if (isUpgrade && meData?.user) {
        const me = await prepareCommonSystemValues(operator, {currentUserId: meData.user.id});
        if (me?.length) {
            await operator.batchRecords(me);
        }
    }

    let removeTeams: TeamModel[] = [];
    const removeChannels: ChannelModel[] = [];

    if (syncDatabase) {
        const removeTeamIds = [];

        const removedFromTeam = teamData.memberships?.filter((m) => m.delete_at > 0);
        if (removedFromTeam?.length) {
            removeTeamIds.push(...removedFromTeam.map((m) => m.team_id));
        }

        if (teamData.teams?.length === 0) {
            // User is no longer a member of any team
            const myTeams = await queryMyTeams(database).fetch();
            removeTeamIds.push(...(myTeams?.map((myTeam) => myTeam.id) || []));
        }

        removeTeams = await teamsToRemove(serverUrl, removeTeamIds);

        if (chData?.channels) {
            const fetchedChannelIds = chData.channels.map((channel) => channel.id);

            const channels = await queryAllChannels(database).fetch();
            for (const channel of channels) {
                if (!fetchedChannelIds.includes(channel.id)) {
                    removeChannels.push(channel);
                }
            }
        }
    }

    let initialTeamId = currentTeamId;
    if (!teamData.teams.length) {
        initialTeamId = '';
    } else if (!initialTeamId || !teamData.teams.find((t) => t.id === currentTeamId)) {
        const teamOrderPreference = getPreferenceValue(prefData.preferences!, Preferences.TEAMS_ORDER, '', '') as string;
        initialTeamId = selectDefaultTeam(teamData.teams, meData.user.locale, teamOrderPreference, config.ExperimentalPrimaryTeam)?.id || '';
    }

    let initialChannelId = currentChannelId;
    if (initialTeamId !== currentTeamId || !chData.channels?.find((c) => c.id === currentChannelId)) {
        initialChannelId = '';
        if (isTabletDevice && chData.channels && chData.memberships) {
            initialChannelId = selectDefaultChannelForTeam(chData.channels, chData.memberships, initialTeamId, roles, meData.user.locale)?.id || '';
        }
    }

    const modelPromises = await prepareModels({operator, initialTeamId, removeTeams, removeChannels, teamData, chData, prefData, meData}, true);
    modelPromises.push(operator.handleRole({roles, prepareRecordsOnly: true}));
    modelPromises.push(prepareCommonSystemValues(
        operator,
        {
            config,
            license,
            currentTeamId: initialTeamId,
            currentChannelId: initialChannelId,
        },
    ));

    if (initialTeamId && initialTeamId !== currentTeamId) {
        const th = addTeamToTeamHistory(operator, initialTeamId, true);
        modelPromises.push(th);
    }

    if (initialTeamId !== currentTeamId && initialChannelId) {
        try {
            const tch = addChannelToTeamHistory(operator, initialTeamId, initialChannelId, true);
            modelPromises.push(tch);
        } catch {
            // do nothing
        }
    }

    const models = await Promise.all(modelPromises);
    time = Date.now();
    if (models.length) {
        console.log('models #', models.flat().length);
        await operator.batchRecords(models.flat());
    }
    console.log('batch', Date.now() - time);

    const isCRTEnabled = Boolean(prefData.preferences && processIsCRTEnabled(prefData.preferences, config));
    deferredAppEntryGraphQLActions(serverUrl, 0, prefData.preferences, config, teamData, chData, isTabletDevice, initialTeamId, initialChannelId, isCRTEnabled);

    const timeElapsed = Date.now() - dt;
    console.log('Time elapsed', Date.now() - dt);
    return {time: timeElapsed, hasTeams: Boolean(teamData.teams.length), userId: meData.user.id};
};
