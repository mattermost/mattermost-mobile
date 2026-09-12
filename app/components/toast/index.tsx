// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {type StyleProp, Text, type TextStyle, useWindowDimensions, View, type ViewStyle} from 'react-native';
import Animated, {type AnimatedStyle} from 'react-native-reanimated';

import CompassIcon, {type CompassIconName} from '@components/compass_icon';
import {useTheme} from '@context/theme';
import {useIsTablet} from '@hooks/device';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type ToastProps = {
    animatedStyle: AnimatedStyle<ViewStyle> | StyleProp<ViewStyle>;
    children?: React.ReactNode;
    description?: string;
    descriptionStyle?: StyleProp<TextStyle>;
    iconName?: CompassIconName;
    message?: string;
    style?: StyleProp<ViewStyle>;
    textStyle?: StyleProp<TextStyle>;
    testID?: string;
}

export const TOAST_HEIGHT = 56;
const TOAST_MARGIN = 40;
const WIDTH_TABLET = 484;
const WIDTH_MOBILE = 400;

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
        height: TOAST_HEIGHT,
        paddingHorizontal: 16,
        shadowColor: changeOpacity('#000', 0.12),
        shadowOffset: {width: 0, height: 4},
        shadowRadius: 6,
    },
    containerWithDescription: {
        alignItems: 'flex-start',
        height: 'auto' as const,
        minHeight: TOAST_HEIGHT,
        paddingVertical: 16,
    },
    flex: {flex: 1},
    text: {
        color: theme.buttonColor,
        marginLeft: 10,
        ...typography('Body', 100, 'SemiBold'),
    },
    title: {
        ...typography('Body', 200, 'SemiBold'),
    },
    description: {
        color: changeOpacity(theme.buttonColor, 0.75),
        marginLeft: 10,
        marginTop: 4,
        ...typography('Body', 100),
    },
    iconWithDescription: {
        marginTop: 3,
    },
}));

const Toast = ({animatedStyle, children, description, descriptionStyle, style, iconName, message, textStyle, testID}: ToastProps) => {
    const theme = useTheme();
    const styles = getStyleSheet(theme);
    const dim = useWindowDimensions();
    const isTablet = useIsTablet();
    const hasDescription = Boolean(description);
    const containerStyle = useMemo(() => {
        const toast_width = isTablet ? WIDTH_TABLET : WIDTH_MOBILE;
        const width = Math.min(dim.height, dim.width, toast_width) - TOAST_MARGIN;
        return [styles.container, hasDescription && styles.containerWithDescription, {width}, style];
    }, [isTablet, dim, styles, hasDescription, style]);

    return (
        <Animated.View
            style={[styles.center, animatedStyle]}
            testID={testID}
        >
            <Animated.View style={containerStyle}>
                {Boolean(iconName) &&
                <CompassIcon
                    color={theme.buttonColor}
                    name={iconName!}
                    size={18}
                    style={[textStyle, hasDescription && styles.iconWithDescription]}
                />
                }
                {Boolean(message) &&
                <View style={styles.flex}>
                    <Text
                        style={[styles.text, textStyle, hasDescription && styles.title]}
                        testID='toast.message'
                    >
                        {message}
                    </Text>
                    {hasDescription &&
                    <Text
                        style={[styles.description, descriptionStyle]}
                        testID='toast.description'
                    >
                        {description}
                    </Text>
                    }
                </View>
                }
                {children}
            </Animated.View>
        </Animated.View>
    );
};

export default Toast;

