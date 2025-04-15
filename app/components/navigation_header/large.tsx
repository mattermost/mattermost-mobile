// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {Text} from 'react-native';
import Animated, {useAnimatedStyle} from 'react-native-reanimated';

import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = {
    heightOffset: number;
    hasSearch: boolean;
    subtitle?: string;
    theme: Theme;
    title: string;
    translateY: Animated.DerivedValue<number>;
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
    heightOffset,
    hasSearch,
    subtitle,
    theme,
    title,
    translateY,
}: Props) => {
    const styles = getStyleSheet(theme);

    const transform = useAnimatedStyle(() => (
        {transform: [{translateY: translateY.value}]}
    ), [translateY?.value]);

    const containerStyle = useMemo(() => {
        return [{height: heightOffset}, styles.container];
    }, [heightOffset, styles.container]);

    return (
        <Animated.View style={[containerStyle, transform]}>
            <Text
                ellipsizeMode='tail'
                numberOfLines={1}
                style={[styles.heading]}
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

