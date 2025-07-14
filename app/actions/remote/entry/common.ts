// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {nativeApplicationVersion} from 'expo-application';
import {RESULTS, checkNotifications} from 'react-native-permissions';

import {fetchAllMyChannelsForAllTeams, fetchMissingDirectChannelsInfo, handleKickFromChannel, type MyChannelsRequest} from '@actions/remote/channel';
import {fetchGroupsForMember} from '@actions/remote/groups';
import {fetchPostsForUnreadChannels} from '@actions/remote/post';
import {type MyPreferencesRequest, fetchMyPreferences} from '@actions/remote/preference';
import {fetchRoles} from '@actions/remote/role';
import {fetchScheduledPosts} from '@actions/remote/scheduled_post';
import {fetchConfigAndLicense, fetchDataRetentionPolicy} from '@actions/remote/systems';
import {fetchMyTeams, fetchTeamsThreads, handleKickFromTeam, type MyTeamsRequest, updateCanJoinTeams} from '@actions/remote/team';
import {syncTeamThreads} from '@actions/remote/thread';
import {fetchMe, type MyUserRequest, updateAllUsersSince, autoUpdateTimezone} from '@actions/remote/user';
import {General, Preferences, Screens} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import {PUSH_PROXY_RESPONSE_NOT_AVAILABLE, PUSH_PROXY_RESPONSE_UNKNOWN, PUSH_PROXY_STATUS_NOT_AVAILABLE, PUSH_PROXY_STATUS_UNKNOWN, PUSH_PROXY_STATUS_VERIFIED} from '@constants/push_proxy';
import DatabaseManager from '@database/manager';
import {getPreferenceValue, getTeammateNameDisplaySetting} from '@helpers/api/preference';
import {selectDefaultTeam} from '@helpers/api/team';
import {DEFAULT_LOCALE} from '@i18n';
import NetworkManager from '@managers/network_manager';
import {getDeviceToken} from '@queries/app/global';
import {getChannelById} from '@queries/servers/channel';
import {prepareEntryModels, prepareEntryModelsForDeletion, truncateCrtRelatedTables} from '@queries/servers/entry';
import {getHasCRTChanged} from '@queries/servers/preference';
import {getCurrentChannelId, getCurrentTeamId, getIsDataRetentionEnabled, getPushVerificationStatus, getLastFullSync, setCurrentTeamAndChannelId, getConfigValue} from '@queries/servers/system';
import {getTeamChannelHistory} from '@queries/servers/team';
import NavigationStore from '@store/navigation_store';
import {isDefaultChannel, isDMorGM, sortChannelsByDisplayName} from '@utils/channel';
import {getFullErrorMessage} from '@utils/errors';
import {isMinimumServerVersion, isTablet} from '@utils/helpers';
import {logDebug, logError} from '@utils/log';
import {processIsCRTEnabled} from '@utils/thread';

import type {Database, Model} from '@nozbe/watermelondb';

export type AppEntryData = {
    initialTeamId: string;
    teamData: MyTeamsRequest;
    chData?: MyChannelsRequest;
    prefData: MyPreferencesRequest;
    meData: MyUserRequest;
    removeTeamIds?: string[];
    removeChannelIds?: string[];
    isCRTEnabled: boolean;
    initialChannelId?: string;
    gmConverted: boolean;
}

export type AppEntryError = {
    error: unknown;
}

export type EntryResponse = {
    models: Model[];
    initialTeamId: string;
    initialChannelId: string;
    prefData: MyPreferencesRequest;
    teamData: MyTeamsRequest;
    chData?: MyChannelsRequest;
    meData?: MyUserRequest;
    gmConverted: boolean;
} | {
    error: unknown;
}

export const entry = async (serverUrl: string, teamId?: string, channelId?: string, since = 0, groupLabel?: RequestGroupLabel): Promise<EntryResponse> => {
    const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
    const result = await entryRest(serverUrl, teamId, channelId, since, groupLabel);

    // Fetch data retention policies
    if (!result.error) {
        const isDataRetentionEnabled = await getIsDataRetentionEnabled(database);
        if (isDataRetentionEnabled) {
            fetchDataRetentionPolicy(serverUrl, false, groupLabel);
        }
    }

    return result;
};

