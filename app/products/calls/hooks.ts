// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Check if calls is enabled. If it is, then run fn; if it isn't, show an alert and set
// msgPostfix to ' (Not Available)'.
import {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, Platform} from 'react-native';
import Permissions from 'react-native-permissions';

import {initializeVoiceTrack} from '@calls/actions/calls';
import {
    getCallsConfig, getCurrentCall,
    setMicPermissionsGranted,
    useCallsState,
    useChannelsWithCalls,
    useCurrentCall,
    useGlobalCallsState,
    useIncomingCalls,
} from '@calls/state';
import {errorAlert, isHostControlsAllowed} from '@calls/utils';
import {Screens} from '@constants';
import {
    CALL_ERROR_BAR_HEIGHT,
    CALL_NOTIFICATION_BAR_HEIGHT,
    CURRENT_CALL_BAR_HEIGHT,
    JOIN_CALL_BAR_HEIGHT,
} from '@constants/view';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import DatabaseManager from '@database/manager';
import {useAppState} from '@hooks/device';
import NetworkManager from '@managers/network_manager';
import {queryAllActiveServers} from '@queries/app/servers';
import {getCurrentUser} from '@queries/servers/user';
import {openAsBottomSheet} from '@screens/navigation';
import {getFullErrorMessage} from '@utils/errors';
import {isSystemAdmin} from '@utils/user';

import type {CallSession} from '@calls/types/calls';
import type {Client} from '@client/rest';

export const useTryCallsFunction = (fn: () => void) => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const [msgPostfix, setMsgPostfix] = useState('');
    const [clientError, setClientError] = useState('');

    let client: Client | undefined;
    if (!clientError) {
        try {
            client = NetworkManager.getClient(serverUrl);
        } catch (error) {
            setClientError(getFullErrorMessage(error));
        }
    }
    const tryFn = useCallback(async () => {
        let enabled;
        try {
            enabled = await client?.getEnabled();
        } catch (error) {
            errorAlert(getFullErrorMessage(error), intl);
            return;
        }

        if (enabled) {
            setMsgPostfix('');
            fn();
            return;
        }

        if (clientError) {
            errorAlert(clientError, intl);
            return;
        }

        const title = intl.formatMessage({
            id: 'mobile.calls_not_available_title',
            defaultMessage: 'Calls is not enabled',
        });
        const message = intl.formatMessage({
            id: 'mobile.calls_not_available_msg',
            defaultMessage: 'Please contact your System Admin to enable the feature.',
        });
        const ok = intl.formatMessage({
            id: 'mobile.calls_ok',
            defaultMessage: 'OK',
        });
        const notAvailable = intl.formatMessage({
            id: 'mobile.calls_not_available_option',
            defaultMessage: '(Not available)',
        });

        Alert.alert(
            title,
            message,
            [
                {
                    text: ok,
                    style: 'cancel',
                },
            ],
        );
        setMsgPostfix(` ${notAvailable}`);
    }, [client, fn, clientError, intl]);

    return [tryFn, msgPostfix] as [() => Promise<void>, string];
};

const micPermission = Platform.select({
    ios: Permissions.PERMISSIONS.IOS.MICROPHONE,
    default: Permissions.PERMISSIONS.ANDROID.RECORD_AUDIO,
});

export const usePermissionsChecker = (micPermissionsGranted: boolean) => {
    const appState = useAppState();

    useEffect(() => {
        const asyncFn = async () => {
            if (appState === 'active') {
                const hasPermission = (await Permissions.check(micPermission)) === Permissions.RESULTS.GRANTED;
                if (hasPermission) {
                    initializeVoiceTrack();
                    setMicPermissionsGranted(hasPermission);
                }
            }
        };
        if (!micPermissionsGranted) {
            asyncFn();
        }
    }, [appState]);
};

