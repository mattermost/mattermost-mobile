// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {useMemo} from 'react';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {BOOKMARKS_BAR_HEIGHT, CHANNEL_BANNER_HEIGHT, DEFAULT_HEADER_HEIGHT, TABLET_HEADER_HEIGHT} from '@constants/view';
import {useIsTablet} from '@hooks/device';

import type {BannerPosition} from '../Banner';

interface UseBannerPositionProps {
    position: BannerPosition;
    includeBookmarkBar: boolean;
    includeChannelBanner: boolean;
    customTopOffset: number;
    customBottomOffset: number;
    threadScreen: boolean;
}

export const useBannerPosition = ({
    position,
    includeBookmarkBar,
    includeChannelBanner,
    customTopOffset,
    customBottomOffset,
    threadScreen,
}: UseBannerPositionProps) => {
    const insets = useSafeAreaInsets();
    const isTablet = useIsTablet();

    const positionStyle = useMemo(() => {
        if (position === 'bottom') {
            return {
                bottom: customBottomOffset,
            };
        }

        let topOffset = insets.top + customTopOffset;

        const shouldAddTabletHeader = isTablet && !threadScreen;
        const shouldAddPhoneHeader = !isTablet && !threadScreen;

        if (shouldAddTabletHeader) {
            topOffset += TABLET_HEADER_HEIGHT;
        } else if (shouldAddPhoneHeader) {
            topOffset += DEFAULT_HEADER_HEIGHT;
        }

        if (includeBookmarkBar) {
            topOffset += BOOKMARKS_BAR_HEIGHT;
        }

        if (includeChannelBanner) {
            topOffset += CHANNEL_BANNER_HEIGHT;
        }

        topOffset += 8;

        return {
            top: topOffset,
        };
    }, [
        position,
        insets.top,
        isTablet,
        threadScreen,
        includeBookmarkBar,
        includeChannelBanner,
        customTopOffset,
        customBottomOffset,
    ]);

    return {positionStyle};
};
