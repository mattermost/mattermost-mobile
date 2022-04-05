// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {FlatList, Platform, ScrollView, SectionList, VirtualizedList} from 'react-native';
import Animated, {useAnimatedStyle} from 'react-native-reanimated';

import Search, {SearchProps} from '@components/search';
import {ANDROID_HEADER_SEARCH_INSET, IOS_HEADER_SEARCH_INSET, SEARCH_INPUT_HEIGHT, TABLET_HEADER_SEARCH_INSET} from '@constants/view';
import {useIsTablet} from '@hooks/device';
import {changeOpacity, makeStyleSheetFromTheme} from '@utils/theme';
import {typography} from '@utils/typography';

type Props = SearchProps & {
    defaultHeight: number;
    forwardedRef?: React.RefObject<ScrollView | FlatList | SectionList>;
    largeHeight: number;
    scrollValue?: Animated.SharedValue<number>;
    theme: Theme;
    top: number;
}

const getStyleSheet = makeStyleSheetFromTheme((theme: Theme) => ({
    container: {
        backgroundColor: theme.sidebarBg,
        height: SEARCH_INPUT_HEIGHT + 5,
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
    defaultHeight,
    forwardedRef,
    largeHeight,
    scrollValue,
    theme,
    top,
    ...searchProps
}: Props) => {
    const isTablet = useIsTablet();
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
    }, [defaultHeight, largeHeight, top]);

    const onFocus = useCallback((e) => {
        const searchInset = isTablet ? TABLET_HEADER_SEARCH_INSET : IOS_HEADER_SEARCH_INSET;
        const offset = Platform.select({android: largeHeight + ANDROID_HEADER_SEARCH_INSET, default: defaultHeight + searchInset});
        if (forwardedRef?.current && Math.abs((scrollValue?.value || 0)) <= top) {
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

