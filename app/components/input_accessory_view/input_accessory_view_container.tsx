// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {type ReactNode} from 'react';
import Animated, {useAnimatedStyle, type SharedValue} from 'react-native-reanimated';

import {useTheme} from '@context/theme';
import {makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    children: ReactNode;
    animatedHeight: SharedValue<number>;
};

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.centerChannelBg,
        overflow: 'hidden',
        width: '100%',
    },
}));

/**
 * InputAccessoryViewContainer - Container for input accessory view content
 */
const InputAccessoryViewContainer = ({
    children,
    animatedHeight,
}: Props) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            height: animatedHeight.value,
        };
    }, []);

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

