// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render, screen} from '@testing-library/react-native';
import React from 'react';

import * as Device from '@hooks/device';
import {useBannerGestureRootPosition} from '@hooks/useBannerGestureRootPosition';

import BannerSection from './banner_section';

import type {FloatingBannerConfig} from './types';

jest.mock('@hooks/device', () => ({
    useIsTablet: jest.fn(),
    useKeyboardHeight: jest.fn(),
    useWindowDimensions: jest.fn(() => ({width: 375, height: 812})),
}));

jest.mock('@hooks/useBannerGestureRootPosition', () => ({
    useBannerGestureRootPosition: jest.fn(),
}));

jest.mock('react-native-safe-area-context', () => ({
    useSafeAreaInsets: jest.fn(() => ({top: 44, bottom: 0, left: 0, right: 0})),
}));

jest.mock('react-native-reanimated', () => {
    const {View} = require('react-native');
    const ReactLib = require('react');

    const AnimatedView = ReactLib.forwardRef((props: Record<string, unknown>, ref: unknown) => {
        return ReactLib.createElement(View, {...props, ref});
    });
    AnimatedView.displayName = 'AnimatedView';

    return {
        __esModule: true,
        useSharedValue: (initialValue: unknown) => ({value: initialValue}),
        useAnimatedStyle: (fn: () => unknown) => fn(),
        withTiming: (value: unknown) => value,
        default: {
            View: AnimatedView,
            createAnimatedComponent: (component: unknown) => component,
        },
    };
});

jest.mock('@components/banner/Banner', () => {
    const mockView = require('react-native').View;
    const mockText = require('react-native').Text;
    const mockPressable = require('react-native').Pressable;
    const mockReact = require('react');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function MockBanner({children, onDismiss, ...props}: {children?: any; onDismiss?: any; [key: string]: any}) {
        return mockReact.createElement(
            mockView,
            {testID: 'banner', ...props},
            children,
            onDismiss && mockReact.createElement(
                mockPressable,
                {testID: 'banner-dismiss', onPress: onDismiss},
                mockReact.createElement(mockText, null, 'Dismiss'),
            ),
        );
    };
});

jest.mock('@components/banner/banner_item', () => {
    const mockView = require('react-native').View;
    const mockText = require('react-native').Text;
    const mockPressable = require('react-native').Pressable;
    const mockReact = require('react');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function MockBannerItem({banner, onPress, onDismiss}: {banner: any; onPress?: any; onDismiss?: any}) {
        return mockReact.createElement(
            mockView,
            {testID: 'banner-item', 'data-banner-id': banner.id},
            mockReact.createElement(mockText, null, banner.title),
            mockReact.createElement(mockText, null, banner.message),
            onPress && mockReact.createElement(
                mockPressable,
                {testID: 'banner-item-press', onPress: () => onPress(banner)},
                mockReact.createElement(mockText, null, 'Press'),
            ),
            onDismiss && mockReact.createElement(
                mockPressable,
                {testID: 'banner-item-dismiss', onPress: () => onDismiss(banner)},
                mockReact.createElement(mockText, null, 'Dismiss'),
            ),
        );
    };
});

describe('BannerSection', () => {
    const mockOnBannerPress = jest.fn();
    const mockOnBannerDismiss = jest.fn();

    const createMockBanner = (overrides: Partial<FloatingBannerConfig> = {}): FloatingBannerConfig => ({
        id: 'test-banner-1',
        title: 'Test Banner',
        message: 'This is a test message',
        type: 'info',
        dismissible: true,
        ...overrides,
    });

    const renderBannerSection = (
        sectionBanners: FloatingBannerConfig[],
        position: 'top' | 'bottom' = 'top',
    ) => {
        return render(
            <BannerSection
                sectionBanners={sectionBanners}
                position={position}
                onBannerPress={mockOnBannerPress}
                onBannerDismiss={mockOnBannerDismiss}
            />,
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(Device.useIsTablet).mockReturnValue(false);
        jest.mocked(Device.useKeyboardHeight).mockReturnValue(0);
        jest.mocked(useBannerGestureRootPosition).mockReturnValue({
            height: 40,
            top: 0,
        });
    });

    describe('rendering', () => {
        it('should return null when no banners are provided', () => {
            renderBannerSection([], 'top');

            expect(screen.queryByTestId('floating-banner-top-container')).toBeNull();
            expect(screen.queryByTestId('floating-banner-bottom-container')).toBeNull();
        });

        it('should render top container with correct testID', () => {
            const banners = [createMockBanner()];
            renderBannerSection(banners, 'top');

            expect(screen.getByTestId('floating-banner-top-container')).toBeDefined();
        });

        it('should render bottom container with correct testID', () => {
            const banners = [createMockBanner()];
            renderBannerSection(banners, 'bottom');

            expect(screen.getByTestId('floating-banner-bottom-container')).toBeDefined();
        });

        it('should render multiple banners', () => {
            const banners = [
                createMockBanner({id: 'banner-1'}),
                createMockBanner({id: 'banner-2'}),
                createMockBanner({id: 'banner-3'}),
            ];
            renderBannerSection(banners);

            const bannerElements = screen.getAllByTestId('banner');
            expect(bannerElements).toHaveLength(3);
        });
    });
});

