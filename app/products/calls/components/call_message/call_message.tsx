// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import React, {useCallback} from 'react';
import {injectIntl, IntlShape} from 'react-intl';
import {View, TouchableOpacity, Text} from 'react-native';

import CompassIcon from '@components/compass_icon';
import FormattedRelativeTime from '@components/formatted_relative_time';
import FormattedText from '@components/formatted_text';
import FormattedTime from '@components/formatted_time';
import {displayUsername} from '@mm-redux/utils/user_utils';
import leaveAndJoinWithAlert from '@mmproducts/calls/components/leave_and_join_alert';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';

import type {Post} from '@mm-redux/types/posts';
import type {Theme} from '@mm-redux/types/theme';
import type {UserProfile} from '@mm-redux/types/users';

type CallMessageProps = {
    actions: {
        joinCall: (channelId: string) => void;
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

const CallMessage = ({post, user, teammateNameDisplay, confirmToJoin, alreadyInTheCall, theme, actions, userTimezone, isMilitaryTime, currentChannelName, callChannelName, intl}: CallMessageProps) => {
    const style = getStyleSheet(theme);
    const joinHandler = useCallback(() => {
        if (alreadyInTheCall) {
            return;
        }
        leaveAndJoinWithAlert(intl, post.channel_id, callChannelName, currentChannelName, confirmToJoin, actions.joinCall);
    }, [post.channel_id, callChannelName, currentChannelName, confirmToJoin, actions.joinCall]);

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
                        id='call_message.call_ended'
                        defaultMessage='Call ended'
                        style={style.startedText}
                    />
                    <View
                        style={style.endCallInfo}
                    >
                        <FormattedText
                            id='call_message.call_ended_at'
                            defaultMessage='Ended at {time}'
                            style={style.timeText}
                            values={{
                                time: (
                                    <FormattedTime
                                        value={post.props.end_at}
                                        isMilitaryTime={isMilitaryTime}
                                        timezone={userTimezone}
                                    />
                                ),
                            }}
                        />
                        <Text style={style.separator}>{'•'}</Text>
                        <FormattedText
                            style={style.timeText}
                            id='call_message.call_lasted'
                            defaultMessage='Lasted {duration}'
                            values={{
                                duration: moment.duration(post.props.end_at - post.props.start_at).humanize(false),
                            }}
                        />
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
                <FormattedText
                    id='call_message.started_a_call'
                    defaultMessage='{user} started a call'
                    values={{user: displayUsername(user, teammateNameDisplay)}}
                    style={style.startedText}
                />
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
                {alreadyInTheCall &&
                    <FormattedText
                        id='call_message.current_call'
                        defaultMessage='Current Call'
                        style={style.joinCallButtonText}
                    />}
                {!alreadyInTheCall &&
                    <FormattedText
                        id='call_message.join_call'
                        defaultMessage='Join Call'
                        style={style.joinCallButtonText}
                    />}
            </TouchableOpacity>
        </View>
    );
};

export default injectIntl(CallMessage);
