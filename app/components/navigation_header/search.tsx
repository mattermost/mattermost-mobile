// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {FlatList, Platform, ScrollView, SectionList, VirtualizedList} from 'react-native';
import Animated, {useAnimatedStyle} from 'react-native-reanimated';

import Search, {SearchProps} from '@components/search';
import {SEARCH_INPUT_HEIGHT} from '@constants/view';
import {makeStyleSheetFromTheme} from '@utils/theme';

type Props = SearchProps & {
    defaultHeight: number;
    forwardedRef?: React.RefObject<ScrollView | FlatList | SectionList>;
    largeHeight: number;
    scrollValue: Animated.SharedValue<number>;
    theme: Theme;
    top: number;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.sidebarBg,
        justifyContent: 'flex-start',
        paddingHorizontal: 20,
        paddingTop: 4,
        position: 'absolute',
        width: '100%',
        zIndex: 10,
    },
}));

const NavigationSearch = ({
    defaultHeight,
    forwardedRef,
    largeHeight,
    scrollValue,
    theme,
    top,
    ...searchProps
}: Props) => {
    const styles = getStyleSheet(theme);

    const searchTop = useAnimatedStyle(() => {
        return {marginTop: Math.max((-scrollValue.value + largeHeight), top)};
    }, [defaultHeight, largeHeight, top]);

    const onFocus = useCallback((e) => {
        const offset = Platform.select({android: largeHeight, default: SEARCH_INPUT_HEIGHT});
        if (forwardedRef?.current && Math.abs(scrollValue.value) <= top) {
            if ((forwardedRef.current as ScrollView).scrollTo) {
                (forwardedRef.current as ScrollView).scrollTo({y: offset, animated: true});
            } else {
                (forwardedRef.current as VirtualizedList<any>).scrollToOffset({
                    offset,
                    animated: true,
                });
            }
        }
        searchProps.onFocus?.(e);
    }, [largeHeight, top]);

    const style = useMemo(() => ({height: defaultHeight, ...styles.container}), [defaultHeight, theme]);

    return (
        <Animated.View style={[style, searchTop]}>
            <Search
                {...searchProps}
                onFocus={onFocus}
            />
        </Animated.View>
    );
};

export default NavigationSearch;

