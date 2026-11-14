// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback} from 'react';
import {useIntl} from 'react-intl';
import {Pressable, Text, View} from 'react-native';

import {leaveCall} from '@calls/actions';
import {startPhoneCall} from '@calls/alerts';
import {getStyleSheet} from '@calls/components/calls_custom_message/calls_custom_message';
import {CallCardState} from '@calls/types/calls';
import {getCallPropsFromPost, getPhoneCallCardState, getPhoneCallPropsFromPost} from '@calls/utils';
import CompassIcon from '@components/compass_icon';
import FormattedText from '@components/formatted_text';
import {useServerUrl} from '@context/server';
import {useTheme} from '@context/theme';
import {usePreventDoubleTap} from '@hooks/utils';
import {displayUsername} from '@utils/user';

import type PostModel from '@typings/database/models/servers/post';
import type UserModel from '@typings/database/models/servers/user';

type Props = {
    post: PostModel;
    currentUser?: UserModel;
    targetUser?: UserModel;
    teammateNameDisplay?: string;
    canDial: boolean;
    inCall: boolean;
    answered: boolean;
}

export const PhoneCallCustomMessage = ({post, currentUser, targetUser, teammateNameDisplay, canDial, inCall, answered}: Props) => {
    const intl = useIntl();
    const theme = useTheme();
    const style = getStyleSheet(theme);
    const serverUrl = useServerUrl();

    const phone = getPhoneCallPropsFromPost(post);
    const number = phone?.number ?? '';
    const targetUserId = phone?.targetUserId ?? '';
    const label = phone?.label ?? '';

    const callAgain = usePreventDoubleTap(useCallback(() => {
        startPhoneCall(intl, serverUrl, {number, targetUserId: targetUserId || undefined, displayLabel: label || undefined});
    }, [intl, serverUrl, number, targetUserId, label]));

    const hangUp = useCallback(() => leaveCall(), []);

    if (!phone) {
        return null;
    }

    const cardState = getPhoneCallCardState(getCallPropsFromPost(post), answered);
    const isCaller = Boolean(currentUser && currentUser.id === post.userId);
    const isCalling = cardState === CallCardState.Calling;
    const isLive = isCalling || cardState === CallCardState.Active;
    const name = targetUser ? displayUsername(targetUser, intl.locale, teammateNameDisplay) : phone.displayNumber;

    let heading;
    switch (cardState) {
        case CallCardState.Calling:
            heading = (
                <FormattedText
                    id='mobile.calls_phone_calling'
                    defaultMessage='Calling {name}…'
                    values={{name}}
                    style={style.text}
                />
            );
            break;
        case CallCardState.Active:
            heading = (
                <FormattedText
                    id='mobile.calls_started_call'
                    defaultMessage='Call started'
                    style={style.text}
                />
            );
            break;
        case CallCardState.NoAnswer:
            heading = isCaller ? (
                <FormattedText
                    id='mobile.calls_no_answer'
                    defaultMessage='No answer'
                    style={style.text}
                />
            ) : (
                <FormattedText
                    id='mobile.calls_missed_call'
                    defaultMessage='Missed call'
                    style={style.text}
                />
            );
            break;
        case CallCardState.Canceled:
            heading = isCaller ? (
                <FormattedText
                    id='mobile.calls_phone_canceled'
                    defaultMessage='Call canceled'
                    style={style.text}
                />
            ) : (
                <FormattedText
                    id='mobile.calls_missed_call'
                    defaultMessage='Missed call'
                    style={style.text}
                />
            );
            break;
        case CallCardState.Declined:
            heading = (
                <FormattedText
                    id='mobile.calls_phone_declined'
                    defaultMessage='Call declined'
                    style={style.text}
                />
            );
            break;
        case CallCardState.Failed:
            heading = (
                <FormattedText
                    id='mobile.calls_phone_failed'
                    defaultMessage='Call failed'
                    style={style.text}
                />
            );
            break;
        default:
            heading = (
                <FormattedText
                    id='mobile.calls_call_ended'
                    defaultMessage='Call ended'
                    style={style.text}
                />
            );
    }

    let button;
    if (isLive) {
        button = inCall ? (
            <Pressable
                style={({pressed}) => [style.callButton, style.leaveCallButton, pressed && style.pressed]}
                onPress={hangUp}
                testID='phone_call_custom_message.hangup_button'
            >
                <CompassIcon
                    name='phone-hangup'
                    size={18}
                    style={style.buttonIcon}
                />
                {isCalling ? (
                    <FormattedText
                        id='mobile.calls_cancel'
                        defaultMessage='Cancel'
                        style={style.buttonText}
                    />
                ) : (
                    <FormattedText
                        id='mobile.calls_leave'
                        defaultMessage='Leave'
                        style={style.buttonText}
                    />
                )}
            </Pressable>
        ) : null;
    } else if (isCaller && canDial && number) {
        button = (
            <Pressable
                style={({pressed}) => [style.callButton, style.joinCallButton, pressed && style.pressed]}
                onPress={callAgain}
                testID='phone_call_custom_message.call_again_button'
            >
                <CompassIcon
                    name='phone-in-talk'
                    size={18}
                    style={style.buttonIcon}
                />
                <FormattedText
                    id='mobile.calls_phone_call_again'
                    defaultMessage='Call again'
                    style={style.buttonText}
                />
            </Pressable>
        );
    }

    return (
        <View style={style.messageStyle}>
            <CompassIcon
                name={isLive ? 'phone-in-talk' : 'phone-hangup'}
                size={20}
                style={[style.callIcon, isLive ? style.joinCallIcon : style.phoneHangupIcon]}
            />
            <View style={style.message}>
                {heading}
                <Text style={style.timeText}>
                    {label ? `${phone.displayNumber} • ${label}` : phone.displayNumber}
                </Text>
            </View>
            {button}
        </View>
    );
};