export const useCallsAdjustment = (serverUrl: string, channelId: string): number => {
    const incomingCalls = useIncomingCalls().incomingCalls;
    const channelsWithCalls = useChannelsWithCalls(serverUrl);
    const callsState = useCallsState(serverUrl);
    const globalCallsState = useGlobalCallsState();
    const currentCall = useCurrentCall();
    const [numServers, setNumServers] = useState(1);
    const dismissed = Boolean(callsState.calls[channelId]?.dismissed[callsState.myUserId]);
    const inCurrentCall = currentCall?.id === channelId;
    const joinCallBannerVisible = Boolean(channelsWithCalls[channelId]) && !dismissed && !inCurrentCall;

    useEffect(() => {
        const getNumServers = async () => {
            const query = await queryAllActiveServers()?.fetch();
            setNumServers(query?.length || 0);
        };
        getNumServers();
    }, []);

    // Do we have calls banners?
    const currentCallBarVisible = Boolean(currentCall);
    const micPermissionsError = !globalCallsState.micPermissionsGranted && (currentCall && !currentCall.micPermissionsErrorDismissed);
    const callQualityAlert = Boolean(currentCall?.callQualityAlert);
    const incomingCallsShowing = incomingCalls.filter((ic) => ic.channelID !== channelId);
    const notificationBarHeight = CALL_NOTIFICATION_BAR_HEIGHT + (numServers > 1 ? 8 : 0);
    const callsIncomingAdjustment = (incomingCallsShowing.length * notificationBarHeight) + (incomingCallsShowing.length * 8);
    return (currentCallBarVisible ? CURRENT_CALL_BAR_HEIGHT + 8 : 0) +
        (micPermissionsError ? CALL_ERROR_BAR_HEIGHT + 8 : 0) +
        (callQualityAlert ? CALL_ERROR_BAR_HEIGHT + 8 : 0) +
        (joinCallBannerVisible ? JOIN_CALL_BAR_HEIGHT + 8 : 0) +
        callsIncomingAdjustment;
};

export const useHostControlsAvailable = () => {
    const [isAdmin, setIsAdmin] = useState(false);

    const currentCall = getCurrentCall();
    const serverUrl = currentCall?.serverUrl || '';
    const config = getCallsConfig(serverUrl);
    const allowed = isHostControlsAllowed(config);

    useEffect(() => {
        const getUser = async () => {
            const database = DatabaseManager.serverDatabases[serverUrl]?.database;
            if (!database) {
                return;
            }
            const user = await getCurrentUser(database);
            setIsAdmin(isSystemAdmin(user?.roles || ''));
        };
        getUser();
    }, [serverUrl]);

    const isHost = currentCall?.hostId === currentCall?.myUserId;
    return allowed && (isHost || isAdmin);
};

export const useHostMenus = () => {
    const intl = useIntl();
    const theme = useTheme();
    const currentCall = useCurrentCall();
    const hostControlsAvailable = useHostControlsAvailable();
    const isHost = currentCall?.hostId === currentCall?.myUserId;

    const openHostControl = useCallback(async (session: CallSession) => {
        const screen = Screens.CALL_HOST_CONTROLS;
        const title = intl.formatMessage({id: 'mobile.calls_host_controls', defaultMessage: 'Host controls'});
        const closeHostControls = 'close-host-controls';
        const props = {closeButtonId: closeHostControls, session};

        openAsBottomSheet({screen, title, theme, closeButtonId: closeHostControls, props});
    }, [theme]);

    const openUserProfile = useCallback(async (session: CallSession) => {
        const screen = Screens.USER_PROFILE;
        const title = intl.formatMessage({id: 'mobile.routes.user_profile', defaultMessage: 'Profile'});
        const closeUserProfile = 'close-user-profile';
        const props = {closeButtonId: closeUserProfile, location: '', userId: session.userId};

        openAsBottomSheet({screen, title, theme, closeButtonId: closeUserProfile, props});
    }, [theme, currentCall?.channelId]);

    const onPress = useCallback((session: CallSession) => () => {
        // Show host controls when allowed and I'm host or admin,
        // but don't show if this is me and I'm the host already.
        const isYou = session.userId === currentCall?.myUserId;
        if (hostControlsAvailable && !(isYou && isHost)) {
            openHostControl(session);
        } else {
            openUserProfile(session);
        }
    }, [currentCall?.myUserId, hostControlsAvailable, isHost, openHostControl, openUserProfile]);

    return {hostControlsAvailable, onPress, openUserProfile};
};
