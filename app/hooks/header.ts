// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {NativeScrollEvent, Platform} from 'react-native';
import Animated, {scrollTo, useAnimatedRef, useAnimatedScrollHandler, useSharedValue} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import ViewConstants, {HEADER_SEARCH_BOTTOM_MARGIN} from '@constants/view';
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
    const animatedRef = useAnimatedRef<Animated.ScrollView>();
    const {largeHeight, defaultHeight} = useHeaderHeight(true, hasSubtitle, hasSearch);
    const scrollValue = useSharedValue(0);

    function snapIfNeeded(dir: string, offset: number) {
        'worklet';
        if (dir === 'up' && offset < defaultHeight) {
            const diffHeight = largeHeight - defaultHeight;
            let position = 0;
            if (Platform.OS === 'ios') {
                position = (diffHeight - (hasSearch ? -HEADER_SEARCH_BOTTOM_MARGIN : insets.top));
            } else {
                position = hasSearch ? largeHeight + HEADER_SEARCH_BOTTOM_MARGIN : diffHeight;
            }
            scrollTo(animatedRef, 0, position, true);
        } else if (dir === 'down') {
            const inset = largeHeight + (hasSearch ? HEADER_SEARCH_BOTTOM_MARGIN : 0);
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
                const dir = e.contentOffset.y < ctx.momentum ? 'down' : 'up';
                ctx.momentum = undefined;

                if (Platform.OS === 'android') {
                    // This avoids snapping to the defaultHeight when already at the top and scrolling down
                    if (dir === 'up' && offset === 0) {
                        return;
                    }
                    snapIfNeeded(dir, offset);
                } else if (dir === 'down' && offset < (defaultHeight + (hasSearch ? HEADER_SEARCH_BOTTOM_MARGIN : 0))) {
                    scrollTo(animatedRef, 0, -insets.top, true);
                }
            }
        },
    }, [insets, defaultHeight, largeHeight]);

    const hideHeader = useCallback(() => {
        const offset = largeHeight + HEADER_SEARCH_BOTTOM_MARGIN;
        if (animatedRef?.current && Math.abs((scrollValue?.value || 0)) <= insets.top) {
            if ('scrollTo' in animatedRef.current) {
                animatedRef.current.scrollTo({y: offset, animated: true});
            } else if ('scrollToOffset' in animatedRef.current) {
                (animatedRef.current as any).scrollToOffset({
                    offset,
                    animated: true,
                });
            } else {
                // No scroll for section lists?
            }
        }
    }, [largeHeight, defaultHeight]);

    let searchPadding = 0;
    if (hasSearch) {
        searchPadding = ViewConstants.HEADER_SEARCH_HEIGHT + ViewConstants.HEADER_SEARCH_BOTTOM_MARGIN;
    }

    return {
        scrollPaddingTop: (isLargeTitle ? largeHeight : defaultHeight) + searchPadding,
        scrollRef: animatedRef as unknown as React.RefObject<T>,
        scrollValue,
        onScroll,
        hideHeader,
    };
};

export default useHeaderHeight;
