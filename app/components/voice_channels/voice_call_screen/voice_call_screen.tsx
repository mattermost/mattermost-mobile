// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect, useCallback} from 'react';
import {Keyboard, View, Text, Platform, Pressable, SafeAreaView, ScrollView} from 'react-native';
import FontAwesome5Icon from 'react-native-vector-icons/FontAwesome5';

import {showModalOverCurrentContext, mergeNavigationOptions, popTopScreen} from '@actions/navigation';
import CompassIcon from '@components/compass_icon';
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
        raiseHand: (channelId: string, userId: string) => GenericAction;
        unraiseHand: (channelId: string, userId: string) => GenericAction;
        leaveCall: () => GenericAction;
    };
    theme: Theme;
    call: Call;
    users: IDMappedObjects<UserProfile>;
    currentParticipant: CallParticipant;
    teammateNameDisplay: string;
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
        },
        handRaised: {
            color: props.theme.sidebarText,
            backgroundColor: '#FFBC1F',
            borderRadius: 34,
            padding: 22,
            width: 68,
            height: 68,
            margin: 10,
        },
        hangUpIcon: {
            backgroundColor: '#D24B4E',
        },
    };
});

const VoiceCallScreen = (props: Props) => {
    if (!props.call) {
        return null;
    }

    const style = getStyleSheet(props);
    useEffect(() => {
        mergeNavigationOptions('VoiceCall', {topBar: {visible: false}});
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
        if (props.currentParticipant?.muted) {
            props.actions.unmuteMyself(props.call.channelId);
        } else {
            props.actions.muteMyself(props.call.channelId);
        }
    }, [props.call.channelId, props.currentParticipant]);

    const raiseUnraiseHandHandler = useCallback(() => {
        if (props.currentParticipant?.handRaised) {
            props.actions.unraiseHand(props.call.channelId, props.currentParticipant?.id);
        } else {
            props.actions.raiseHand(props.call.channelId, props.currentParticipant?.id);
        }
    }, [props.call.channelId, props.currentParticipant]);

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
                        {/* TODO: Replace the key idx with user.id when the data is real */}
                        {Object.entries(props.call.participants).map(([id, user]) => {
                            return (
                                <View
                                    style={style.user}
                                    key={id}
                                >
                                    <VoiceAvatar
                                        userId={user.id}
                                        volume={user.isTalking ? 1 : 0}
                                        handRaised={user.handRaised}
                                        muted={user.muted}
                                        size='l'
                                    />
                                    <Text style={style.username}>{displayUsername(props.users[user.id], props.teammateNameDisplay)}</Text>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
                <View style={style.buttons}>
                    <Pressable
                        style={style.mute}
                        onPress={muteUnmuteHandler}
                    >
                        <FontAwesome5Icon
                            name={props.currentParticipant?.muted ? 'microphone-slash' : 'microphone'}
                            size={24}
                            style={style.muteIcon}
                        />
                        <Text style={style.buttonText}>{props.currentParticipant?.muted ? 'Unmute' : 'Mute'}</Text>
                    </Pressable>
                    <View style={style.otherButtons}>
                        <Pressable
                            style={style.button}
                            onPress={() => {
                                popTopScreen();
                                props.actions.leaveCall();
                            }}
                        >
                            <FontAwesome5Icon
                                name='phone'
                                size={24}
                                style={{...style.buttonIcon, ...style.hangUpIcon}}
                            />
                            <Text style={style.buttonText}>{'Leave'}</Text>
                        </Pressable>
                        <Pressable
                            style={style.button}
                        >
                            <CompassIcon
                                name='message-text-outline'
                                size={24}
                                style={style.buttonIcon}
                            />
                            <Text style={style.buttonText}>{'Chat thread'}</Text>
                        </Pressable>
                        <Pressable
                            style={style.button}
                            onPress={raiseUnraiseHandHandler}
                        >
                            <FontAwesome5Icon
                                name='hand-paper'
                                size={24}
                                style={props.currentParticipant?.handRaised ? style.handRaised : style.buttonIcon}
                            />
                            <Text style={style.buttonText}>{props.currentParticipant?.handRaised ? 'Unraise hand' : 'Raise hand'}</Text>
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
                            <Text style={style.buttonText}>{'More'}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    );
};

export default VoiceCallScreen;
