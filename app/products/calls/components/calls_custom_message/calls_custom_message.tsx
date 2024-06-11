// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Text, TouchableOpacity, View} from 'react-native';

import {leaveCall} from '@calls/actions';
import {leaveAndJoinWithAlert, showLimitRestrictedAlert} from '@calls/alerts';
import {setJoiningChannelId} from '@calls/state';
import CompassIcon from '@components/compass_icon';
import FormattedRelativeTime from '@components/formatted_relative_time';
import FormattedText from '@components/formatted_text';
import FormattedTime from '@components/formatted_time';
import Loading from '@components/loading';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {getUserTimezone} from '@utils/user';

import type {LimitRestrictedInfo} from '@calls/observers';
import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    post: PostModel;
    currentUser?: UserModel;
    isMilitaryTime: boolean;
    limitRestrictedInfo?: LimitRestrictedInfo;
    ccChannelId?: string;
    joiningChannelId: string | null;
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
            padding: 12,
            marginBottom: 2,
            gap: 8,
            backgroundColor: theme.centerChannelBg,
            borderWidth: 1,
            borderColor: changeOpacity(theme.centerChannelColor, 0.12),
            borderRadius: 4,
            shadowColor: theme.centerChannelColor,
            shadowOffset: {
                width: 0,
                height: 2,
            },
            shadowRadius: 1,
            shadowOpacity: 0.08,
            elevation: 1,
        },
        message: {
            flex: 1,
        },
        text: {
            color: theme.centerChannelColor,
            ...typography('Heading', 200),
        },
        timeText: {
            color: changeOpacity(theme.centerChannelColor, 0.72),
            ...typography('Body', 75),
        },
        callIcon: {
            padding: 10,
            borderRadius: 20,
            color: theme.buttonColor,
            overflow: 'hidden',
        },
        joinCallIcon: {
            backgroundColor: theme.onlineIndicator,
        },
        phoneHangupIcon: {
            color: changeOpacity(theme.centerChannelColor, 0.72),
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
        },
        callButton: {
            flexDirection: 'row',
            paddingHorizontal: 16,
            paddingVertical: 10,
            gap: 7,
            borderRadius: 4,
            alignItems: 'center',
            alignContent: 'center',
        },
        joinCallButton: {
            backgroundColor: theme.onlineIndicator,
        },
        leaveCallButton: {
            backgroundColor: theme.dndIndicator,
        },
        buttonText: {
            color: theme.buttonColor,
            ...typography('Body', 100, 'SemiBold'),
        },
        buttonRestricted: {
            color: changeOpacity(theme.centerChannelColor, 0.32),
        },
        buttonIcon: {
            color: theme.buttonColor,
        },
        joinCallButtonRestricted: {
            backgroundColor: changeOpacity(theme.centerChannelColor, 0.08),
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
    post,
    currentUser,
    isMilitaryTime,
    ccChannelId,
    limitRestrictedInfo,
    joiningChannelId,
}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const serverUrl = useServerUrl();
    const timezone = getUserTimezone(currentUser);

    const joiningThisCall = Boolean(joiningChannelId === post.channelId);
    const alreadyInTheCall = Boolean(ccChannelId && ccChannelId === post.channelId);
    const isLimitRestricted = Boolean(limitRestrictedInfo?.limitRestricted);
    const joiningMsg = intl.formatMessage({id: 'mobile.calls_joining', defaultMessage: 'Joining...'});

    const joinHandler = useCallback(async () => {
        if (isLimitRestricted) {
            showLimitRestrictedAlert(limitRestrictedInfo!, intl);
            return;
        }

        setJoiningChannelId(post.channelId);
        await leaveAndJoinWithAlert(intl, serverUrl, post.channelId);
        setJoiningChannelId(null);
    }, [limitRestrictedInfo, intl, serverUrl, post.channelId]);

    const leaveHandler = useCallback(() => {
        leaveCall();
    }, []);

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
                        size={20}
                        style={[style.callIcon, style.phoneHangupIcon]}
                    />
                    <View style={style.message}>
                        <FormattedText
                            id={'mobile.calls_call_ended'}
                            defaultMessage={'Call ended'}
                            style={style.text}
                        />
                        <View style={style.endCallInfo}>
                            <FormattedText
                                style={style.timeText}
                                id={'mobile.calls_ended_at'}
                                defaultMessage={'Ended at'}
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
                                style={style.timeText}
                                defaultMessage={'Lasted {duration}'}
                                values={{duration: moment.duration(post.props.end_at - post.props.start_at).humanize(false)}}
                            />
                        </View>
                    </View>
                </View>
            </>
        );
    }

    const button = alreadyInTheCall ? (
        <TouchableOpacity
            style={[style.callButton, style.leaveCallButton]}
            onPress={leaveHandler}
        >
            <CompassIcon
                name='phone-hangup'
                size={18}
                style={[style.buttonIcon]}
            />
            <FormattedText
                id={'mobile.calls_leave'}
                defaultMessage={'Leave'}
                style={style.buttonText}
            />
        </TouchableOpacity>
    ) : (
        <TouchableOpacity
            style={[style.callButton, style.joinCallButton, isLimitRestricted && style.joinCallButtonRestricted]}
            onPress={joinHandler}
        >
            <CompassIcon
                name='phone-in-talk'
                size={18}
                style={[style.buttonIcon, isLimitRestricted && style.buttonRestricted]}
            />
            <FormattedText
                id={'mobile.calls_join'}
                defaultMessage={'Join'}
                style={[style.buttonText, isLimitRestricted && style.buttonRestricted]}
            />
        </TouchableOpacity>
    );

    const joiningButton = (
        <Loading
            color={theme.buttonColor}
            size={'small'}
            footerText={joiningMsg}
            containerStyle={[style.callButton, style.joinCallButton]}
            footerTextStyles={style.buttonText}
        />
    );

    return (
        <>
            {title}
            <View style={style.messageStyle}>
                <CompassIcon
                    name='phone-in-talk'
                    size={20}
                    style={[style.callIcon, style.joinCallIcon]}
                />
                <View style={style.message}>
                    <FormattedText
                        id={'mobile.calls_started_call'}
                        defaultMessage={'Call started'}
                        style={style.text}
                    />
                    <FormattedRelativeTime
                        value={post.props.start_at}
                        updateIntervalInSeconds={1}
                        style={style.timeText}
                    />
                </View>
                {joiningThisCall ? joiningButton : button}
            </View>
        </>
    );
};

