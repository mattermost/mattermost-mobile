// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useCallback} from 'react';
import {Keyboard, View, Text, Platform, Pressable, SafeAreaView, ScrollView} from 'react-native';
import {RTCView} from 'react-native-webrtc';

import {showModalOverCurrentContext, mergeNavigationOptions, popTopScreen} from '@actions/navigation';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import VoiceAvatar from '@components/voice_channels/voice_avatar';
import VoiceCallDuration from '@components/voice_channels/voice_call_duration';
import {GenericAction} from '@mm-redux/types/actions';
import {displayUsername} from '@mm-redux/utils/user_utils';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {Theme} from '@mm-redux/types/theme';
import type {UserProfile} from '@mm-redux/types/users';
import type {IDMappedObjects} from '@mm-redux/types/utilities';
import type {Call, CallParticipant} from '@mm-redux/types/voiceCalls';

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

const getStyleSheet = makeStyleSheetFromTheme((props: Props) => {
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
        header: {
            flexDirection: 'row',
            width: '100%',
            padding: 14,
        },
        time: {
            flex: 1,
            color: props.theme.sidebarText,
            margin: 10,
            padding: 10,
        },
        users: {
            flex: 1,
            flexDirection: 'row',
            flexWrap: 'wrap',
            width: '100%',
            alignContent: 'flex-start',
        },
        user: {
            flexGrow: 1,
            flexDirection: 'column',
            alignItems: 'center',
            margin: 10,
        },
        username: {
            color: props.theme.sidebarText,
        },
        buttons: {
            flexDirection: 'column',
            backgroundColor: 'rgba(255,255,255,0.16)',
            width: '100%',
            paddingBottom: 10,
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
        hangUpIcon: {
            backgroundColor: '#D24B4E',
        },
        screenShare: {
            flex: 3,
            width: '100%',
            height: '100%',
            backgroundColor: 'white',
        },
    };
});

const VoiceCallScreen = (props: Props) => {
    if (!props.call) {
        return null;
    }

    const style = getStyleSheet(props);
    useEffect(() => {
        mergeNavigationOptions('VoiceCall', {
            layout: {
                componentBackgroundColor: 'black',
            },
            topBar: {
                visible: false,
            },
        });
    }, []);

    const showOtherActions = () => {
        const screen = 'VoiceCallOtherActions';
        const passProps = {
        };

        Keyboard.dismiss();
        const otherActionsRequest = requestAnimationFrame(() => {
            showModalOverCurrentContext(screen, passProps);
            cancelAnimationFrame(otherActionsRequest);
        });
    };

    const muteUnmuteHandler = useCallback(() => {
        if (props.call) {
            if (props.currentParticipant?.muted) {
                props.actions.unmuteMyself(props.call.channelId);
            } else {
                props.actions.muteMyself(props.call.channelId);
            }
        }
    }, [props.call.channelId, props.currentParticipant]);

    let screenShareView = null;
    if (props.screenShareURL) {
        screenShareView = (
            <RTCView
                streamURL={props.screenShareURL}
                style={style.screenShare}
            />
        );
    }

    return (
        <SafeAreaView style={style.wrapper}>
            <View style={style.container}>
                <View style={style.header}>
                    <VoiceCallDuration
                        style={style.time}
                        value={props.call.startTime}
                        updateIntervalInSeconds={1}
                    />
                    <Pressable
                        onPress={() => popTopScreen()}
                    >
                        <CompassIcon
                            name='arrow-collapse'
                            size={24}
                            style={style.collapseIcon}
                        />
                    </Pressable>
                </View>
                <ScrollView alwaysBounceVertical={false}>
                    <View style={style.users}>
                        {Object.values(props.call.participants).map((user) => {
                            return (
                                <View
                                    style={style.user}
                                    key={user.id}
                                >
                                    <VoiceAvatar
                                        userId={user.id}
                                        volume={user.isTalking ? 1 : 0}
                                        muted={user.muted}
                                        size='l'
                                    />
                                    <Text style={style.username}>{displayUsername(props.users[user.id], props.teammateNameDisplay)}</Text>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
                {screenShareView}
                <View style={style.buttons}>
                    <Pressable
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
                                id='voice_call.unmute'
                                defaultMessage='Unmute'
                            />}
                        {!props.currentParticipant?.muted &&
                            <FormattedText
                                style={style.buttonText}
                                id='voice_call.mute'
                                defaultMessage='Mute'
                            />}
                    </Pressable>
                    <View style={style.otherButtons}>
                        <Pressable
                            style={style.button}
                            onPress={() => {
                                popTopScreen();
                                props.actions.leaveCall();
                            }}
                        >
                            <CompassIcon
                                name='phone-hangup'
                                size={24}
                                style={{...style.buttonIcon, ...style.hangUpIcon}}
                            />
                            <FormattedText
                                style={style.buttonText}
                                id='voice_call.leave'
                                defaultMessage='Leave'
                            />
                        </Pressable>
                        <Pressable
                            style={style.button}
                        >
                            <CompassIcon
                                name='message-text-outline'
                                size={24}
                                style={style.buttonIcon}
                            />
                            <FormattedText
                                style={style.buttonText}
                                id='voice_call.chat_thread'
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
                                id='voice_call.settings'
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
                                id='voice_call.more'
                                defaultMessage='More'
                            />
                        </Pressable>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
};

export default VoiceCallScreen;
