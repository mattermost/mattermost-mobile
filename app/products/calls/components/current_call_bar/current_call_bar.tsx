// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {View, Text, TouchableOpacity, Pressable, Platform} from 'react-native';
import {Options} from 'react-native-navigation';

import {muteMyself, unmuteMyself} from '@calls/actions';
import CallAvatar from '@calls/components/call_avatar';
import {CurrentCall} from '@calls/types/calls';
import CompassIcon from '@components/compass_icon';
import {Screens} from '@constants';
import {CURRENT_CALL_BAR_HEIGHT} from '@constants/view';
import {useTheme} from '@context/theme';
import {dismissAllModalsAndPopToScreen} from '@screens/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {displayUsername} from '@utils/user';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    displayName: string;
    currentCall: CurrentCall | null;
    userModelsDict: Dictionary<UserModel>;
    teammateNameDisplay: string;
    threadScreen?: boolean;
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
    threadScreen,
}: Props) => {
    const theme = useTheme();
    const {formatMessage} = useIntl();

    const goToCallScreen = useCallback(async () => {
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
        await dismissAllModalsAndPopToScreen(Screens.CALL, title, {fromThreadScreen: threadScreen}, options);
    }, [formatMessage, threadScreen]);

    const myParticipant = currentCall?.participants[currentCall.myUserId];

    // Since we can only see one user talking, it doesn't really matter who we show here (e.g., we can't
    // tell who is speaking louder).
    const talkingUsers = Object.keys(currentCall?.voiceOn || {});
    const speaker = talkingUsers.length > 0 ? talkingUsers[0] : '';
    let talkingMessage = formatMessage({
        id: 'mobile.calls_noone_talking',
        defaultMessage: 'No one is talking',
    });
    if (speaker) {
        talkingMessage = formatMessage({
            id: 'mobile.calls_name_is_talking',
            defaultMessage: '{name} is talking',
        }, {name: displayUsername(userModelsDict[speaker], teammateNameDisplay)});
    }

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
