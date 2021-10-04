// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {View, Text, Platform, TouchableOpacity, Pressable} from 'react-native';
import FontAwesome5Icon from 'react-native-vector-icons/FontAwesome5';

import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import VoiceAvatar from '@components/voice_channels/voice_avatar';
import {GenericAction} from '@mm-redux/types/actions';
import {displayUsername} from '@mm-redux/utils/user_utils';
import {makeStyleSheetFromTheme} from '@utils/theme';

// import {newClient} from '@utils/voice_calls_connection';

import type {Channel} from '@mm-redux/types/channels';
import type {Theme} from '@mm-redux/types/theme';
import type {UserProfile} from '@mm-redux/types/users';
import type {Call, CallParticipant} from '@mm-redux/types/voiceCalls';

type Props = {
    actions: {
        muteMyself: (channelId: string) => GenericAction;
        unmuteMyself: (channelId: string) => GenericAction;
    };
    theme: Theme;
    channel: Channel;
    speaker: CallParticipant;
    speakerUser: UserProfile;
    call: Call;
    currentParticipant: CallParticipant;
    teammateNameDisplay: string;
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
            width: 42,
            height: 42,
            textAlign: 'center',
            textAlignVertical: 'center',
            justifyContent: 'center',
            backgroundColor: props.currentParticipant?.muted ? 'transparent' : '#3DB887',
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
    if (!props.call) {
        return null;
    }

    const style = getStyleSheet(props);
    return (
        <View style={style.wrapper}>
            <View style={style.container}>
                <VoiceAvatar
                    userId={props.speaker?.id}
                    volume={props.speaker?.isTalking ? 0.5 : 0}
                />
                <View style={style.userInfo}>
                    <Text style={style.speakingUser}>
                        <FormattedText
                            id='floating_voice_call.user-is-speaking'
                            defaultMessage='{username} is speaking'
                            values={{username: displayUsername(props.speakerUser, props.teammateNameDisplay)}}
                        />
                    </Text>
                    <Text style={style.currentChannel}>
                        <FormattedText
                            id='floating_voice_call.channel-name'
                            defaultMessage='~{channelName}'
                            values={{channelName: props.channel.display_name}}
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
                    onPress={useCallback(() => {
                        if (props.currentParticipant?.muted) {
                            props.actions.unmuteMyself(props.call.channelId);
                        } else {
                            props.actions.muteMyself(props.call.channelId);
                        }
                    }, [props.currentParticipant?.muted])}
                    style={style.pressable}
                >
                    <FontAwesome5Icon
                        name={props.currentParticipant?.muted ? 'microphone-slash' : 'microphone'}
                        size={24}
                        style={style.micIcon}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};
export default FloatingVoiceCall;
