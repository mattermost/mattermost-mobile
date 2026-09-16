// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {type StyleProp, type TextStyle} from 'react-native';
import Animated from 'react-native-reanimated';

import {ElapsedTimer} from '@calls/components/elapsed_timer';
import {useCallingPulseAnimationStyle} from '@calls/hooks';

type Props = {
    isConnecting?: boolean;
    isCalling: boolean;
    value: number;
    style: StyleProp<TextStyle>;
    truncateWhenLong?: boolean;
}

/**
 * Shows elapsed call time after answer, or "Connecting..." until we're in the call and "Calling..."
 * while it rings (DM only). Timer starts at answer, excluding connect and ring time.
 */
export function CallStatusTimer({isConnecting = false, isCalling, value, style, truncateWhenLong}: Props) {
    const intl = useIntl();
    const callingPulseAnimationStyle = useCallingPulseAnimationStyle(isConnecting || isCalling);

    if (isConnecting) {
        return (
            <Animated.Text
                style={[style, callingPulseAnimationStyle]}
                numberOfLines={1}
                testID='calls.connecting_text'
            >
                {intl.formatMessage({
                    id: 'mobile.calls_connecting',
                    defaultMessage: 'Connecting...',
                })}
            </Animated.Text>
        );
    }

    if (isCalling) {
        return (
            <Animated.Text
                style={[style, callingPulseAnimationStyle]}
                numberOfLines={1}
                testID='calls.calling_text'
            >
                {intl.formatMessage({
                    id: 'mobile.calls_calling',
                    defaultMessage: 'Calling...',
                })}
            </Animated.Text>
        );
    }

    return (
        <ElapsedTimer
            style={style}
            value={value}
            updateIntervalInSeconds={1}
            truncateWhenLong={truncateWhenLong}
        />
    );
}
