// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {View, Pressable} from 'react-native';

import {leaveAndJoinWithAlert, showLimitRestrictedAlert} from '@calls/alerts';
import CompassIcon from '@components/compass_icon';
import FormattedRelativeTime from '@components/formatted_relative_time';
import FormattedText from '@components/formatted_text';
import UserAvatarsStack from '@components/user_avatars_stack';
import Screens from '@constants/screens';
import {JOIN_CALL_BAR_HEIGHT} from '@constants/view';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {LimitRestrictedInfo} from '@calls/observers';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    channelId: string;
    serverUrl: string;
    participants: UserModel[];
    channelCallStartTime: number;
    limitRestrictedInfo: LimitRestrictedInfo;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    outerContainer: {
        backgroundColor: theme.centerChannelBg,
    },
    innerContainer: {
        flexDirection: 'row',
        backgroundColor: '#3DB887',
        width: '100%',
        padding: 5,
        justifyContent: 'center',
        alignItems: 'center',
        height: JOIN_CALL_BAR_HEIGHT,
    },
    innerContainerRestricted: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.48),
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
    limitReached: {
        flex: 1,
        display: 'flex',
        textAlign: 'right',
        marginRight: 10,
        color: '#FFFFFFD6',
        fontWeight: '400',
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
}));

const JoinCallBanner = ({
    channelId,
    serverUrl,
    participants,
    channelCallStartTime,
    limitRestrictedInfo,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const isLimitRestricted = limitRestrictedInfo.limitRestricted;

    const joinHandler = async () => {
        if (isLimitRestricted) {
            showLimitRestrictedAlert(limitRestrictedInfo, intl);
            return;
        }
        leaveAndJoinWithAlert(intl, serverUrl, channelId);
    };

    return (
        <View style={style.outerContainer}>
            <Pressable
                style={[style.innerContainer, isLimitRestricted && style.innerContainerRestricted]}
                onPress={joinHandler}
            >
                <CompassIcon
                    name='phone-in-talk'
                    size={16}
                    style={style.joinCallIcon}
                />
                <FormattedText
                    id={'mobile.calls_join_call'}
                    defaultMessage={'Join call'}
                    style={style.joinCall}
                />
                {isLimitRestricted ? (
                    <FormattedText
                        id={'mobile.calls_limit_reached'}
                        defaultMessage={'Participant limit reached'}
                        style={style.limitReached}
                    />
                ) : (
                    <FormattedRelativeTime
                        value={channelCallStartTime}
                        updateIntervalInSeconds={1}
                        style={style.started}
                    />
                )}
                <View style={style.avatars}>
                    <UserAvatarsStack
                        channelId={channelId}
                        location={Screens.CHANNEL}
                        users={participants}
                        breakAt={1}
                    />
                </View>
            </Pressable>
        </View>
    );
};

export default JoinCallBanner;