export async function deferredAppEntryActions(
    serverUrl: string, since: number, currentUserId: string, currentUserLocale: string, preferences: PreferenceType[] | undefined,
    config: ClientConfig, license: ClientLicense | undefined, teamData: MyTeamsRequest, chData: MyChannelsRequest | undefined,
    initialTeamId?: string, initialChannelId?: string,
    groupLabel?: BaseRequestGroupLabel,
) {
    const result = restDeferredAppEntryActions(
        serverUrl, since, currentUserId, currentUserLocale,
        preferences, config, license,
        teamData, chData, initialTeamId, initialChannelId,
        groupLabel,
    );

    autoUpdateTimezone(serverUrl, groupLabel);

    return result;
}

const entryRest = async (serverUrl: string, teamId?: string, channelId?: string, since = 0, groupLabel?: RequestGroupLabel) => {
    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        let lastDisconnectedAt = since || await getLastFullSync(database);

        const [confResp, prefData] = await Promise.all([
            fetchConfigAndLicense(serverUrl, false, groupLabel),
            fetchMyPreferences(serverUrl, true, groupLabel),
        ]);

        const isCRTEnabled = Boolean(prefData.preferences && processIsCRTEnabled(prefData.preferences, confResp.config?.CollapsedThreads, confResp.config?.FeatureFlagCollapsedThreads, confResp.config?.Version));
        if (prefData.preferences) {
            const crtToggled = await getHasCRTChanged(database, prefData.preferences);
            if (crtToggled) {
                const currentServerUrl = await DatabaseManager.getActiveServerUrl();
                const isSameServer = currentServerUrl === serverUrl;
                if (isSameServer) {
                    lastDisconnectedAt = 0;
                }
                const {error} = await truncateCrtRelatedTables(serverUrl);
                if (error) {
                    throw new Error(`Resetting CRT on ${serverUrl} failed`);
                }
            }
        }

        // let's start fetching in parallel all we can
        const promises: [Promise<MyTeamsRequest>, Promise<MyUserRequest>, Promise<MyChannelsRequest>] = [
            fetchMyTeams(serverUrl, true, groupLabel),
            fetchMe(serverUrl, true, groupLabel),
            fetchAllMyChannelsForAllTeams(serverUrl, lastDisconnectedAt, isCRTEnabled, true, groupLabel),
        ];

        const [teamData, meData, chData] = await Promise.all(promises);
        const error = confResp.error || prefData.error || teamData.error || meData.error || chData.error;
        if (error) {
            return {error};
        }

        fetchRoles(serverUrl, teamData.memberships, chData.memberships, meData.user, false, false, groupLabel);

        let initialTeamId = teamId || '';
        let initialChannelId = channelId || '';
        let gmConverted = false;

        if (channelId) {
            const existingChannel = await getChannelById(database, channelId);
            if (existingChannel && existingChannel.type === General.GM_CHANNEL) {
                // Okay, so now we know the channel existsin in mobile app's database as a GM.
                // We now need to also check if channel on server is actually a private channel,
                // and if so, which team does it belong to now. That team will become the
                // active team on mobile app after this point.

                const serverChannel = chData.channels?.find((c) => c.id === channelId);

                // Although yon can convert GM only to a pirvate channel, a private channel can furthur be converted to a public channel.
                // So between the mobile app being on the GM and reconnecting,
                // it may have become either a public or a private channel. So we need to check for both.
                if (serverChannel?.type === General.PRIVATE_CHANNEL || serverChannel?.type === General.OPEN_CHANNEL) {
                    initialTeamId = serverChannel.team_id;
                    initialChannelId = channelId;
                    gmConverted = true;
                }
            }
        }

        if (!teamData.error && teamData.teams?.length === 0) {
            initialTeamId = '';
        }

        const inTeam = teamData.teams?.find((t) => t.id === initialTeamId);
        if (initialTeamId && !inTeam && !teamData.error) {
            initialTeamId = '';
        }

        if (!initialTeamId && teamData.teams?.length && teamData.memberships?.length) {
            // If no initial team was set in the database but got teams in the response
            const teamOrderPreference = getPreferenceValue<string>(prefData.preferences || [], Preferences.CATEGORIES.TEAMS_ORDER, '', '');
            const teamMembers = new Set(teamData.memberships.filter((m) => m.delete_at === 0).map((m) => m.team_id));
            const myTeams = teamData.teams.filter((t) => teamMembers.has(t.id));
            const defaultTeam = selectDefaultTeam(myTeams, meData.user?.locale || DEFAULT_LOCALE, teamOrderPreference, confResp.config?.ExperimentalPrimaryTeam);
            if (defaultTeam?.id) {
                initialTeamId = defaultTeam.id;
            }
        }

        initialChannelId = await entryInitialChannelId(database, initialChannelId, teamId, initialTeamId, meData?.user?.locale || '', chData?.channels, chData?.memberships);

        const dt = Date.now();
        const modelsToDeletePromises = await prepareEntryModelsForDeletion({serverUrl, operator, teamData, chData});
        const modelPromises = await prepareEntryModels({operator, teamData, chData, prefData, meData, isCRTEnabled});
        const modelsToDelete = await Promise.all(modelsToDeletePromises);
        const models = await Promise.all(modelPromises);
        if (modelsToDelete.length) {
            models.push(...modelsToDelete);
        }
        logDebug('Process models on entry', groupLabel, models.flat().length, `${Date.now() - dt}ms`);

        return {models: models.flat(), initialChannelId, initialTeamId, prefData, teamData, chData, meData, gmConverted};
    } catch (error) {
        logError('entryRest', groupLabel, error);
        return {error};
    }
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
        if (membershipIds.has(c) || c === Screens.GLOBAL_THREADS || c === Screens.GLOBAL_DRAFTS) {
            return c;
        }
    }

    // Check if we are member of the default channel.
    const defaultChannel = channels?.find((c) => isDefaultChannel(c) && c.team_id === initialTeamId);
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
    initialTeamId?: string, initialChannelId?: string, groupLabel?: BaseRequestGroupLabel,
) {
    const isCRTEnabled = (preferences && processIsCRTEnabled(preferences, config.CollapsedThreads, config.FeatureFlagCollapsedThreads, config.Version)) || false;
    const directChannels = chData?.channels?.filter(isDMorGM);
    const channelsToFetchProfiles = new Set<Channel>(directChannels);
    const requestLabel: RequestGroupLabel|undefined = groupLabel ? `${groupLabel} Deferred` : undefined;

    // sidebar DM & GM profiles
    if (channelsToFetchProfiles.size) {
        const teammateDisplayNameSetting = getTeammateNameDisplaySetting(preferences || [], config.LockTeammateNameDisplay, config.TeammateNameDisplay, license);
        fetchMissingDirectChannelsInfo(serverUrl, Array.from(channelsToFetchProfiles), currentUserLocale, teammateDisplayNameSetting, currentUserId, false, requestLabel);
    }

    updateAllUsersSince(serverUrl, since, false, requestLabel);
    updateCanJoinTeams(serverUrl);

    setTimeout(async () => {
        let mySortedTeams: Team[] = [];
        if (teamData.teams?.length && teamData.memberships?.length) {
            const teamsOrder = preferences?.find((p) => p.category === Preferences.CATEGORIES.TEAMS_ORDER);
            const sortedTeamIds = new Set(teamsOrder?.value.split(','));
            const membershipSet = new Set(teamData.memberships.map((m) => m.team_id));
            const teamMap = new Map(teamData.teams.map((t) => [t.id, t]));
            if (sortedTeamIds.size) {
                const sortedTeams = [...sortedTeamIds].
                    filter((id) => membershipSet.has(id) && teamMap.has(id)).
                    map((id) => teamMap.get(id)!);
                const extraTeams = [...membershipSet].
                    filter((id) => !sortedTeamIds.has(id) && teamMap.get(id)).
                    map((id) => teamMap.get(id)!).
                    sort((a, b) => a.display_name.toLocaleLowerCase().localeCompare(b.display_name.toLocaleLowerCase()));
                mySortedTeams = [...sortedTeams, ...extraTeams];
            } else {
                mySortedTeams = teamData.teams.
                    sort((a, b) => a.display_name.toLocaleLowerCase().localeCompare(b.display_name.toLocaleLowerCase()));
            }

            const myOtherSortedTeams = mySortedTeams.filter((t) => t.id !== initialTeamId);
            if (initialTeamId) {
                const initialTeam = teamMap.get(initialTeamId);
                if (initialTeam) {
                    mySortedTeams = [initialTeam, ...myOtherSortedTeams];
                }
            }

            if (chData?.channels?.length && chData.memberships?.length && initialTeamId) {
                if (isCRTEnabled && initialTeamId) {
                    await syncTeamThreads(serverUrl, initialTeamId, {groupLabel: requestLabel});
                }
                fetchPostsForUnreadChannels(serverUrl, mySortedTeams, chData.channels, chData.memberships, initialChannelId, isCRTEnabled, requestLabel);
            }

            if (myOtherSortedTeams.length) {
                fetchTeamsThreads(serverUrl, since, myOtherSortedTeams, isCRTEnabled, false, requestLabel);
            }
        }
    });

    // Fetch groups for current user
    fetchGroupsForMember(serverUrl, currentUserId, false, requestLabel);

    if (initialTeamId) {
        fetchScheduledPosts(serverUrl, initialTeamId, true, groupLabel);
    }
}

