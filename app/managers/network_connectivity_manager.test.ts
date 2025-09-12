// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkConnectivityManager, {testExports} from './network_connectivity_manager';

const {FLOATING_BANNER_OVERLAY_ID, TIME_TO_OPEN, TIME_TO_CLOSE} = testExports;

// Mock the navigation functions
const mockShowOverlay = jest.fn();
const mockDismissOverlay = jest.fn();

jest.mock('@screens/navigation', () => ({
    showOverlay: (...args: unknown[]) => mockShowOverlay(...args),
    dismissOverlay: (...args: unknown[]) => mockDismissOverlay(...args),
}));

describe('NetworkConnectivityManager', () => {
    let manager: typeof NetworkConnectivityManager;
    const mockSetTimeout = jest.spyOn(global, 'setTimeout').mockImplementation((cb: () => void) => {
        cb();
        return 1 as unknown as NodeJS.Timeout;
    });
    jest.spyOn(global, 'clearTimeout').mockImplementation(() => undefined);

    beforeEach(() => {
        mockShowOverlay.mockClear();
        mockDismissOverlay.mockClear();
        mockSetTimeout.mockClear();
        manager = NetworkConnectivityManager;

        // Comprehensive state reset
        manager.cleanup();
        manager.setServerConnectionStatus(false, null);
    });

    describe('singleton pattern', () => {
        it('should return the same instance', () => {
            const instance1 = NetworkConnectivityManager;
            const instance2 = NetworkConnectivityManager;
            expect(instance1).toBe(instance2);
        });
    });

    describe('server connection status', () => {
        it('should hide overlay when server is disconnected', () => {
            manager.setServerConnectionStatus(false, null);
            manager.updateState('not_connected', {isInternetReachable: false}, 'active', jest.fn());

            expect(mockShowOverlay).not.toHaveBeenCalled();
        });

        it('should show overlay when server is connected', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');
            manager.updateState('connecting', {isInternetReachable: true}, 'active', jest.fn());

            expect(mockShowOverlay).toHaveBeenCalled();
        });

        it('should hide overlay when server URL is empty', () => {
            manager.setServerConnectionStatus(true, '');
            manager.updateState('connecting', {isInternetReachable: true}, 'active', jest.fn());

            expect(mockShowOverlay).not.toHaveBeenCalled();
        });
    });

    describe('websocket state handling', () => {
        beforeEach(() => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');
        });

        it('should show overlay immediately when connecting', () => {
            manager.updateState('connecting', {isInternetReachable: true}, 'active', jest.fn());

            expect(mockShowOverlay).toHaveBeenCalled();
        });

        it('should show overlay with delay when not connected', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            // Add some debugging
            const formatMessageSpy = jest.fn().mockReturnValue('Test message');
            manager.updateState('not_connected', {isInternetReachable: true}, 'active', formatMessageSpy);

            // Check if the formatMessage was called - this would indicate updateState was processed
            expect(formatMessageSpy).toHaveBeenCalled();
            expect(mockSetTimeout).toHaveBeenCalled();
            expect(mockShowOverlay).toHaveBeenCalled();
        });

        it('should refresh overlay with auto-hide when transitioning to connected', () => {
            // First make the overlay visible
            manager.updateState('connecting', {isInternetReachable: true}, 'active', jest.fn());
            expect(mockShowOverlay).toHaveBeenCalled();

            // Clear the mock
            mockShowOverlay.mockClear();

            // Now transition to connected state (overlay should still be visible)
            manager.updateState('connected', {isInternetReachable: true}, 'active', jest.fn());

            // Should call showOverlay again for the connected auto-hide refresh
            expect(mockShowOverlay).toHaveBeenCalled();

            // Verify setTimeout was called for auto-hide
            expect(mockSetTimeout).toHaveBeenCalled();
        });
    });

    describe('app state handling', () => {
        beforeEach(() => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');
        });

        it('should hide overlay when app goes to background', () => {
            // First make the overlay visible
            manager.updateState('connecting', {isInternetReachable: true}, 'active', jest.fn());
            expect(mockShowOverlay).toHaveBeenCalled();

            // Clear the mock
            mockDismissOverlay.mockClear();

            // Now transition to background
            manager.updateState('not_connected', {isInternetReachable: true}, 'background', jest.fn());

            expect(mockDismissOverlay).toHaveBeenCalled();
        });

        it('should show overlay when app becomes active and not connected', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');
            manager.updateState('not_connected', {isInternetReachable: true}, 'active', jest.fn());

            expect(mockSetTimeout).toHaveBeenCalled();
            expect(mockShowOverlay).toHaveBeenCalled();
        });
    });

    describe('cleanup', () => {
        it('should hide overlay and clear timeouts on cleanup', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');
            manager.updateState('connecting', {isInternetReachable: true}, 'active', jest.fn());

            manager.cleanup();

            expect(mockDismissOverlay).toHaveBeenCalled();
        });
    });

    describe('constants', () => {
        it('should have correct timeout values', () => {
            expect(TIME_TO_OPEN).toBe(1000);
            expect(TIME_TO_CLOSE).toBe(5000);
        });

        it('should have correct overlay ID', () => {
            expect(FLOATING_BANNER_OVERLAY_ID).toBe('floating-banner-overlay');
        });
    });
});
