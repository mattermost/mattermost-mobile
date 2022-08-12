// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {Text} from 'react-native';
import Animated, {useAnimatedStyle} from 'react-native-reanimated';

import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    defaultHeight: number;
    hasSearch: boolean;
    largeHeight: number;
    lockValue?: Animated.SharedValue<number | null>;
    scrollValue?: Animated.SharedValue<number>;
    subtitle?: string;
    theme: Theme;
    title: string;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.sidebarBg,
        paddingHorizontal: 20,
    },
    heading: {
        ...typography('Heading', 800),
        color: theme.sidebarHeaderTextColor,
    },
    subHeading: {
        ...typography('Heading', 200, 'Regular'),
        color: changeOpacity(theme.sidebarHeaderTextColor, 0.8),
    },
}));

const NavigationHeaderLargeTitle = ({
    defaultHeight,
    largeHeight,
    hasSearch,
    scrollValue,
    lockValue,
    subtitle,
    theme,
    title,
}: Props) => {
    const styles = getStyleSheet(theme);

    const transform = useAnimatedStyle(() => {
        const value = scrollValue?.value || 0;
        const translateY = lockValue?.value ? -lockValue.value : Math.min(-value, largeHeight - defaultHeight);
        return {
            transform: [{translateY}],
        };
    });

    const containerStyle = useMemo(() => {
        return [{height: largeHeight - defaultHeight}, styles.container];
    }, [defaultHeight, largeHeight, theme]);

    return (
        <Animated.View style={[containerStyle, transform]}>
            <Text
                ellipsizeMode='tail'
                numberOfLines={1}
                style={styles.heading}
                testID='navigation.large_header.title'
            >
                {title}
            </Text>
            {!hasSearch && Boolean(subtitle) &&
            <Text
                ellipsizeMode='tail'
                numberOfLines={1}
                style={styles.subHeading}
                testID='navigation.large_header.subtitle'
            >
                {subtitle}
            </Text>
            }
        </Animated.View>
    );
};

export default NavigationHeaderLargeTitle;

