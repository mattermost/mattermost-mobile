// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

// Check if calls is enabled. If it is, then run fn; if it isn't, show an alert and set
// msgPostfix to ' (Not Available)'.
import {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {Alert, Platform} from 'react-native';
import Permissions from 'react-native-permissions';
import {cancelAnimation, Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming} from 'react-native-reanimated';

import {initializeVoiceTrack} from '@calls/actions/calls';
import {leaveAndJoinWithAlert, showLimitRestrictedAlert} from '@calls/alerts';
import {observeIsCallLimitRestricted, type LimitRestrictedInfo} from '@calls/observers';
import {
    getCallsConfig,
    getCurrentCall,
    setMicPermissionsGranted,
    useCallsState,
    useChannelsWithCalls,
    useCurrentCall,
    useGlobalCallsState,
    useIncomingCalls,
} from '@calls/state';
import {type CallSession} from '@calls/types/calls';
import {errorAlert, isHostControlsAllowed} from '@calls/utils';
import {Screens} from '@constants';
import {
    CALL_ERROR_BAR_HEIGHT,
    CALL_NOTIFICATION_BAR_HEIGHT,
    CURRENT_CALL_BAR_HEIGHT,
    JOIN_CALL_BAR_HEIGHT,
} from '@constants/view';
import {useServerUrl} from '@context/server';
import DatabaseManager from '@database/manager';
import {useAppState} from '@hooks/device';
import {usePreventDoubleTap} from '@hooks/utils';
import NetworkManager from '@managers/network_manager';
import {queryAllActiveServers} from '@queries/app/servers';
import {getCurrentUser} from '@queries/servers/user';
import {navigateToScreen} from '@screens/navigation';
import {isDMChannel} from '@utils/channel';
import {getFullErrorMessage} from '@utils/errors';
import {logError} from '@utils/log';
import {openUserProfile} from '@utils/navigation';
import {isSystemAdmin} from '@utils/user';

import type {Client} from '@client/rest';
import type {NavigationButtonProps} from '@components/navigation_button';

const DEFAULT_LIMIT_RESTRICTED_INFO: LimitRestrictedInfo = {
    limitRestricted: false,
    maxParticipants: 0,
    isCloudStarter: false,
};

export const useTryCallsFunction = (fn: () => void): [() => Promise<void>, string, boolean] => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const [msgPostfix, setMsgPostfix] = useState('');
    const [clientError, setClientError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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
        setIsLoading(true);
        try {
            enabled = await client?.getEnabled();
        } catch (error) {
            errorAlert(getFullErrorMessage(error), intl);
            return;
        } finally {
            setIsLoading(false);
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

    return [tryFn, msgPostfix, isLoading];
};

const micPermission = Platform.select({
    ios: Permissions.PERMISSIONS.IOS.MICROPHONE,
    default: Permissions.PERMISSIONS.ANDROID.RECORD_AUDIO,
});

export const usePermissionsChecker = (micPermissionsGranted: boolean) => {
    const appState = useAppState();
    const [hasPermission, setHasPermission] = useState(micPermissionsGranted);

    useEffect(() => {
        const asyncFn = async () => {
            if (appState === 'active') {
                const result = (await Permissions.check(micPermission)) === Permissions.RESULTS.GRANTED;
                setHasPermission(result);
                if (result) {
                    initializeVoiceTrack();
                    setMicPermissionsGranted(result);
                }
            }
        };
        if (!micPermissionsGranted) {
            asyncFn();
        }
    }, [appState, micPermissionsGranted]);

    return hasPermission;
};

const CALLING_PULSE_ANIMATION_MIN_OPACITY = 0.4;
const CALLING_PULSE_ANIMATION_DURATION = 800;
const CALLING_PULSE_ANIMATION_EASEOUT_DURATION = 200;
const CALLING_PULSE_ANIMATION_EASING_FUNCTION = Easing.inOut(Easing.ease);
export const useCallingPulseAnimationStyle = (active: boolean) => {
    const opacity = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({opacity: opacity.value}));

    useEffect(() => {
        if (active) {
            opacity.value = withRepeat(
                withTiming(CALLING_PULSE_ANIMATION_MIN_OPACITY,
                    {
                        duration: CALLING_PULSE_ANIMATION_DURATION,
                        easing: CALLING_PULSE_ANIMATION_EASING_FUNCTION,
                    }),
                -1,
                true,
            );
        } else {
            opacity.value = withTiming(1, {
                duration: CALLING_PULSE_ANIMATION_EASEOUT_DURATION,
            });
        }

        return () => {
            cancelAnimation(opacity);
        };
    }, [active, opacity]);

    return animatedStyle;
};

export const useCallsAdjustment = (serverUrl: string, channelId: string): number => {
    const incomingCalls = useIncomingCalls().incomingCalls;
    const channelsWithCalls = useChannelsWithCalls(serverUrl);
    const callsState = useCallsState(serverUrl);
    const globalCallsState = useGlobalCallsState();
    const currentCall = useCurrentCall();
    const [numServers, setNumServers] = useState(1);
    const micPermissionsGranted = usePermissionsChecker(globalCallsState.micPermissionsGranted);
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
    const micPermissionsError = !micPermissionsGranted && (currentCall && !currentCall.micPermissionsErrorDismissed);
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
    const currentCall = useCurrentCall();
    const hostControlsAvailable = useHostControlsAvailable();
    const isHost = currentCall?.hostId === currentCall?.myUserId;

    const openHostControl = useCallback(async (sessionId: string) => {
        navigateToScreen(Screens.CALL_HOST_CONTROLS, {sessionId});
    }, []);

    const openProfile = useCallback(async (session: CallSession) => {
        openUserProfile({
            userId: session.userId,
        });
    }, []);

    const onPress = useCallback((session: CallSession) => () => {
        // Show host controls when allowed and I'm host or admin,
        // but don't show if this is me and I'm the host already.
        const isYou = session.userId === currentCall?.myUserId;
        if (hostControlsAvailable && !(isYou && isHost)) {
            openHostControl(session.sessionId);
        } else {
            openProfile(session);
        }
    }, [currentCall?.myUserId, hostControlsAvailable, isHost, openHostControl, openProfile]);

    return {hostControlsAvailable, onPress, openProfile};
};

/**
 * Hook to observe whether a call in the given channel has reached the participant limit.
 */
export const useCallLimitRestrictedInfo = (serverUrl: string, channelId: string): LimitRestrictedInfo => {
    const [limitRestrictedInfo, setLimitRestrictedInfo] = useState(DEFAULT_LIMIT_RESTRICTED_INFO);

    useEffect(() => {
        // Without this the old value survives until the new observer emits
        setLimitRestrictedInfo(DEFAULT_LIMIT_RESTRICTED_INFO);

        const database = DatabaseManager.serverDatabases[serverUrl]?.database;
        if (!database) {
            return undefined;
        }

        const subscription = observeIsCallLimitRestricted(database, serverUrl, channelId).subscribe(setLimitRestrictedInfo);

        return () => subscription.unsubscribe();
    }, [serverUrl, channelId]);

    return limitRestrictedInfo;
};

/**
 * Hook to display the call button in the navigation header for DM channels only.
 */
export const useNavigationHeaderCallButtonForDM = (channelId: Channel['id'], channelType: Channel['type']): NavigationButtonProps | undefined => {
    const intl = useIntl();
    const serverUrl = useServerUrl();
    const channelsWithCalls = useChannelsWithCalls(serverUrl);
    const currentCall = useCurrentCall();
    const isDM = isDMChannel(channelType);
    const limitRestrictedInfo = useCallLimitRestrictedInfo(serverUrl, channelId);

    const [isJoiningOrStarting, setIsJoiningOrStarting] = useState(false);

    const isCallInChannel = Boolean(channelsWithCalls[channelId]);
    const alreadyInCall = currentCall?.channelId === channelId;

    const joinOrStart = useCallback(async () => {
        if (limitRestrictedInfo.limitRestricted) {
            showLimitRestrictedAlert(limitRestrictedInfo, intl);
            return;
        }

        setIsJoiningOrStarting(true);
        try {
            const joined = await leaveAndJoinWithAlert(intl, serverUrl, channelId);
            if (joined) {
                navigateToScreen(Screens.CALL);
            }
        } catch (error) {
            logError('error on useNavigationHeaderCallButtonForDM.joinOrStart', getFullErrorMessage(error));
        } finally {
            setIsJoiningOrStarting(false);
        }
    }, [limitRestrictedInfo, intl, serverUrl, channelId]);
    const [tryJoinOrStart, , isLoadingTryCallsFunction] = useTryCallsFunction(joinOrStart);

    const handleOnPress = useCallback(() => {
        if (alreadyInCall) {
            navigateToScreen(Screens.CALL);
        } else {
            tryJoinOrStart();
        }
    }, [alreadyInCall, tryJoinOrStart]);

    const onPress = usePreventDoubleTap(handleOnPress);

    const isLoading = isJoiningOrStarting || isLoadingTryCallsFunction;

    const navigationHeaderCallButton = useMemo<NavigationButtonProps>(() => {
        let accessibilityLabel = intl.formatMessage({id: 'mobile.calls_start_call', defaultMessage: 'Start call'});
        if (alreadyInCall) {
            accessibilityLabel = intl.formatMessage({id: 'mobile.calls_return_to_call', defaultMessage: 'Return to call'});
        } else if (isCallInChannel) {
            accessibilityLabel = intl.formatMessage({id: 'mobile.calls_join_call', defaultMessage: 'Join call'});
        }

        const iconName = isCallInChannel || alreadyInCall ? 'phone-in-talk' : 'phone';

        return {
            id: 'calls',
            iconName,
            isLoading,
            onPress,
            disabled: isLoading,
            accessibilityLabel,
            testID: 'channel_header.quick_call.button',
        };
    }, [alreadyInCall, isCallInChannel, onPress, isLoading, intl]);

    if (!isDM) {
        return undefined;
    }

    return navigationHeaderCallButton;
};
