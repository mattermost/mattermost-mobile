// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {Platform} from 'react-native';
import Animated, {useAnimatedStyle} from 'react-native-reanimated';

import Search, {SearchProps} from '@components/search';
import {HEADER_SEARCH_HEIGHT} from '@constants/view';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = SearchProps & {
    largeHeight: number;
    scrollValue?: Animated.SharedValue<number>;
    hideHeader?: (visible: boolean) => void;
    theme: Theme;
    top: number;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.sidebarBg,
        height: HEADER_SEARCH_HEIGHT,
        justifyContent: 'flex-start',
        paddingHorizontal: 20,
        position: 'absolute',
        width: '100%',
        zIndex: 10,
    },
    inputContainerStyle: {
        backgroundColor: changeOpacity(theme.sidebarText, 0.12),
    },
    inputStyle: {
        color: theme.sidebarText,
    },
}));

const NavigationSearch = ({
    largeHeight,
    scrollValue,
    hideHeader: setHeaderVisibility,
    theme,
    top,
    ...searchProps
}: Props) => {
    const styles = getStyleSheet(theme);

    const cancelButtonProps: SearchProps['cancelButtonProps'] = useMemo(() => ({
        buttonTextStyle: {
            color: changeOpacity(theme.sidebarText, 0.72),
            ...typography('Body', 100, 'Regular'),
        },
        color: theme.sidebarText,
    }), [theme]);

    const searchTop = useAnimatedStyle(() => {
        return {marginTop: Math.max((-(scrollValue?.value || 0) + largeHeight), top)};
    }, [largeHeight, top]);

    const onFocus = useCallback((e) => {
        setHeaderVisibility?.(false);
        searchProps.onFocus?.(e);
    }, [setHeaderVisibility, searchProps.onFocus]);

    return (
        <Animated.View style={[styles.container, searchTop]}>
            <Search
                {...searchProps}
                cancelButtonProps={cancelButtonProps}
                clearIconColor={theme.sidebarText}
                inputContainerStyle={styles.inputContainerStyle}
                inputStyle={styles.inputStyle}
                onFocus={onFocus}
                placeholderTextColor={changeOpacity(theme.sidebarText, Platform.select({android: 0.56, default: 0.72}))}
                searchIconColor={theme.sidebarText}
                selectionColor={theme.sidebarText}
            />
        </Animated.View>
    );
};

export default NavigationSearch;

