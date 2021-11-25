// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import Animated, {useAnimatedStyle} from 'react-native-reanimated';

import {makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    defaultHeight: number;
    hasSearch: boolean;
    isLargeTitle: boolean;
    largeHeight: number;
    scrollValue: Animated.SharedValue<number>;
    theme: Theme;
    top: number;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.sidebarBg,
        height: 16,
        position: 'absolute',
        width: '100%',
    },
    content: {
        backgroundColor: theme.centerChannelBg,
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
        flex: 1,
    },
}));

const NavigationHeaderContext = ({
    defaultHeight,
    hasSearch,
    isLargeTitle,
    largeHeight,
    scrollValue,
    theme,
    top,
}: Props) => {
    const styles = getStyleSheet(theme);

    const marginTop = useAnimatedStyle(() => {
        const normal = defaultHeight + top;
        const calculated = -(top + scrollValue.value);
        const searchHeight = hasSearch ? defaultHeight + 9 : 0;
        if (!isLargeTitle) {
            return {marginTop: Math.max((normal + calculated), normal)};
        }

        return {marginTop: Math.max((-scrollValue.value + largeHeight + searchHeight), normal)};
    }, [defaultHeight, largeHeight, isLargeTitle, hasSearch, top]);

    return (
        <Animated.View style={[styles.container, marginTop]}>
            <Animated.View style={styles.content}/>
        </Animated.View>
    );
};

export default NavigationHeaderContext;

