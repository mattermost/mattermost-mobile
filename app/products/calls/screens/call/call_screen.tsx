// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useCallback, useState} from 'react';
import {
    Keyboard,
    View,
    Text,
    Platform,
    Pressable,
    SafeAreaView,
    ScrollView,
    useWindowDimensions,
    DeviceEventEmitter,
} from 'react-native';
import {RTCView} from 'react-native-webrtc';

import {showModalOverCurrentContext, mergeNavigationOptions, popTopScreen} from '@actions/navigation';
import CompassIcon from '@components/compass_icon';
import {WebsocketEvents} from '@constants';
import {ActionFunc, GenericAction} from '@mm-redux/types/actions';
import {displayUsername} from '@mm-redux/utils/user_utils';
import CallAvatar from '@mmproducts/calls/components/call_avatar';
import CallDuration from '@mmproducts/calls/components/call_duration';
import RaisedHandIcon from '@mmproducts/calls/components/raised_hand_icon';
import UnraisedHandIcon from '@mmproducts/calls/components/unraised_hand_icon';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {Theme} from '@mm-redux/types/theme';
import type {UserProfile} from '@mm-redux/types/users';
import type {Call, CallParticipant, VoiceEventData} from '@mmproducts/calls/store/types/calls';

type Props = {
    actions: {
        muteMyself: (channelId: string) => GenericAction;
        unmuteMyself: (channelId: string) => GenericAction;
        setSpeakerphoneOn: (newState: boolean) => GenericAction;
        leaveCall: () => ActionFunc;
        raiseHand: () => GenericAction;
        unraiseHand: () => GenericAction;
    };
    theme: Theme;
    call: Call | null;
    participants: CallParticipant[];
    currentParticipant: CallParticipant;
    teammateNameDisplay: string;
    screenShareURL: string;
    speakerphoneOn: boolean;
}

