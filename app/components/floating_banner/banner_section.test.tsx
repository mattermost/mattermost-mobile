// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render, screen} from '@testing-library/react-native';
import React from 'react';

import {
    FLOATING_BANNER_BOTTOM_OFFSET_PHONE_IOS,
    FLOATING_BANNER_TABLET_EXTRA_BOTTOM_OFFSET,
    FLOATING_BANNER_BOTTOM_OFFSET_WITH_KEYBOARD_IOS,
    FLOATING_BANNER_BOTTOM_OFFSET_WITH_KEYBOARD_ANDROID,
} from '@constants/view';
import * as Device from '@hooks/device';

import BannerSection from './banner_section';

import type {FloatingBannerConfig} from './types';

jest.mock('@hooks/device');

jest.mock('react-native-reanimated', () => {
    const {View} = require('react-native');
    const ReactLib = require('react');

    const AnimatedView = ReactLib.forwardRef((props: Record<string, unknown>, ref: unknown) => {
        return ReactLib.createElement(View, {...props, ref});
    });
    AnimatedView.displayName = 'AnimatedView';

    return {
        __esModule: true,
        useAnimatedStyle: (fn: () => unknown) => fn(),
        withTiming: (value: unknown) => value,
        default: {
            View: AnimatedView,
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
    });

    describe('rendering', () => {
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

    describe('tablet and positioning', () => {
        it('should apply tablet-specific bottom offset', () => {
            jest.mocked(Device.useIsTablet).mockReturnValue(true);

            const banners = [createMockBanner({id: 'bottom-1'})];
            renderBannerSection(banners, 'bottom');

            const container = screen.getByTestId('floating-banner-bottom-container');
            expect(container.props.style[1].bottom).toBe(FLOATING_BANNER_BOTTOM_OFFSET_PHONE_IOS + FLOATING_BANNER_TABLET_EXTRA_BOTTOM_OFFSET);
        });

        it('should apply tablet-specific top positioning', () => {
            jest.mocked(Device.useIsTablet).mockReturnValue(true);

            const banners = [createMockBanner({id: 'top-tablet-banner'})];
            renderBannerSection(banners, 'top');

            const bannerElements = screen.getAllByTestId('banner');
            expect(bannerElements).toHaveLength(1);
            expect(bannerElements[0].props.visible).toBe(true);
        });
    });

    describe('keyboard height adjustment', () => {
        it('should adjust bottom banner position when keyboard is open on iOS', () => {
            const keyboardHeight = 300;
            jest.mocked(Device.useKeyboardHeight).mockReturnValue(keyboardHeight);

            const banners = [createMockBanner({id: 'bottom-banner'})];
            renderBannerSection(banners, 'bottom');

            const container = screen.getByTestId('floating-banner-bottom-container');
            expect(container.props.style[1].bottom).toBe(FLOATING_BANNER_BOTTOM_OFFSET_WITH_KEYBOARD_IOS + keyboardHeight);
        });

        it('should adjust bottom banner position on tablet when keyboard is open', () => {
            const keyboardHeight = 250;
            jest.mocked(Device.useIsTablet).mockReturnValue(true);
            jest.mocked(Device.useKeyboardHeight).mockReturnValue(keyboardHeight);

            const banners = [createMockBanner({id: 'tablet-bottom-banner'})];
            renderBannerSection(banners, 'bottom');

            const container = screen.getByTestId('floating-banner-bottom-container');
            const expectedBottom = FLOATING_BANNER_BOTTOM_OFFSET_WITH_KEYBOARD_IOS + keyboardHeight;
            expect(container.props.style[1].bottom).toBe(expectedBottom);
        });

        it('should not adjust top banner position when keyboard is open', () => {
            const keyboardHeight = 300;
            jest.mocked(Device.useKeyboardHeight).mockReturnValue(keyboardHeight);

            const banners = [createMockBanner({id: 'top-banner'})];
            renderBannerSection(banners, 'top');

            const container = screen.getByTestId('floating-banner-top-container');
            const styleProp = container.props.style as Array<Record<string, unknown>>;

            const hasBottomStyle = styleProp.some((style) =>
                typeof style === 'object' && style !== null && 'bottom' in style,
            );
            expect(hasBottomStyle).toBeFalsy();
        });

        it('should handle zero keyboard height correctly', () => {
            jest.mocked(Device.useKeyboardHeight).mockReturnValue(0);

            const banners = [createMockBanner({id: 'bottom-banner'})];
            renderBannerSection(banners, 'bottom');

            const container = screen.getByTestId('floating-banner-bottom-container');
            expect(container.props.style[1].bottom).toBe(FLOATING_BANNER_BOTTOM_OFFSET_PHONE_IOS);
        });

        it('should use Android-specific keyboard offset on Android platform', () => {
            const {Platform} = require('react-native');
            Platform.OS = 'android';

            const keyboardHeight = 250;
            jest.mocked(Device.useKeyboardHeight).mockReturnValue(keyboardHeight);

            const banners = [createMockBanner({id: 'android-bottom-banner'})];
            renderBannerSection(banners, 'bottom');

            const container = screen.getByTestId('floating-banner-bottom-container');
            expect(container.props.style[1].bottom).toBe(FLOATING_BANNER_BOTTOM_OFFSET_WITH_KEYBOARD_ANDROID);
        });

        it('should apply Android tablet-specific bottom offset', () => {
            const {Platform} = require('react-native');
            Platform.OS = 'android';
            jest.mocked(Device.useIsTablet).mockReturnValue(true);

            const banners = [createMockBanner({id: 'android-tablet-banner'})];
            renderBannerSection(banners, 'bottom');

            const container = screen.getByTestId('floating-banner-bottom-container');
            expect(container.props.style[1].bottom).toBe(FLOATING_BANNER_BOTTOM_OFFSET_WITH_KEYBOARD_ANDROID);
        });
    });

});

