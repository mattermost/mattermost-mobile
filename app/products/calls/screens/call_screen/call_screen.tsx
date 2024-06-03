// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
/* eslint max-lines: off */

import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {useIntl} from 'react-intl';
import {
    Keyboard,
    type LayoutChangeEvent,
    type LayoutRectangle,
    NativeModules,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    StatusBar,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {RTCView} from 'react-native-webrtc';

import {leaveCall, muteMyself, unmuteMyself} from '@calls/actions';
import {startCallRecording, stopCallRecording} from '@calls/actions/calls';
import {recordingAlert, recordingWillBePostedAlert, recordingErrorAlert} from '@calls/alerts';
import {AudioDeviceButton} from '@calls/components/audio_device_button';
import CallDuration from '@calls/components/call_duration';
import CallNotification from '@calls/components/call_notification';
import CallsBadge, {CallsBadgeType} from '@calls/components/calls_badge';
import Captions from '@calls/components/captions';
import EmojiList from '@calls/components/emoji_list';
import MessageBar from '@calls/components/message_bar';
import ReactionBar from '@calls/components/reaction_bar';
import UnavailableIconWrapper from '@calls/components/unavailable_icon_wrapper';
import {useHostMenus, usePermissionsChecker} from '@calls/hooks';
import {HeaderCenter} from '@calls/screens/call_screen/header_center';
import {ParticipantCard} from '@calls/screens/call_screen/participant_card';
import {
    setCallQualityAlertDismissed,
    setMicPermissionsErrorDismissed,
    useCallsConfig,
    useIncomingCalls,
} from '@calls/state';
import {getHandsRaised, makeCallsTheme, sortSessions} from '@calls/utils';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import {Calls, Preferences, Screens} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import DatabaseManager from '@database/manager';
import useAndroidHardwareBackHandler from '@hooks/android_back_handler';
import {useIsTablet} from '@hooks/device';
import WebsocketManager from '@managers/websocket_manager';
import {
    allOrientations,
    bottomSheet,
    dismissAllModalsAndPopToScreen,
    dismissBottomSheet,
    goToScreen,
    openAsBottomSheet,
    popTopScreen,
    setScreensOrientation,
} from '@screens/navigation';
import {freezeOtherScreens} from '@utils/gallery';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {mergeNavigationOptions} from '@utils/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername} from '@utils/user';

import type {CallSession, CallsTheme, CurrentCall} from '@calls/types/calls';
import type {AvailableScreens} from '@typings/screens/navigation';

export const avatarL = 96;
export const avatarM = 72;
export const usernameL = 110;
export const usernameM = 92;

export type Props = {
    componentId: AvailableScreens;
    currentCall: CurrentCall | null;
    sessionsDict: Dictionary<CallSession>;
    micPermissionsGranted: boolean;
    teammateNameDisplay: string;
    fromThreadScreen?: boolean;
    displayName?: string;
    isOwnDirectMessage: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: CallsTheme) => ({
    wrapper: {
        flex: 1,
        backgroundColor: theme.callsBg,
    },
    container: {
        ...Platform.select({
            android: {
                elevation: 3,
            },
            ios: {
                zIndex: 3,
            },
        }),
        flexDirection: 'column',
        backgroundColor: theme.callsBg,
        width: '100%',
        height: '100%',
        alignItems: 'center',
    },
    floatingBarsContainer: {
        flexDirection: 'column',
        width: '100%',
        gap: 8,
        marginBottom: 8,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        height: 56,
        gap: 8,
    },
    headerPortraitSpacer: {
        height: 12,
    },
    headerLandscape: {
        position: 'absolute',
        top: 0,
        backgroundColor: 'rgba(0,0,0,0.5)', // not themed
        height: 52,
        paddingTop: 0,
    },
    headerLandscapeNoControls: {
        top: -1000,
    },
    time: {
        color: theme.buttonColor,
        ...typography('Heading', 200),
        width: 56,
        marginLeft: 24,
        marginRight: 8,
        marginVertical: 2,
    },
    collapseIconContainer: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 48,
        height: 48,
        marginLeft: 24,
        marginRight: 8,
    },
    collapseIcon: {
        color: changeOpacity(theme.buttonColor, 0.56),
    },
    collapseIconLandscape: {
        margin: 10,
        padding: 0,
        backgroundColor: 'transparent',
        borderRadius: 0,
    },
    usersScrollContainer: {
        flex: 1,
        width: '100%',
    },
    usersScrollContainerScreenOn: {
        marginTop: -20,
    },
    usersScrollViewCentered: {
        flex: 1,
        justifyContent: 'center',
    },
    users: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    buttonsContainer: {
        alignItems: 'center',
    },
    buttons: {
        flexDirection: 'column',
        alignItems: 'center',
        paddingBottom: 12,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        gap: 4,
        backgroundColor: changeOpacity(theme.buttonColor, 0.08),
    },
    buttonsLandscape: {
        height: 110,
        position: 'absolute',
        backgroundColor: 'rgba(0,0,0,0.5)', // not themed
        width: '100%',
        bottom: 0,
        paddingTop: 16,
        borderTopLeftRadius: 0,
        borderTopRightRadius: 0,
    },
    buttonsLandscapeWithReactions: {
        height: 174,
    },
    buttonsLandscapeNoControls: {
        bottom: 1000,
    },
    button: {
        flexDirection: 'column',
        alignItems: 'center',
        flex: 1,
    },
    buttonLandscape: {
        flex: 0,
    },
    mute: {
        alignSelf: 'stretch',
        alignItems: 'center',
        gap: 4,
        padding: 24,
        backgroundColor: theme.onlineIndicator,
        borderRadius: 20,
        marginLeft: 16,
        marginRight: 16,
        marginTop: 20,
        marginBottom: 20,
    },
    muteMuted: {
        backgroundColor: changeOpacity(theme.buttonColor, 0.12),
    },
    speakerphoneIcon: {
        color: theme.sidebarText,
        backgroundColor: changeOpacity(theme.buttonColor, 0.12),
    },
    buttonOn: {
        color: theme.callsBg,
        backgroundColor: 'white',
    },
    otherButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    otherButtonsLandscape: {
        justifyContent: 'center',
    },
    muteIcon: {
        color: theme.buttonColor,
    },
    muteIconLandscape: {
        backgroundColor: theme.onlineIndicator,
        padding: 11,
    },
    muteIconLandscapeMuted: {
        backgroundColor: changeOpacity(theme.buttonColor, 0.12),
    },
    buttonText: {
        color: changeOpacity(theme.buttonColor, 0.72),
        ...typography('Body', 75, 'SemiBold'),
    },
    buttonIcon: {
        color: theme.buttonColor,
        backgroundColor: changeOpacity(theme.buttonColor, 0.08),
        borderRadius: 30,
        padding: 14,
        width: 60,
        height: 60,
        marginBottom: 8,
        overflow: 'hidden',
    },
    buttonIconLandscape: {
        borderRadius: 26,
        padding: 10,
        width: 52,
        height: 52,
        marginLeft: 12,
        marginRight: 12,
    },
    errorContainerLandscape: {
        right: 20,
        top: 10,
    },
    hangUpIcon: {
        backgroundColor: Preferences.THEMES.denim.dndIndicator,
    },
    screenShareImage: {
        flex: 2,
        width: '100%',
        height: '100%',
        alignItems: 'center',
    },
    screenShareText: {
        color: 'white',
        margin: 3,
    },
    unavailableText: {
        color: changeOpacity(theme.buttonColor, 0.32),
    },
    denimDND: {
        color: Preferences.THEMES.denim.dndIndicator,
    },
}));

