// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {renderHook, act} from '@testing-library/react-native';
import React from 'react';

import {FloatingBannerProvider, useBannerActions, useBanner, type BannerConfig} from '.';

// Mock the FloatingBanner component since we're only testing the context logic
jest.mock('./floating_banner', () => {
    return function MockFloatingBanner() {
        return null;
    };
});

const wrapper = ({children}: {children: React.ReactNode}) => (
    <FloatingBannerProvider>
        {children}
    </FloatingBannerProvider>
);

describe('useBannerActions', () => {
    beforeEach(() => {
        jest.clearAllMocks();

        jest.spyOn(global, 'setTimeout').mockImplementation(() => 123 as any);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should provide all banner action methods', () => {
        const {result} = renderHook(() => useBannerActions(), {wrapper});

        expect(result.current).toHaveProperty('showSuccess');
        expect(result.current).toHaveProperty('showError');
        expect(result.current).toHaveProperty('showInfo');
        expect(result.current).toHaveProperty('showWarning');
        expect(result.current).toHaveProperty('showCustom');
        expect(result.current).toHaveProperty('hideBanner');
        expect(result.current).toHaveProperty('hideAllBanners');
    });

    it('should show success banner with correct defaults', async () => {
        const {result} = renderHook(() => {
            const actions = useBannerActions();
            const banner = useBanner();
            return {actions, banner};
        }, {wrapper});

        act(() => {
            result.current.actions.showSuccess('Success Title', 'Success message');
        });

        const banners = result.current.banner.banners;
        expect(banners).toHaveLength(1);
        expect(banners[0]).toMatchObject({
            title: 'Success Title',
            message: 'Success message',
            type: 'success',
            autoHideDuration: 3000,
            dismissible: true,
        });
        expect(result.current.banner.banners[0].id).toMatch(/^success-\d+$/);
    });

    it('should show error banner with correct defaults', () => {
        const {result} = renderHook(() => {
            const actions = useBannerActions();
            const banner = useBanner();
            return {actions, banner};
        }, {wrapper});

        act(() => {
            result.current.actions.showError('Error Title', 'Error message');
        });

        const banners = result.current.banner.banners;
        expect(banners).toHaveLength(1);
        expect(banners[0]).toMatchObject({
            title: 'Error Title',
            message: 'Error message',
            type: 'error',
            dismissible: true,
        });
        expect(banners[0].id).toMatch(/^error-\d+$/);
    });

    it('should show info banner with correct defaults', () => {
        const {result} = renderHook(() => {
            const actions = useBannerActions();
            const banner = useBanner();
            return {actions, banner};
        }, {wrapper});

        act(() => {
            result.current.actions.showInfo('Info Title', 'Info message');
        });

        const banners = result.current.banner.banners;
        expect(banners).toHaveLength(1);
        expect(banners[0]).toMatchObject({
            title: 'Info Title',
            message: 'Info message',
            type: 'info',
            autoHideDuration: 5000,
            dismissible: true,
        });
        expect(banners[0].id).toMatch(/^info-\d+$/);
    });

    it('should show warning banner with correct defaults', () => {
        const {result} = renderHook(() => {
            const actions = useBannerActions();
            const banner = useBanner();
            return {actions, banner};
        }, {wrapper});

        act(() => {
            result.current.actions.showWarning('Warning Title', 'Warning message');
        });

        const banners = result.current.banner.banners;
        expect(banners).toHaveLength(1);
        expect(banners[0]).toMatchObject({
            title: 'Warning Title',
            message: 'Warning message',
            type: 'warning',
            dismissible: true,
        });
        expect(banners[0].id).toMatch(/^warning-\d+$/);
    });

    it('should allow custom options to override defaults', () => {
        const {result} = renderHook(() => {
            const actions = useBannerActions();
            const banner = useBanner();
            return {actions, banner};
        }, {wrapper});

        const customOptions = {
            id: 'custom-success-id',
            autoHideDuration: 1000,
            dismissible: false,
            position: 'bottom' as const,
        };

        act(() => {
            result.current.actions.showSuccess('Custom Success', 'Custom message', customOptions);
        });

        const banners = result.current.banner.banners;
        expect(banners).toHaveLength(1);
        expect(banners[0]).toMatchObject({
            id: 'custom-success-id',
            title: 'Custom Success',
            message: 'Custom message',
            type: 'success',
            autoHideDuration: 1000,
            dismissible: false,
            position: 'bottom',
        });
    });

    it('should show custom banner using showCustom', () => {
        const {result} = renderHook(() => {
            const actions = useBannerActions();
            const banner = useBanner();
            return {actions, banner};
        }, {wrapper});

        const customBanner: BannerConfig = {
            id: 'custom-banner',
            title: 'Custom Title',
            message: 'Custom Message',
            type: 'info',
            position: 'bottom',
            dismissible: false,
        };

        act(() => {
            result.current.actions.showCustom(customBanner);
        });

        const banners = result.current.banner.banners;
        expect(banners).toHaveLength(1);
        expect(banners[0]).toEqual(customBanner);
    });

    it('should hide specific banner by id', () => {
        const {result} = renderHook(() => {
            const actions = useBannerActions();
            const banner = useBanner();
            return {actions, banner};
        }, {wrapper});

        // Add multiple banners
        act(() => {
            result.current.actions.showSuccess('Success 1', 'Message 1', {id: 'banner-1'});
            result.current.actions.showError('Error 1', 'Message 2', {id: 'banner-2'});
        });

        expect(result.current.banner.banners).toHaveLength(2);

        // Hide one banner
        act(() => {
            result.current.actions.hideBanner('banner-1');
        });

        const remainingBanners = result.current.banner.banners;
        expect(remainingBanners).toHaveLength(1);
        expect(remainingBanners[0].id).toBe('banner-2');
    });

    it('should hide all banners', () => {
        const {result} = renderHook(() => {
            const actions = useBannerActions();
            const banner = useBanner();
            return {actions, banner};
        }, {wrapper});

        // Add multiple banners
        act(() => {
            result.current.actions.showSuccess('Success 1', 'Message 1');
            result.current.actions.showError('Error 1', 'Message 2');
            result.current.actions.showInfo('Info 1', 'Message 3');
        });

        expect(result.current.banner.banners).toHaveLength(3);

        // Hide all banners
        act(() => {
            result.current.actions.hideAllBanners();
        });

        expect(result.current.banner.banners).toHaveLength(0);
    });

    it('should auto-hide banners after specified duration', () => {
        jest.useFakeTimers();
        const {result} = renderHook(() => {
            const actions = useBannerActions();
            const banner = useBanner();
            return {actions, banner};
        }, {wrapper});

        act(() => {
            result.current.actions.showSuccess('Auto Hide', 'This will auto hide', {
                autoHideDuration: 1000,
            });
        });

        expect(result.current.banner.banners).toHaveLength(1);

        // Fast-forward time
        act(() => {
            jest.advanceTimersByTime(1000);
        });

        expect(result.current.banner.banners).toHaveLength(0);
        jest.useRealTimers();
    });

    it('should replace banner with same id', () => {
        const {result} = renderHook(() => {
            const actions = useBannerActions();
            const banner = useBanner();
            return {actions, banner};
        }, {wrapper});

        // Add banner with specific id
        act(() => {
            result.current.actions.showSuccess('First Banner', 'First message', {id: 'same-id'});
        });

        expect(result.current.banner.banners).toHaveLength(1);
        expect(result.current.banner.banners[0].title).toBe('First Banner');

        // Add another banner with same id (should replace)
        act(() => {
            result.current.actions.showError('Second Banner', 'Second message', {id: 'same-id'});
        });

        const banners = result.current.banner.banners;
        expect(banners).toHaveLength(1);
        expect(banners[0].title).toBe('Second Banner');
        expect(banners[0].type).toBe('error');
    });

    it('should handle onPress and onDismiss callbacks', () => {
        const {result} = renderHook(() => {
            const actions = useBannerActions();
            const banner = useBanner();
            return {actions, banner};
        }, {wrapper});

        const onPress = jest.fn();
        const onDismiss = jest.fn();

        act(() => {
            result.current.actions.showInfo('Interactive Banner', 'Click me', {
                onPress,
                onDismiss,
            });
        });

        const banner = result.current.banner.banners[0];
        expect(banner.onPress).toBe(onPress);
        expect(banner.onDismiss).toBe(onDismiss);
    });
});

describe('useBanner', () => {
    it('should throw error when used outside provider', () => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

        expect(() => {
            renderHook(() => useBanner());
        }).toThrow('useBanner must be used within a FloatingBannerProvider');

        consoleSpy.mockRestore();
    });
});
