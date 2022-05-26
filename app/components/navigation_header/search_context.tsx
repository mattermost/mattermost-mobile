// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import Animated, {useAnimatedStyle} from 'react-native-reanimated';

import {HEADER_SEARCH_BOTTOM_MARGIN, HEADER_SEARCH_HEIGHT} from '@constants/view';
import {makeStyleSheetFromTheme} from '@utils/theme';

type Props = {
    defaultHeight: number;
    largeHeight: number;
    scrollValue?: Animated.SharedValue<number>;
    theme: Theme;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.sidebarBg,
        height: HEADER_SEARCH_BOTTOM_MARGIN * 2,
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
        return {marginTop: (largeHeight + HEADER_SEARCH_HEIGHT) - (scrollValue?.value || 0)};
    }, [defaultHeight, largeHeight]);

    return (
        <Animated.View style={[styles.container, marginTop]}/>
    );
};

export default NavigationHeaderSearchContext;

