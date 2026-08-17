// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {useIntl} from 'react-intl';
import {type StyleProp, type TextStyle} from 'react-native';
import Animated from 'react-native-reanimated';

import {ElapsedTimer} from '@calls/components/elapsed_timer';
import {useCallingPulseAnimationStyle} from '@calls/hooks';

type Props = {
    isCalling: boolean;
    value: number;
    style: StyleProp<TextStyle>;
    truncateWhenLong?: boolean;
}

/**
 * Shows elapsed call time after answer, or "Calling…" while ringing (DM only).
 * Timer starts at answer, excluding ring time.
 */
export function CallStatusTimer({isCalling, value, style, truncateWhenLong}: Props) {
    const intl = useIntl();
    const callingPulseAnimationStyle = useCallingPulseAnimationStyle(isCalling);

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
