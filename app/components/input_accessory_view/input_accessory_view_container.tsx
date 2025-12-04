// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ReactNode} from 'react';
import {StyleSheet} from 'react-native';
import Animated, {useAnimatedStyle, type SharedValue} from 'react-native-reanimated';

type Props = {
    children: ReactNode;
    animatedHeight: SharedValue<number>;
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'yellow',
        overflow: 'hidden',
        width: '100%',
    },
});

/**
 * InputAccessoryViewContainer - Container for input accessory view content
 */
const InputAccessoryViewContainer = ({
    children,
    animatedHeight,
}: Props) => {
    const animatedStyle = useAnimatedStyle(() => {
        return {
            height: animatedHeight.value,
        };
    }, [animatedHeight]);

    return (
        <Animated.View
            style={[
                styles.container,
                animatedStyle,
            ]}
        >
            {children}
        </Animated.View>
    );
};

export default InputAccessoryViewContainer;

