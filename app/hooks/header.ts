// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useMemo} from 'react';
import {NativeScrollEvent, Platform} from 'react-native';
import Animated, {scrollTo, useAnimatedRef, useAnimatedScrollHandler, useSharedValue} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import ViewConstants from '@constants/view';
import {useIsTablet} from '@hooks/device';

type HeaderScrollContext = {
    momentum?: number;
    start?: number;
};

export const useDefaultHeaderHeight = () => {
    const isTablet = useIsTablet();

    if (isTablet) {
        return ViewConstants.TABLET_HEADER_HEIGHT;
    }

    if (Platform.OS === 'ios') {
        return ViewConstants.IOS_DEFAULT_HEADER_HEIGHT;
    }

    return ViewConstants.ANDROID_DEFAULT_HEADER_HEIGHT;
};

export const useLargeHeaderHeight = (hasLargeTitle: boolean, hasSubtitle: boolean, hasSearch: boolean) => {
    const defaultHeight = useDefaultHeaderHeight();
    if (hasLargeTitle && hasSubtitle && !hasSearch) {
        return defaultHeight + ViewConstants.LARGE_HEADER_TITLE + ViewConstants.HEADER_WITH_SUBTITLE;
    } else if (hasLargeTitle && hasSearch) {
        return defaultHeight + ViewConstants.LARGE_HEADER_TITLE + ViewConstants.HEADER_WITH_SEARCH_HEIGHT;
    }

    return defaultHeight + ViewConstants.LARGE_HEADER_TITLE;
};

export const useHeaderHeight = (hasLargeTitle: boolean, hasSubtitle: boolean, hasSearch: boolean) => {
    const defaultHeight = useDefaultHeaderHeight();
    const largeHeight = useLargeHeaderHeight(hasLargeTitle, hasSubtitle, hasSearch);
    return useMemo(() => {
        return {
            defaultHeight,
            largeHeight,
        };
    }, [defaultHeight, hasSearch, largeHeight]);
};

export const useCollapsibleHeader = <T>(isLargeTitle: boolean, hasSubtitle: boolean, hasSearch: boolean) => {
    const insets = useSafeAreaInsets();
    const isTablet = useIsTablet();
    const animatedRef = useAnimatedRef<Animated.ScrollView>();
    const {largeHeight, defaultHeight} = useHeaderHeight(true, hasSubtitle, hasSearch);
    const scrollValue = useSharedValue(0);

    function snapIfNeeded(dir: string, offset: number) {
        'worklet';
        if (dir === 'up' && offset < defaultHeight) {
            const diffHeight = largeHeight - defaultHeight;
            let position = 0;
            if (Platform.OS === 'ios') {
                const searchInset = isTablet ? ViewConstants.TABLET_HEADER_SEARCH_INSET : ViewConstants.IOS_HEADER_SEARCH_INSET;
                position = (diffHeight - (hasSearch ? -searchInset : insets.top));
            } else {
                position = hasSearch ? largeHeight + ViewConstants.ANDROID_HEADER_SEARCH_INSET : diffHeight;
            }
            scrollTo(animatedRef, 0, position!, true);
        } else if (dir === 'down') {
            let inset = 0;
            if (Platform.OS === 'ios') {
                const searchInset = isTablet ? ViewConstants.TABLET_HEADER_SEARCH_INSET : ViewConstants.IOS_HEADER_SEARCH_INSET;
                inset = defaultHeight + (hasSearch ? searchInset : 0);
            } else {
                inset = largeHeight + (hasSearch ? ViewConstants.ANDROID_HEADER_SEARCH_INSET : 0);
            }
            if (offset < inset) {
                scrollTo(animatedRef, 0, -insets.top, true);
            }
        }
    }

    const onScroll = useAnimatedScrollHandler({
        onBeginDrag: (e: NativeScrollEvent, ctx: HeaderScrollContext) => {
            ctx.start = e.contentOffset.y;
        },
        onScroll: (e) => {
            scrollValue.value = e.contentOffset.y;
        },
        onEndDrag: (e, ctx) => {
            if (ctx.start !== undefined && Platform.OS === 'ios') {
                const dir = e.contentOffset.y < ctx.start ? 'down' : 'up';
                const offset = Math.abs(e.contentOffset.y);
                ctx.start = undefined;
                snapIfNeeded(dir, offset);
            }
        },
        onMomentumBegin: (e, ctx) => {
            ctx.momentum = Platform.OS === 'ios' ? e.contentOffset.y : ctx.start;
        },
        onMomentumEnd: (e, ctx) => {
            if (ctx.momentum !== undefined) {
                const offset = Math.abs(e.contentOffset.y);
                const searchInset = isTablet ? ViewConstants.TABLET_HEADER_SEARCH_INSET : ViewConstants.IOS_HEADER_SEARCH_INSET;
                const dir = e.contentOffset.y < ctx.momentum ? 'down' : 'up';
                ctx.momentum = undefined;

                if (Platform.OS === 'android') {
                    // This avoids snapping to the defaultHeight when already at the top and scrolling down
                    if (dir === 'up' && offset === 0) {
                        return;
                    }
                    snapIfNeeded(dir, offset);
                } else if (dir === 'down' && offset < (defaultHeight + (hasSearch ? searchInset : 0))) {
                    scrollTo(animatedRef, 0, -insets.top, true);
                }
            }
        },
    }, [insets, defaultHeight, largeHeight]);

    let searchPadding = 0;
    if (hasSearch) {
        searchPadding = ViewConstants.SEARCH_INPUT_HEIGHT +
            ViewConstants.IOS_HEADER_SEARCH_INSET +
            ViewConstants.ANDROID_HEADER_SEARCH_INSET;
    }

    return {
        defaultHeight,
        largeHeight,
        scrollPaddingTop: (isLargeTitle ? largeHeight : defaultHeight) + searchPadding,
        scrollRef: animatedRef as unknown as React.RefObject<T>,
        scrollValue,
        onScroll,
    };
};

export default useHeaderHeight;
