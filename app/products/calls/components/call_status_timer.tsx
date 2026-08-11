// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {type StyleProp, type TextStyle} from 'react-native';
import Animated from 'react-native-reanimated';

import {ElapsedTimer} from '@calls/components/elapsed_timer';
import {useCallingPulseAnimationStyle} from '@calls/hooks';
import FormattedText from '@components/formatted_text';

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
    const callingPulseAnimationStyle = useCallingPulseAnimationStyle(isCalling);

    if (isCalling) {
        return (
            <Animated.View style={callingPulseAnimationStyle}>
                <FormattedText
                    id='mobile.calls_calling'
                    defaultMessage='Calling...'
                    style={style}
                    numberOfLines={1}
                    testID='calls.calling_text'
                />
            </Animated.View>
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
