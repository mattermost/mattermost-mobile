// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {View, Pressable} from 'react-native';

import {dismissIncomingCall} from '@calls/actions';
import {leaveAndJoinWithAlert, showLimitRestrictedAlert} from '@calls/alerts';
import {removeIncomingCall} from '@calls/state';
import CompassIcon from '@components/compass_icon';
import FormattedRelativeTime from '@components/formatted_relative_time';
import FormattedText from '@components/formatted_text';
import UserAvatarsStack from '@components/user_avatars_stack';
import Screens from '@constants/screens';
import {JOIN_CALL_BAR_HEIGHT} from '@constants/view';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

import type {LimitRestrictedInfo} from '@calls/observers';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    channelId: string;
    callId: string;
    serverUrl: string;
    participants: UserModel[];
    channelCallStartTime: number;
    limitRestrictedInfo: LimitRestrictedInfo;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    outerContainer: {
        borderRadius: 8,
        height: JOIN_CALL_BAR_HEIGHT,
        marginTop: 8,
        marginRight: 8,
        marginLeft: 8,
    },
    innerContainer: {
        flexDirection: 'row',
        backgroundColor: '#339970', // intentionally not themed
        width: '100%',
        height: '100%',
        borderRadius: 8,
        borderWidth: 2,
        borderColor: changeOpacity(theme.buttonColor, 0.16),
        paddingTop: 4,
        paddingBottom: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    innerContainerRestricted: {
        backgroundColor: changeOpacity(theme.centerChannelColor, 0.48),
    },
    joinCallIcon: {
        color: theme.buttonColor,
        marginLeft: 15,
        marginRight: 13,
    },
    joinCall: {
        color: theme.buttonColor,
        ...typography('Body', 100, 'SemiBold'),
    },
    started: {
        flex: 1,
        color: changeOpacity(theme.buttonColor, 0.80),
        ...typography(),
        marginLeft: 6,
    },
    limitReached: {
        flex: 1,
        display: 'flex',
        textAlign: 'right',
        marginRight: 10,
        color: changeOpacity(theme.sidebarText, 0.84),
        fontWeight: '400',
    },
    headerText: {
        color: changeOpacity(theme.centerChannelColor, 0.56),
        fontSize: 12,
        fontWeight: '600',
        paddingHorizontal: 16,
        paddingVertical: 0,
        top: 16,
    },
    avatarStyle: {
        borderColor: '#339970',
        backgroundColor: '#339970',
    },
    overflowContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: (24 / 2),
        borderColor: '#339970',
        backgroundColor: '#339970',
        borderRadius: 24 / 2,
        marginTop: 1,
    },
    overflowItem: {
        width: 26,
        height: 26,
        borderRadius: 26 / 2,
        borderWidth: 1,
        borderColor: '#339970',
        backgroundColor: changeOpacity(theme.buttonColor, 0.24),
    },
    overflowText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: changeOpacity(theme.buttonColor, 0.80),
        textAlign: 'center',
    },
    closeIcon: {
        color: changeOpacity(theme.buttonColor, 0.56),
        paddingLeft: 10,
        paddingRight: 10,
        paddingTop: 4,
        paddingBottom: 4,
    },
}));

const JoinCallBanner = ({
    channelId,
    callId,
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

    const onDismissPress = () => {
        removeIncomingCall(serverUrl, callId, channelId);
        dismissIncomingCall(serverUrl, channelId);
    };

    return (
        <View style={style.outerContainer}>
            <Pressable
                style={[style.innerContainer, isLimitRestricted && style.innerContainerRestricted]}
                onPress={joinHandler}
            >
                <CompassIcon
                    name='phone-in-talk'
                    size={18}
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
                <UserAvatarsStack
                    channelId={channelId}
                    location={Screens.CHANNEL}
                    users={participants}
                    breakAt={3}
                    avatarStyle={style.avatarStyle}
                    overflowContainerStyle={style.overflowContainer}
                    overflowItemStyle={style.overflowItem}
                    overflowTextStyle={style.overflowText}
                />
                <Pressable onPress={onDismissPress}>
                    <CompassIcon
                        name='close'
                        size={18}
                        style={style.closeIcon}
                    />
                </Pressable>
            </Pressable>
        </View>
    );
};

export default JoinCallBanner;
