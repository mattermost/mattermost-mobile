// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React, {useCallback, useMemo} from 'react';
import {NativeScrollEvent, Platform} from 'react-native';
import Animated, {useAnimatedRef, useAnimatedScrollHandler, useSharedValue} from 'react-native-reanimated';

import ViewConstants from '@constants/view';
import {useIsTablet} from '@hooks/device';

type HeaderScrollContext = {
    dragging?: boolean;
    lastValue?: number;
    updatingHeader?: boolean;
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
    const animatedRef = useAnimatedRef<Animated.ScrollView>();
    const {largeHeight, defaultHeight} = useHeaderHeight(true, hasSubtitle, hasSearch);
    const headerPosition = useSharedValue(0);
    const maxHeaderHeight = largeHeight - defaultHeight;

    const onScroll = useAnimatedScrollHandler({
        onBeginDrag: (e: NativeScrollEvent, ctx: HeaderScrollContext) => {
            ctx.lastValue = e.contentOffset.y;
            ctx.dragging = true;
            ctx.updatingHeader = false;
        },
        onScroll: (e, ctx) => {
            if (!ctx.dragging) {
                return;
            }
            if (ctx.updatingHeader) {
                ctx.lastValue = e.contentOffset.y;
                ctx.updatingHeader = false;
                return;
            }
            const diff = e.contentOffset.y - ctx.lastValue!;
            if (!diff) {
                return;
            }

            if (
                (diff > 0 && headerPosition.value === maxHeaderHeight) ||
                (diff < 0 && headerPosition.value === 0)
            ) {
                ctx.lastValue = e.contentOffset.y;
            } else {
                const newHeaderPosition = headerPosition.value + diff;
                headerPosition.value = diff > 0 ? Math.min(maxHeaderHeight, newHeaderPosition) : Math.max(0, newHeaderPosition);
                ctx.updatingHeader = true;
            }
        },
        onEndDrag: (e, ctx: HeaderScrollContext) => {
            ctx.dragging = false;
            if (headerPosition.value > maxHeaderHeight / 2) {
                headerPosition.value = maxHeaderHeight;
            } else {
                headerPosition.value = 0;
            }
        },
    }, [maxHeaderHeight]);

    const setHeaderVisibility = useCallback((visible: boolean) => {
        headerPosition.value = visible ? 0 : maxHeaderHeight;
    }, [maxHeaderHeight]);

    let searchPadding = 0;
    if (hasSearch) {
        searchPadding = ViewConstants.HEADER_SEARCH_HEIGHT + 10;
    }

    return {
        scrollPaddingTop: (isLargeTitle ? largeHeight : defaultHeight) + searchPadding,
        scrollRef: animatedRef as unknown as React.RefObject<T>,
        onScroll,
        headerPosition,
        setHeaderVisibility,
    };
};

export default useHeaderHeight;
