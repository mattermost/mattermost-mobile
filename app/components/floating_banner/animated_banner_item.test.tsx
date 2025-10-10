// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render, fireEvent, screen} from '@testing-library/react-native';
import React from 'react';
import {Text} from 'react-native';

import AnimatedBannerItem from './animated_banner_item';

import type {FloatingBannerConfig} from './types';

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
        useSharedValue: (initial: unknown) => ({value: initial}),
        withTiming: (value: unknown) => value,
        withDelay: (_delay: number, value: unknown) => value,
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

jest.mock('@hooks/header', () => ({
    useDefaultHeaderHeight: jest.fn(() => 64),
}));

describe('AnimatedBannerItem', () => {
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

    const renderAnimatedBannerItem = (
        banner: FloatingBannerConfig,
        index: number = 0,
    ) => {
        return render(
            <AnimatedBannerItem
                banner={banner}
                index={index}
                onBannerPress={mockOnBannerPress}
                onBannerDismiss={mockOnBannerDismiss}
            />,
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('rendering', () => {
        it('should render banner with correct props', () => {
            const banner = createMockBanner();
            renderAnimatedBannerItem(banner);

            const bannerElement = screen.getByTestId('banner');
            expect(bannerElement.props.dismissible).toBe(true);
        });

        it('should render BannerItem when no custom component is provided', () => {
            const banner = createMockBanner();
            renderAnimatedBannerItem(banner);

            const bannerItem = screen.getByTestId('banner-item');
            expect(bannerItem.props['data-banner-id']).toBe('test-banner-1');
        });

        it('should render custom component when provided', () => {
            const customComponent = <Text testID={'custom-content'}>{'Custom Banner Content'}</Text>;
            const banner = createMockBanner({customComponent});
            renderAnimatedBannerItem(banner);

            expect(screen.getByTestId('custom-content')).toBeDefined();
            expect(screen.queryByTestId('banner-item')).toBeNull();
        });

        it('should handle non-dismissible banners', () => {
            const banner = createMockBanner({dismissible: false});
            renderAnimatedBannerItem(banner);

            const bannerElement = screen.getByTestId('banner');
            expect(bannerElement.props.dismissible).toBe(false);
        });

        it('should handle banner with dismissible undefined (defaults to true)', () => {
            const banner = createMockBanner();
            delete banner.dismissible;
            renderAnimatedBannerItem(banner);

            const bannerElement = screen.getByTestId('banner');
            expect(bannerElement.props.dismissible).toBe(true);
        });

        it('should render BannerItem when customComponent is falsy', () => {
            const banner = createMockBanner({customComponent: null});
            renderAnimatedBannerItem(banner);

            const bannerItem = screen.getByTestId('banner-item');
            expect(bannerItem.props['data-banner-id']).toBe('test-banner-1');
            expect(screen.queryByTestId('custom-content')).toBeNull();
        });
    });

    describe('event handlers', () => {
        it('should call onBannerPress when banner item is pressed', () => {
            const banner = createMockBanner({onPress: jest.fn()});
            renderAnimatedBannerItem(banner);

            const pressButton = screen.getByTestId('banner-item-press');
            fireEvent.press(pressButton);

            expect(mockOnBannerPress).toHaveBeenCalledWith(banner);
        });

        it('should call onBannerDismiss when banner item dismiss is pressed', () => {
            const banner = createMockBanner();
            renderAnimatedBannerItem(banner);

            const dismissButton = screen.getByTestId('banner-item-dismiss');
            fireEvent.press(dismissButton);

            expect(mockOnBannerDismiss).toHaveBeenCalledWith(banner);
        });

        it('should call onBannerDismiss when Banner dismiss is pressed', () => {
            const banner = createMockBanner();
            renderAnimatedBannerItem(banner);

            const bannerDismissButton = screen.getByTestId('banner-dismiss');
            fireEvent.press(bannerDismissButton);

            expect(mockOnBannerDismiss).toHaveBeenCalledWith(banner);
        });
    });

    describe('positioning', () => {
        it('should render for top position', () => {
            const banner = createMockBanner();
            renderAnimatedBannerItem(banner, 0);

            expect(screen.getByTestId('banner')).toBeDefined();
        });

        it('should render for bottom position', () => {
            const banner = createMockBanner();
            renderAnimatedBannerItem(banner, 0);

            expect(screen.getByTestId('banner')).toBeDefined();
        });

        it('should render on tablet with top position', () => {
            const banner = createMockBanner();
            renderAnimatedBannerItem(banner, 0);

            expect(screen.getByTestId('banner')).toBeDefined();
        });

        it('should render on tablet with bottom position', () => {
            const banner = createMockBanner();
            renderAnimatedBannerItem(banner, 0);

            expect(screen.getByTestId('banner')).toBeDefined();
        });

        it('should render at different index positions', () => {
            const banner = createMockBanner();
            renderAnimatedBannerItem(banner, 2);

            expect(screen.getByTestId('banner')).toBeDefined();
        });
    });

    describe('custom content', () => {
        it('should render custom content for a bottom-positioned banner', () => {
            const customComponent = <Text testID={'custom-content-bottom'}>{'Bottom Custom'}</Text>;
            const banner = createMockBanner({customComponent, dismissible: false});
            renderAnimatedBannerItem(banner, 0);

            expect(screen.getByTestId('custom-content-bottom')).toBeDefined();
            const bannerElement = screen.getByTestId('banner');
            expect(bannerElement.props.dismissible).toBe(false);
        });

        it('should render custom content without title and message', () => {
            const customComponent = <Text testID={'custom-no-text'}>{'Custom Banner'}</Text>;
            const banner = createMockBanner({title: undefined, message: undefined, customComponent});
            renderAnimatedBannerItem(banner);

            expect(screen.getByTestId('custom-no-text')).toBeDefined();
            expect(screen.queryByTestId('banner-item')).toBeNull();
        });
    });
});

