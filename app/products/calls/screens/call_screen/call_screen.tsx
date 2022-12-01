// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {
    DeviceEventEmitter,
    Keyboard,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    Text,
    useWindowDimensions,
    View,
} from 'react-native';
import {Navigation} from 'react-native-navigation';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {RTCView} from 'react-native-webrtc';

import {appEntry} from '@actions/remote/entry';
import {leaveCall, muteMyself, setSpeakerphoneOn, unmuteMyself} from '@calls/actions';
import {startCallRecording, stopCallRecording} from '@calls/actions/calls';
import {recordingAlert, recordingWillBePostedAlert} from '@calls/alerts';
import CallAvatar from '@calls/components/call_avatar';
import CallDuration from '@calls/components/call_duration';
import CallsBadge, {CallsBadgeType} from '@calls/components/calls_badge';
import EmojiList from '@calls/components/emoji_list';
import PermissionErrorBar from '@calls/components/permission_error_bar';
import ReactionBar from '@calls/components/reaction_bar';
import UnavailableIconWrapper from '@calls/components/unavailable_icon_wrapper';
import {usePermissionsChecker} from '@calls/hooks';
import {useCallsConfig} from '@calls/state';
import {CallParticipant, CurrentCall} from '@calls/types/calls';
import {sortParticipants} from '@calls/utils';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import {Preferences, Screens, WebsocketEvents} from '@constants';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import DatabaseManager from '@database/manager';
import {
    bottomSheet,
    dismissAllModalsAndPopToScreen,
    dismissBottomSheet,
    goToScreen,
    popTopScreen,
} from '@screens/navigation';
import NavigationStore from '@store/navigation_store';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {mergeNavigationOptions} from '@utils/navigation';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {displayUsername} from '@utils/user';

export type Props = {
    componentId: string;
    currentCall: CurrentCall | null;
    participantsDict: Dictionary<CallParticipant>;
    micPermissionsGranted: boolean;
    teammateNameDisplay: string;
    fromThreadScreen?: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    wrapper: {
        flex: 1,
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
        backgroundColor: 'black',
        width: '100%',
        height: '100%',
        borderRadius: 5,
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        paddingTop: 10,
        paddingLeft: 14,
        paddingRight: 14,
        ...Platform.select({
            android: {
                elevation: 4,
            },
            ios: {
                zIndex: 4,
            },
        }),
    },
    headerLandscape: {
        position: 'absolute',
        top: 0,
        backgroundColor: 'rgba(0,0,0,0.64)',
        height: 64,
        padding: 0,
    },
    headerLandscapeNoControls: {
        top: -1000,
    },
    time: {
        flex: 1,
        color: theme.sidebarText,
        margin: 10,
        padding: 10,
    },
    users: {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: '100%',
        height: '100%',
        alignContent: 'center',
        alignItems: 'flex-start',
    },
    usersScrollLandscapeScreenOn: {
        position: 'absolute',
        height: 0,
    },
    user: {
        flexGrow: 1,
        flexDirection: 'column',
        alignItems: 'center',
        marginTop: 10,
        marginBottom: 10,
        marginLeft: 10,
        marginRight: 10,
    },
    userScreenOn: {
        marginTop: 0,
        marginBottom: 0,
    },
    username: {
        color: theme.sidebarText,
    },
    buttons: {
        flexDirection: 'column',
        backgroundColor: 'rgba(255,255,255,0.16)',
        width: '100%',
        paddingBottom: 10,
        ...Platform.select({
            android: {
                elevation: 4,
            },
            ios: {
                zIndex: 4,
            },
        }),
    },
    buttonsLandscape: {
        height: 128,
        position: 'absolute',
        backgroundColor: 'rgba(0,0,0,0.64)',
        bottom: 0,
    },
    buttonsLandscapeNoControls: {
        bottom: 1000,
    },
    button: {
        flexDirection: 'column',
        alignItems: 'center',
        flex: 1,
    },
    mute: {
        flexDirection: 'column',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#3DB887',
        borderRadius: 20,
        marginBottom: 10,
        marginTop: 20,
        marginLeft: 16,
        marginRight: 16,
    },
    muteMuted: {
        backgroundColor: 'rgba(255,255,255,0.16)',
    },
    speakerphoneIcon: {
        color: theme.sidebarText,
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    buttonOn: {
        color: 'black',
        backgroundColor: 'white',
    },
    otherButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        alignContent: 'space-between',
    },
    collapseIcon: {
        color: theme.sidebarText,
        margin: 10,
        padding: 10,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    muteIcon: {
        color: theme.sidebarText,
    },
    muteIconLandscape: {
        backgroundColor: '#3DB887',
    },
    muteIconLandscapeMuted: {
        backgroundColor: 'rgba(255,255,255,0.16)',
    },
    buttonText: {
        color: theme.sidebarText,
    },
    buttonIcon: {
        color: theme.sidebarText,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderRadius: 34,
        padding: 22,
        width: 68,
        height: 68,
        margin: 10,
        overflow: 'hidden',
    },
    hangUpIcon: {
        backgroundColor: Preferences.THEMES.denim.dndIndicator,
    },
    screenShareImage: {
        flex: 7,
        width: '100%',
        height: '100%',
        alignItems: 'center',
    },
    screenShareText: {
        color: 'white',
        margin: 3,
    },
    unavailableText: {
        color: changeOpacity(theme.sidebarText, 0.32),
    },
    denimDND: {
        color: Preferences.THEMES.denim.dndIndicator,
    },
}));

