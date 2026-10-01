// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import moment from 'moment-timezone';
import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Pressable, Text, View} from 'react-native';

import {joinCallAndOpenCallScreen, leaveCallConfirmation} from '@calls/actions/calls';
import {showLimitRestrictedAlert} from '@calls/alerts';
import {CallCardState} from '@calls/types/calls';
import {getCallCardState, getCallPropsFromPost} from '@calls/utils';
import CompassIcon from '@components/compass_icon';
import FormattedRelativeTime from '@components/formatted_relative_time';
import FormattedText from '@components/formatted_text';
import FormattedTime from '@components/formatted_time';
import Loading from '@components/loading';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';
import {displayUsername, getUserTimezone} from '@utils/user';

import type {LimitRestrictedInfo} from '@calls/observers';
import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    post: PostModel;
    isMilitaryTime: boolean;
    joiningChannelId: string | null;
    otherParticipants: boolean;
    isAdmin: boolean;
    isHost: boolean;
    currentUser?: UserModel;
    caller?: UserModel;
    callee?: UserModel;
    teammateNameDisplay?: string;
    limitRestrictedInfo?: LimitRestrictedInfo;
    ccChannelId?: string;
    numUsers?: number;
    callExists?: boolean;
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
        pressed: {
            opacity: 0.72,
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
    caller,
    callee,
    teammateNameDisplay,
    isMilitaryTime,
    ccChannelId,
    limitRestrictedInfo,
    joiningChannelId,
    otherParticipants,
    isAdmin,
    isHost,
    numUsers = 0,

    // An ended call post has no live call to observe, so the HOC does not pass this through.
    callExists = false,
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

    const handleJoinPress = useCallback(async () => {
        if (isLimitRestricted) {
            showLimitRestrictedAlert(limitRestrictedInfo!, intl);
            return;
        }

        await joinCallAndOpenCallScreen(intl, serverUrl, post.channelId);
    }, [isLimitRestricted, post.channelId, intl, serverUrl, limitRestrictedInfo]);
    const joinHandler = usePreventDoubleTap(handleJoinPress);

    // Hanging up while a DM call is still ringing is what the server turns into a canceled call,
    // so the caller's "Cancel" and a participant's "Leave" are the same action.
    const leaveCallHandler = useCallback(() => {
        leaveCallConfirmation(intl, otherParticipants, isAdmin, isHost, serverUrl, post.channelId);
    }, [intl, otherParticipants, isAdmin, isHost, serverUrl, post.channelId]);

    const callProps = getCallPropsFromPost(post);
    const cardState = getCallCardState(callProps, numUsers, callExists);

    // The author of the call post is the caller.
    const isCaller = Boolean(currentUser && currentUser.id === post.userId);
    const isCalling = cardState === CallCardState.Calling;
    const callEnded = cardState !== CallCardState.Calling && cardState !== CallCardState.Active;

    const title = callProps.title ? (
        <Text style={style.title}>
            {callProps.title}
        </Text>
    ) : null;

    let heading;
    if (isCalling) {
        heading = isCaller ? (
            <FormattedText
                id={'mobile.calls_calling'}
                defaultMessage={'Calling...'}
                style={style.text}
                testID='calls_custom_message.heading'
            />
        ) : (
            <FormattedText
                id={'mobile.calls_incoming_call'}
                defaultMessage={'Incoming call...'}
                style={style.text}
                testID='calls_custom_message.heading'
            />
        );
    } else if (callEnded) {
        heading = (
            <FormattedText
                id={'mobile.calls_call_ended'}
                defaultMessage={'Call ended'}
                style={style.text}
                testID='calls_custom_message.heading'
            />
        );
    } else {
        heading = (
            <FormattedText
                id={'mobile.calls_started_call'}
                defaultMessage={'Call started'}
                style={style.text}
                testID='calls_custom_message.heading'
            />
        );
    }

    let subHeading;
    switch (cardState) {
        case CallCardState.Calling:
            break;
        case CallCardState.NoAnswer:
            subHeading = isCaller ? (
                <FormattedText
                    id={'mobile.calls_no_answer'}
                    defaultMessage={'No answer'}
                    style={style.timeText}
                    testID='calls_custom_message.sub_heading'
                />
            ) : (
                <FormattedText
                    id={'mobile.calls_missed_call'}
                    defaultMessage={'Missed call'}
                    style={style.timeText}
                    testID='calls_custom_message.sub_heading'
                />
            );
            break;
        case CallCardState.Canceled:
            subHeading = isCaller ? (
                <FormattedText
                    id={'mobile.calls_you_canceled_call'}
                    defaultMessage={'You canceled the call'}
                    style={style.timeText}
                    testID='calls_custom_message.sub_heading'
                />
            ) : (
                <FormattedText
                    id={'mobile.calls_canceled_by'}
                    defaultMessage={'Canceled by {user}'}
                    values={{user: displayUsername(caller, intl.locale, teammateNameDisplay)}}
                    style={style.timeText}
                    testID='calls_custom_message.sub_heading'
                />
            );
            break;
        case CallCardState.Declined:
            subHeading = isCaller ? (
                <FormattedText
                    id={'mobile.calls_declined_by'}
                    defaultMessage={'Declined by {user}'}
                    values={{user: displayUsername(callee, intl.locale, teammateNameDisplay)}}
                    style={style.timeText}
                    testID='calls_custom_message.sub_heading'
                />
            ) : (
                <FormattedText
                    id={'mobile.calls_you_declined_call'}
                    defaultMessage={'You declined the call'}
                    style={style.timeText}
                    testID='calls_custom_message.sub_heading'
                />
            );
            break;
        case CallCardState.Ended: {
            if (callProps.end_at === 0) {
                break;
            }

            // The card reaches this state from the call_end event, before the post is updated with
            // end_at, so the timings are only rendered once they are known.
            subHeading = (
                <View
                    style={style.endCallInfo}
                    testID='calls_custom_message.sub_heading'
                >
                    <FormattedText
                        style={style.timeText}
                        id={'mobile.calls_ended_at'}
                        defaultMessage={'Ended at'}
                    />
                    <Text>{' '}</Text>
                    <FormattedTime
                        style={style.timeText}
                        value={callProps.end_at}
                        isMilitaryTime={isMilitaryTime}
                        timezone={timezone}
                    />
                    <Text style={style.separator}>{'•'}</Text>
                    <FormattedText
                        id={'mobile.calls_lasted'}
                        style={style.timeText}
                        defaultMessage={'Lasted {duration}'}
                        values={{duration: moment.duration(callProps.end_at - callProps.start_at).humanize(false)}}
                    />
                </View>
            );
            break;
        }
        default:
            subHeading = (
                <FormattedRelativeTime
                    value={callProps.start_at}
                    updateIntervalInSeconds={1}
                    style={style.timeText}
                    testID='calls_custom_message.sub_heading'
                />
            );
    }

    const hangupButton = (
        <Pressable
            style={({pressed}) => [style.callButton, style.leaveCallButton, pressed && style.pressed]}
            onPress={leaveCallHandler}
            testID='calls_custom_message.hangup_button'
        >
            <CompassIcon
                name='phone-hangup'
                size={18}
                style={style.buttonIcon}
            />
            {isCalling ? (
                <FormattedText
                    id={'mobile.calls_cancel'}
                    defaultMessage={'Cancel'}
                    style={style.buttonText}
                />
            ) : (
                <FormattedText
                    id={'mobile.calls_leave'}
                    defaultMessage={'Leave'}
                    style={style.buttonText}
                />
            )}
        </Pressable>
    );

    const joinButton = (
        <Pressable
            style={({pressed}) => [style.callButton, style.joinCallButton, isLimitRestricted && style.joinCallButtonRestricted, pressed && style.pressed]}
            onPress={joinHandler}
            testID='calls_custom_message.join_button'
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
        </Pressable>
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

    let button;
    if (callEnded) {
        button = null;
    } else if (joiningThisCall) {
        button = joiningButton;
    } else {
        button = alreadyInTheCall ? hangupButton : joinButton;
    }

    return (
        <>
            {title}
            <View style={style.messageStyle}>
                <CompassIcon
                    name={callEnded ? 'phone-hangup' : 'phone-in-talk'}
                    size={20}
                    style={[style.callIcon, callEnded ? style.phoneHangupIcon : style.joinCallIcon]}
                />
                <View style={style.message}>
                    {heading}
                    {subHeading}
                </View>
                {button}
            </View>
        </>
    );
};
