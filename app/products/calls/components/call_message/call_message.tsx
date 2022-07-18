// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import React from 'react';
import {injectIntl, intlShape, IntlShape} from 'react-intl';
import {View, TouchableOpacity, Text} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedRelativeTime from '@components/formatted_relative_time';
import FormattedTime from '@components/formatted_time';
import {displayUsername} from '@mm-redux/utils/user_utils';
import leaveAndJoinWithAlert from '@mmproducts/calls/components/leave_and_join_alert';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {Post} from '@mm-redux/types/posts';
import type {Theme} from '@mm-redux/types/theme';
import type {UserProfile} from '@mm-redux/types/users';

type CallMessageProps = {
    actions: {
        joinCall: (channelId: string, intl: typeof intlShape) => void;
    };
    post: Post;
    user: UserProfile;
    theme: Theme;
    teammateNameDisplay: string;
    confirmToJoin: boolean;
    alreadyInTheCall: boolean;
    isMilitaryTime: boolean;
    userTimezone: string;
    currentChannelName: string;
    callChannelName: string;
    intl: typeof IntlShape;
    isLimitRestricted: boolean;
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

const CallMessage = ({
    post,
    user,
    teammateNameDisplay,
    confirmToJoin,
    alreadyInTheCall,
    theme,
    actions,
    userTimezone,
    isMilitaryTime,
    currentChannelName,
    callChannelName,
    intl,
    isLimitRestricted,
}: CallMessageProps) => {
    const style = getStyleSheet(theme);
    const joinHandler = () => {
        if (alreadyInTheCall || isLimitRestricted) {
            return;
        }
        leaveAndJoinWithAlert(intl, post.channel_id, callChannelName, currentChannelName, confirmToJoin, actions.joinCall);
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
                    <Text
                        style={style.startedText}
                    >{'Call ended'}</Text>
                    <View
                        style={style.endCallInfo}
                    >
                        <Text
                            style={style.timeText}
                        >{'Ended at '}</Text>
                        {
                            <FormattedTime
                                value={post.props.end_at}
                                isMilitaryTime={isMilitaryTime}
                                timezone={userTimezone}
                            />
                        }
                        <Text style={style.separator}>{'•'}</Text>
                        <Text
                            style={style.timeText}
                        >{`Lasted ${moment.duration(post.props.end_at - post.props.start_at).humanize(false)}`}</Text>
                    </View>
                </View>
            </View>
        );
    }

    const joinCallButtonText = alreadyInTheCall ? 'Current call' : 'Join call';

    return (
        <View style={style.messageStyle}>
            <CompassIcon
                name='phone-in-talk'
                size={16}
                style={style.joinCallIcon}
            />
            <View style={style.messageText}>
                <Text
                    style={style.startedText}
                >{`${displayUsername(user, teammateNameDisplay)} started a call`}</Text>
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
                <Text style={[style.joinCallButtonText, isLimitRestricted && style.joinCallButtonTextRestricted]}>
                    {joinCallButtonText}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

export default injectIntl(CallMessage);
