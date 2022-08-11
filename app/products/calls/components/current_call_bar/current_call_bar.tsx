// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {View, Text, TouchableOpacity, Pressable, Platform, DeviceEventEmitter} from 'react-native';
import {Options} from 'react-native-navigation';

import {muteMyself, unmuteMyself} from '@calls/actions';
import CallAvatar from '@calls/components/call_avatar';
import {CurrentCall, VoiceEventData} from '@calls/types/calls';
import CompassIcon from '@components/compass_icon';
import {Events, Screens, WebsocketEvents} from '@constants';
import {CURRENT_CALL_BAR_HEIGHT} from '@constants/view';
import {useTheme} from '@context/theme';
import {goToScreen} from '@screens/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {displayUsername} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    displayName: string;
    currentCall: CurrentCall | null;
    userModelsDict: Dictionary<UserModel>;
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
            paddingLeft: 10,
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

const CurrentCallBar = ({
    displayName,
    currentCall,
    userModelsDict,
    teammateNameDisplay,
}: Props) => {
    const theme = useTheme();
    const {formatMessage} = useIntl();
    const [speaker, setSpeaker] = useState<string | null>(null);
    const [talkingMessage, setTalkingMessage] = useState('');

    const isCurrentCall = Boolean(currentCall);
    const handleVoiceOn = (data: VoiceEventData) => {
        if (data.channelId === currentCall?.channelId) {
            setSpeaker(data.userId);
        }
    };
    const handleVoiceOff = (data: VoiceEventData) => {
        if (data.channelId === currentCall?.channelId && ((speaker === data.userId) || !speaker)) {
            setSpeaker(null);
        }
    };

    useEffect(() => {
        const onVoiceOn = DeviceEventEmitter.addListener(WebsocketEvents.CALLS_USER_VOICE_ON, handleVoiceOn);
        const onVoiceOff = DeviceEventEmitter.addListener(WebsocketEvents.CALLS_USER_VOICE_OFF, handleVoiceOff);
        DeviceEventEmitter.emit(Events.CURRENT_CALL_BAR_VISIBLE, isCurrentCall);
        return () => {
            DeviceEventEmitter.emit(Events.CURRENT_CALL_BAR_VISIBLE, Boolean(false));
            onVoiceOn.remove();
            onVoiceOff.remove();
        };
    }, [isCurrentCall]);

    useEffect(() => {
        if (speaker) {
            setTalkingMessage(formatMessage({
                id: 'mobile.calls_name_is_talking',
                defaultMessage: '{name} is talking',
            }, {name: displayUsername(userModelsDict[speaker], teammateNameDisplay)}));
        } else {
            setTalkingMessage(formatMessage({
                id: 'mobile.calls_noone_talking',
                defaultMessage: 'No one is talking',
            }));
        }
    }, [speaker, setTalkingMessage]);

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
        const title = formatMessage({id: 'mobile.calls_call_screen', defaultMessage: 'Call'});
        goToScreen(Screens.CALL, title, {}, options);
    }, []);

    const myParticipant = currentCall?.participants[currentCall.myUserId];

    const muteUnmute = () => {
        if (myParticipant?.muted) {
            unmuteMyself();
        } else {
            muteMyself();
        }
    };

    const style = getStyleSheet(theme);

    return (
        <View style={style.wrapper}>
            <View style={style.container}>
                <CallAvatar
                    userModel={userModelsDict[speaker || '']}
                    volume={speaker ? 0.5 : 0}
                    serverUrl={currentCall?.serverUrl || ''}
                />
                <View style={style.userInfo}>
                    <Text style={style.speakingUser}>{talkingMessage}</Text>
                    <Text style={style.currentChannel}>{`~${displayName}`}</Text>
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
                        name={myParticipant?.muted ? 'microphone-off' : 'microphone'}
                        size={24}
                        style={[style.micIcon, myParticipant?.muted ? style.muted : undefined]}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );
};
export default CurrentCallBar;
