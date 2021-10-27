// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useCallback, useState} from 'react';
import {Keyboard, View, Text, Platform, Pressable, SafeAreaView, ScrollView, useWindowDimensions} from 'react-native';
import {RTCView} from 'react-native-webrtc2';

import {showModalOverCurrentContext, mergeNavigationOptions, popTopScreen, goToScreen} from '@actions/navigation';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {THREAD} from '@constants/screen';
import {GenericAction} from '@mm-redux/types/actions';
import {displayUsername} from '@mm-redux/utils/user_utils';
import CallAvatar from '@mmproducts/calls/components/call_avatar';
import CallDuration from '@mmproducts/calls/components/call_duration';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {Theme} from '@mm-redux/types/theme';
import type {UserProfile} from '@mm-redux/types/users';
import type {IDMappedObjects} from '@mm-redux/types/utilities';
import type {Call, CallParticipant} from '@mmproducts/calls/store/types/calls';

type Props = {
    actions: {
        muteMyself: (channelId: string) => GenericAction;
        unmuteMyself: (channelId: string) => GenericAction;
        leaveCall: () => GenericAction;
    };
    theme: Theme;
    call: Call|null;
    users: IDMappedObjects<UserProfile>;
    currentParticipant: CallParticipant;
    teammateNameDisplay: string;
    screenShareURL: string;
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
        padding: 14,
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
    if (!props.call) {
        return null;
    }
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

    const showOtherActions = () => {
        const screen = 'CallOtherActions';
        const passProps = {
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

    const openThreadHandler = useCallback(() => {
        const passProps = {
            channelId: props.call?.channelId,
            rootId: props.call?.threadId,
        };
        goToScreen(THREAD, '', passProps);
    }, [props.call]);

    const muteUnmuteHandler = useCallback(() => {
        if (props.call) {
            if (props.currentParticipant?.muted) {
                props.actions.unmuteMyself(props.call.channelId);
            } else {
                props.actions.muteMyself(props.call.channelId);
            }
        }
    }, [props.call.channelId, props.currentParticipant]);

    const toggleControlsInLandscape = useCallback(() => {
        setShowControlsInLandscape(!showControlsInLandscape);
    }, [showControlsInLandscape]);

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
                <FormattedText
                    id='call.screen_share_user'
                    defaultMessage='You are seing {userDisplayName} screen'
                    values={{userDisplayName: displayUsername(props.users[props.call.screenOn], props.teammateNameDisplay)}}
                    style={style.screenShareText}
                />
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
                    {Object.values(props.call.participants).map((user) => {
                        return (
                            <View
                                style={style.user}
                                key={user.id}
                            >
                                <CallAvatar
                                    userId={user.id}
                                    volume={user.isTalking ? 1 : 0}
                                    muted={user.muted}
                                    size={props.call?.screenOn ? 'm' : 'l'}
                                />
                                <Text style={style.username}>{displayUsername(props.users[user.id], props.teammateNameDisplay)}</Text>
                            </View>
                        );
                    })}
                </Pressable>
            </ScrollView>
        );
    }

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
                                <FormattedText
                                    style={style.buttonText}
                                    id='call.unmute'
                                    defaultMessage='Unmute'
                                />}
                            {!props.currentParticipant?.muted &&
                                <FormattedText
                                    style={style.buttonText}
                                    id='call.mute'
                                    defaultMessage='Mute'
                                />}
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
                                style={style.buttonText}
                                id='call.leave'
                                defaultMessage='Leave'
                            />
                        </Pressable>
                        <Pressable
                            style={style.button}
                            onPress={openThreadHandler}
                        >
                            <CompassIcon
                                name='message-text-outline'
                                size={24}
                                style={style.buttonIcon}
                            />
                            <FormattedText
                                style={style.buttonText}
                                id='call.chat_thread'
                                defaultMessage='Chat thread'
                            />
                        </Pressable>
                        <Pressable
                            style={style.button}
                        >
                            <CompassIcon
                                name='settings-outline'
                                size={24}
                                style={style.buttonIcon}
                            />
                            <FormattedText
                                style={style.buttonText}
                                id='call.settings'
                                defaultMessage='Settings'
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
                                style={style.buttonText}
                                id='call.more'
                                defaultMessage='More'
                            />
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
                                    <FormattedText
                                        style={style.buttonText}
                                        id='call.unmute'
                                        defaultMessage='Unmute'
                                    />}
                                {!props.currentParticipant?.muted &&
                                    <FormattedText
                                        style={style.buttonText}
                                        id='call.mute'
                                        defaultMessage='Mute'
                                    />}
                            </Pressable>}
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
};

export default CallScreen;
