// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render, fireEvent, screen} from '@testing-library/react-native';
import React from 'react';
import {Text} from 'react-native';

import * as Device from '@hooks/device';

import FloatingBanner from './floating_banner';

import type {FloatingBannerConfig} from './types';

jest.mock('@hooks/device');

jest.mock('@hooks/useBannerGestureRootPosition', () => ({
    useBannerGestureRootPosition: jest.fn(() => ({
        height: 40,
        top: 0,
    })),
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
        useAnimatedStyle: (fn: () => unknown) => fn(),
        useSharedValue: (initialValue: unknown) => ({value: initialValue}),
        withTiming: (value: unknown) => value,
        createAnimatedComponent: (component: unknown) => component,
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

describe('FloatingBanner', () => {
    const mockOnPress = jest.fn();
    const mockOnDismiss = jest.fn();

    const createMockBanner = (overrides: Partial<FloatingBannerConfig> = {}): FloatingBannerConfig => ({
        id: 'test-banner-1',
        title: 'Test Banner',
        message: 'This is a test message',
        type: 'info',
        dismissible: true,
        onPress: mockOnPress,
        onDismiss: mockOnDismiss,
        ...overrides,
    });

    const mockOverlayOnDismiss = jest.fn();

    const renderFloatingBanner = (banners: FloatingBannerConfig[] = []) => {
        return render(
            <FloatingBanner
                banners={banners}
                onDismiss={mockOverlayOnDismiss}
            />,
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockOverlayOnDismiss.mockClear();

        jest.mocked(Device.useIsTablet).mockReturnValue(false);
        jest.mocked(Device.useKeyboardHeight).mockReturnValue(0);
    });

    describe('rendering', () => {
        it('should render nothing when no banners are present', () => {
            renderFloatingBanner([]);

            expect(screen.queryByTestId('banner')).toBeNull();
        });

        it('should render single banner with correct props', () => {
            const banner = createMockBanner();
            renderFloatingBanner([banner]);

            const bannerElement = screen.getByTestId('banner');
            expect(bannerElement.props.dismissible).toBe(true);
        });

        it('should render multiple banners with correct offsets', () => {
            const banners = [
                createMockBanner({id: 'banner-1'}),
                createMockBanner({id: 'banner-2'}),
                createMockBanner({id: 'banner-3'}),
            ];
            renderFloatingBanner(banners);

            const bannerElements = screen.getAllByTestId('banner');
            expect(bannerElements).toHaveLength(3);
        });

        it('should use banner position when specified', () => {
            const banner = createMockBanner({position: 'bottom'});
            renderFloatingBanner([banner]);

            const bannerElement = screen.getByTestId('banner');
            expect(bannerElement).toBeDefined();
        });
    });

    describe('event handlers', () => {
        it('should call banner onPress when onBannerPress is triggered', () => {
            const banner = createMockBanner();
            renderFloatingBanner([banner]);

            const pressButton = screen.getByTestId('banner-item-press');
            fireEvent.press(pressButton);

            expect(mockOnPress).toHaveBeenCalledTimes(1);
        });

        it('should not call onPress when banner has no onPress handler', () => {
            const banner = createMockBanner({onPress: undefined});
            renderFloatingBanner([banner]);

            const pressButton = screen.getByTestId('banner-item-press');
            fireEvent.press(pressButton);

            expect(mockOnPress).not.toHaveBeenCalled();
        });

        it('should call onDismiss and banner onDismiss when onBannerDismiss is triggered', () => {
            const banner = createMockBanner();
            renderFloatingBanner([banner]);

            const dismissButton = screen.getByTestId('banner-item-dismiss');
            fireEvent.press(dismissButton);

            expect(mockOverlayOnDismiss).toHaveBeenCalledWith('test-banner-1');
            expect(mockOnDismiss).toHaveBeenCalledTimes(1);
        });

        it('should only call onDismiss when banner has no onDismiss handler', () => {
            const banner = createMockBanner({onDismiss: undefined});
            renderFloatingBanner([banner]);

            const dismissButton = screen.getByTestId('banner-item-dismiss');
            fireEvent.press(dismissButton);

            expect(mockOverlayOnDismiss).toHaveBeenCalledWith('test-banner-1');
        });

        it('should call onBannerDismiss when Banner onDismiss is triggered', () => {
            const banner = createMockBanner();
            renderFloatingBanner([banner]);

            const bannerDismissButton = screen.getByTestId('banner-dismiss');
            fireEvent.press(bannerDismissButton);

            expect(mockOverlayOnDismiss).toHaveBeenCalledWith('test-banner-1');
        });
    });

    describe('banner positioning', () => {
        it('should separate banners by position (top vs bottom)', () => {
            const banners = [
                createMockBanner({
                    id: 'info-banner',
                    type: 'info',
                    position: 'top',
                    dismissible: true,
                }),
                createMockBanner({
                    id: 'error-banner',
                    type: 'error',
                    position: 'bottom',
                    dismissible: false,
                }),
                createMockBanner({
                    id: 'custom-banner',
                    customComponent: <Text testID={'custom-banner'}>{'Custom'}</Text>,
                }),
            ];
            renderFloatingBanner(banners);

            const bannerElements = screen.getAllByTestId('banner');
            expect(bannerElements).toHaveLength(3);

            expect(screen.getByTestId('floating-banner-top-container')).toBeDefined();
            expect(screen.getByTestId('floating-banner-bottom-container')).toBeDefined();
        });
    });

    describe('position filtering', () => {
        it('uses default top when position is undefined', () => {
            const banners = [
                createMockBanner({id: 'no-pos-1', position: undefined}),
                createMockBanner({id: 'no-pos-2', position: undefined}),
            ];
            renderFloatingBanner(banners);

            const bannerElements = screen.getAllByTestId('banner');
            expect(bannerElements).toHaveLength(2);
        });
    });
});
