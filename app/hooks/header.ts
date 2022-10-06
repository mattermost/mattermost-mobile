// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {NativeScrollEvent, Platform} from 'react-native';
import Animated, {runOnJS, scrollTo, useAnimatedRef, useAnimatedScrollHandler, useDerivedValue, useSharedValue} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import ViewConstants from '@constants/view';
import {useIsTablet} from '@hooks/device';

type HeaderScrollContext = {
    dragging?: boolean;
    momentum?: string;
    start?: number;
};

export const MAX_OVERSCROLL = 80;

export const useDefaultHeaderHeight = (hasSearch = false) => {
    const isTablet = useIsTablet();
    let height;
    if (isTablet) {
        height = hasSearch ? ViewConstants.TABLET_SEARCH_HEIGHT_COLLAPSED : ViewConstants.TABLET_HEADER_HEIGHT;
    } else if (Platform.OS === 'ios') {
        height = ViewConstants.IOS_DEFAULT_HEADER_HEIGHT;
        height += hasSearch ? 7 : 0;
    } else {
        height = ViewConstants.ANDROID_DEFAULT_HEADER_HEIGHT;
    }
    return height;
};

export const useLargeHeaderHeight = (hasSearch = false) => {
    const isTablet = useIsTablet();
    const defaultHeight = useDefaultHeaderHeight(hasSearch);
    if (isTablet && hasSearch) {
        return ViewConstants.TABLET_SEARCH_HEIGHT_EXPANDED;
    }
    return defaultHeight + ViewConstants.LARGE_HEADER_TITLE + ViewConstants.HEADER_WITH_SUBTITLE;
};

export const useHeaderHeight = (hasSearch = false) => {
    const defaultHeight = useDefaultHeaderHeight(hasSearch);
    const largeHeight = useLargeHeaderHeight(hasSearch);
    return useMemo(() => {
        return {
            defaultHeight,
            largeHeight,
        };
    }, [defaultHeight, largeHeight, hasSearch]);
};

export const useCollapsibleHeader = <T>(isLargeTitle: boolean, onSnap?: (offset: number) => void, hasSearch = false) => {
    const insets = useSafeAreaInsets();
    const animatedRef = useAnimatedRef<Animated.ScrollView>();
    const {largeHeight, defaultHeight} = useHeaderHeight(hasSearch);
    const scrollValue = useSharedValue(0);
    const lockValue = useSharedValue<number | null>(null);
    const autoScroll = useSharedValue(false);
    const snapping = useSharedValue(false);

    const headerHeight = useDerivedValue(() => {
        const value = -(scrollValue?.value || 0);
        const header = (isLargeTitle ? largeHeight : defaultHeight);
        const height = header + value + insets.top;
        if (height > header + (insets.top * 2)) {
            return Math.min(height, largeHeight + insets.top + MAX_OVERSCROLL);
        }
        return Math.max(height, defaultHeight + insets.top);
    });

    function snapIfNeeded(dir: string, offset: number) {
        'worklet';
        if (onSnap && !snapping.value) {
            snapping.value = true;
            if (dir === 'down' && offset < largeHeight) {
                runOnJS(onSnap)(0);
            } else if (dir === 'up' && offset < (defaultHeight + insets.top)) {
                runOnJS(onSnap)((largeHeight - defaultHeight));
            }
            snapping.value = false;
        }
    }

    const onScroll = useAnimatedScrollHandler({
        onBeginDrag: (e: NativeScrollEvent, ctx: HeaderScrollContext) => {
            ctx.start = e.contentOffset.y;
            ctx.dragging = true;
        },
        onScroll: (e, ctx) => {
            if (ctx.dragging || autoScroll.value) {
                scrollValue.value = e.contentOffset.y;
            } else {
                // here we want to ensure that the scroll position
                // always start at 0 if the user has not dragged
                // the scrollview manually
                scrollValue.value = 0;
                scrollTo(animatedRef, 0, 0, false);
            }
        },
        onEndDrag: (e, ctx) => {
            if (ctx.start !== undefined) {
                const dir = e.contentOffset.y < ctx.start ? 'down' : 'up';
                const offset = Math.abs(e.contentOffset.y);
                snapIfNeeded(dir, offset);
            }
        },
        onMomentumBegin: (e, ctx) => {
            ctx.momentum = e.contentOffset.y < (ctx.start || 0) ? 'down' : 'up';
        },
        onMomentumEnd: (e, ctx) => {
            ctx.start = undefined;
            ctx.dragging = false;
            if (ctx.momentum === 'down') {
                const offset = Math.abs(e.contentOffset.y);

                if (onSnap && offset < largeHeight) {
                    runOnJS(onSnap)(0);
                }
                ctx.momentum = undefined;
            }
        },
    }, [insets, defaultHeight, largeHeight, animatedRef]);

    const hideHeader = useCallback((lock = false) => {
        const offset = largeHeight - defaultHeight;
        if (lock) {
            lockValue.value = defaultHeight + insets.top;
        }
        if (animatedRef?.current && Math.abs((scrollValue?.value || 0)) <= insets.top) {
            autoScroll.value = true;
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

    const unlock = () => {
        lockValue.value = null;
    };

    const scrollPaddingTop = (isLargeTitle ? largeHeight : defaultHeight) + insets.top;

    return {
        defaultHeight,
        largeHeight,
        scrollPaddingTop,
        scrollRef: animatedRef as unknown as React.RefObject<T>,
        scrollValue,
        onScroll,
        hideHeader,
        lockValue,
        unlock,
        headerHeight,
    };
};

export default useHeaderHeight;