export const setExtraSessionProps = async (serverUrl: string, groupLabel?: RequestGroupLabel) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const serverVersion = await getConfigValue(database, 'Version');
        const deviceToken = await getDeviceToken();

        // For new servers, we want to send all the information.
        // For old servers, we only want to send the information when there
        // is a device token. Sending the rest of the information should not
        // create any issue.
        if (isMinimumServerVersion(serverVersion, 10, 1, 0) || deviceToken) {
            const res = await checkNotifications();
            const granted = res.status === RESULTS.GRANTED || res.status === RESULTS.LIMITED;
            const client = NetworkManager.getClient(serverUrl);
            client.setExtraSessionProps(deviceToken, !granted, nativeApplicationVersion, groupLabel);
        }
        return {};
    } catch (error) {
        logDebug('error on setExtraSessionProps', getFullErrorMessage(error));
        return {error};
    }
};

export async function verifyPushProxy(serverUrl: string, groupLabel?: RequestGroupLabel) {
    const deviceId = await getDeviceToken();
    if (!deviceId) {
        return;
    }

    try {
        const {database, operator} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const ppVerification = await getPushVerificationStatus(database);
        if (
            ppVerification !== PUSH_PROXY_STATUS_UNKNOWN &&
            ppVerification !== ''
        ) {
            return;
        }

        const client = NetworkManager.getClient(serverUrl);
        const response = await client.ping(deviceId, undefined, groupLabel);
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
    } catch (error) {
        logDebug('error on verifyPushProxy', getFullErrorMessage(error));

        // Do nothing
    }
}

