// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {StyleProp, Text, useWindowDimensions, View, ViewStyle} from 'react-native';
import Animated, {AnimatedStyleProp} from 'react-native-reanimated';

import CompassIcon from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type ToastProps = {
    animatedStyle: AnimatedStyleProp<ViewStyle>;
    children?: React.ReactNode;
    iconName?: string;
    message?: string;
    style: StyleProp<ViewStyle>;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    center: {
        alignItems: 'center',
        width: '100%',
        opacity: 0,
    },
    container: {
        alignItems: 'center',
        backgroundColor: theme.onlineIndicator,
        borderRadius: 8,
        elevation: 6,
        flex: 1,
        flexDirection: 'row',
        height: 56,
        paddingLeft: 20,
        paddingRight: 10,
        shadowColor: changeOpacity('#000', 0.12),
        shadowOffset: {width: 0, height: 4},
        shadowRadius: 6,
    },
    flex: {flex: 1},
    text: {
        color: theme.buttonColor,
        marginLeft: 10,
        ...typography('Body', 100, 'SemiBold'),
    },
}));

const Toast = ({animatedStyle, children, style, iconName, message}: ToastProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const dim = useWindowDimensions();
    const containerStyle = useMemo(() => {
        const totalMargin = 40;
        const width = Math.min(dim.height, dim.width, 400) - totalMargin;

        return [styles.container, {width}, style];
    }, [dim, styles.container, style]);

    return (
        <Animated.View style={[styles.center, animatedStyle]}>
            <Animated.View style={containerStyle}>
                {Boolean(iconName) &&
                <CompassIcon
                    color={theme.buttonColor}
                    name={iconName!}
                    size={18}
                />
                }
                {Boolean(message) &&
                <View style={styles.flex}>
                    <Text style={styles.text}>{message}</Text>
                </View>
                }
                {children}
            </Animated.View>
        </Animated.View>
    );
};

export default Toast;

