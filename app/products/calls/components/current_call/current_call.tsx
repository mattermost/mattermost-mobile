// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect} from 'react';
import {View, Text, TouchableOpacity, Pressable, Platform} from 'react-native';
import {Options} from 'react-native-navigation';

import {goToScreen} from '@actions/navigation';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import ViewTypes, {CURRENT_CALL_BAR_HEIGHT} from '@constants/view';
import {GenericAction} from '@mm-redux/types/actions';
import EventEmitter from '@mm-redux/utils/event_emitter';
import {displayUsername} from '@mm-redux/utils/user_utils';
import CallAvatar from '@mmproducts/calls/components/call_avatar';
import {makeStyleSheetFromTheme} from '@utils/theme';

import type {Channel} from '@mm-redux/types/channels';
import type {Theme} from '@mm-redux/types/theme';
import type {UserProfile} from '@mm-redux/types/users';
import type {Call, CallParticipant} from '@mmproducts/calls/store/types/calls';

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
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        wrapper: {
            padding: 10,
        },
        container: {
            flexDirection: 'row',
            backgroundColor: '#3F4350',
            width: '100%',
            borderRadius: 5,
            padding: 4,
            height: CURRENT_CALL_BAR_HEIGHT - 10,
            alignItems: 'center',
        },
        pressable: {
            zIndex: 10,
        },
        userInfo: {
            flex: 1,
        },
        speakingUser: {
            color: theme.sidebarText,
            fontWeight: '600',
            fontSize: 16,
        },
        currentChannel: {
            color: theme.sidebarText,
            opacity: 0.64,
        },
        micIcon: {
            color: theme.sidebarText,
            width: 42,
            height: 42,
            textAlign: 'center',
            textAlignVertical: 'center',
            justifyContent: 'center',
            backgroundColor: '#3DB887',
            borderRadius: 4,
            margin: 4,
            padding: 9,
            overflow: 'hidden',
        },
        muted: {
            backgroundColor: 'transparent',
        },
        expandIcon: {
            color: theme.sidebarText,
            padding: 8,
            marginRight: 8,
        },
    };
});

const CurrentCall = (props: Props) => {
    useEffect(() => {
        EventEmitter.emit(ViewTypes.CURRENT_CALL_BAR_VISIBLE, Boolean(props.call));
        return () => {
            EventEmitter.emit(ViewTypes.CURRENT_CALL_BAR_VISIBLE, Boolean(false));
        };
    }, [props.call]);

    const goToCallScreen = useCallback(() => {
        const options: Options = {
            layout: {
                backgroundColor: '#000',
                componentBackgroundColor: '#000',
                orientation: ['portrait', 'landscape'],
            },
            topBar: {
                background: {
                    color: '#000',
                },
                visible: Platform.OS === 'android',
            },
        };
        goToScreen('Call', 'Call', {}, options);
    }, []);

    const muteUnmute = useCallback(() => {
        if (props.currentParticipant?.muted) {
            props.actions.unmuteMyself(props.call.channelId);
        } else {
            props.actions.muteMyself(props.call.channelId);
        }
    }, [props.currentParticipant?.muted]);

    if (!props.call) {
        return null;
    }

    const style = getStyleSheet(props.theme);
    return (
        <View style={style.wrapper}>
            <View style={style.container}>
                <CallAvatar
                    userId={props.speaker?.id}
                    volume={props.speaker?.isTalking ? 0.5 : 0}
                />
                <View style={style.userInfo}>
                    <Text style={style.speakingUser}>
                        <FormattedText
                            id='current_call.user-is-speaking'
                            defaultMessage='{username} is speaking'
                            values={{username: displayUsername(props.speakerUser, props.teammateNameDisplay)}}
                        />
                    </Text>
                    <Text style={style.currentChannel}>
                        <FormattedText
                            id='current_call.channel-name'
                            defaultMessage='~{channelName}'
                            values={{channelName: props.channel.display_name}}
                        />
                    </Text>
                </View>
                <Pressable
                    onPressIn={goToCallScreen}
                    style={style.pressable}
                >
                    <CompassIcon
                        name='arrow-expand'
                        size={24}
                        style={style.expandIcon}
                    />
                </Pressable>
                <TouchableOpacity
                    onPress={muteUnmute}
                    style={style.pressable}
                >
                    <CompassIcon
                        name={props.currentParticipant?.muted ? 'microphone-off' : 'microphone'}
                        size={24}
                        style={[style.micIcon, props.currentParticipant?.muted ? style.muted : undefined]}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};
export default CurrentCall;
