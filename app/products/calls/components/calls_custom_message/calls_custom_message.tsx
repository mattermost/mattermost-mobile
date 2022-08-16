// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import React from 'react';
import {useIntl} from 'react-intl';
import {Text, TouchableOpacity, View} from 'react-native';

import {showLimitRestrictedAlert} from '@calls/alerts';
import leaveAndJoinWithAlert from '@calls/components/leave_and_join_alert';
import CompassIcon from '@components/compass_icon';
import FormattedRelativeTime from '@components/formatted_relative_time';
import FormattedText from '@components/formatted_text';
import FormattedTime from '@components/formatted_time';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {displayUsername, getUserTimezone} from '@utils/user';

import type {LimitRestrictedInfo} from '@calls/observers';
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
    limitRestrictedInfo?: LimitRestrictedInfo;
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
        joinCallButtonTextRestricted: {
            color: changeOpacity(theme.centerChannelColor, 0.32),
        },
        joinCallButtonIcon: {
            color: 'white',
            marginRight: 5,
        },
        joinCallButtonIconRestricted: {
            color: changeOpacity(theme.centerChannelColor, 0.32),
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
        joinCallButtonRestricted: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
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
    currentCallChannelId, leaveChannelName, joinChannelName, limitRestrictedInfo,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const timezone = getUserTimezone(currentUser);

    const confirmToJoin = Boolean(currentCallChannelId && currentCallChannelId !== post.channelId);
    const alreadyInTheCall = Boolean(currentCallChannelId && currentCallChannelId === post.channelId);
    const isLimitRestricted = Boolean(limitRestrictedInfo?.limitRestricted);

    const joinHandler = () => {
        if (alreadyInTheCall) {
            return;
        }

        if (isLimitRestricted) {
            showLimitRestrictedAlert(limitRestrictedInfo!.maxParticipants, intl);
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
                    <FormattedText
                        id={'mobile.calls_call_ended'}
                        defaultMessage={'Call ended'}
                        style={style.startedText}
                    />
                    <View style={style.endCallInfo}>
                        <FormattedText
                            id={'mobile.calls_ended_at'}
                            defaultMessage={'Ended at'}
                            style={style.timeText}
                        />
                        <Text>{' '}</Text>
                        {
                            <FormattedTime
                                style={style.timeText}
                                value={post.props.end_at}
                                isMilitaryTime={isMilitaryTime}
                                timezone={timezone}
                            />
                        }
                        <Text style={style.separator}>{'•'}</Text>
                        <FormattedText
                            id={'mobile.calls_lasted'}
                            defaultMessage={'Lasted {duration}'}
                            values={{duration: moment.duration(post.props.end_at - post.props.start_at).humanize(false)}}
                            style={style.timeText}
                        />
                    </View>
                </View>
            </View>
        );
    }

    const joinTextStyle = [style.joinCallButtonText, isLimitRestricted && style.joinCallButtonTextRestricted];
    return (
        <View style={style.messageStyle}>
            <CompassIcon
                name='phone-in-talk'
                size={16}
                style={style.joinCallIcon}
            />
            <View style={style.messageText}>
                <FormattedText
                    id={'mobile.calls_name_started_call'}
                    defaultMessage={'{name} started a call'}
                    values={{name: displayUsername(author, intl.locale, teammateNameDisplay)}}
                    style={style.startedText}
                />
                <FormattedRelativeTime
                    value={post.props.start_at}
                    updateIntervalInSeconds={1}
                    style={style.timeText}
                />
            </View>

            <TouchableOpacity
                style={[style.joinCallButton, isLimitRestricted && style.joinCallButtonRestricted]}
                onPress={joinHandler}
            >
                <CompassIcon
                    name='phone-outline'
                    size={16}
                    style={[style.joinCallButtonIcon, isLimitRestricted && style.joinCallButtonIconRestricted]}
                />
                {
                    alreadyInTheCall &&
                    <FormattedText
                        id={'mobile.calls_current_call'}
                        defaultMessage={'Current call'}
                        style={joinTextStyle}
                    />
                }
                {
                    !alreadyInTheCall &&
                    <FormattedText
                        id={'mobile.calls_join_call'}
                        defaultMessage={'Join call'}
                        style={joinTextStyle}
                    />
                }
            </TouchableOpacity>
        </View>
    );
};

