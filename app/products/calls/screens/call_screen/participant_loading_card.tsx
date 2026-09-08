// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {useIntl} from 'react-intl';
import {Text} from 'react-native';
import Animated from 'react-native-reanimated';

import CallAvatar from '@calls/components/call_avatar';
import {useCallingPulseAnimationStyle} from '@calls/hooks';
import {avatarL, avatarM, usernameL, usernameM} from '@calls/screens/call_screen/call_screen';
import {makeCallsTheme} from '@calls/utils';
import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername} from '@utils/user';

import type {CallsTheme} from '@calls/types/calls';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    callee?: UserModel;
    smallerAvatar: boolean;
    teammateNameDisplay: string;
    serverUrl: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: CallsTheme) => ({
    user: {
        flexDirection: 'column',
        alignItems: 'center',
        margin: 4,
        padding: 12,
        borderRadius: 8,
    },
    username: {
        width: usernameL,
        textAlign: 'center',
        color: theme.buttonColor,
        ...typography('Body', 100, 'SemiBold'),
    },
    usernameShort: {
        width: usernameM,
    },
}));

/**
 * The card for the person we're calling, who has no session in the call until they answer. It
 * pulses to show we're waiting on them; no mic state is shown, since they have none yet.
 */
export const ParticipantLoadingCard = ({callee, smallerAvatar, teammateNameDisplay, serverUrl}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const callsTheme = useMemo(() => makeCallsTheme(theme), [theme]);
    const style = getStyleSheet(callsTheme);
    const callingPulseAnimationStyle = useCallingPulseAnimationStyle(true);

    return (
        <Animated.View
            testID='calls.calling_participant'
            style={[style.user, callingPulseAnimationStyle]}
        >
            <CallAvatar
                userModel={callee}
                size={smallerAvatar ? avatarM : avatarL}
                serverUrl={serverUrl}
            />
            <Text
                style={[style.username, smallerAvatar && style.usernameShort]}
                numberOfLines={1}
            >
                {displayUsername(callee, intl.locale, teammateNameDisplay)}
            </Text>
        </Animated.View>
    );
};