const CallScreen = ({
    componentId,
    currentCall,
    sessionsDict,
    micPermissionsGranted,
    teammateNameDisplay,
    fromThreadScreen,
    displayName,
    isOwnDirectMessage,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const {bottom} = useSafeAreaInsets();
    const {width, height} = useWindowDimensions();
    const isTablet = useIsTablet();
    const serverUrl = useServerUrl();
    const {EnableRecordings, EnableTranscriptions} = useCallsConfig(serverUrl);
    usePermissionsChecker(micPermissionsGranted);
    const incomingCalls = useIncomingCalls();
    const {hostControlsAvailable, onPress, openUserProfile} = useHostMenus();

    const [showControlsInLandscape, setShowControlsInLandscape] = useState(false);
    const [showReactions, setShowReactions] = useState(false);
    const [showCC, setShowCC] = useState(false);
    const callsTheme = useMemo(() => makeCallsTheme(theme), [theme]);
    const style = getStyleSheet(callsTheme);
    const [centerUsers, setCenterUsers] = useState(false);
    const [layout, setLayout] = useState<LayoutRectangle | null>(null);
    const [contentOverflow, setContentOverflow] = useState(false);
    const [previousNumSessions, setPreviousNumSessions] = useState(0);

    const mySession = currentCall?.sessions[currentCall.mySessionId];
    const micPermissionsError = !micPermissionsGranted && !currentCall?.micPermissionsErrorDismissed;
    const screenShareOn = Boolean(currentCall?.screenOn);
    const isLandscape = width > height;
    const smallerAvatar = isLandscape || screenShareOn || showCC || contentOverflow;
    const avatarSize = smallerAvatar ? avatarM : avatarL;
    const numSessions = Object.keys(sessionsDict).length;
    const showIncomingCalls = incomingCalls.incomingCalls.length > 0;

    const callThreadOptionTitle = intl.formatMessage({id: 'mobile.calls_call_thread', defaultMessage: 'Call Thread'});
    const recordOptionTitle = intl.formatMessage({id: 'mobile.calls_record', defaultMessage: 'Record'});
    const stopRecordingOptionTitle = intl.formatMessage({
        id: 'mobile.calls_stop_recording',
        defaultMessage: 'Stop Recording',
    });
    const openChannelOptionTitle = intl.formatMessage({
        id: 'mobile.calls_open_channel',
        defaultMessage: 'Open Channel',
    });
    const showCCTitle = intl.formatMessage({id: 'mobile.calls_show_cc', defaultMessage: 'Show live captions'});
    const hideCCTitle = intl.formatMessage({id: 'mobile.calls_hide_cc', defaultMessage: 'Hide live captions'});

    useEffect(() => {
        mergeNavigationOptions('Call', {
            layout: {
                componentBackgroundColor: callsTheme.callsBg,
                orientation: allOrientations,
            },
            topBar: {
                visible: false,
            },
        });
        if (Platform.OS === 'ios') {
            NativeModules.SplitView.unlockOrientation();
        }

        return () => {
            setScreensOrientation(isTablet);
            if (Platform.OS === 'ios' && !isTablet) {
                // We need both the navigation & the module
                NativeModules.SplitView.lockPortrait();
            }
            freezeOtherScreens(false);
        };
    }, []);

    const leaveCallHandler = useCallback(() => {
        popTopScreen();
        leaveCall();
    }, []);

    const muteUnmuteHandler = useCallback(() => {
        if (mySession?.muted) {
            unmuteMyself();
        } else {
            muteMyself();
        }
    }, [mySession?.muted]);

    const toggleReactions = useCallback(() => {
        setShowReactions((prev) => !prev);
    }, [setShowReactions]);

    const toggleControlsInLandscape = useCallback(() => {
        setShowControlsInLandscape(!showControlsInLandscape);
    }, [showControlsInLandscape]);

    const startRecording = useCallback(async () => {
        Keyboard.dismiss();
        await dismissBottomSheet();
        if (!currentCall) {
            return;
        }

        await startCallRecording(currentCall.serverUrl, currentCall.channelId);
    }, [currentCall?.channelId, currentCall?.serverUrl]);

    const stopRecording = useCallback(async () => {
        Keyboard.dismiss();
        await dismissBottomSheet();
        if (!currentCall) {
            return;
        }

        await stopCallRecording(currentCall.serverUrl, currentCall.channelId);
    }, [currentCall?.channelId, currentCall?.serverUrl]);

    const toggleCC = useCallback(async () => {
        Keyboard.dismiss();
        await dismissBottomSheet();

        setShowCC((prev) => !prev);
    }, [setShowCC]);

    const switchToThread = useCallback(async () => {
        Keyboard.dismiss();
        await dismissBottomSheet();
        if (!currentCall) {
            return;
        }

        const activeUrl = await DatabaseManager.getActiveServerUrl();
        if (activeUrl === currentCall.serverUrl) {
            await dismissAllModalsAndPopToScreen(Screens.THREAD, callThreadOptionTitle, {rootId: currentCall.threadId});
            return;
        }

        // TODO: this is a temporary solution until we have a proper cross-team thread view.
        //  https://mattermost.atlassian.net/browse/MM-45752
        await popTopScreen(componentId);
        if (fromThreadScreen) {
            await popTopScreen(Screens.THREAD);
        }
        await DatabaseManager.setActiveServerDatabase(currentCall.serverUrl);
        WebsocketManager.initializeClient(currentCall.serverUrl);
        await goToScreen(Screens.THREAD, callThreadOptionTitle, {rootId: currentCall.threadId});
    }, [currentCall?.serverUrl, currentCall?.threadId, fromThreadScreen, componentId, callThreadOptionTitle]);

    // The user should receive a recording alert if all of the following conditions apply:
    // - Recording has started, recording has not ended
    const isHost = Boolean(currentCall?.hostId === mySession?.userId);
    const recording = Boolean(currentCall?.recState?.start_at && !currentCall.recState.end_at);
    if (recording) {
        recordingAlert(isHost, EnableTranscriptions, intl);
    }

    // The user should receive a recording finished alert if all of the following conditions apply:
    // - Is the host, recording has started, and recording has ended
    if (isHost && currentCall?.recState?.start_at && currentCall.recState.end_at) {
        recordingWillBePostedAlert(intl);
    }

    // The host should receive an alert in case of unexpected error.
    if (isHost && currentCall?.recState?.err) {
        recordingErrorAlert(intl);
    }

    // The user should see the loading only if:
    // - Recording has been initialized, recording has not been started, and recording has not ended
    const waitingForRecording = Boolean(currentCall?.recState?.init_at && !currentCall.recState.start_at && !currentCall.recState.end_at && isHost);
    const showStartRecording = isHost && EnableRecordings && !(waitingForRecording || recording);
    const showStopRecording = isHost && EnableRecordings && (waitingForRecording || recording);
    const ccAvailable = Boolean((currentCall?.capState?.start_at || 0) > (currentCall?.capState?.end_at || 0));

    const openParticipantsList = useCallback(async () => {
        const screen = Screens.CALL_PARTICIPANTS;
        const title = intl.formatMessage({id: 'mobile.calls_participants', defaultMessage: 'Participants'});
        const closeButtonId = 'close-call-participants';

        Keyboard.dismiss();
        openAsBottomSheet({screen, title, theme, closeButtonId});
    }, [theme]);

    const showOtherActions = useCallback(async () => {
        const renderContent = () => {
            return (
                <View>
                    {
                        showStartRecording &&
                        <SlideUpPanelItem
                            leftIcon={'record-circle-outline'}
                            onPress={startRecording}
                            text={recordOptionTitle}
                        />
                    }
                    {
                        showStopRecording &&
                        <SlideUpPanelItem
                            leftIcon={'record-square-outline'}
                            onPress={stopRecording}
                            text={stopRecordingOptionTitle}
                            textStyles={style.denimDND}
                        />
                    }
                    <SlideUpPanelItem
                        leftIcon='message-text-outline'
                        onPress={switchToThread}
                        text={callThreadOptionTitle}
                    />
                    {
                        ccAvailable &&
                        <SlideUpPanelItem
                            leftIcon='closed-caption-outline'
                            onPress={toggleCC}
                            text={showCC ? hideCCTitle : showCCTitle}
                        />
                    }
                </View>
            );
        };

        let items = isHost && EnableRecordings ? 3 : 2;
        if (ccAvailable) {
            items++;
        }
        bottomSheet({
            closeButtonId: 'close-other-actions',
            renderContent,
            snapPoints: [1, bottomSheetSnapPoint(items, ITEM_HEIGHT, bottom)],
            title: intl.formatMessage({id: 'post.options.title', defaultMessage: 'Options'}),
            theme,
        });
    }, [bottom, intl, theme, isHost, EnableRecordings, waitingForRecording, recording, startRecording,
        recordOptionTitle, stopRecording, stopRecordingOptionTitle, style, switchToThread,
        callThreadOptionTitle, openChannelOptionTitle, ccAvailable, toggleCC, showCC, hideCCTitle,
        showCCTitle]);

    const collapse = useCallback(() => {
        popTopScreen(componentId);
    }, [componentId]);

    useAndroidHardwareBackHandler(componentId, collapse);

    useEffect(() => {
        const didDismissListener = Navigation.events().registerComponentDidDisappearListener(async ({componentId: screen}) => {
            if (componentId === screen) {
                setScreensOrientation(isTablet);
            }
        });

        return () => didDismissListener.remove();
    }, [isTablet]);

    useEffect(() => {
        if (!layout || !layout.height || !layout.width) {
            return;
        }

        const avatarCellHeight = avatarSize + 20 + 20 + 20; // avatar + name + host pill + padding
        const usernameSize = smallerAvatar ? usernameM : usernameL;
        const avatarCellWidth = usernameSize + 20; // name width + padding

        const perRow = Math.floor(layout.width / avatarCellWidth);
        const totalHeight = Math.ceil(numSessions / perRow) * avatarCellHeight;
        const totalWidth = numSessions * avatarCellWidth;

        // If screenShareOn, we care about width, otherwise we care about height.
        if ((screenShareOn && totalWidth > layout.width) || (!screenShareOn && totalHeight > layout.height)) {
            setCenterUsers(false);
        } else {
            setCenterUsers(true);
        }
    }, [layout, numSessions]);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        setLayout(e.nativeEvent.layout);
    }, []);

    const onContentSizeChange = useCallback((_: number, h: number) => {
        // If numSessions has changed, perform contentOverflow check. Prevents infinite loop.
        if (numSessions !== previousNumSessions) {
            setContentOverflow(h > (layout?.height || 0));
            setPreviousNumSessions(numSessions);
        }
    }, [layout, numSessions, previousNumSessions]);

    const onShortPress = useCallback((session: CallSession) => () => {
        if (hostControlsAvailable) {
            onPress(session)();
        }
    }, [hostControlsAvailable, onPress]);

    const onLongPress = useCallback((session: CallSession) => () => {
        if (hostControlsAvailable) {
            onPress(session)();
        } else {
            openUserProfile(session);
        }
    }, [hostControlsAvailable, onPress, openUserProfile]);

    if (!currentCall || !mySession) {
        return null;
    }

    let screenShareView = null;
    if (currentCall.screenShareURL && screenShareOn) {
        screenShareView = (
            <Pressable
                testID='screen-share-container'
                style={style.screenShareImage}
                onPress={toggleControlsInLandscape}
            >
                <RTCView
                    streamURL={currentCall.screenShareURL}
                    style={style.screenShareImage}
                />
                {!isLandscape &&
                    <FormattedText
                        id={'mobile.calls_viewing_screen'}
                        defaultMessage={'You are viewing {name}\'s screen'}
                        values={{name: displayUsername(sessionsDict[currentCall.screenOn].userModel, intl.locale, teammateNameDisplay)}}
                        style={style.screenShareText}
                    />
                }
            </Pressable>
        );
    }

    const raisedHands = getHandsRaised(sessionsDict);
    const sessions = sortSessions(intl.locale, teammateNameDisplay, sessionsDict, currentCall.screenOn);
    let usersList = null;
    if (!screenShareOn || !isLandscape) {
        usersList = (
            <View style={[style.usersScrollContainer, screenShareOn && style.usersScrollContainerScreenOn]}>
                <ScrollView
                    alwaysBounceVertical={false}
                    horizontal={screenShareOn}
                    onLayout={onLayout}
                    onContentSizeChange={onContentSizeChange}
                    contentContainerStyle={centerUsers && style.usersScrollViewCentered}
                >
                    <Pressable
                        testID='users-list'
                        onPress={toggleControlsInLandscape}
                        style={style.users}
                    >
                        {sessions.map((sess) => (
                            <ParticipantCard
                                key={sess.sessionId}
                                session={sess}
                                smallerAvatar={smallerAvatar}
                                teammateNameDisplay={teammateNameDisplay}
                                onPress={onShortPress(sess)}
                                onLongPress={onLongPress(sess)}
                            />
                        ))}
                    </Pressable>
                </ScrollView>
            </View>
        );
    }

    const MuteText = (
        <FormattedText
            id={'mobile.calls_mute'}
            defaultMessage={'Mute'}
            style={style.buttonText}
        />);
    const UnmuteText = (
        <FormattedText
            id={'mobile.calls_unmute'}
            defaultMessage={'Unmute'}
            style={[style.buttonText, !micPermissionsGranted && style.unavailableText]}
        />);

    const header = (
        <View
            style={[
                style.header,
                isLandscape && style.headerLandscape,
                isLandscape && !showControlsInLandscape && style.headerLandscapeNoControls,
            ]}
        >
            {waitingForRecording && <CallsBadge type={CallsBadgeType.Waiting}/>}
            {recording && <CallsBadge type={CallsBadgeType.Rec}/>}
            <CallDuration
                style={style.time}
                value={currentCall.startTime}
                updateIntervalInSeconds={1}
            />
            <HeaderCenter
                raisedHands={raisedHands}
                sessionId={currentCall.mySessionId}
                teammateNameDisplay={teammateNameDisplay}
                displayName={displayName}
                isOwnDirectMessage={isOwnDirectMessage}
            />
            <Pressable
                onPress={collapse}
                style={style.collapseIconContainer}
            >
                <CompassIcon
                    name='arrow-collapse'
                    size={28}
                    style={[style.collapseIcon, isLandscape && style.collapseIconLandscape]}
                />
            </Pressable>
        </View>
    );

    return (
        <SafeAreaView style={style.wrapper}>
            <StatusBar barStyle={'light-content'}/>
            <View style={style.container}>
                {!isLandscape && header}
                {!isLandscape && <View style={style.headerPortraitSpacer}/>}
                {usersList}
                {screenShareView}
                {isLandscape && header}
                {showCC &&
                    <Captions
                        captionsDict={currentCall.captions}
                        sessionsDict={currentCall.sessions}
                        teammateNameDisplay={teammateNameDisplay}
                    />
                }
                {!isLandscape && currentCall.reactionStream.length > 0 &&
                    <EmojiList reactionStream={currentCall.reactionStream}/>
                }
                <View style={style.floatingBarsContainer}>
                    {showIncomingCalls &&
                        incomingCalls.incomingCalls.map((ic) => (
                            <CallNotification
                                key={ic.callID}
                                incomingCall={ic}
                                onCallsScreen={true}
                            />
                        ))
                    }
                    {micPermissionsError &&
                        <MessageBar
                            type={Calls.MessageBarType.Microphone}
                            onDismiss={setMicPermissionsErrorDismissed}
                        />
                    }
                    {currentCall.callQualityAlert &&
                        <MessageBar
                            type={Calls.MessageBarType.CallQuality}
                            onDismiss={setCallQualityAlertDismissed}
                        />
                    }
                </View>
                <View style={[style.buttonsContainer]}>
                    <View
                        style={[
                            style.buttons,
                            isLandscape && style.buttonsLandscape,
                            isLandscape && showReactions && style.buttonsLandscapeWithReactions,
                            isLandscape && !showControlsInLandscape && style.buttonsLandscapeNoControls,
                        ]}
                    >
                        {showReactions &&
                            <ReactionBar raisedHand={mySession.raisedHand}/>
                        }
                        {!isLandscape &&
                            <Pressable
                                testID='mute-unmute'
                                style={[style.mute, mySession.muted && style.muteMuted]}
                                onPress={muteUnmuteHandler}
                                disabled={!micPermissionsGranted}
                            >
                                <UnavailableIconWrapper
                                    name={mySession.muted ? 'microphone-off' : 'microphone'}
                                    size={32}
                                    unavailable={!micPermissionsGranted}
                                    style={style.muteIcon}
                                />
                                {mySession.muted ? UnmuteText : MuteText}
                            </Pressable>
                        }
                        <View style={[style.otherButtons, isLandscape && style.otherButtonsLandscape]}>
                            <Pressable
                                testID='leave'
                                style={[style.button, isLandscape && style.buttonLandscape]}
                                onPress={leaveCallHandler}
                            >
                                <CompassIcon
                                    name='phone-hangup'
                                    size={32}
                                    style={[style.buttonIcon, isLandscape && style.buttonIconLandscape, style.hangUpIcon]}
                                />
                                <FormattedText
                                    id={'mobile.calls_leave'}
                                    defaultMessage={'Leave'}
                                    style={style.buttonText}
                                />
                            </Pressable>
                            <AudioDeviceButton
                                pressableStyle={[style.button, isLandscape && style.buttonLandscape]}
                                iconStyle={[
                                    style.buttonIcon,
                                    isLandscape && style.buttonIconLandscape,
                                    currentCall.speakerphoneOn && style.buttonOn,
                                ]}
                                buttonTextStyle={style.buttonText}
                                currentCall={currentCall}
                            />
                            <Pressable
                                style={[style.button, isLandscape && style.buttonLandscape]}
                                onPress={toggleReactions}
                            >
                                <CompassIcon
                                    name={'emoticon-happy-outline'}
                                    size={32}
                                    style={[style.buttonIcon, isLandscape && style.buttonIconLandscape, showReactions && style.buttonOn]}
                                />
                                <FormattedText
                                    id={'mobile.calls_react'}
                                    defaultMessage={'React'}
                                    style={style.buttonText}
                                />
                            </Pressable>
                            <Pressable
                                style={[style.button, isLandscape && style.buttonLandscape]}
                                onPress={openParticipantsList}
                            >
                                <CompassIcon
                                    name={'account-multiple-outline'}
                                    size={32}
                                    style={[style.buttonIcon, isLandscape && style.buttonIconLandscape]}
                                />
                                <FormattedText
                                    id={'mobile.calls_people'}
                                    defaultMessage={'People'}
                                    style={style.buttonText}
                                />
                            </Pressable>
                            {!isLandscape && (isHost || ccAvailable) &&
                                <Pressable
                                    style={[style.button, isLandscape && style.buttonLandscape]}
                                    onPress={showOtherActions}
                                >
                                    <CompassIcon
                                        name='dots-horizontal'
                                        size={32}
                                        style={[style.buttonIcon, isLandscape && style.buttonIconLandscape]}
                                    />
                                    <FormattedText
                                        id={'mobile.calls_more'}
                                        defaultMessage={'More'}
                                        style={style.buttonText}
                                    />
                                </Pressable>
                            }
                            {isLandscape &&
                                <Pressable
                                    testID='mute-unmute'
                                    style={[style.button, style.buttonLandscape]}
                                    onPress={muteUnmuteHandler}
                                >
                                    <UnavailableIconWrapper
                                        name={mySession.muted ? 'microphone-off' : 'microphone'}
                                        size={32}
                                        unavailable={!micPermissionsGranted}
                                        style={[
                                            style.buttonIcon,
                                            isLandscape && style.buttonIconLandscape,
                                            style.muteIconLandscape,
                                            mySession?.muted && style.muteIconLandscapeMuted,
                                        ]}
                                        errorContainerStyle={isLandscape && style.errorContainerLandscape}
                                    />
                                    {mySession.muted ? UnmuteText : MuteText}
                                </Pressable>
                            }
                            {(isLandscape || (!isHost && !ccAvailable)) &&
                                <Pressable
                                    style={[style.button, isLandscape && style.buttonLandscape]}
                                    onPress={switchToThread}
                                >
                                    <CompassIcon
                                        name='message-text-outline'
                                        size={32}
                                        style={[style.buttonIcon, isLandscape && style.buttonIconLandscape]}
                                    />
                                    <FormattedText
                                        id={'mobile.calls_thread'}
                                        defaultMessage={'Thread'}
                                        style={style.buttonText}
                                    />
                                </Pressable>
                            }
                            {isLandscape && showStartRecording &&
                                <Pressable
                                    style={[style.button, style.buttonLandscape]}
                                    onPress={startRecording}
                                >
                                    <CompassIcon
                                        name='record-circle-outline'
                                        size={32}
                                        style={[style.buttonIcon, isLandscape && style.buttonIconLandscape]}
                                    />
                                    <Text style={style.buttonText}>{recordOptionTitle}</Text>
                                </Pressable>
                            }
                            {isLandscape && showStopRecording &&
                                <Pressable
                                    style={[style.button, style.buttonLandscape]}
                                    onPress={stopRecording}
                                >
                                    <CompassIcon
                                        name='record-square-outline'
                                        size={32}
                                        style={[style.buttonIcon, isLandscape && style.buttonIconLandscape]}
                                    />
                                    <Text style={style.buttonText}>{stopRecordingOptionTitle}</Text>
                                </Pressable>
                            }
                            {isLandscape && ccAvailable &&
                                <Pressable
                                    style={[style.button, style.buttonLandscape]}
                                    onPress={toggleCC}
                                >
                                    <CompassIcon
                                        name='closed-caption-outline'
                                        size={32}
                                        style={[style.buttonIcon, style.buttonIconLandscape, showCC && style.buttonOn]}
                                    />
                                    <FormattedText
                                        id={'mobile.calls_captions'}
                                        defaultMessage={'Captions'}
                                        style={style.buttonText}
                                    />
                                </Pressable>
                            }
                        </View>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
};

export default CallScreen;
