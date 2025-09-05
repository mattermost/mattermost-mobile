// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render, fireEvent, screen} from '@testing-library/react-native';
import React from 'react';
import {Text} from 'react-native';

import FloatingBanner from './floating_banner';

import {useBanner, type BannerConfig} from './';

// Mock the dependencies
jest.mock('@components/banner', () => {
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

// Mock the context hook
jest.mock('./', () => ({
    useBanner: jest.fn(),
    BannerConfig: {},
}));

const mockUseBanner = useBanner as jest.MockedFunction<typeof useBanner>;

describe('FloatingBanner', () => {
    const mockHideBanner = jest.fn();
    const mockOnPress = jest.fn();
    const mockOnDismiss = jest.fn();

    const createMockBanner = (overrides: Partial<BannerConfig> = {}): BannerConfig => ({
        id: 'test-banner-1',
        title: 'Test Banner',
        message: 'This is a test message',
        type: 'info',
        dismissible: true,
        onPress: mockOnPress,
        onDismiss: mockOnDismiss,
        ...overrides,
    });

    const setupMockBanner = (banners: BannerConfig[] = []) => {
        mockUseBanner.mockReturnValue({
            banners,
            showBanner: jest.fn(),
            hideBanner: mockHideBanner,
            hideAllBanners: jest.fn(),
        });
    };

    const renderFloatingBanner = (banners: BannerConfig[] = []) => {
        setupMockBanner(banners);
        return render(<FloatingBanner/>);
    };

    beforeEach(() => {
        jest.clearAllMocks();
        setupMockBanner([]);
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
            expect(bannerElement).toBeTruthy();
            expect(bannerElement.props.position).toBe('top');
            expect(bannerElement.props.visible).toBe(true);
            expect(bannerElement.props.customTopOffset).toBe(0);
            expect(bannerElement.props.customBottomOffset).toBe(120);
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

            bannerElements.forEach((element, index) => {
                expect(element.props.customTopOffset).toBe(index * 60);
            });
        });

        it('should use banner position when specified', () => {
            const banner = createMockBanner({position: 'bottom'});
            renderFloatingBanner([banner]);

            const bannerElement = screen.getByTestId('banner');

            expect(bannerElement.props.position).toBe('bottom');
        });

        it('should handle non-dismissible banners', () => {
            const banner = createMockBanner({dismissible: false});
            renderFloatingBanner([banner]);

            const bannerElement = screen.getByTestId('banner');

            expect(bannerElement.props.dismissible).toBe(false);
        });
    });

    describe('content rendering', () => {
        it('should render BannerItem when no custom content is provided', () => {
            const banner = createMockBanner();
            renderFloatingBanner([banner]);

            const bannerItem = screen.getByTestId('banner-item');
            expect(bannerItem).toBeTruthy();
            expect(bannerItem.props['data-banner-id']).toBe('test-banner-1');
        });

        it('should render custom content when provided', () => {
            const customContent = <Text testID={'custom-content'}>{'Custom Banner Content'}</Text>;
            const banner = createMockBanner({customContent});
            renderFloatingBanner([banner]);

            expect(screen.getByTestId('custom-content')).toBeTruthy();
            expect(screen.queryByTestId('banner-item')).toBeNull();
        });
    });

    describe('event handlers', () => {
        it('should call banner onPress when executeBannerAction is triggered', () => {
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

        it('should call hideBanner and banner onDismiss when dismissBanner is triggered', () => {
            const banner = createMockBanner();
            renderFloatingBanner([banner]);

            const dismissButton = screen.getByTestId('banner-item-dismiss');
            fireEvent.press(dismissButton);

            expect(mockHideBanner).toHaveBeenCalledWith('test-banner-1');
            expect(mockOnDismiss).toHaveBeenCalledTimes(1);
        });

        it('should only call hideBanner when banner has no onDismiss handler', () => {
            const banner = createMockBanner({onDismiss: undefined});
            renderFloatingBanner([banner]);

            const dismissButton = screen.getByTestId('banner-item-dismiss');
            fireEvent.press(dismissButton);

            expect(mockHideBanner).toHaveBeenCalledWith('test-banner-1');
            expect(mockOnDismiss).not.toHaveBeenCalled();
        });

        it('should call dismissBanner when Banner onDismiss is triggered', () => {
            const banner = createMockBanner();
            renderFloatingBanner([banner]);

            const bannerDismissButton = screen.getByTestId('banner-dismiss');
            fireEvent.press(bannerDismissButton);

            expect(mockHideBanner).toHaveBeenCalledWith('test-banner-1');
            expect(mockOnDismiss).toHaveBeenCalledTimes(1);
        });
    });

    describe('banner mapping', () => {
        it('should handle multiple banners with different configurations', () => {
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
                    customContent: <Text testID={'custom-banner'}>{'Custom'}</Text>,
                }),
            ];
            renderFloatingBanner(banners);

            const bannerElements = screen.getAllByTestId('banner');
            expect(bannerElements).toHaveLength(3);

            // Check first banner (info)
            expect(bannerElements[0].props.position).toBe('top');
            expect(bannerElements[0].props.dismissible).toBe(true);
            expect(bannerElements[0].props.customTopOffset).toBe(0);

            // Check second banner (error)
            expect(bannerElements[1].props.position).toBe('bottom');
            expect(bannerElements[1].props.dismissible).toBe(false);
            expect(bannerElements[1].props.customTopOffset).toBe(60);

            // Check third banner (custom)
            expect(bannerElements[2].props.customTopOffset).toBe(120);

            // Verify content types
            expect(screen.getByTestId('custom-banner')).toBeTruthy();
            expect(screen.getAllByTestId('banner-item')).toHaveLength(2); // Only first two have BannerItem
        });
    });
});
