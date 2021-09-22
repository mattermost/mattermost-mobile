// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {Keyboard, View, Text, Platform, Pressable, SafeAreaView, ScrollView} from 'react-native';
import FontAwesome5Icon from 'react-native-vector-icons/FontAwesome5';

import {showModalOverCurrentContext, mergeNavigationOptions, popTopScreen} from '@actions/navigation';
import CompassIcon from '@components/compass_icon';
import VoiceAvatar from '@components/voice_channels/voice_avatar';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {Theme} from '@mm-redux/types/theme';

type Props = {
    theme: Theme;
    users: {
        id: string;
        username: string;
        handRaised: boolean;
        muted: boolean;
        volume: number;
    }[];
    muted: boolean;
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
            backgroundColor: props.muted ? 'rgba(255,255,255,0.16)' : '#3DB887',
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
        hangUpIcon: {
            backgroundColor: '#D24B4E',
        },
    };
});

const VoiceCallScreen = (props: Props) => {
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

    return (
        <SafeAreaView style={style.wrapper}>
            <View style={style.container}>
                <View style={style.header}>
                    <Text style={style.time}>{'21:48'}</Text>
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
                        {props.users.map((user, idx) => {
                            return (
                                <View
                                    style={style.user}
                                    key={idx}
                                >
                                    <VoiceAvatar
                                        userId={user.id}
                                        volume={user.volume}
                                        handRaised={user.handRaised}
                                        muted={user.muted}
                                        size='l'
                                    />
                                    <Text style={style.username}>{user.username}</Text>
                                </View>
                            );
                        })}
                    </View>
                </ScrollView>
                <View style={style.buttons}>
                    <View style={style.mute}>
                        <FontAwesome5Icon
                            name={props.muted ? 'microphone-slash' : 'microphone'}
                            size={24}
                            style={style.muteIcon}
                        />
                        <Text style={style.buttonText}>{props.muted ? 'Mute' : 'Unmute'}</Text>
                    </View>
                    <View style={style.otherButtons}>
                        <View style={style.button}>
                            <FontAwesome5Icon
                                name='phone'
                                size={24}
                                style={{...style.buttonIcon, ...style.hangUpIcon}}
                            />
                            <Text style={style.buttonText}>{'Leave'}</Text>
                        </View>
                        <View style={style.button}>
                            <CompassIcon
                                name='message-text-outline'
                                size={24}
                                style={style.buttonIcon}
                            />
                            <Text style={style.buttonText}>{'Chat thread'}</Text>
                        </View>
                        <View style={style.button}>
                            <FontAwesome5Icon
                                name='hand-paper'
                                size={24}
                                style={style.buttonIcon}
                            />
                            <Text style={style.buttonText}>{'Raise hand'}</Text>
                        </View>
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
