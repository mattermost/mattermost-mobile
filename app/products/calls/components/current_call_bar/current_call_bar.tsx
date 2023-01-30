// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {View, Text, TouchableOpacity, Pressable, Platform} from 'react-native';

import {muteMyself, unmuteMyself} from '@calls/actions';
import {recordingAlert, recordingWillBePostedAlert, recordingErrorAlert} from '@calls/alerts';
import CallAvatar from '@calls/components/call_avatar';
import PermissionErrorBar from '@calls/components/permission_error_bar';
import UnavailableIconWrapper from '@calls/components/unavailable_icon_wrapper';
import {usePermissionsChecker} from '@calls/hooks';
import CompassIcon from '@components/compass_icon';
import {Screens} from '@constants';
import {CURRENT_CALL_BAR_HEIGHT} from '@constants/view';
import {useTheme} from '@context/theme';
import {allOrientations, dismissAllModalsAndPopToScreen} from '@screens/navigation';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {displayUsername} from '@utils/user';

import type {CurrentCall} from '@calls/types/calls';
import type UserModel from '@typings/database/models/servers/user';
import type {Options} from 'react-native-navigation';

type Props = {
    displayName: string;
    currentCall: CurrentCall | null;
    userModelsDict: Dictionary<UserModel>;
    teammateNameDisplay: string;
    micPermissionsGranted: boolean;
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
        micIconContainer: {
            width: 42,
            height: 42,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.onlineIndicator,
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
    };
});

const CurrentCallBar = ({
    displayName,
    currentCall,
    userModelsDict,
    teammateNameDisplay,
    micPermissionsGranted,
    threadScreen,
}: Props) => {
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const intl = useIntl();
    const {formatMessage} = intl;
    usePermissionsChecker(micPermissionsGranted);

    const goToCallScreen = useCallback(async () => {
        const options: Options = {
            layout: {
                backgroundColor: '#000',
                componentBackgroundColor: '#000',
                orientation: allOrientations,
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
        }, {name: displayUsername(userModelsDict[speaker], intl.locale, teammateNameDisplay)});
    }

    const muteUnmute = () => {
        if (myParticipant?.muted) {
            unmuteMyself();
        } else {
            muteMyself();
        }
    };

    const micPermissionsError = !micPermissionsGranted && !currentCall?.micPermissionsErrorDismissed;

    // The user should receive an alert if all of the following conditions apply:
    // - Recording has started and recording has not ended.
    const isHost = Boolean(currentCall?.hostId === myParticipant?.id);
    if (currentCall?.recState?.start_at && !currentCall?.recState?.end_at) {
        recordingAlert(isHost, intl);
    }

    // The user should receive a recording finished alert if all of the following conditions apply:
    // - Is the host, recording has started, and recording has ended
    if (isHost && currentCall?.recState?.start_at && currentCall.recState.end_at) {
        recordingWillBePostedAlert(intl);
    }

    // The host should receive an alert in case of unexpected error.
    if (isHost && currentCall?.recState?.err) {
        recordingErrorAlert(intl);
    }

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
            {micPermissionsError && <PermissionErrorBar/>}
        </>
    );
};

export default CurrentCallBar;
