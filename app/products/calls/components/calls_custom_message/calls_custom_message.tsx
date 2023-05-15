// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import React from 'react';
import {useIntl} from 'react-intl';
import {Text, TouchableOpacity, View} from 'react-native';

import {leaveAndJoinWithAlert, showLimitRestrictedAlert} from '@calls/alerts';
import CompassIcon from '@components/compass_icon';
import FormattedRelativeTime from '@components/formatted_relative_time';
import FormattedText from '@components/formatted_text';
import FormattedTime from '@components/formatted_time';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername, getUserTimezone} from '@utils/user';

import type {LimitRestrictedInfo} from '@calls/observers';
import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    post: PostModel;
    currentUser?: UserModel;
    author?: UserModel;
    isMilitaryTime: boolean;
    teammateNameDisplay?: string;
    limitRestrictedInfo?: LimitRestrictedInfo;
    ccChannelId?: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => {
    return {
        title: {
            ...typography('Heading', 500),
            color: theme.centerChannelColor,
        },
        messageStyle: {
            flexDirection: 'row',
            alignItems: 'center',
            color: changeOpacity(theme.centerChannelColor, 0.6),
            paddingTop: 5,
            paddingBottom: 5,
        },
        messageText: {
            flex: 1,
            paddingLeft: 12,
            paddingRight: 4,
        },
        joinCallIcon: {
            padding: 8,
            backgroundColor: theme.onlineIndicator,
            borderRadius: 4,
            color: theme.buttonColor,
            overflow: 'hidden',
        },
        phoneHangupIcon: {
            padding: 8,
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.6),
            borderRadius: 4,
            color: theme.buttonColor,
            overflow: 'hidden',
        },
        joinCallButtonText: {
            color: theme.buttonColor,
            ...typography('Body', 75, 'SemiBold'),
        },
        joinCallButtonTextRestricted: {
            color: changeOpacity(theme.centerChannelColor, 0.32),
        },
        joinCallButtonIcon: {
            color: theme.buttonColor,
            marginRight: 5,
        },
        joinCallButtonIconRestricted: {
            color: changeOpacity(theme.centerChannelColor, 0.32),
        },
        startedText: {
            color: theme.centerChannelColor,
            ...typography('Body', 100, 'SemiBold'),
        },
        joinCallButton: {
            flexDirection: 'row',
            padding: 12,
            backgroundColor: theme.onlineIndicator,
            borderRadius: 4,
            alignItems: 'center',
            alignContent: 'center',
        },
        joinCallButtonRestricted: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        },
        timeText: {
            ...typography('Body', 75),
            color: changeOpacity(theme.centerChannelColor, 0.64),
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
    ccChannelId, limitRestrictedInfo,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const timezone = getUserTimezone(currentUser);

    const alreadyInTheCall = Boolean(ccChannelId && ccChannelId === post.channelId);
    const isLimitRestricted = Boolean(limitRestrictedInfo?.limitRestricted);

    const joinHandler = () => {
        if (alreadyInTheCall) {
            return;
        }

        if (isLimitRestricted) {
            showLimitRestrictedAlert(limitRestrictedInfo!, intl);
            return;
        }

        leaveAndJoinWithAlert(intl, serverUrl, post.channelId);
    };

    const title = post.props.title ? (
        <Text style={style.title}>
            {post.props.title}
        </Text>
    ) : null;

    if (post.props.end_at) {
        return (
            <>
                {title}
                <View style={style.messageStyle}>
                    <CompassIcon
                        name='phone-hangup'
                        size={24}
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
                            <FormattedTime
                                style={style.timeText}
                                value={post.props.end_at}
                                isMilitaryTime={isMilitaryTime}
                                timezone={timezone}
                            />
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
            </>
        );
    }

    const joinTextStyle = [style.joinCallButtonText, isLimitRestricted && style.joinCallButtonTextRestricted];
    return (
        <>
            {title}
            <View style={style.messageStyle}>
                <CompassIcon
                    name='phone-in-talk'
                    size={24}
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
                        name='phone'
                        size={14}
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
        </>
    );
};

