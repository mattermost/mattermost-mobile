// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useCallback, useState} from 'react';
import {useIntl} from 'react-intl';
import {
    View,
    Text,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    useWindowDimensions,
    DeviceEventEmitter, Keyboard,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {RTCView} from 'react-native-webrtc';

import {appEntry} from '@actions/remote/entry';
import {
    leaveCall,
    muteMyself,
    raiseHand,
    setSpeakerphoneOn,
    unmuteMyself,
    unraiseHand,
} from '@calls/actions';
import CallAvatar from '@calls/components/call_avatar';
import CallDuration from '@calls/components/call_duration';
import RaisedHandIcon from '@calls/icons/raised_hand_icon';
import UnraisedHandIcon from '@calls/icons/unraised_hand_icon';
import {CallParticipant, CurrentCall, VoiceEventData} from '@calls/types/calls';
import {sortParticipants} from '@calls/utils';
import CompassIcon from '@components/compass_icon';
import SlideUpPanelItem, {ITEM_HEIGHT} from '@components/slide_up_panel_item';
import {WebsocketEvents} from '@constants';
import Screens from '@constants/screens';
import {useTheme} from '@context/theme';
import DatabaseManager from '@database/manager';
import {bottomSheet, dismissBottomSheet, goToScreen, popTopScreen} from '@screens/navigation';
import {bottomSheetSnapPoint} from '@utils/helpers';
import {mergeNavigationOptions} from '@utils/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {displayUsername} from '@utils/user';

export type Props = {
    componentId: string;
    currentCall: CurrentCall | null;
    participantsDict: Dictionary<CallParticipant>;
    teammateNameDisplay: string;
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
        alignItems: 'center',
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
        padding: 30,
        backgroundColor: '#3DB887',
        borderRadius: 20,
        marginBottom: 10,
        marginTop: 20,
        marginLeft: 10,
        marginRight: 10,
    },
    muteMuted: {
        backgroundColor: 'rgba(255,255,255,0.16)',
    },
    handIcon: {
        borderRadius: 34,
        padding: 34,
        margin: 10,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    handIconRaisedHand: {
        backgroundColor: 'rgba(255, 188, 66, 0.16)',
    },
    handIconSvgStyle: {
        position: 'relative',
        top: -12,
        right: 13,
    },
    speakerphoneIcon: {
        color: theme.sidebarText,
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    speakerphoneIconOn: {
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
        backgroundColor: '#D24B4E',
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
}));

const CallScreen = ({componentId, currentCall, participantsDict, teammateNameDisplay}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const {width, height} = useWindowDimensions();
    const isLandscape = width > height;
    const [showControlsInLandscape, setShowControlsInLandscape] = useState(false);
    const myParticipant = currentCall?.participants[currentCall.myUserId];
    const style = getStyleSheet(theme);
    const showControls = !isLandscape || showControlsInLandscape;

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

    const [speaker, setSpeaker] = useState('');
    useEffect(() => {
        const handleVoiceOn = (data: VoiceEventData) => {
            if (data.channelId === currentCall?.channelId) {
                setSpeaker(data.userId);
            }
        };
        const handleVoiceOff = (data: VoiceEventData) => {
            if (data.channelId === currentCall?.channelId && ((speaker === data.userId) || !speaker)) {
                setSpeaker('');
            }
        };

        const onVoiceOn = DeviceEventEmitter.addListener(WebsocketEvents.CALLS_USER_VOICE_ON, handleVoiceOn);
        const onVoiceOff = DeviceEventEmitter.addListener(WebsocketEvents.CALLS_USER_VOICE_OFF, handleVoiceOff);
        return () => {
            onVoiceOn.remove();
            onVoiceOff.remove();
        };
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

    const toggleRaiseHand = useCallback(() => {
        const raisedHand = myParticipant?.raisedHand || 0;
        if (raisedHand > 0) {
            unraiseHand();
        } else {
            raiseHand();
        }
    }, [myParticipant?.raisedHand]);

    const toggleControlsInLandscape = useCallback(() => {
        setShowControlsInLandscape(!showControlsInLandscape);
    }, [showControlsInLandscape]);

    const switchToThread = useCallback(async () => {
        Keyboard.dismiss();
        await dismissBottomSheet();
        if (!currentCall) {
            return;
        }

        const activeUrl = await DatabaseManager.getActiveServerUrl();
        if (activeUrl === currentCall.serverUrl) {
            goToScreen(Screens.THREAD, '', {rootId: currentCall.threadId});
            return;
        }

        // TODO: this is a temporary solution until we have a proper cross-team thread view.
        //  https://mattermost.atlassian.net/browse/MM-45752
        popTopScreen(componentId);
        await DatabaseManager.setActiveServerDatabase(currentCall.serverUrl);
        await appEntry(currentCall.serverUrl, Date.now());
        goToScreen(Screens.THREAD, '', {rootId: currentCall.threadId});
    }, [currentCall?.serverUrl, currentCall?.threadId]);

    const showOtherActions = useCallback(() => {
        const renderContent = () => {
            return (
                <View style={style.bottomSheet}>
                    <SlideUpPanelItem
                        icon='message-text-outline'
                        onPress={switchToThread}
                        text='Chat thread'
                    />
                </View>
            );
        };

        bottomSheet({
            closeButtonId: 'close-other-actions',
            renderContent,
            snapPoints: [bottomSheetSnapPoint(2, ITEM_HEIGHT, insets.bottom), 10],
            title: intl.formatMessage({id: 'post.options.title', defaultMessage: 'Options'}),
            theme,
        });
    }, [insets, intl, theme]);

    if (!currentCall || !myParticipant) {
        // This should not be possible, but may happen until https://github.com/mattermost/mattermost-mobile/pull/6493 is merged.
        // TODO: will figure out a way to remove the need for this check: https://mattermost.atlassian.net/browse/MM-46050
        popTopScreen(componentId);
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
                <Text style={style.screenShareText}>
                    {`You are viewing ${displayUsername(participantsDict[currentCall.screenOn].userModel, teammateNameDisplay)}'s screen`}
                </Text>
            </Pressable>
        );
    }

    const participants = sortParticipants(teammateNameDisplay, participantsDict, currentCall.screenOn);
    let usersList = null;
    if (!currentCall.screenOn || !isLandscape) {
        usersList = (
            <ScrollView
                alwaysBounceVertical={false}
                horizontal={currentCall?.screenOn !== ''}
                contentContainerStyle={[isLandscape && currentCall?.screenOn && style.usersScrollLandscapeScreenOn]}
            >
                <Pressable
                    testID='users-list'
                    onPress={toggleControlsInLandscape}
                    style={style.users}
                >
                    {participants.map((user) => {
                        return (
                            <View
                                style={[style.user, currentCall?.screenOn && style.userScreenOn]}
                                key={user.id}
                            >
                                <CallAvatar
                                    userModel={user.userModel}
                                    volume={speaker === user.id ? 1 : 0}
                                    muted={user.muted}
                                    sharingScreen={user.id === currentCall.screenOn}
                                    raisedHand={Boolean(user.raisedHand)}
                                    size={currentCall.screenOn ? 'm' : 'l'}
                                    serverUrl={currentCall.serverUrl}
                                />
                                <Text style={style.username}>
                                    {displayUsername(user.userModel, teammateNameDisplay)}
                                    {user.id === myParticipant.id && ' (you)'}
                                </Text>
                            </View>
                        );
                    })}
                </Pressable>
            </ScrollView>
        );
    }

    const HandIcon = myParticipant.raisedHand ? UnraisedHandIcon : RaisedHandIcon;

    return (
        <SafeAreaView style={style.wrapper}>
            <View style={style.container}>
                <View
                    style={[style.header, isLandscape && style.headerLandscape, !showControls && style.headerLandscapeNoControls]}
                >
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
                <View
                    style={[style.buttons, isLandscape && style.buttonsLandscape, !showControls && style.buttonsLandscapeNoControls]}
                >
                    {!isLandscape &&
                        <Pressable
                            testID='mute-unmute'
                            style={[style.mute, myParticipant.muted && style.muteMuted]}
                            onPress={muteUnmuteHandler}
                        >
                            <CompassIcon
                                name={myParticipant.muted ? 'microphone-off' : 'microphone'}
                                size={24}
                                style={style.muteIcon}
                            />
                            {myParticipant.muted &&
                                <Text style={style.buttonText}>{'Unmute'}</Text>}
                            {!myParticipant.muted &&
                                <Text style={style.buttonText}>{'Mute'}</Text>}
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
                            <Text style={style.buttonText}>{'Leave'}</Text>
                        </Pressable>
                        <Pressable
                            testID={'toggle-speakerphone'}
                            style={style.button}
                            onPress={() => setSpeakerphoneOn(!currentCall?.speakerphoneOn)}
                        >
                            <CompassIcon
                                name={'volume-high'}
                                size={24}
                                style={[style.buttonIcon, style.speakerphoneIcon, currentCall?.speakerphoneOn && style.speakerphoneIconOn]}
                            />
                            <Text style={style.buttonText}>{'Speaker'}</Text>
                        </Pressable>
                        <Pressable
                            style={style.button}
                            onPress={toggleRaiseHand}
                        >
                            <HandIcon
                                fill={myParticipant.raisedHand ? 'rgb(255, 188, 66)' : theme.sidebarText}
                                height={24}
                                width={24}
                                style={[style.buttonIcon, style.handIcon, myParticipant.raisedHand && style.handIconRaisedHand]}
                                svgStyle={style.handIconSvgStyle}
                            />
                            <Text style={style.buttonText}>
                                {myParticipant.raisedHand ? 'Lower hand' : 'Raise hand'}
                            </Text>
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
                            <Text
                                style={style.buttonText}
                            >{'More'}</Text>
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
                                {myParticipant.muted &&
                                    <Text
                                        style={style.buttonText}
                                    >{'Unmute'}</Text>}
                                {!myParticipant.muted &&
                                    <Text
                                        style={style.buttonText}
                                    >{'Mute'}</Text>}
                            </Pressable>}
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
};

export default CallScreen;