const getStyleSheet = makeStyleSheetFromTheme((props: any) => {
    const showControls = !props.isLandscape || props.showControlsInLandscape;
    const buttons: any = {
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
    };
    if (props.isLandscape) {
        buttons.height = 128;
        buttons.position = 'absolute';
        buttons.backgroundColor = 'rgba(0,0,0,0.64)';
        buttons.bottom = 0;
        if (!showControls) {
            buttons.bottom = 1000;
        }
    }
    const header: any = {
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
    };
    if (props.isLandscape) {
        header.position = 'absolute';
        header.top = 0;
        header.backgroundColor = 'rgba(0,0,0,0.64)';
        header.height = 64;
        header.padding = 0;
        if (!showControls) {
            header.top = -1000;
        }
    }
    const usersScroll: any = {};
    const users: any = {
        flex: 1,
        flexDirection: 'row',
        flexWrap: 'wrap',
        width: '100%',
        height: '100%',
        alignContent: 'center',
        alignItems: 'center',
    };

    if (props.isLandscape && props.call?.screenOn) {
        usersScroll.position = 'absolute';
        usersScroll.height = 0;
    }
    return {
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
        header,
        time: {
            flex: 1,
            color: props.theme.sidebarText,
            margin: 10,
            padding: 10,
        },
        users,
        usersScroll,
        user: {
            flexGrow: 1,
            flexDirection: 'column',
            alignItems: 'center',
            marginTop: props.call?.screenOn ? 0 : 10,
            marginBottom: props.call?.screenOn ? 0 : 10,
            marginLeft: 10,
            marginRight: 10,
        },
        username: {
            color: props.theme.sidebarText,
        },
        buttons,
        button: {
            flexDirection: 'column',
            alignItems: 'center',
            flex: 1,
        },
        mute: {
            flexDirection: 'column',
            alignItems: 'center',
            padding: 30,
            backgroundColor: props.currentParticipant?.muted ? 'rgba(255,255,255,0.16)' : '#3DB887',
            borderRadius: 20,
            marginBottom: 10,
            marginTop: 20,
            marginLeft: 10,
            marginRight: 10,
        },
        handIcon: {
            borderRadius: 34,
            padding: 34,
            margin: 10,
            overflow: 'hidden',
            backgroundColor: props.currentParticipant?.raisedHand ? 'rgba(255, 188, 66, 0.16)' : 'rgba(255,255,255,0.12)',
        },
        handIconSvgStyle: {
            position: 'relative',
            top: -12,
            right: 13,
        },
        speakerphoneIcon: {
            color: props.speakerphoneOn ? 'black' : props.theme.sidebarText,
            backgroundColor: props.speakerphoneOn ? 'white' : 'rgba(255,255,255,0.12)',
        },
        otherButtons: {
            flexDirection: 'row',
            alignItems: 'center',
            alignContent: 'space-between',
        },
        collapseIcon: {
            color: props.theme.sidebarText,
            margin: 10,
            padding: 10,
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderRadius: 4,
            overflow: 'hidden',
        },
        muteIcon: {
            color: props.theme.sidebarText,
        },
        buttonText: {
            color: props.theme.sidebarText,
        },
        buttonIcon: {
            color: props.theme.sidebarText,
            backgroundColor: 'rgba(255,255,255,0.12)',
            borderRadius: 34,
            padding: 22,
            width: 68,
            height: 68,
            margin: 10,
            overflow: 'hidden',
        },
        muteIconLandscape: {
            backgroundColor: props.currentParticipant?.muted ? 'rgba(255,255,255,0.16)' : '#3DB887',
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
    };
});

const CallScreen = (props: Props) => {
    const {width, height} = useWindowDimensions();
    const isLandscape = width > height;

    const [showControlsInLandscape, setShowControlsInLandscape] = useState(false);

    const style = getStyleSheet({...props, showControlsInLandscape, isLandscape});

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

    const [speaker, setSpeaker] = useState<UserProfile | null>(null);
    const handleVoiceOn = (data: VoiceEventData) => {
        if (data.channelId === props.call?.channelId) {
            setSpeaker(props.call.participants[data.userId].profile);
        }
    };
    const handleVoiceOff = (data: VoiceEventData) => {
        if (data.channelId === props.call?.channelId && ((speaker?.id === data.userId) || !speaker)) {
            setSpeaker(null);
        }
    };

    useEffect(() => {
        const onVoiceOn = DeviceEventEmitter.addListener(WebsocketEvents.CALLS_USER_VOICE_ON, handleVoiceOn);
        const onVoiceOff = DeviceEventEmitter.addListener(WebsocketEvents.CALLS_USER_VOICE_OFF, handleVoiceOff);
        return () => {
            onVoiceOn.remove();
            onVoiceOff.remove();
        };
    }, [props.call]);

    const showOtherActions = () => {
        const screen = 'CallOtherActions';
        const passProps = {
            theme: props.theme,
            channelId: props.call?.channelId,
            rootId: props.call?.threadId,
        };

        Keyboard.dismiss();
        const otherActionsRequest = requestAnimationFrame(() => {
            showModalOverCurrentContext(screen, passProps);
            cancelAnimationFrame(otherActionsRequest);
        });
    };

    const minimizeCallHandler = useCallback(() => popTopScreen(), []);

    const leaveCallHandler = useCallback(() => {
        popTopScreen();
        props.actions.leaveCall();
    }, [props.actions.leaveCall]);

    const muteUnmuteHandler = useCallback(() => {
        if (props.call) {
            if (props.currentParticipant?.muted) {
                props.actions.unmuteMyself(props.call.channelId);
            } else {
                props.actions.muteMyself(props.call.channelId);
            }
        }
    }, [props.call?.channelId, props.currentParticipant]);

    const toggleSpeakerphoneHandler = useCallback(() => {
        props.actions.setSpeakerphoneOn(!props.speakerphoneOn);
    }, [props.speakerphoneOn]);

    const toggleRaiseHand = useCallback(() => {
        if (props.currentParticipant?.raisedHand > 0) {
            props.actions.unraiseHand();
        } else {
            props.actions.raiseHand();
        }
    }, [props.currentParticipant?.raisedHand]);

    const toggleControlsInLandscape = useCallback(() => {
        setShowControlsInLandscape(!showControlsInLandscape);
    }, [showControlsInLandscape]);

    useEffect(() => {
        const listener = DeviceEventEmitter.addListener(WebsocketEvents.CALLS_CALL_END, ({channelId}) => {
            if (channelId === props.call?.channelId) {
                popTopScreen();
            }
        });

        return () => listener.remove();
    }, []);

    if (!props.call) {
        return null;
    }

    let screenShareView = null;
    if (props.screenShareURL && props.call.screenOn) {
        screenShareView = (
            <Pressable
                testID='screen-share-container'
                style={style.screenShareImage}
                onPress={toggleControlsInLandscape}
            >
                <RTCView
                    streamURL={props.screenShareURL}
                    style={style.screenShareImage}
                />
                <Text style={style.screenShareText}>
                    {`You are viewing ${displayUsername(props.call.participants[props.call.screenOn].profile, props.teammateNameDisplay)}'s screen`}
                </Text>
            </Pressable>
        );
    }
    let usersList = null;
    if (!props.call.screenOn || !isLandscape) {
        usersList = (
            <ScrollView
                alwaysBounceVertical={false}
                horizontal={props.call?.screenOn !== ''}
                contentContainerStyle={style.usersScroll}
            >
                <Pressable
                    testID='users-list'
                    onPress={toggleControlsInLandscape}
                    style={style.users}
                >
                    {props.participants.map((user) => {
                        return (
                            <View
                                style={style.user}
                                key={user.id}
                            >
                                <CallAvatar
                                    userId={user.id}
                                    volume={speaker && speaker.id === user.id ? 1 : 0}
                                    muted={user.muted}
                                    sharingScreen={user.id === props.call?.screenOn}
                                    raisedHand={Boolean(user.raisedHand)}
                                    size={props.call?.screenOn ? 'm' : 'l'}
                                />
                                <Text style={style.username}>
                                    {displayUsername(user.profile, props.teammateNameDisplay)}
                                    {user.id === props.currentParticipant?.id && ' (you)'}
                                </Text>
                            </View>
                        );
                    })}
                </Pressable>
            </ScrollView>
        );
    }

    const HandIcon = props.currentParticipant?.raisedHand ? UnraisedHandIcon : RaisedHandIcon;

    return (
        <SafeAreaView style={style.wrapper}>
            <View style={style.container}>
                <View style={style.header}>
                    <CallDuration
                        style={style.time}
                        value={props.call.startTime}
                        updateIntervalInSeconds={1}
                    />
                    <Pressable
                        onPress={minimizeCallHandler}
                    >
                        <CompassIcon
                            name='arrow-collapse'
                            size={24}
                            style={style.collapseIcon}
                        />
                    </Pressable>
                </View>
                {usersList}
                {screenShareView}
                <View style={style.buttons}>
                    {!isLandscape &&
                        <Pressable
                            testID='mute-unmute'
                            style={style.mute}
                            onPress={muteUnmuteHandler}
                        >
                            <CompassIcon
                                name={props.currentParticipant?.muted ? 'microphone-off' : 'microphone'}
                                size={24}
                                style={style.muteIcon}
                            />
                            {props.currentParticipant?.muted &&
                                <Text style={style.buttonText}>{'Unmute'}</Text>}
                            {!props.currentParticipant?.muted &&
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
                            onPress={toggleSpeakerphoneHandler}
                        >
                            <CompassIcon
                                name={'volume-high'}
                                size={24}
                                style={[style.buttonIcon, style.speakerphoneIcon]}
                            />
                            <Text style={style.buttonText}>{'Speaker'}</Text>
                        </Pressable>
                        <Pressable
                            style={style.button}
                            onPress={toggleRaiseHand}
                        >
                            <HandIcon
                                fill={props.currentParticipant?.raisedHand ? 'rgb(255, 188, 66)' : props.theme.sidebarText}
                                height={24}
                                width={24}
                                style={[style.buttonIcon, style.handIcon]}
                                svgStyle={style.handIconSvgStyle}
                            />
                            <Text style={style.buttonText}>
                                {props.currentParticipant?.raisedHand ? 'Lower hand' : 'Raise hand'}
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
                                    name={props.currentParticipant?.muted ? 'microphone-off' : 'microphone'}
                                    size={24}
                                    style={{...style.buttonIcon, ...style.muteIconLandscape}}
                                />
                                {props.currentParticipant?.muted &&
                                    <Text
                                        style={style.buttonText}
                                    >{'Unmute'}</Text>}
                                {!props.currentParticipant?.muted &&
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
