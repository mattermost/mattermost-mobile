// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {Screens} from '@constants';
import {showOverlay, dismissOverlay} from '@screens/navigation';

import {BannerManager, testExports} from './banner_manager';

import type {BannerConfig} from '@context/floating_banner';

interface MockOverlayProps {
    banners: BannerConfig[];
    onDismiss: (id: string) => void;
}

jest.mock('@screens/navigation', () => ({
    showOverlay: jest.fn(),
    dismissOverlay: jest.fn(),
}));

jest.mock('@utils/datetime', () => ({
    toMilliseconds: jest.fn().mockImplementation(({seconds}) => seconds * 1000),
}));

const mockShowOverlay = jest.mocked(showOverlay);
const mockDismissOverlay = jest.mocked(dismissOverlay);

describe('BannerManager', () => {
    const mockSetTimeout = jest.spyOn(global, 'setTimeout').mockImplementation((cb: () => void) => {
        cb();
        return 1 as unknown as NodeJS.Timeout;
    });
    const mockClearTimeout = jest.spyOn(global, 'clearTimeout').mockImplementation(() => undefined);

    beforeEach(() => {
        jest.clearAllMocks();
        BannerManager.cleanup();
    });

    afterEach(() => {
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
        const mockBannerConfig: BannerConfig = {
            id: 'test-banner',
            title: 'Test Title',
            message: 'Test Message',
            type: 'info',
        };

        it('should show banner with correct overlay configuration', () => {
            BannerManager.showBanner(mockBannerConfig);

            expect(mockShowOverlay).toHaveBeenCalledWith(
                Screens.FLOATING_BANNER,
                {
                    banners: [expect.objectContaining({
                        id: 'test-banner',
                        title: 'Test Title',
                        message: 'Test Message',
                        type: 'info',
                        onDismiss: expect.any(Function),
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

            BannerManager.showBanner(mockBannerConfig);

            expect(BannerManager.isBannerVisible()).toBe(true);
            expect(BannerManager.getCurrentBannerId()).toBe('test-banner');
        });

        it('should dismiss existing banner before showing new one', () => {
            const firstBanner: BannerConfig = {
                id: 'first-banner',
                title: 'First',
                message: 'First message',
            };

            const secondBanner: BannerConfig = {
                id: 'second-banner',
                title: 'Second',
                message: 'Second message',
            };

            BannerManager.showBanner(firstBanner);
            expect(BannerManager.getCurrentBannerId()).toBe('first-banner');

            BannerManager.showBanner(secondBanner);

            expect(mockDismissOverlay).toHaveBeenCalledWith('floating-banner-overlay');
            expect(BannerManager.getCurrentBannerId()).toBe('second-banner');
        });

        it('should handle custom content with React elements', () => {
            const customElement = React.createElement('div', {}, 'Custom content');
            const bannerWithCustomContent: BannerConfig = {
                ...mockBannerConfig,
                customContent: customElement,
            };

            jest.spyOn(React, 'isValidElement').mockReturnValue(true);
            jest.spyOn(React, 'cloneElement').mockReturnValue(customElement);

            BannerManager.showBanner(bannerWithCustomContent);

            expect(React.cloneElement).toHaveBeenCalledWith(
                customElement,
                {
                    onDismiss: expect.any(Function),
                    dismissible: true,
                },
            );
        });

        it('should call original onDismiss when banner is dismissed via handleDismiss', () => {
            const mockOnDismiss = jest.fn();
            const bannerWithOnDismiss: BannerConfig = {
                ...mockBannerConfig,
                onDismiss: mockOnDismiss,
            };

            BannerManager.showBanner(bannerWithOnDismiss);

            const overlayCall = mockShowOverlay.mock.calls[0];
            const bannerConfig = (overlayCall?.[1] as MockOverlayProps)?.banners?.[0];

            bannerConfig?.onDismiss?.();

            expect(mockOnDismiss).toHaveBeenCalled();
            expect(mockDismissOverlay).toHaveBeenCalledWith('floating-banner-overlay');
            expect(BannerManager.isBannerVisible()).toBe(false);
            expect(BannerManager.getCurrentBannerId()).toBeNull();
        });

        it('should call original onDismiss when banner is dismissed via overlay onDismiss', () => {
            const mockOnDismiss = jest.fn();
            const bannerWithOnDismiss: BannerConfig = {
                ...mockBannerConfig,
                onDismiss: mockOnDismiss,
            };

            BannerManager.showBanner(bannerWithOnDismiss);

            const overlayCall = mockShowOverlay.mock.calls[0];
            const overlayOnDismiss = (overlayCall?.[1] as MockOverlayProps)?.onDismiss;

            overlayOnDismiss?.('test-banner');

            expect(mockOnDismiss).toHaveBeenCalled();
            expect(mockDismissOverlay).toHaveBeenCalledWith('floating-banner-overlay');
            expect(BannerManager.isBannerVisible()).toBe(false);
            expect(BannerManager.getCurrentBannerId()).toBeNull();
        });

        it('should not call onDismiss for different banner IDs in overlay callback', () => {
            const mockOnDismiss = jest.fn();
            const bannerWithOnDismiss: BannerConfig = {
                ...mockBannerConfig,
                onDismiss: mockOnDismiss,
            };

            BannerManager.showBanner(bannerWithOnDismiss);

            const overlayCall = mockShowOverlay.mock.calls[0];
            const overlayOnDismiss = (overlayCall?.[1] as MockOverlayProps)?.onDismiss;

            overlayOnDismiss?.('different-banner-id');

            expect(mockOnDismiss).not.toHaveBeenCalled();
            expect(mockDismissOverlay).not.toHaveBeenCalled();
        });

        it('should handle errors in onDismiss callback gracefully', () => {
            const mockOnDismiss = jest.fn().mockImplementation(() => {
                throw new Error('Test error');
            });
            const bannerWithErrorOnDismiss: BannerConfig = {
                ...mockBannerConfig,
                onDismiss: mockOnDismiss,
            };

            BannerManager.showBanner(bannerWithErrorOnDismiss);

            const overlayCall = mockShowOverlay.mock.calls[0];
            const bannerConfig = (overlayCall?.[1] as MockOverlayProps)?.banners?.[0];

            expect(() => bannerConfig?.onDismiss?.()).not.toThrow();
            expect(mockDismissOverlay).toHaveBeenCalledWith('floating-banner-overlay');
            expect(BannerManager.isBannerVisible()).toBe(false);
        });
    });

    describe('showBannerWithAutoHide', () => {
        const mockBannerConfig: BannerConfig = {
            id: 'auto-hide-banner',
            title: 'Auto Hide Banner',
            message: 'This will auto hide',
        };

        it('should show banner and set timeout for auto hide with default duration', () => {
            mockSetTimeout.mockImplementationOnce(() => {
                return 1 as unknown as NodeJS.Timeout;
            });

            BannerManager.showBannerWithAutoHide(mockBannerConfig);

            expect(mockShowOverlay).toHaveBeenCalled();
            expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);
            expect(BannerManager.isBannerVisible()).toBe(true);
        });

        it('should show banner and set timeout for auto hide with custom duration', () => {
            const customDuration = 3000;
            mockSetTimeout.mockImplementationOnce(() => {
                return 1 as unknown as NodeJS.Timeout;
            });

            BannerManager.showBannerWithAutoHide(mockBannerConfig, customDuration);

            expect(mockShowOverlay).toHaveBeenCalled();
            expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), customDuration);
        });

        it('should hide banner when timeout executes', () => {
            BannerManager.showBannerWithAutoHide(mockBannerConfig);

            expect(BannerManager.isBannerVisible()).toBe(false);
            expect(mockDismissOverlay).toHaveBeenCalledWith('floating-banner-overlay');
        });
    });

    describe('showBannerWithDelay', () => {
        const mockBannerConfig: BannerConfig = {
            id: 'delayed-banner',
            title: 'Delayed Banner',
            message: 'This will show after delay',
        };

        it('should set timeout for delayed show with default delay', () => {
            mockSetTimeout.mockImplementationOnce(() => {
                return 1 as unknown as NodeJS.Timeout;
            });

            BannerManager.showBannerWithDelay(mockBannerConfig);

            expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);
            expect(mockShowOverlay).not.toHaveBeenCalled();
        });

        it('should set timeout for delayed show with custom delay', () => {
            const customDelay = 2000;
            mockSetTimeout.mockImplementationOnce(() => {
                return 1 as unknown as NodeJS.Timeout;
            });

            BannerManager.showBannerWithDelay(mockBannerConfig, customDelay);

            expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), customDelay);
        });

        it('should show banner when timeout executes', () => {
            BannerManager.showBannerWithDelay(mockBannerConfig);

            expect(mockShowOverlay).toHaveBeenCalled();
            expect(BannerManager.isBannerVisible()).toBe(true);
            expect(BannerManager.getCurrentBannerId()).toBe('delayed-banner');
        });
    });

    describe('hideBanner', () => {
        const mockBannerConfig: BannerConfig = {
            id: 'hide-test-banner',
            title: 'Hide Test',
            message: 'Test hiding',
        };

        it('should do nothing if no banner is visible', () => {
            expect(BannerManager.isBannerVisible()).toBe(false);

            const clearTimeoutCallsBefore = mockClearTimeout.mock.calls.length;
            BannerManager.hideBanner();

            expect(mockDismissOverlay).not.toHaveBeenCalled();
            expect(mockClearTimeout).toHaveBeenCalledTimes(clearTimeoutCallsBefore);
        });

        it('should hide visible banner and clear timeouts', () => {
            BannerManager.showBanner(mockBannerConfig);
            expect(BannerManager.isBannerVisible()).toBe(true);

            const clearTimeoutCallsBefore = mockClearTimeout.mock.calls.length;
            BannerManager.hideBanner();

            expect(BannerManager.isBannerVisible()).toBe(false);
            expect(BannerManager.getCurrentBannerId()).toBeNull();
            expect(mockDismissOverlay).toHaveBeenCalledWith('floating-banner-overlay');
            expect(mockClearTimeout).toHaveBeenCalledTimes(clearTimeoutCallsBefore + 2);
        });

        it('should call current onDismiss callback when hiding', () => {
            const mockOnDismiss = jest.fn();
            const bannerWithOnDismiss: BannerConfig = {
                ...mockBannerConfig,
                onDismiss: mockOnDismiss,
            };

            BannerManager.showBanner(bannerWithOnDismiss);
            BannerManager.hideBanner();

            expect(mockOnDismiss).toHaveBeenCalled();
        });

        it('should handle errors in onDismiss callback during hide', () => {
            const mockOnDismiss = jest.fn().mockImplementation(() => {
                throw new Error('Hide error');
            });
            const bannerWithErrorOnDismiss: BannerConfig = {
                ...mockBannerConfig,
                onDismiss: mockOnDismiss,
            };

            BannerManager.showBanner(bannerWithErrorOnDismiss);

            expect(() => BannerManager.hideBanner()).not.toThrow();
            expect(BannerManager.isBannerVisible()).toBe(false);
            expect(mockDismissOverlay).toHaveBeenCalled();
        });
    });

    describe('cleanup', () => {
        const mockBannerConfig: BannerConfig = {
            id: 'cleanup-test-banner',
            title: 'Cleanup Test',
            message: 'Test cleanup',
        };

        it('should clear all timeouts and hide banner', () => {
            mockSetTimeout.mockImplementationOnce(() => {
                return 1 as unknown as NodeJS.Timeout;
            });
            mockSetTimeout.mockImplementationOnce(() => {
                return 2 as unknown as NodeJS.Timeout;
            });

            BannerManager.showBannerWithDelay(mockBannerConfig);
            BannerManager.showBannerWithAutoHide(mockBannerConfig);

            const clearTimeoutCallsBefore = mockClearTimeout.mock.calls.length;
            BannerManager.cleanup();

            // cleanup calls clearTimeout twice (for openTimeout and closeTimeout)
            // hideBanner (called by cleanup) also calls clearTimeout twice
            expect(mockClearTimeout).toHaveBeenCalledTimes(clearTimeoutCallsBefore + 4);
        });

        it('should reset manager state', () => {
            BannerManager.showBanner(mockBannerConfig);
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
            const mockBannerConfig: BannerConfig = {
                id: 'current-id-test',
                title: 'Current ID Test',
                message: 'Testing current ID',
            };

            BannerManager.showBanner(mockBannerConfig);
            expect(BannerManager.getCurrentBannerId()).toBe('current-id-test');
        });

        it('should return null after banner is hidden', () => {
            const mockBannerConfig: BannerConfig = {
                id: 'hidden-id-test',
                title: 'Hidden ID Test',
                message: 'Testing hidden ID',
            };

            BannerManager.showBanner(mockBannerConfig);
            expect(BannerManager.getCurrentBannerId()).toBe('hidden-id-test');

            BannerManager.hideBanner();
            expect(BannerManager.getCurrentBannerId()).toBeNull();
        });
    });

    describe('isBannerVisible', () => {
        it('should return false when no banner is shown', () => {
            expect(BannerManager.isBannerVisible()).toBe(false);
        });

        it('should return true when banner is shown', () => {
            const mockBannerConfig: BannerConfig = {
                id: 'visibility-test',
                title: 'Visibility Test',
                message: 'Testing visibility',
            };

            BannerManager.showBanner(mockBannerConfig);
            expect(BannerManager.isBannerVisible()).toBe(true);
        });

        it('should return false after banner is hidden', () => {
            const mockBannerConfig: BannerConfig = {
                id: 'hidden-visibility-test',
                title: 'Hidden Visibility Test',
                message: 'Testing hidden visibility',
            };

            BannerManager.showBanner(mockBannerConfig);
            expect(BannerManager.isBannerVisible()).toBe(true);

            BannerManager.hideBanner();
            expect(BannerManager.isBannerVisible()).toBe(false);
        });
    });

    describe('constants and utilities', () => {
        it('should use default timeout values', () => {
            const mockBannerConfig: BannerConfig = {
                id: 'constants-test',
                title: 'Constants Test',
                message: 'Testing constants',
            };

            mockSetTimeout.mockImplementationOnce(() => {
                return 1 as unknown as NodeJS.Timeout;
            });

            BannerManager.showBannerWithDelay(mockBannerConfig);
            expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 1000);

            mockSetTimeout.mockImplementationOnce(() => {
                return 2 as unknown as NodeJS.Timeout;
            });

            BannerManager.showBannerWithAutoHide(mockBannerConfig);
            expect(mockSetTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);
        });
    });
});