export async function handleEntryAfterLoadNavigation(
    serverUrl: string,
    teamMembers: TeamMembership[],
    channelMembers: ChannelMember[],
    currentTeamId: string,
    currentChannelId: string,
    initialTeamId: string,
    initialChannelId: string,
    gmConverted: boolean,
) {
    try {
        const {operator, database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        const currentTeamIdAfterLoad = await getCurrentTeamId(database);
        const currentChannelIdAfterLoad = await getCurrentChannelId(database);
        const mountedScreens = NavigationStore.getScreensInStack();
        const isChannelScreenMounted = mountedScreens.includes(Screens.CHANNEL);
        const isThreadsMounted = mountedScreens.includes(Screens.THREAD);
        const tabletDevice = isTablet();

        if (!currentTeamIdAfterLoad) {
            // First load or no team
            if (tabletDevice) {
                await setCurrentTeamAndChannelId(operator, initialTeamId, initialChannelId);
            } else {
                await setCurrentTeamAndChannelId(operator, initialTeamId, '');
            }
        } else if (currentTeamIdAfterLoad !== currentTeamId) {
            // Switched teams while loading
            if (!teamMembers.find((t) => t.team_id === currentTeamIdAfterLoad && t.delete_at === 0)) {
                await handleKickFromTeam(serverUrl, currentTeamIdAfterLoad);
            }
        } else if (currentTeamIdAfterLoad !== initialTeamId) {
            if (gmConverted) {
                await setCurrentTeamAndChannelId(operator, initialTeamId, currentChannelId);
            } else {
                await handleKickFromTeam(serverUrl, currentTeamIdAfterLoad);
            }
        } else if (currentChannelIdAfterLoad !== currentChannelId) {
            // Switched channels while loading
            if (!channelMembers.find((m) => m.channel_id === currentChannelIdAfterLoad)) {
                if (tabletDevice || isChannelScreenMounted || isThreadsMounted) {
                    await handleKickFromChannel(serverUrl, currentChannelIdAfterLoad);
                } else {
                    await setCurrentTeamAndChannelId(operator, initialTeamId, initialChannelId);
                }
            }
        } else if (currentChannelIdAfterLoad && currentChannelIdAfterLoad !== initialChannelId) {
            if (tabletDevice || isChannelScreenMounted || isThreadsMounted) {
                await handleKickFromChannel(serverUrl, currentChannelIdAfterLoad);
            } else {
                await setCurrentTeamAndChannelId(operator, initialTeamId, initialChannelId);
            }
        }
    } catch (error) {
        logDebug('could not manage the entry after load navigation', error);
    }
}
