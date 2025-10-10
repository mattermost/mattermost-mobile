// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Navigation} from 'react-native-navigation';

import {Screens} from '@constants';
import {showOverlay, dismissOverlay} from '@screens/navigation';

import {BannerManager, testExports} from './banner_manager';

import type {FloatingBannerConfig} from '@components/floating_banner/types';

interface MockOverlayProps {
    banners: FloatingBannerConfig[];
    onDismiss: (id: string) => void;
}

jest.mock('react-native-navigation', () => ({
    Navigation: {
        updateProps: jest.fn(),
    },
}));

jest.mock('@screens/navigation', () => ({
    showOverlay: jest.fn(),
    dismissOverlay: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@utils/datetime', () => ({
    toMilliseconds: jest.fn().mockImplementation(({seconds}) => seconds * 1000),
}));

const mockShowOverlay = jest.mocked(showOverlay);
const mockDismissOverlay = jest.mocked(dismissOverlay);
const mockUpdateProps = jest.mocked(Navigation.updateProps);

describe('BannerManager', () => {
    let timeoutId = 0;
    type TimeoutCallback = () => void;
    const timeoutCallbacks = new Map<number, TimeoutCallback>();

    const mockSetTimeout = jest.spyOn(global, 'setTimeout').mockImplementation((cb: TimeoutCallback) => {
        timeoutId++;
        timeoutCallbacks.set(timeoutId, cb);
        return timeoutId as unknown as NodeJS.Timeout;
    });

    const mockClearTimeout = jest.spyOn(global, 'clearTimeout').mockImplementation((id: NodeJS.Timeout) => {
        timeoutCallbacks.delete(id as unknown as number);
    });

    const runAllTimers = () => {
        const callbacks = Array.from(timeoutCallbacks.values());
        timeoutCallbacks.clear();
        callbacks.forEach((cb) => cb());
    };

    beforeEach(() => {
        jest.clearAllMocks();
        timeoutCallbacks.clear();
        timeoutId = 0;
        BannerManager.cleanup();
    });

    afterEach(() => {
        timeoutCallbacks.clear();
        BannerManager.cleanup();
    });

    describe('singleton pattern', () => {
        it('should export the same instance', () => {
            expect(BannerManager).toBeDefined();
            expect(BannerManager).toBe(BannerManager);
        });

        it('should allow creating new instances via testExports', () => {
            const newInstance = new testExports.BannerManager();
            expect(newInstance).toBeDefined();
            expect(newInstance).not.toBe(BannerManager);
        });
    });

    describe('showBanner', () => {
        const mockFloatingBannerConfig: FloatingBannerConfig = {
            id: 'test-banner',
            title: 'Test Title',
            message: 'Test Message',
            type: 'info',
        };

        it('should show banner with correct overlay configuration', async () => {
            BannerManager.showBanner(mockFloatingBannerConfig);
            await Promise.resolve();

            expect(mockShowOverlay).toHaveBeenCalledWith(
                Screens.FLOATING_BANNER,
                {
                    banners: [expect.objectContaining({
                        id: 'test-banner',
                        title: 'Test Title',
                        message: 'Test Message',
                        type: 'info',
                    })],
                    onDismiss: expect.any(Function),
                },
                {
                    overlay: {
                        interceptTouchOutside: false,
                    },
                },
                'floating-banner-overlay',
            );
        });

        it('should update visibility state when showing banner', () => {
            expect(BannerManager.isBannerVisible()).toBe(false);
            expect(BannerManager.getCurrentBannerId()).toBeNull();

            BannerManager.showBanner(mockFloatingBannerConfig);

            expect(BannerManager.isBannerVisible()).toBe(true);
            expect(BannerManager.getCurrentBannerId()).toBe('test-banner');
        });

        it('should show banner without title and message when using customComponent', async () => {
            const bannerWithCustomComponent: FloatingBannerConfig = {
                id: 'custom-banner',
                customComponent: React.createElement('div', {testID: 'custom-content'}, 'Custom Content'),
            };

            BannerManager.showBanner(bannerWithCustomComponent);
            await Promise.resolve();

            expect(mockShowOverlay).toHaveBeenCalledWith(
                Screens.FLOATING_BANNER,
                expect.objectContaining({
                    banners: [expect.objectContaining({
                        id: 'custom-banner',
                        customComponent: expect.anything(),
                    })],
                }),
                expect.anything(),
                'floating-banner-overlay',
            );
        });

        it('should stack multiple banners and update overlay', async () => {
            const firstBanner: FloatingBannerConfig = {
                id: 'first-banner',
                title: 'First',
                message: 'First message',
            };

            const secondBanner: FloatingBannerConfig = {
                id: 'second-banner',
                title: 'Second',
                message: 'Second message',
            };

            BannerManager.showBanner(firstBanner);
            await Promise.resolve();
            expect(BannerManager.getCurrentBannerId()).toBe('first-banner');
            expect(mockShowOverlay).toHaveBeenCalledTimes(1);

            BannerManager.showBanner(secondBanner);
            await Promise.resolve();

            expect(mockUpdateProps).toHaveBeenCalledWith(
                'floating-banner-overlay',
                expect.objectContaining({
                    banners: expect.arrayContaining([
                        expect.objectContaining({id: 'first-banner'}),
                        expect.objectContaining({id: 'second-banner'}),
                    ]),
                }),
            );
            expect(BannerManager.getCurrentBannerId()).toBe('second-banner');
        });

        it('should handle custom content with React elements', async () => {
            const customElement = React.createElement('div', {}, 'Custom content');
            const bannerWithCustomComponent: FloatingBannerConfig = {
                ...mockFloatingBannerConfig,
                customComponent: customElement,
            };

            jest.spyOn(React, 'isValidElement').mockReturnValue(true);
            jest.spyOn(React, 'cloneElement').mockReturnValue(customElement);

            BannerManager.showBanner(bannerWithCustomComponent);
            await Promise.resolve();

            expect(React.cloneElement).toHaveBeenCalledWith(
                customElement,
                {
                    onDismiss: expect.any(Function),
                    dismissible: undefined,
                },
            );
        });

        it('should call cloned onDismiss handler when custom component is dismissed', async () => {
            const mockOnDismiss = jest.fn();
            const customElement = React.createElement('div', {}, 'Custom content');
            const bannerWithCustomComponent: FloatingBannerConfig = {
                id: 'custom-component-banner',
                customComponent: customElement,
                dismissible: true,
                onDismiss: mockOnDismiss,
            };

            jest.spyOn(React, 'isValidElement').mockReturnValue(true);

            BannerManager.showBanner(bannerWithCustomComponent);
            await Promise.resolve();

            const cloneCall = (React.cloneElement as jest.Mock).mock.calls[0];
            const clonedProps = cloneCall[1];
            const clonedOnDismiss = clonedProps.onDismiss;

            clonedOnDismiss();
            await Promise.resolve();

            expect(mockOnDismiss).toHaveBeenCalled();
            expect(BannerManager.isBannerVisible()).toBe(false);

            runAllTimers();
            await Promise.resolve();
            runAllTimers();
            await Promise.resolve();

            expect(mockDismissOverlay).toHaveBeenCalledWith('floating-banner-overlay');
        });

        it('should respect dismissible property from banner config', async () => {
            const customElement = React.createElement('div', {}, 'Custom content');

            const dismissibleBanner: FloatingBannerConfig = {
                ...mockFloatingBannerConfig,
                customComponent: customElement,
                dismissible: true,
            };

            const nonDismissibleBanner: FloatingBannerConfig = {
                ...mockFloatingBannerConfig,
                customComponent: customElement,
                dismissible: false,
            };

            jest.spyOn(React, 'isValidElement').mockReturnValue(true);
            jest.spyOn(React, 'cloneElement').mockReturnValue(customElement);

            BannerManager.showBanner(dismissibleBanner);
            await Promise.resolve();
            expect(React.cloneElement).toHaveBeenCalledWith(
                customElement,
                {
                    onDismiss: expect.any(Function),
                    dismissible: true,
                },
            );

            jest.clearAllMocks();

            BannerManager.showBanner(nonDismissibleBanner);
            await Promise.resolve();
            expect(React.cloneElement).toHaveBeenCalledWith(
                customElement,
                {
                    onDismiss: expect.any(Function),
                    dismissible: false,
                },
            );
        });

        it('should call original onDismiss when banner is dismissed via handleDismiss', async () => {
            const mockOnDismiss = jest.fn();
            const bannerWithOnDismiss: FloatingBannerConfig = {
                ...mockFloatingBannerConfig,
                onDismiss: mockOnDismiss,
            };

            BannerManager.showBanner(bannerWithOnDismiss);
            await Promise.resolve();

            const overlayCall = mockShowOverlay.mock.calls[0];
            const overlayOnDismiss = (overlayCall?.[1] as MockOverlayProps)?.onDismiss;

            overlayOnDismiss?.('test-banner');
            await Promise.resolve();

            expect(mockOnDismiss).toHaveBeenCalled();
            expect(BannerManager.isBannerVisible()).toBe(false);

            runAllTimers();
            await Promise.resolve();

            expect(mockDismissOverlay).toHaveBeenCalledWith('floating-banner-overlay');
            expect(BannerManager.getCurrentBannerId()).toBeNull();
        });

        it('should remove banner from list when dismissed but keep overlay for other banners', async () => {
            const firstBanner: FloatingBannerConfig = {
                id: 'first-banner',
                title: 'First',
                message: 'First message',
                onDismiss: jest.fn(),
            };

            const secondBanner: FloatingBannerConfig = {
                id: 'second-banner',
                title: 'Second',
                message: 'Second message',
            };

            BannerManager.showBanner(firstBanner);
            await Promise.resolve();
            BannerManager.showBanner(secondBanner);
            await Promise.resolve();

            const overlayCall = mockUpdateProps.mock.calls[0];
            const overlayOnDismiss = (overlayCall?.[1] as MockOverlayProps)?.onDismiss;

            overlayOnDismiss?.('first-banner');
            await Promise.resolve();

            expect(firstBanner.onDismiss).toHaveBeenCalled();
            expect(BannerManager.isBannerVisible()).toBe(true);
            expect(BannerManager.getCurrentBannerId()).toBe('second-banner');
            expect(mockDismissOverlay).not.toHaveBeenCalled();
        });

        it('should not call onDismiss for different banner IDs in overlay callback', () => {
            const mockOnDismiss = jest.fn();
            const bannerWithOnDismiss: FloatingBannerConfig = {
                ...mockFloatingBannerConfig,
                onDismiss: mockOnDismiss,
            };

            BannerManager.showBanner(bannerWithOnDismiss);

            const overlayCall = mockShowOverlay.mock.calls[0];
            const overlayOnDismiss = (overlayCall?.[1] as MockOverlayProps)?.onDismiss;

            overlayOnDismiss?.('different-banner-id');

            expect(mockOnDismiss).not.toHaveBeenCalled();
            expect(mockDismissOverlay).not.toHaveBeenCalled();
        });

        it('should handle errors in onDismiss callback gracefully', async () => {
            const mockOnDismiss = jest.fn().mockImplementation(() => {
                throw new Error('Test error');
            });
            const bannerWithErrorOnDismiss: FloatingBannerConfig = {
                ...mockFloatingBannerConfig,
                onDismiss: mockOnDismiss,
            };

            BannerManager.showBanner(bannerWithErrorOnDismiss);
            await Promise.resolve();

            const overlayCall = mockShowOverlay.mock.calls[0];
            const overlayOnDismiss = (overlayCall?.[1] as MockOverlayProps)?.onDismiss;

            expect(() => overlayOnDismiss?.('test-banner')).not.toThrow();
            await Promise.resolve();
            expect(BannerManager.isBannerVisible()).toBe(false);

            runAllTimers();
            await Promise.resolve();

            expect(mockDismissOverlay).toHaveBeenCalledWith('floating-banner-overlay');
        });
    });

    describe('showBannerWithAutoHide', () => {
        const mockFloatingBannerConfig: FloatingBannerConfig = {
            id: 'auto-hide-banner',
            title: 'Auto Hide Banner',
            message: 'This will auto hide',
        };

        it('should show banner and set timeout for auto hide with default duration', async () => {
            BannerManager.showBannerWithAutoHide(mockFloatingBannerConfig);
            await Promise.resolve();

            expect(mockShowOverlay).toHaveBeenCalled();
            expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);
            expect(BannerManager.isBannerVisible()).toBe(true);
        });

        it('should show banner and set timeout for auto hide with custom duration', async () => {
            const customDuration = 3000;

            BannerManager.showBannerWithAutoHide(mockFloatingBannerConfig, customDuration);
            await Promise.resolve();

            expect(mockShowOverlay).toHaveBeenCalled();
            expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), customDuration);
        });

        it('should hide banner when timeout executes', async () => {
            BannerManager.showBannerWithAutoHide(mockFloatingBannerConfig);
            await Promise.resolve();

            expect(BannerManager.isBannerVisible()).toBe(true);

            runAllTimers();
            await Promise.resolve();
            runAllTimers();
            await Promise.resolve();

            expect(BannerManager.isBannerVisible()).toBe(false);
            expect(mockDismissOverlay).toHaveBeenCalledWith('floating-banner-overlay');
        });
    });

    describe('hideBanner', () => {
        const mockFloatingBannerConfig: FloatingBannerConfig = {
            id: 'hide-test-banner',
            title: 'Hide Test',
            message: 'Test hiding',
        };

        it('should do nothing if banner ID does not exist', () => {
            expect(BannerManager.isBannerVisible()).toBe(false);

            BannerManager.hideBanner('non-existent-banner');

            expect(mockDismissOverlay).not.toHaveBeenCalled();
        });

        it('should hide visible banner and clear timeouts', async () => {
            BannerManager.showBanner(mockFloatingBannerConfig);
            await Promise.resolve();
            expect(BannerManager.isBannerVisible()).toBe(true);

            BannerManager.hideBanner('hide-test-banner');
            await Promise.resolve();

            expect(BannerManager.isBannerVisible()).toBe(false);
            expect(BannerManager.getCurrentBannerId()).toBeNull();

            runAllTimers();
            await Promise.resolve();
            runAllTimers();
            await Promise.resolve();

            expect(mockDismissOverlay).toHaveBeenCalledWith('floating-banner-overlay');
        });

        it('should hide specific banner by ID', () => {
            const firstBanner: FloatingBannerConfig = {
                id: 'first-banner',
                title: 'First',
                message: 'First message',
            };

            const secondBanner: FloatingBannerConfig = {
                id: 'second-banner',
                title: 'Second',
                message: 'Second message',
            };

            BannerManager.showBanner(firstBanner);
            BannerManager.showBanner(secondBanner);

            BannerManager.hideBanner('first-banner');

            expect(BannerManager.isBannerVisible()).toBe(true);
            expect(BannerManager.getCurrentBannerId()).toBe('second-banner');
            expect(mockDismissOverlay).not.toHaveBeenCalled();
        });

        it('should call current onDismiss callback when hiding', () => {
            const mockOnDismiss = jest.fn();
            const bannerWithOnDismiss: FloatingBannerConfig = {
                ...mockFloatingBannerConfig,
                onDismiss: mockOnDismiss,
            };

            BannerManager.showBanner(bannerWithOnDismiss);
            BannerManager.hideBanner('hide-test-banner');

            expect(mockOnDismiss).toHaveBeenCalled();
        });

        it('should handle errors in onDismiss callback during hide', () => {
            const mockOnDismiss = jest.fn().mockImplementation(() => {
                throw new Error('Hide error');
            });
            const bannerWithErrorOnDismiss: FloatingBannerConfig = {
                ...mockFloatingBannerConfig,
                onDismiss: mockOnDismiss,
            };

            BannerManager.showBanner(bannerWithErrorOnDismiss);

            expect(() => BannerManager.hideBanner('hide-test-banner')).not.toThrow();
            expect(BannerManager.isBannerVisible()).toBe(false);
            expect(mockOnDismiss).toHaveBeenCalled();
        });
    });

    describe('hideAllBanners', () => {
        it('should hide all banners at once', async () => {
            const firstBanner: FloatingBannerConfig = {
                id: 'first-banner',
                title: 'First',
                message: 'First message',
            };

            const secondBanner: FloatingBannerConfig = {
                id: 'second-banner',
                title: 'Second',
                message: 'Second message',
            };

            const thirdBanner: FloatingBannerConfig = {
                id: 'third-banner',
                title: 'Third',
                message: 'Third message',
            };

            BannerManager.showBanner(firstBanner);
            BannerManager.showBanner(secondBanner);
            BannerManager.showBanner(thirdBanner);
            await Promise.resolve();

            expect(BannerManager.isBannerVisible()).toBe(true);
            expect(BannerManager.getCurrentBannerId()).toBe('third-banner');

            BannerManager.hideAllBanners();
            await Promise.resolve();

            expect(BannerManager.isBannerVisible()).toBe(false);
            expect(BannerManager.getCurrentBannerId()).toBeNull();

            runAllTimers();
            await Promise.resolve();

            expect(mockDismissOverlay).toHaveBeenCalledWith('floating-banner-overlay');
        });

        it('should clear all auto-hide timers when hiding all banners', () => {
            const firstBanner: FloatingBannerConfig = {
                id: 'first-auto-hide',
                title: 'First Auto Hide',
                message: 'First message',
            };

            const secondBanner: FloatingBannerConfig = {
                id: 'second-auto-hide',
                title: 'Second Auto Hide',
                message: 'Second message',
            };

            BannerManager.showBannerWithAutoHide(firstBanner, 3000);
            BannerManager.showBannerWithAutoHide(secondBanner, 5000);

            expect(BannerManager.isBannerVisible()).toBe(true);

            const clearTimeoutCallsBefore = mockClearTimeout.mock.calls.length;
            BannerManager.hideAllBanners();

            expect(mockClearTimeout.mock.calls.length).toBeGreaterThan(clearTimeoutCallsBefore);
            expect(BannerManager.isBannerVisible()).toBe(false);
        });

        it('should do nothing when no banners are visible', () => {
            expect(BannerManager.isBannerVisible()).toBe(false);

            BannerManager.hideAllBanners();

            expect(BannerManager.isBannerVisible()).toBe(false);
            expect(mockDismissOverlay).not.toHaveBeenCalled();
        });
    });

    describe('edge cases', () => {
        it('should set empty banners array when hiding last banner', async () => {
            const banner: FloatingBannerConfig = {
                id: 'single-banner',
                title: 'Single',
                message: 'Single banner',
            };

            BannerManager.showBanner(banner);
            await Promise.resolve();

            expect(mockShowOverlay).toHaveBeenCalled();
            expect(BannerManager.isBannerVisible()).toBe(true);

            BannerManager.hideBanner('single-banner');
            await Promise.resolve();

            expect(mockUpdateProps).toHaveBeenCalledWith(
                'floating-banner-overlay',
                expect.objectContaining({
                    banners: [],
                    onDismiss: expect.any(Function),
                }),
            );

            const updatePropsCall = mockUpdateProps.mock.calls[mockUpdateProps.mock.calls.length - 1];
            const emptyOnDismiss = (updatePropsCall?.[1] as MockOverlayProps)?.onDismiss;

            expect(() => emptyOnDismiss?.('non-existent-banner')).not.toThrow();
        });
    });

    describe('dismiss delay behavior', () => {
        it('should cancel overlay dismiss when new banner is added during delay', async () => {
            const firstBanner: FloatingBannerConfig = {
                id: 'first-banner',
                title: 'First',
                message: 'First message',
            };

            const secondBanner: FloatingBannerConfig = {
                id: 'second-banner',
                title: 'Second',
                message: 'Second message',
            };

            BannerManager.showBanner(firstBanner);
            expect(BannerManager.isBannerVisible()).toBe(true);

            const dismissCallsBefore = mockDismissOverlay.mock.calls.length;

            BannerManager.hideBanner('first-banner');
            expect(BannerManager.isBannerVisible()).toBe(false);

            await Promise.resolve();

            BannerManager.showBanner(secondBanner);

            runAllTimers();
            await Promise.resolve();

            expect(mockDismissOverlay).toHaveBeenCalledTimes(dismissCallsBefore);
            expect(BannerManager.isBannerVisible()).toBe(true);
            expect(BannerManager.getCurrentBannerId()).toBe('second-banner');
        });
    });

    describe('cleanup', () => {
        const mockFloatingBannerConfig: FloatingBannerConfig = {
            id: 'cleanup-test-banner',
            title: 'Cleanup Test',
            message: 'Test cleanup',
        };

        it('should clear all timeouts and hide banner', () => {
            BannerManager.showBannerWithAutoHide(mockFloatingBannerConfig);

            const clearTimeoutCallsBefore = mockClearTimeout.mock.calls.length;
            BannerManager.cleanup();

            expect(mockClearTimeout.mock.calls.length).toBeGreaterThan(clearTimeoutCallsBefore);
            expect(BannerManager.isBannerVisible()).toBe(false);
        });

        it('should reset manager state', () => {
            BannerManager.showBanner(mockFloatingBannerConfig);
            expect(BannerManager.isBannerVisible()).toBe(true);
            expect(BannerManager.getCurrentBannerId()).toBe('cleanup-test-banner');

            BannerManager.cleanup();

            expect(BannerManager.isBannerVisible()).toBe(false);
            expect(BannerManager.getCurrentBannerId()).toBeNull();
        });
    });

    describe('getCurrentBannerId', () => {
        it('should return null when no banner is shown', () => {
            expect(BannerManager.getCurrentBannerId()).toBeNull();
        });

        it('should return current banner ID when banner is shown', () => {
            const mockFloatingBannerConfig: FloatingBannerConfig = {
                id: 'current-id-test',
                title: 'Current ID Test',
                message: 'Testing current ID',
            };

            BannerManager.showBanner(mockFloatingBannerConfig);
            expect(BannerManager.getCurrentBannerId()).toBe('current-id-test');
        });

        it('should return null after banner is hidden', async () => {
            const mockFloatingBannerConfig: FloatingBannerConfig = {
                id: 'hidden-id-test',
                title: 'Hidden ID Test',
                message: 'Testing hidden ID',
            };

            BannerManager.showBanner(mockFloatingBannerConfig);
            await Promise.resolve();
            expect(BannerManager.getCurrentBannerId()).toBe('hidden-id-test');

            BannerManager.hideBanner('hidden-id-test');
            await Promise.resolve();
            expect(BannerManager.getCurrentBannerId()).toBeNull();
        });
    });

    describe('isBannerVisible', () => {
        it('should return false when no banner is shown', () => {
            expect(BannerManager.isBannerVisible()).toBe(false);
        });

        it('should return true when banner is shown', () => {
            const mockFloatingBannerConfig: FloatingBannerConfig = {
                id: 'visibility-test',
                title: 'Visibility Test',
                message: 'Testing visibility',
            };

            BannerManager.showBanner(mockFloatingBannerConfig);
            expect(BannerManager.isBannerVisible()).toBe(true);
        });

        it('should return false after banner is hidden', async () => {
            const mockFloatingBannerConfig: FloatingBannerConfig = {
                id: 'hidden-visibility-test',
                title: 'Hidden Visibility Test',
                message: 'Testing hidden visibility',
            };

            BannerManager.showBanner(mockFloatingBannerConfig);
            await Promise.resolve();
            expect(BannerManager.isBannerVisible()).toBe(true);

            BannerManager.hideBanner('hidden-visibility-test');
            await Promise.resolve();
            expect(BannerManager.isBannerVisible()).toBe(false);
        });
    });

    describe('constants and utilities', () => {
        it('should use default timeout values', () => {
            const mockFloatingBannerConfig: FloatingBannerConfig = {
                id: 'constants-test',
                title: 'Constants Test',
                message: 'Testing constants',
            };

            mockSetTimeout.mockImplementationOnce(() => {
                return 1 as unknown as NodeJS.Timeout;
            });

            BannerManager.showBannerWithAutoHide(mockFloatingBannerConfig);
            expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);
        });
    });
});