const CallScreen = ({
    componentId,
    currentCall,
    participantsDict,
    micPermissionsGranted,
    teammateNameDisplay,
    fromThreadScreen,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const {width, height} = useWindowDimensions();
    const serverUrl = useServerUrl();
    const {EnableRecordings} = useCallsConfig(serverUrl);
    usePermissionsChecker(micPermissionsGranted);
    const [showControlsInLandscape, setShowControlsInLandscape] = useState(false);
    const [showReactions, setShowReactions] = useState(false);

    const style = getStyleSheet(theme);
    const isLandscape = width > height;
    const showControls = !isLandscape || showControlsInLandscape;
    const myParticipant = currentCall?.participants[currentCall.myUserId];
    const micPermissionsError = !micPermissionsGranted && !currentCall?.micPermissionsErrorDismissed;

    const callThreadOptionTitle = intl.formatMessage({id: 'mobile.calls_call_thread', defaultMessage: 'Call Thread'});
    const recordOptionTitle = intl.formatMessage({id: 'mobile.calls_record', defaultMessage: 'Record'});
    const stopRecordingOptionTitle = intl.formatMessage({id: 'mobile.calls_stop_recording', defaultMessage: 'Stop Recording'});
    const openChannelOptionTitle = intl.formatMessage({id: 'mobile.calls_call_thread', defaultMessage: 'Open Channel'});

    useEffect(() => {
        mergeNavigationOptions('Call', {
            layout: {
                componentBackgroundColor: 'black',
            },
            topBar: {
                visible: false,
            },
        });
    }, []);

    const leaveCallHandler = useCallback(() => {
        popTopScreen();
        leaveCall();
    }, []);

    const muteUnmuteHandler = useCallback(() => {
        if (myParticipant?.muted) {
            unmuteMyself();
        } else {
            muteMyself();
        }
    }, [myParticipant?.muted]);

    const toggleReactions = useCallback(() => {
        setShowReactions((prev) => !prev);
    }, [setShowReactions]);

    const toggleSpeakerPhone = useCallback(() => {
        setSpeakerphoneOn(!currentCall?.speakerphoneOn);
    }, [currentCall?.speakerphoneOn]);

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
        await appEntry(currentCall.serverUrl, Date.now());
        await goToScreen(Screens.THREAD, callThreadOptionTitle, {rootId: currentCall.threadId});
    }, [currentCall?.serverUrl, currentCall?.threadId, fromThreadScreen, componentId, callThreadOptionTitle]);

    // The user should receive a recording alert if all of the following conditions apply:
    // - Recording has started, recording has not ended
    const isHost = Boolean(currentCall?.hostId === myParticipant?.id);
    const recording = Boolean(currentCall?.recState?.start_at && !currentCall.recState.end_at);
    if (recording) {
        recordingAlert(isHost, intl);
    }

    // The user should receive a recording finished alert if all of the following conditions apply:
    // - Is the host, recording has started, and recording has ended
    if (isHost && currentCall?.recState?.start_at && currentCall.recState.end_at) {
        recordingWillBePostedAlert(intl);
    }

    // The user should see the loading only if:
    // - Recording has been initialized, recording has not been started, and recording has not ended
    const waitingForRecording = Boolean(currentCall?.recState?.init_at && !currentCall.recState.start_at && !currentCall.recState.end_at && isHost);

    const showOtherActions = useCallback(async () => {
        const renderContent = () => {
            return (
                <View style={style.bottomSheet}>
                    {
                        isHost && EnableRecordings && !(waitingForRecording || recording) &&
                        <SlideUpPanelItem
                            icon={'record-circle-outline'}
                            onPress={startRecording}
                            text={recordOptionTitle}
                        />
                    }
                    {
                        isHost && EnableRecordings && (waitingForRecording || recording) &&
                        <SlideUpPanelItem
                            icon={'record-square-outline'}
                            imageStyles={style.denimDND}
                            onPress={stopRecording}
                            text={stopRecordingOptionTitle}
                            textStyles={style.denimDND}
                        />
                    }
                    <SlideUpPanelItem
                        icon='message-text-outline'
                        onPress={switchToThread}
                        text={callThreadOptionTitle}
                    />
                </View>
            );
        };

        const items = isHost && EnableRecordings ? 3 : 2;
        await bottomSheet({
            closeButtonId: 'close-other-actions',
            renderContent,
            snapPoints: [bottomSheetSnapPoint(items, ITEM_HEIGHT, insets.bottom), 10],
            title: intl.formatMessage({id: 'post.options.title', defaultMessage: 'Options'}),
            theme,
        });
    }, [insets, intl, theme, isHost, EnableRecordings, waitingForRecording, recording, startRecording,
        recordOptionTitle, stopRecording, stopRecordingOptionTitle, style, switchToThread, callThreadOptionTitle,
        openChannelOptionTitle]);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(WebsocketEvents.CALLS_CALL_END, ({channelId}) => {
            if (channelId === currentCall?.channelId && NavigationStore.getNavigationTopComponentId() === componentId) {
                Navigation.pop(componentId);
            }
        });

        return () => listener.remove();
    }, []);

    if (!currentCall || !myParticipant) {
        // Note: this happens because the screen is "rendered", even after the screen has been popped, and the
        // currentCall will have already been set to null when those extra renders run. We probably don't ever need
        // to pop, but just in case.
        if (NavigationStore.getNavigationTopComponentId() === componentId) {
            // ignore the error because the call screen has likely already been popped async
            Navigation.pop(componentId).catch(() => null);
        }
        return null;
    }

    let screenShareView = null;
    if (currentCall.screenShareURL && currentCall.screenOn) {
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
                <FormattedText
                    id={'mobile.calls_viewing_screen'}
                    defaultMessage={'You are viewing {name}\'s screen'}
                    values={{name: displayUsername(participantsDict[currentCall.screenOn].userModel, teammateNameDisplay)}}
                    style={style.screenShareText}
                />
            </Pressable>
        );
    }

    const participants = sortParticipants(teammateNameDisplay, participantsDict, currentCall.screenOn);
    let usersList = null;
    if (!currentCall.screenOn || !isLandscape) {
        usersList = (
            <ScrollView
                alwaysBounceVertical={false}
                horizontal={currentCall.screenOn !== ''}
                contentContainerStyle={[isLandscape && currentCall.screenOn && style.usersScrollLandscapeScreenOn]}
            >
                <Pressable
                    testID='users-list'
                    onPress={toggleControlsInLandscape}
                    style={style.users}
                >
                    {participants.map((user) => {
                        return (
                            <View
                                style={[style.user, currentCall.screenOn && style.userScreenOn]}
                                key={user.id}
                            >
                                <CallAvatar
                                    userModel={user.userModel}
                                    volume={currentCall.voiceOn[user.id] ? 1 : 0}
                                    muted={user.muted}
                                    sharingScreen={user.id === currentCall.screenOn}
                                    raisedHand={Boolean(user.raisedHand)}
                                    reaction={user.reaction?.emoji}
                                    size={currentCall.screenOn ? 'm' : 'l'}
                                    serverUrl={currentCall.serverUrl}
                                />
                                <Text style={style.username}>
                                    {displayUsername(user.userModel, teammateNameDisplay)}
                                    {user.id === myParticipant.id &&
                                        ` ${intl.formatMessage({id: 'mobile.calls_you', defaultMessage: '(you)'})}`
                                    }
                                </Text>
                                {user.id === currentCall.hostId && <CallsBadge type={CallsBadgeType.Host}/>}
                            </View>
                        );
                    })}
                </Pressable>
            </ScrollView>
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

    return (
        <SafeAreaView style={style.wrapper}>
            <View style={style.container}>
                <View
                    style={[style.header, isLandscape && style.headerLandscape, !showControls && style.headerLandscapeNoControls]}
                >
                    {waitingForRecording && <CallsBadge type={CallsBadgeType.Waiting}/>}
                    {recording && <CallsBadge type={CallsBadgeType.Rec}/>}
                    <CallDuration
                        style={style.time}
                        value={currentCall.startTime}
                        updateIntervalInSeconds={1}
                    />
                    <Pressable onPress={() => popTopScreen()}>
                        <CompassIcon
                            name='arrow-collapse'
                            size={24}
                            style={style.collapseIcon}
                        />
                    </Pressable>
                </View>
                {usersList}
                {screenShareView}
                {micPermissionsError && <PermissionErrorBar/>}
                <EmojiList reactionStream={currentCall.reactionStream}/>
                {showReactions && <ReactionBar raisedHand={myParticipant.raisedHand}/>}
                <View
                    style={[style.buttons, isLandscape && style.buttonsLandscape, !showControls && style.buttonsLandscapeNoControls]}
                >
                    {!isLandscape &&
                        <Pressable
                            testID='mute-unmute'
                            style={[style.mute, myParticipant.muted && style.muteMuted]}
                            onPress={muteUnmuteHandler}
                            disabled={!micPermissionsGranted}
                        >
                            <UnavailableIconWrapper
                                name={myParticipant.muted ? 'microphone-off' : 'microphone'}
                                size={24}
                                unavailable={!micPermissionsGranted}
                                style={style.muteIcon}
                            />
                            {myParticipant.muted ? UnmuteText : MuteText}
                        </Pressable>}
                    <View style={style.otherButtons}>
                        <Pressable
                            testID='leave'
                            style={style.button}
                            onPress={leaveCallHandler}
                        >
                            <CompassIcon
                                name='phone-hangup'
                                size={24}
                                style={{...style.buttonIcon, ...style.hangUpIcon}}
                            />
                            <FormattedText
                                id={'mobile.calls_leave'}
                                defaultMessage={'Leave'}
                                style={style.buttonText}
                            />
                        </Pressable>
                        <Pressable
                            testID={'toggle-speakerphone'}
                            style={style.button}
                            onPress={toggleSpeakerPhone}
                        >
                            <CompassIcon
                                name={'volume-high'}
                                size={24}
                                style={[style.buttonIcon, style.speakerphoneIcon, currentCall.speakerphoneOn && style.buttonOn]}
                            />
                            <FormattedText
                                id={'mobile.calls_speaker'}
                                defaultMessage={'Speaker'}
                                style={style.buttonText}
                            />
                        </Pressable>
                        <Pressable
                            style={style.button}
                            onPress={toggleReactions}
                        >
                            <CompassIcon
                                name={'emoticon-happy-outline'}
                                size={24}
                                style={[style.buttonIcon, showReactions && style.buttonOn]}
                            />
                            <FormattedText
                                id={'mobile.calls_react'}
                                defaultMessage={'React'}
                                style={style.buttonText}
                            />
                        </Pressable>
                        <Pressable
                            style={style.button}
                            onPress={showOtherActions}
                        >
                            <CompassIcon
                                name='dots-horizontal'
                                size={24}
                                style={style.buttonIcon}
                            />
                            <FormattedText
                                id={'mobile.calls_more'}
                                defaultMessage={'More'}
                                style={style.buttonText}
                            />
                        </Pressable>
                        {isLandscape &&
                            <Pressable
                                testID='mute-unmute'
                                style={style.button}
                                onPress={muteUnmuteHandler}
                            >
                                <CompassIcon
                                    name={myParticipant.muted ? 'microphone-off' : 'microphone'}
                                    size={24}
                                    style={[style.buttonIcon, style.muteIconLandscape, myParticipant?.muted && style.muteIconLandscapeMuted]}
                                />
                                {myParticipant.muted ? UnmuteText : MuteText}
                            </Pressable>}
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
};

export default CallScreen;
