// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fetchMissingDirectChannelsInfo, fetchMyChannelsForTeam, type MyChannelsRequest} from '@actions/remote/channel';
import {fetchGroupsForMember} from '@actions/remote/groups';
import {fetchPostsForUnreadChannels} from '@actions/remote/post';
import {fetchRoles} from '@actions/remote/role';
import {fetchScheduledPosts} from '@actions/remote/scheduled_post';
import {fetchTeamsThreads, type MyTeamsRequest, updateCanJoinTeams} from '@actions/remote/team';
import {syncTeamThreads} from '@actions/remote/thread';
import {autoUpdateTimezone, updateAllUsersSince, type MyUserRequest} from '@actions/remote/user';
import {Preferences} from '@constants';
import DatabaseManager from '@database/manager';
import {getTeammateNameDisplaySetting} from '@helpers/api/preference';
import {processEntryModels, processEntryModelsForDeletion} from '@queries/servers/entry';
import {isDMorGM} from '@utils/channel';
import {logError} from '@utils/log';
import {processIsCRTEnabled} from '@utils/thread';

export async function deferredAppEntryActions(
    serverUrl: string,
    since: number,
    currentUserId: string, currentUserLocale: string,
    preferences: PreferenceType[] | undefined,
    config: ClientConfig,
    license: ClientLicense | undefined,
    teamData: MyTeamsRequest,
    chData: MyChannelsRequest | undefined,
    meData: MyUserRequest | undefined,
    initialTeamId?: string, initialChannelId?: string,
    groupLabel?: BaseRequestGroupLabel,
) {
    const result = restDeferredAppEntryActions(
        serverUrl,
        since,
        currentUserId,
        currentUserLocale,
        preferences,
        config,
        license,
        teamData,
        chData,
        meData,
        initialTeamId,
        initialChannelId,
        groupLabel,
    );

    autoUpdateTimezone(serverUrl, groupLabel);

    return result;
}

