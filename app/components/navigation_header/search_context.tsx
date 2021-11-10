// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import Animated, {useAnimatedStyle} from 'react-native-reanimated';

import {ANDROID_HEADER_SEARCH_INSET} from '@constants/view';
import {makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    defaultHeight: number;
    largeHeight: number;
    scrollValue: Animated.SharedValue<number>;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.sidebarBg,
        height: 20,
        position: 'absolute',
        width: '100%',
    },
}));

const NavigationHeaderSearchContext = ({
    defaultHeight,
    largeHeight,
    scrollValue,
    theme,
}: Props) => {
    const styles = getStyleSheet(theme);

    const marginTop = useAnimatedStyle(() => {
        return {marginTop: (-scrollValue.value + largeHeight + defaultHeight) - ANDROID_HEADER_SEARCH_INSET};
    }, [defaultHeight, largeHeight]);

    return (
        <Animated.View style={[styles.container, marginTop]}>
            <Animated.View style={styles.content}/>
        </Animated.View>
    );
};

export default NavigationHeaderSearchContext;

