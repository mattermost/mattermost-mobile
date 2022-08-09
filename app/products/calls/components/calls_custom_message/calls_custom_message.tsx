// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import React from 'react';
import {useIntl} from 'react-intl';
import {Text, TouchableOpacity, View} from 'react-native';

import leaveAndJoinWithAlert from '@calls/components/leave_and_join_alert';
import CompassIcon from '@components/compass_icon';
import FormattedRelativeTime from '@components/formatted_relative_time';
import FormattedTime from '@components/formatted_time';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {displayUsername, getUserTimezone} from '@utils/user';

import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    post: PostModel;
    currentUser: UserModel;
    author?: UserModel;
    isMilitaryTime: boolean;
    teammateNameDisplay?: string;
    currentCallChannelId?: string;
    leaveChannelName?: string;
    joinChannelName?: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        messageStyle: {
            flexDirection: 'row',
            color: changeOpacity(theme.centerChannelColor, 0.6),
            fontSize: 15,
            lineHeight: 20,
            paddingTop: 5,
            paddingBottom: 5,
        },
        messageText: {
            flex: 1,
        },
        joinCallIcon: {
            padding: 12,
            backgroundColor: '#339970',
            borderRadius: 8,
            marginRight: 5,
            color: 'white',
            overflow: 'hidden',
        },
        phoneHangupIcon: {
            padding: 12,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.6),
            borderRadius: 8,
            marginRight: 5,
            color: 'white',
            overflow: 'hidden',
        },
        joinCallButtonText: {
            color: 'white',
        },
        joinCallButtonIcon: {
            color: 'white',
            marginRight: 5,
        },
        startedText: {
            color: theme.centerChannelColor,
            fontWeight: 'bold',
        },
        joinCallButton: {
            flexDirection: 'row',
            padding: 12,
            backgroundColor: '#339970',
            borderRadius: 8,
            alignItems: 'center',
            alignContent: 'center',
        },
        timeText: {
            color: theme.centerChannelColor,
        },
        endCallInfo: {
            flexDirection: 'row',
            alignItems: 'center',
            alignContent: 'center',
        },
        separator: {
            color: theme.centerChannelColor,
            marginLeft: 5,
            marginRight: 5,
        },
    };
});

export const CallsCustomMessage = ({
    post, currentUser, author, isMilitaryTime, teammateNameDisplay,
    currentCallChannelId, leaveChannelName, joinChannelName,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const timezone = getUserTimezone(currentUser);

    const confirmToJoin = Boolean(currentCallChannelId && currentCallChannelId !== post.channelId);
    const alreadyInTheCall = Boolean(currentCallChannelId && currentCallChannelId === post.channelId);

    const joinHandler = () => {
        if (alreadyInTheCall) {
            return;
        }

        leaveAndJoinWithAlert(intl, serverUrl, post.channelId, leaveChannelName || '', joinChannelName || '', confirmToJoin, false);
    };

    if (post.props.end_at) {
        return (
            <View style={style.messageStyle}>
                <CompassIcon
                    name='phone-hangup'
                    size={16}
                    style={style.phoneHangupIcon}
                />
                <View style={style.messageText}>
                    <Text style={style.startedText}>{'Call ended'}</Text>
                    <View style={style.endCallInfo}>
                        <Text style={style.timeText}>{'Ended at '}</Text>
                        {
                            <FormattedTime
                                value={post.props.end_at}
                                isMilitaryTime={isMilitaryTime}
                                timezone={timezone}
                            />
                        }
                        <Text style={style.separator}>{'•'}</Text>
                        <Text style={style.timeText}>
                            {`Lasted ${moment.duration(post.props.end_at - post.props.start_at).humanize(false)}`}
                        </Text>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={style.messageStyle}>
            <CompassIcon
                name='phone-in-talk'
                size={16}
                style={style.joinCallIcon}
            />
            <View style={style.messageText}>
                <Text style={style.startedText}>
                    {`${displayUsername(author, intl.locale, teammateNameDisplay)} started a call`}
                </Text>
                <FormattedRelativeTime
                    value={post.props.start_at}
                    updateIntervalInSeconds={1}
                    style={style.timeText}
                />
            </View>

            <TouchableOpacity
                style={style.joinCallButton}
                onPress={joinHandler}
            >
                <CompassIcon
                    name='phone-outline'
                    size={16}
                    style={style.joinCallButtonIcon}
                />
                {
                    alreadyInTheCall &&
                    <Text style={style.joinCallButtonText}>{'Current call'}</Text>
                }
                {
                    !alreadyInTheCall &&
                    <Text style={style.joinCallButtonText}>{'Join call'}</Text>
                }
            </TouchableOpacity>
        </View>
    );
};