export async function restDeferredAppEntryActions(
    serverUrl: string, since: number, currentUserId: string, currentUserLocale: string, preferences: PreferenceType[] | undefined,
    config: ClientConfig, license: ClientLicense | undefined, teamData: MyTeamsRequest, chData: MyChannelsRequest | undefined, meData: MyUserRequest | undefined,
    initialTeamId?: string, initialChannelId?: string, groupLabel?: BaseRequestGroupLabel,
) {
    const isCRTEnabled = (preferences && processIsCRTEnabled(preferences, config.CollapsedThreads, config.FeatureFlagCollapsedThreads, config.Version)) || false;
    const directChannels = chData?.channels?.filter(isDMorGM);
    const channelsToFetchProfiles = new Set<Channel>(directChannels);
    const requestLabel: RequestGroupLabel|undefined = groupLabel ? `${groupLabel} Deferred` : undefined;

    setTimeout(async () => {
        // sidebar DM & GM profiles
        if (channelsToFetchProfiles.size) {
            const teammateDisplayNameSetting = getTeammateNameDisplaySetting(preferences || [], config.LockTeammateNameDisplay, config.TeammateNameDisplay, license);
            fetchMissingDirectChannelsInfo(serverUrl, Array.from(channelsToFetchProfiles), currentUserLocale, teammateDisplayNameSetting, currentUserId, false, requestLabel);
        }

        updateAllUsersSince(serverUrl, since, false, requestLabel);
        updateCanJoinTeams(serverUrl);

        const {operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const teamMap = new Map(teamData.teams?.map((t) => [t.id, t]) || []);
        let mySortedTeams: Team[] = [];
        let myOtherSortedTeams: Team[] = [];
        let teamQueue: Team[] = [];

        const combinedChannelsData: MyChannelsRequest = {
            channels: [],
            memberships: [],
            ...chData,
        };

        const processTeams = async () => {
            for (const team of teamQueue) {
                let data: MyChannelsRequest = {};
                try {
                    /* eslint-disable-next-line no-await-in-loop */
                    data = await fetchMyChannelsForTeam(serverUrl, team.id, false, since, true, false, isCRTEnabled, requestLabel);

                    combineChannelsData(combinedChannelsData, data);

                } catch (error) {
                    logError('Error fetching channels for team', groupLabel, error);
                }

                const currentTeamData: MyTeamsRequest = {
                    teams: [team],
                    memberships: teamData?.memberships?.filter((m) => m.team_id === team.id),
                };

                /* eslint-disable-next-line no-await-in-loop */
                await processEntryModels({operator, teamData: currentTeamData, chData: data, isCRTEnabled});
            }

            const uniqueChannelsData: MyChannelsRequest = {
                channels: Array.from(new Map(combinedChannelsData.channels?.map((c) => [c.id, c])).values()),
                memberships: Array.from(new Map(combinedChannelsData.memberships?.map((m) => [m.channel_id, m])).values()),
                categories: Array.from(new Map(combinedChannelsData.categories?.map((c) => [c.id, c])).values()),
            };

            await processFinalInitializationTasks(uniqueChannelsData);
        };

        const processFinalInitializationTasks = async (uniqueChannelsData: MyChannelsRequest) => {
            try {
                fetchRoles(serverUrl, teamData.memberships, chData?.memberships, meData?.user, false, false, groupLabel);

                if (initialTeamId) {
                    const initialTeam = teamMap.get(initialTeamId);
                    if (initialTeam) {
                        mySortedTeams = [initialTeam, ...myOtherSortedTeams];
                    }
                }

                // previously we were deleting the models via processEntryModels, but we don't want to delete any
                // teams or channels until we have fetched all the data for the team, which now is later in the code
                processEntryModelsForDeletion({serverUrl, operator, teamData, chData: uniqueChannelsData});

                if (uniqueChannelsData?.channels?.length && uniqueChannelsData.memberships?.length && initialTeamId) {
                    if (isCRTEnabled && initialTeamId) {
                        await syncTeamThreads(serverUrl, initialTeamId, {groupLabel: requestLabel});
                    }

                    fetchPostsForUnreadChannels(serverUrl, mySortedTeams, uniqueChannelsData.channels, uniqueChannelsData.memberships, initialChannelId, isCRTEnabled, requestLabel);
                }

                if (myOtherSortedTeams.length) {
                    fetchTeamsThreads(serverUrl, since, myOtherSortedTeams, isCRTEnabled, false, requestLabel);
                }

                // Fetch groups for current user
                await fetchGroupsForMember(serverUrl, currentUserId, false, requestLabel);

                if (initialTeamId) {
                    await fetchScheduledPosts(serverUrl, initialTeamId, true, groupLabel);
                }
            } catch (error) {
                logError('Error in processFinalInitializationTasks', groupLabel, error);
            }

        };

        if (teamData.teams?.length && teamData.memberships?.length) {
            mySortedTeams = sortTeamsByPreferences(teamData, preferences, teamMap);
            myOtherSortedTeams = mySortedTeams.filter((t) => t.id !== initialTeamId);

            teamQueue = [...myOtherSortedTeams];
        }

        processTeams();
    });
}

function sortTeamsByPreferences(teamData: MyTeamsRequest, preferences: PreferenceType[] | undefined, teamMap: Map<string, Team>): Team[] {
    const teamsOrder = preferences?.find((p) => p.category === Preferences.CATEGORIES.TEAMS_ORDER);
    const sortedTeamIds = new Set(teamsOrder?.value.split(','));
    const membershipSet = new Set(teamData.memberships?.map((m) => m.team_id) || []);

    if (sortedTeamIds.size) {
        const sortedTeams = [...sortedTeamIds].
            filter((id) => membershipSet.has(id) && teamMap.has(id)).
            map((id) => teamMap.get(id)!);
        const extraTeams = [...membershipSet].
            filter((id) => !sortedTeamIds.has(id) && teamMap.get(id)).
            map((id) => teamMap.get(id)!).
            sort((a, b) => a.display_name.toLocaleLowerCase().localeCompare(b.display_name.toLocaleLowerCase()));
        return [...sortedTeams, ...extraTeams];
    }
    return teamData.teams?.
        sort((a, b) => a.display_name.toLocaleLowerCase().localeCompare(b.display_name.toLocaleLowerCase())) || [];

}

function combineChannelsData(target: MyChannelsRequest, source: MyChannelsRequest) {
    if (source.channels) {
        target.channels = target.channels?.concat(source.channels);
    }
    if (source.memberships) {
        target.memberships = target.memberships?.concat(source.memberships);
    }
    if (source.categories) {
        target.categories = target.categories?.concat(source.categories);
    }
}

export const testExports = {
    combineChannelsData,
    sortTeamsByPreferences,
};

