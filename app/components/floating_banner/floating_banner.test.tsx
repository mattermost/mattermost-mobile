// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render, fireEvent, screen} from '@testing-library/react-native';
import React from 'react';
import {Text} from 'react-native';

import * as Device from '@hooks/device';

import FloatingBanner, {testExports} from './floating_banner';

import type {BannerConfig} from './types';

jest.mock('@hooks/device');

// Mock react-native-reanimated
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

// Mock the dependencies
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

    const mockOverlayOnDismiss = jest.fn();

    const renderFloatingBanner = (banners: BannerConfig[] = []) => {
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

        // Default to phone behavior unless a test overrides
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
            expect(bannerElement).toBeTruthy();
            expect(bannerElement.props.position).toBe('top');
            expect(bannerElement.props.visible).toBe(true);
            expect(bannerElement.props.customTopOffset).toBe(0);
            expect(bannerElement.props.customBottomOffset).toBeUndefined();
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

        it('should render BannerItem without title and message', () => {
            const banner = createMockBanner({title: undefined, message: undefined});
            renderFloatingBanner([banner]);

            const bannerItem = screen.getByTestId('banner-item');
            expect(bannerItem).toBeTruthy();
            expect(bannerItem.props['data-banner-id']).toBe('test-banner-1');
        });

        it('should render custom content when provided', () => {
            const customComponent = <Text testID={'custom-content'}>{'Custom Banner Content'}</Text>;
            const banner = createMockBanner({customComponent});
            renderFloatingBanner([banner]);

            expect(screen.getByTestId('custom-content')).toBeTruthy();
            expect(screen.queryByTestId('banner-item')).toBeNull();
        });

        it('should render custom content without title and message', () => {
            const customComponent = <Text testID={'custom-no-text'}>{'Custom Banner'}</Text>;
            const banner = createMockBanner({title: undefined, message: undefined, customComponent});
            renderFloatingBanner([banner]);

            expect(screen.getByTestId('custom-no-text')).toBeTruthy();
            expect(screen.queryByTestId('banner-item')).toBeNull();
        });

        it('should render custom content for a bottom-positioned banner', () => {
            const customComponent = <Text testID={'custom-content-bottom'}>{'Bottom Custom'}</Text>;
            const banner = createMockBanner({id: 'bottom-custom', position: 'bottom', customComponent, dismissible: false});
            renderFloatingBanner([banner]);

            expect(screen.getByTestId('custom-content-bottom')).toBeTruthy();
            const bannerElement = screen.getByTestId('banner');
            expect(bannerElement.props.position).toBe('bottom');
            expect(bannerElement.props.dismissible).toBe(false);
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

        it('should call onDismiss and banner onDismiss when dismissBanner is triggered', () => {
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

        it('should call dismissBanner when Banner onDismiss is triggered', () => {
            const banner = createMockBanner();
            renderFloatingBanner([banner]);

            const bannerDismissButton = screen.getByTestId('banner-dismiss');
            fireEvent.press(bannerDismissButton);

            expect(mockOverlayOnDismiss).toHaveBeenCalledWith('test-banner-1');
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
                    customComponent: <Text testID={'custom-banner'}>{'Custom'}</Text>,
                }),
            ];
            renderFloatingBanner(banners);

            const bannerElements = screen.getAllByTestId('banner');
            expect(bannerElements).toHaveLength(3);

            // Check first banner (info - top)
            expect(bannerElements[0].props.position).toBe('top');
            expect(bannerElements[0].props.dismissible).toBe(true);
            expect(bannerElements[0].props.customTopOffset).toBe(0);

            // Check second banner (custom - top, rendered after info)
            expect(bannerElements[1].props.position).toBe('top');
            expect(bannerElements[1].props.customTopOffset).toBe(60);

            // Check third banner (error - bottom)
            expect(bannerElements[2].props.position).toBe('bottom');
            expect(bannerElements[2].props.dismissible).toBe(false);
            expect(bannerElements[2].props.customBottomOffset).toBe(8);

            // Verify content types
            expect(screen.getByTestId('custom-banner')).toBeTruthy();
            expect(screen.getAllByTestId('banner-item')).toHaveLength(2); // Only first two have BannerItem
        });
    });

    describe('tablet and default branches', () => {
        it('uses default top when position is undefined', () => {
            const banners = [
                createMockBanner({id: 'no-pos-1', position: undefined}),
                createMockBanner({id: 'no-pos-2', position: undefined}),
            ];
            renderFloatingBanner(banners);

            const bannerElements = screen.getAllByTestId('banner');
            expect(bannerElements).toHaveLength(2);
            expect(bannerElements[0].props.position).toBe('top');
            expect(bannerElements[1].props.position).toBe('top');
            expect(bannerElements[1].props.customTopOffset).toBe(60);
        });

        it('applies tablet-specific bottom offset', () => {
            jest.mocked(Device.useIsTablet).mockReturnValue(true);

            const banners = [
                createMockBanner({id: 'bottom-1', position: 'bottom', dismissible: false}),
            ];
            renderFloatingBanner(banners);

            const container = screen.getByTestId('floating-banner-bottom-container');
            const styleProp = container.props.style as Array<Record<string, unknown>>;
            const containerStyle = styleProp.find((style) =>
                typeof style === 'object' && style !== null && 'bottom' in style,
            ) as {bottom: number};

            const {BOTTOM_OFFSET_PHONE_IOS, TABLET_EXTRA_BOTTOM_OFFSET} = testExports;
            expect(containerStyle.bottom).toBe(BOTTOM_OFFSET_PHONE_IOS + TABLET_EXTRA_BOTTOM_OFFSET);
        });
    });

    describe('keyboard height adjustment', () => {
        it('should adjust bottom banner position when keyboard is open', () => {
            const keyboardHeight = 300;
            jest.mocked(Device.useKeyboardHeight).mockReturnValue(keyboardHeight);

            const banners = [
                createMockBanner({id: 'bottom-banner', position: 'bottom'}),
            ];
            renderFloatingBanner(banners);

            const container = screen.getByTestId('floating-banner-bottom-container');
            const styleProp = container.props.style as Array<Record<string, unknown>>;

            // Find the animated style (should contain bottom property)
            const animatedStyle = styleProp.find((style) =>
                typeof style === 'object' && style !== null && 'bottom' in style,
            ) as {bottom: number};

            const {BOTTOM_OFFSET_WITH_KEYBOARD_IOS} = testExports;
            expect(animatedStyle.bottom).toBe(BOTTOM_OFFSET_WITH_KEYBOARD_IOS + keyboardHeight);
        });

        it('should adjust bottom banner position on tablet when keyboard is open', () => {
            const keyboardHeight = 250;
            jest.mocked(Device.useIsTablet).mockReturnValue(true);
            jest.mocked(Device.useKeyboardHeight).mockReturnValue(keyboardHeight);

            const banners = [
                createMockBanner({id: 'tablet-bottom-banner', position: 'bottom'}),
            ];
            renderFloatingBanner(banners);

            const container = screen.getByTestId('floating-banner-bottom-container');
            const styleProp = container.props.style as Array<Record<string, unknown>>;

            // Find the animated style (should contain bottom property)
            const animatedStyle = styleProp.find((style) =>
                typeof style === 'object' && style !== null && 'bottom' in style,
            ) as {bottom: number};

            const {BOTTOM_OFFSET_WITH_KEYBOARD_IOS} = testExports;
            const expectedBottom = BOTTOM_OFFSET_WITH_KEYBOARD_IOS + keyboardHeight;
            expect(animatedStyle.bottom).toBe(expectedBottom);
        });

        it('should not adjust top banner position when keyboard is open', () => {
            const keyboardHeight = 300;
            jest.mocked(Device.useKeyboardHeight).mockReturnValue(keyboardHeight);

            const banners = [
                createMockBanner({id: 'top-banner', position: 'top'}),
            ];
            renderFloatingBanner(banners);

            const container = screen.getByTestId('floating-banner-top-container');
            const styleProp = container.props.style as Array<Record<string, unknown>>;

            // Top banners should not have animated styles with bottom positioning
            const hasBottomStyle = styleProp.some((style) =>
                typeof style === 'object' && style !== null && 'bottom' in style,
            );
            expect(hasBottomStyle).toBe(false);
        });

        it('should handle zero keyboard height correctly', () => {
            jest.mocked(Device.useKeyboardHeight).mockReturnValue(0);

            const banners = [
                createMockBanner({id: 'bottom-banner', position: 'bottom'}),
            ];
            renderFloatingBanner(banners);

            const container = screen.getByTestId('floating-banner-bottom-container');
            const styleProp = container.props.style as Array<Record<string, unknown>>;

            // Find the animated style (should contain bottom property)
            const animatedStyle = styleProp.find((style) =>
                typeof style === 'object' && style !== null && 'bottom' in style,
            ) as {bottom: number};

            const {BOTTOM_OFFSET_PHONE_IOS} = testExports;
            expect(animatedStyle.bottom).toBe(BOTTOM_OFFSET_PHONE_IOS);
        });
    });
});
