// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {View, Text, Pressable} from 'react-native';

import {joinCall} from '@calls/actions';
import leaveAndJoinWithAlert from '@calls/components/leave_and_join_alert';
import {CurrentCall} from '@calls/types/calls';
import CompassIcon from '@components/compass_icon';
import FormattedRelativeTime from '@components/formatted_relative_time';
import UserAvatarsStack from '@components/user_avatars_stack';
import Screens from '@constants/screens';
import {JOIN_CALL_BAR_HEIGHT} from '@constants/view';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type UserModel from '@typings/database/models/servers/user';

type Props = {
    channelId: string;
    serverUrl: string;
    displayName: string;
    currentCall: CurrentCall | null;
    participants: UserModel[];
    currentCallChannelName: string;
    isCallInCurrentChannel: boolean;
    channelCallStartTime: number;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        container: {
            flexDirection: 'row',
            backgroundColor: '#3DB887',
            width: '100%',
            padding: 5,
            justifyContent: 'center',
            alignItems: 'center',
            height: JOIN_CALL_BAR_HEIGHT,
        },
        joinCallIcon: {
            color: theme.sidebarText,
            marginLeft: 10,
            marginRight: 5,
        },
        joinCall: {
            color: theme.sidebarText,
            fontWeight: 'bold',
            fontSize: 16,
        },
        started: {
            flex: 1,
            color: theme.sidebarText,
            fontWeight: '400',
            marginLeft: 10,
        },
        avatars: {
            marginRight: 5,
        },
        headerText: {
            color: changeOpacity(theme.centerChannelColor, 0.56),
            fontSize: 12,
            fontWeight: '600',
            paddingHorizontal: 16,
            paddingVertical: 0,
            top: 16,
        },
    };
});

const JoinCallBanner = ({
    channelId,
    serverUrl,
    displayName,
    currentCall,
    participants,
    currentCallChannelName,
    isCallInCurrentChannel,
    channelCallStartTime,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);

    if (!isCallInCurrentChannel) {
        return null;
    }

    const confirmToJoin = Boolean(currentCall && currentCall.channelId !== channelId);
    const alreadyInTheCall = Boolean(currentCall && currentCall.channelId === channelId);

    if (alreadyInTheCall) {
        return null;
    }

    const joinHandler = async () => {
        leaveAndJoinWithAlert(intl, serverUrl, channelId, currentCallChannelName, displayName, confirmToJoin, joinCall);
    };

    return (
        <Pressable
            style={style.container}
            onPress={joinHandler}
        >
            <CompassIcon
                name='phone-in-talk'
                size={16}
                style={style.joinCallIcon}
            />
            <Text style={style.joinCall}>{'Join Call'}</Text>
            <Text style={style.started}>
                <FormattedRelativeTime
                    value={channelCallStartTime}
                    updateIntervalInSeconds={1}
                />
            </Text>
            <View style={style.avatars}>
                <UserAvatarsStack
                    channelId={channelId}
                    location={Screens.CHANNEL}
                    users={participants}
                    breakAt={1}
                />
            </View>
        </Pressable>
    );
};

export default JoinCallBanner;
