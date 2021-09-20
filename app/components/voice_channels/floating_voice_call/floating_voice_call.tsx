// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {View, Text, Platform, TouchableOpacity, Pressable} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import VoiceAvatar from '@components/voice_channels/voice_avatar';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {Theme} from '@mm-redux/types/theme';

type Props = {
    theme: Theme;
    channelName: string;
    user: {id: string; username: string};
    muted: boolean;
    volume: number;
    onMuteSet: (newMute: boolean) => void;
    onExpand: () => void;
}

const getStyleSheet = makeStyleSheetFromTheme((props: Props) => {
    return {
        wrapper: {
            position: 'absolute',
            top: 60,
            width: '100%',
            height: '100%',
            padding: 10,
        },
        pressable: {
            zIndex: 10,
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
            flexDirection: 'row',
            backgroundColor: '#3F4350',
            width: '100%',
            borderRadius: 5,
            padding: 4,
            height: 64,
            alignItems: 'center',
        },
        userInfo: {
            flex: 1,
        },
        speakingUser: {
            color: props.theme.sidebarText,
            fontWeight: '600',
            fontSize: 16,
        },
        currentChannel: {
            color: props.theme.sidebarText,
            opacity: 0.64,
        },
        micIcon: {
            color: props.theme.sidebarText,
            padding: 8,
            backgroundColor: props.muted ? 'transparent' : '#3DB887',
            borderRadius: 4,
            margin: 4,
        },
        expandIcon: {
            color: props.theme.sidebarText,
            padding: 8,
            marginRight: 8,
        },
    };
});

const FloatingVoiceCall = (props: Props) => {
    const style = getStyleSheet(props);
    return (
        <View style={style.wrapper}>
            <View style={style.container}>
                <VoiceAvatar
                    userId={props.user.id}
                    volume={props.volume}
                />
                <View style={style.userInfo}>
                    <Text style={style.speakingUser}>
                        <FormattedText
                            id='floating_voice_call.user-is-speaking'
                            defaultMessage='User {username} is speaking'
                            values={{username: props.user.username}}
                        />
                    </Text>
                    <Text style={style.currentChannel}>
                        <FormattedText
                            id='floating_voice_call.channel-name'
                            defaultMessage='~{channelName}'
                            values={{channelName: props.channelName}}
                        />
                    </Text>
                </View>
                <Pressable
                    onPressIn={props.onExpand}
                    style={style.pressable}
                >
                    <CompassIcon
                        name='arrow-expand'
                        size={24}
                        style={style.expandIcon}
                    />
                </Pressable>
                <TouchableOpacity
                    onPress={() => props.onMuteSet(!props.muted)}
                    onPressIn={() => props.onMuteSet(!props.muted)}
                    style={style.pressable}
                >
                    <CompassIcon
                        style={style.micIcon}
                        name='cellphone'
                        size={24}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};
export default FloatingVoiceCall;
