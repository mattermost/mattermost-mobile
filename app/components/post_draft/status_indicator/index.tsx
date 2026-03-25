// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useEffect} from 'react';
import {type StyleProp, type ViewStyle} from 'react-native';
import Animated, {useAnimatedStyle, useSharedValue, withTiming} from 'react-native-reanimated';

import {TYPING_HEIGHT} from '@constants/post_draft';

type Props = {
    visible: boolean;
    children: React.ReactNode;
    style?: StyleProp<ViewStyle>;
}

export const STATUS_INDICATOR_HEIGHT = TYPING_HEIGHT;

function StatusIndicator({
    visible,
    children,
    style,
}: Props) {
    const height = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            height: withTiming(height.value),
            marginBottom: 4,
            overflow: 'hidden',
        };
    });

    useEffect(() => {
        height.value = visible ? STATUS_INDICATOR_HEIGHT : 0;
    }, [visible, height]);

    return (
        <Animated.View style={[animatedStyle, style]}>
            {children}
        </Animated.View>
    );
}

export default React.memo(StatusIndicator);

