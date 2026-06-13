// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {nativeApplicationVersion} from 'expo-application';
import {RESULTS, checkNotifications} from 'react-native-permissions';

import {handleKickFromChannel} from '@actions/remote/channel';
import {fetchDataRetentionPolicy} from '@actions/remote/systems';
import {handleKickFromTeam} from '@actions/remote/team';
import {Screens} from '@constants';
import {SYSTEM_IDENTIFIERS} from '@constants/database';
import {PUSH_PROXY_RESPONSE_NOT_AVAILABLE, PUSH_PROXY_RESPONSE_UNKNOWN, PUSH_PROXY_STATUS_NOT_AVAILABLE, PUSH_PROXY_STATUS_UNKNOWN, PUSH_PROXY_STATUS_VERIFIED} from '@constants/push_proxy';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getDeviceToken, getVoIPDeviceToken} from '@queries/app/global';
import {getCurrentChannelId, getCurrentTeamId, getIsDataRetentionEnabled, getPushVerificationStatus, setCurrentTeamAndChannelId, getConfigValue} from '@queries/servers/system';
import EphemeralStore from '@store/ephemeral_store';
import {NavigationStore} from '@store/navigation_store';
import {getFullErrorMessage} from '@utils/errors';
import {isMinimumServerVersion, isTablet} from '@utils/helpers';
import {logDebug, logError} from '@utils/log';

import {entryInitialLoad} from './initial_load';
import {entryRest} from './rest';

import type {EntryResponse} from './types';

export const entry = async (serverUrl: string, teamId?: string, channelId?: string, since = 0, config?: ClientConfig, license?: ClientLicense, groupLabel?: RequestGroupLabel): Promise<EntryResponse> => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);

        if (EphemeralStore.getExperienceAPIEnabled(serverUrl)) {
            const initialResult = await entryInitialLoad(serverUrl, teamId, channelId, config, license, groupLabel);

            if (EphemeralStore.getExperienceAPIEnabled(serverUrl)) {
                return initialResult;
            }
        }

        const result = await entryRest(serverUrl, teamId, channelId, since, groupLabel);

        if (!('error' in result)) {
            const isDataRetentionEnabled = await getIsDataRetentionEnabled(database);
            if (isDataRetentionEnabled) {
                fetchDataRetentionPolicy(serverUrl, false, groupLabel);
            }
        }

        return result;
    } catch (error) {
        logError('entryRest', groupLabel, error);
        return {error};
    }
};

export const setExtraSessionProps = async (serverUrl: string, groupLabel?: RequestGroupLabel) => {
    try {
        const {database} = DatabaseManager.getServerDatabaseAndOperator(serverUrl);
        const serverVersion = await getConfigValue(database, 'Version');
        const deviceToken = await getDeviceToken();
        const voipDeviceToken = await getVoIPDeviceToken();

        // For new servers, we want to send all the information.
        // For old servers, we only want to send the information when there
        // is a device token. Sending the rest of the information should not
        // create any issue.
        if (isMinimumServerVersion(serverVersion, 10, 1, 0) || deviceToken) {
            const res = await checkNotifications();
            const granted = res.status === RESULTS.GRANTED || res.status === RESULTS.LIMITED;
            const client = NetworkManager.getClient(serverUrl);
            client.setExtraSessionProps(deviceToken, !granted, nativeApplicationVersion, voipDeviceToken || undefined, groupLabel);
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
