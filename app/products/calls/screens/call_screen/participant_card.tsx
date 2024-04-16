// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Pressable, Text, View} from 'react-native';

import CallAvatar from '@calls/components/call_avatar';
import CallsBadge, {CallsBadgeType} from '@calls/components/calls_badge';
import {avatarL, avatarM, usernameL, usernameM} from '@calls/screens/call_screen/call_screen';
import {useCurrentCall} from '@calls/state';
import {makeCallsTheme} from '@calls/utils';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername} from '@utils/user';

import type {CallSession, CallsTheme} from '@calls/types/calls';

type Props = {
    session: CallSession;
    smallerAvatar: boolean;
    teammateNameDisplay: string;
    onPress: () => void;
    onLongPress: () => void;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: CallsTheme) => ({
    user: {
        flexDirection: 'column',
        alignItems: 'center',
        margin: 4,
        padding: 12,
        borderRadius: 8,
    },
    pressed: {
        backgroundColor: changeOpacity(theme.sidebarText, 0.08),
    },
    userScreenOn: {
        marginTop: 5,
        marginBottom: 0,
    },
    profileScreenOn: {
        marginBottom: 2,
    },
    username: {
        width: usernameL,
        textAlign: 'center',
        color: theme.buttonColor,
        ...typography('Body', 100, 'SemiBold'),
    },
    usernameShort: {
        marginTop: 0,
        width: usernameM,
    },
}));

export const ParticipantCard = ({session, smallerAvatar, teammateNameDisplay, onPress, onLongPress}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const currentCall = useCurrentCall();
    const callsTheme = useMemo(() => makeCallsTheme(theme), [theme]);
    const style = getStyleSheet(callsTheme);

    const mySession = currentCall?.sessions[currentCall.mySessionId];
    const screenShareOn = Boolean(currentCall?.screenOn);
    const avatarSize = smallerAvatar ? avatarM : avatarL;

    if (!currentCall || !mySession) {
        return null;
    }

    return (
        <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
        >
            {({pressed}) => (
                <View
                    style={[style.user, pressed && style.pressed, screenShareOn && style.userScreenOn]}
                    key={session.sessionId}
                >
                    <View style={[screenShareOn && style.profileScreenOn]}>
                        <CallAvatar
                            userModel={session.userModel}
                            speaking={currentCall.voiceOn[session.sessionId]}
                            muted={session.muted}
                            sharingScreen={session.sessionId === currentCall.screenOn}
                            raisedHand={Boolean(session.raisedHand)}
                            reaction={session.reaction?.emoji}
                            size={avatarSize}
                            serverUrl={currentCall.serverUrl}
                        />
                    </View>
                    <Text
                        style={[style.username, smallerAvatar && style.usernameShort]}
                        numberOfLines={1}
                    >
                        {displayUsername(session.userModel, intl.locale, teammateNameDisplay)}
                        {session.sessionId === mySession.sessionId &&
                            ` ${intl.formatMessage({id: 'mobile.calls_you', defaultMessage: '(you)'})}`
                        }
                    </Text>
                    {session.userId === currentCall.hostId && <CallsBadge type={CallsBadgeType.Host}/>}
                </View>
            )}
        </Pressable>
    );
};
