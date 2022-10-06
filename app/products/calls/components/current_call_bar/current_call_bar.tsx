// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useEffect, useState} from 'react';
import {useIntl} from 'react-intl';
import {View, Text, TouchableOpacity, Pressable, Platform, DeviceEventEmitter} from 'react-native';
import {Options} from 'react-native-navigation';
import Permissions from 'react-native-permissions';

import {muteMyself, unmuteMyself} from '@calls/actions';
import CallAvatar from '@calls/components/call_avatar';
import UnavailableIconWrapper from '@calls/components/unavailable_icon_wrapper';
import {setMicPermissionsErrorDismissed} from '@calls/state';
import {CurrentCall, VoiceEventData} from '@calls/types/calls';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {Events, Screens, WebsocketEvents} from '@constants';
import {CALL_ERROR_BAR_HEIGHT, CURRENT_CALL_BAR_HEIGHT} from '@constants/view';
import {useTheme} from '@context/theme';
import {goToScreen} from '@screens/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    displayName: string;
    currentCall: CurrentCall | null;
    userModelsDict: Dictionary<UserModel>;
    teammateNameDisplay: string;
    micPermissionsGranted: boolean;
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
        micIconContainer: {
            width: 42,
            height: 42,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#3DB887',
            borderRadius: 4,
            margin: 4,
            padding: 9,
        },
        micIcon: {
            color: theme.sidebarText,
        },
        muted: {
            backgroundColor: 'transparent',
        },
        expandIcon: {
            color: theme.sidebarText,
            padding: 8,
            marginRight: 8,
        },
        errorWrapper: {
            padding: 10,
            paddingTop: 0,
        },
        errorBar: {
            flexDirection: 'row',
            backgroundColor: theme.dndIndicator,
            height: CALL_ERROR_BAR_HEIGHT,
            width: '100%',
            borderRadius: 5,
            padding: 10,
            alignItems: 'center',
        },
        errorText: {
            flex: 1,
            ...typography('Body', 100, 'SemiBold'),
            color: '#ffffff',
        },
        errorIcon: {
            color: '#ffffff',
            fontSize: 18,
        },
        pressableIcon: {
            padding: 9,
        },
    };
});

const CurrentCallBar = ({
    displayName,
    currentCall,
    userModelsDict,
    teammateNameDisplay,
    micPermissionsGranted,
}: Props) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
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

    const goToSettings = useCallback(() => {
        Permissions.openSettings();
    }, []);

    const dismissPermissionsError = useCallback(() => {
        setMicPermissionsErrorDismissed();
    }, []);

    const micPermissionsError = !micPermissionsGranted && !currentCall?.micPermissionsErrorDismissed;

    return (
        <>
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
                        style={[style.pressable, style.micIconContainer, myParticipant?.muted && style.muted]}
                        disabled={!micPermissionsGranted}
                    >
                        <UnavailableIconWrapper
                            name={myParticipant?.muted ? 'microphone-off' : 'microphone'}
                            size={24}
                            unavailable={!micPermissionsGranted}
                            style={[style.micIcon]}
                        />
                    </TouchableOpacity>
                </View>
            </View>
            {micPermissionsError &&
                <View style={style.errorWrapper}>
                    <Pressable onPress={goToSettings}>
                        <View style={style.errorBar}>
                            <CompassIcon
                                name='microphone-off'
                                style={[style.errorIcon, {paddingRight: 9}]}
                            />
                            <FormattedText
                                id={'mobile.calls_mic_error'}
                                defaultMessage={'To participate, open Settings to grant Mattermost access to your microphone.'}
                                style={style.errorText}
                            />
                            <Pressable
                                onPress={dismissPermissionsError}
                                hitSlop={20}
                                style={style.pressable}
                            >
                                <CompassIcon
                                    name='close'
                                    style={[style.errorIcon, style.pressableIcon]}
                                />
                            </Pressable>
                        </View>
                    </Pressable>
                </View>
            }
        </>
    );
};

export default CurrentCallBar;
