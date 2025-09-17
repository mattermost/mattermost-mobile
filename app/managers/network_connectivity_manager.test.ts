// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {BannerManager} from './banner_manager';
import NetworkConnectivityManager, {testExports} from './network_connectivity_manager';

const {
    shouldShowDisconnectedBanner,
    shouldShowConnectingBanner,
    shouldShowPerformanceBanner,
    shouldShowReconnectionBanner,
} = testExports;

// Define constants locally for testing
const FLOATING_BANNER_OVERLAY_ID = 'floating-banner-overlay';
const TIME_TO_OPEN = 1000;
const TIME_TO_CLOSE = 5000;

const mockBannerManager = BannerManager as jest.Mocked<typeof BannerManager>;

jest.mock('./banner_manager', () => ({
    BannerManager: {
        showBanner: jest.fn(),
        showBannerWithAutoHide: jest.fn(),
        showBannerWithDelay: jest.fn(),
        hideBanner: jest.fn(),
        cleanup: jest.fn(),
        getCurrentBannerId: jest.fn().mockReturnValue(null),
        isBannerVisible: jest.fn().mockReturnValue(false),
    },
}));

function simulateBannerDismissal() {
    const showBannerCall = mockBannerManager.showBanner.mock.calls[0];
    if (showBannerCall?.[0]?.onDismiss) {
        showBannerCall[0].onDismiss();
    }
}

function setupConnectedState(manager: typeof NetworkConnectivityManager) {
    manager.updateState('connected', {isInternetReachable: true}, 'active');
}

function setupReconnectionScenario(manager: typeof NetworkConnectivityManager) {
    setupConnectedState(manager);
    manager.updateState('not_connected', {isInternetReachable: true}, 'active');
}

describe('NetworkConnectivityManager', () => {
    let manager: typeof NetworkConnectivityManager;
    const mockSetTimeout = jest.spyOn(global, 'setTimeout').mockImplementation((cb: () => void) => {
        cb();
        return 1 as unknown as NodeJS.Timeout;
    });
    jest.spyOn(global, 'clearTimeout').mockImplementation(() => undefined);

    beforeEach(() => {
        mockSetTimeout.mockClear();
        Object.values(mockBannerManager).forEach((mock) => {
            if (typeof mock === 'function' && 'mockClear' in mock) {
                mock.mockClear();
            }
        });
        manager = NetworkConnectivityManager;

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

    describe('initialization', () => {
        it('should initialize with server URL', () => {
            const serverUrl = 'https://test.server.com';
            manager.init(serverUrl);

            expect((manager as any).currentServerUrl).toBe(serverUrl);
        });

        it('should initialize with null server URL', () => {
            manager.init(null);

            expect((manager as any).currentServerUrl).toBeNull();
        });

        it('should reset state on initialization', () => {
            manager.setServerConnectionStatus(true, 'https://old.server.com');
            setupReconnectionScenario(manager);

            manager.init('https://new.server.com');

            expect((manager as any).currentServerUrl).toBe('https://new.server.com');
            expect((manager as any).isFirstConnection).toBe(true);
            expect((manager as any).hasShownReconnectionBanner).toBe(false);
        });
    });

    describe('shutdown', () => {
        it('should completely reset all state', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');
            setupReconnectionScenario(manager);

            manager.shutdown();

            expect((manager as any).currentServerUrl).toBeNull();
            expect((manager as any).websocketState).toBeNull();
            expect((manager as any).netInfo).toBeNull();
            expect((manager as any).appState).toBeNull();
            expect((manager as any).currentPerformanceState).toBeNull();
            expect((manager as any).performanceSuppressedUntilNormal).toBe(false);
            expect((manager as any).isFirstConnection).toBe(true);
            expect((manager as any).hasShownReconnectionBanner).toBe(false);
        });

        it('should call cleanup during shutdown', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            manager.shutdown();

            expect(mockBannerManager.cleanup).toHaveBeenCalled();
        });
    });

    describe('server connection status', () => {
        it('should hide banner when server is disconnected', () => {
            manager.setServerConnectionStatus(false, null);
            manager.updateState('not_connected', {isInternetReachable: false}, 'active');

            expect(mockBannerManager.showBanner).not.toHaveBeenCalled();
        });

        it('should show banner when server is connected after first connection', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            setupReconnectionScenario(manager);
            manager.updateState('connecting', {isInternetReachable: true}, 'active');

            expect(mockBannerManager.showBanner).toHaveBeenCalled();
        });

        it('should hide banner when server URL is empty', () => {
            manager.setServerConnectionStatus(true, '');
            manager.updateState('connecting', {isInternetReachable: true}, 'active');

            expect(mockBannerManager.showBanner).not.toHaveBeenCalled();
        });

        it('should hide banner when server URL is null', () => {
            manager.setServerConnectionStatus(true, null);
            manager.updateState('connecting', {isInternetReachable: true}, 'active');

            expect(mockBannerManager.showBanner).not.toHaveBeenCalled();
        });
    });

    describe('websocket state handling', () => {
        beforeEach(() => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');
        });

        it('should not show banner when connecting on first connection', () => {
            manager.updateState('connecting', {isInternetReachable: true}, 'active');

            expect(mockBannerManager.showBanner).not.toHaveBeenCalled();
        });

        it('should not show banner when not connected on first connection', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            manager.updateState('not_connected', {isInternetReachable: true}, 'active');

            expect(mockSetTimeout).not.toHaveBeenCalled();
            expect(mockBannerManager.showBanner).not.toHaveBeenCalled();
        });

        it('should show banner when connecting after first connection', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            setupReconnectionScenario(manager);
            manager.updateState('connecting', {isInternetReachable: true}, 'active');

            expect(mockBannerManager.showBanner).toHaveBeenCalled();
        });

        it('should show banner with auto-hide when transitioning to connected', () => {
            manager.updateState('connected', {isInternetReachable: true}, 'active');
            manager.updateState('not_connected', {isInternetReachable: true}, 'active');
            manager.updateState('connecting', {isInternetReachable: true}, 'active');
            expect(mockBannerManager.showBanner).toHaveBeenCalled();

            mockBannerManager.showBanner.mockClear();
            manager.updateState('connected', {isInternetReachable: true}, 'active');

            expect(mockBannerManager.showBannerWithAutoHide).toHaveBeenCalled();
        });
    });

    describe('app state handling', () => {
        beforeEach(() => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');
        });

        it('should hide banner when app goes to background', () => {
            manager.updateState('connected', {isInternetReachable: true}, 'active');
            manager.updateState('not_connected', {isInternetReachable: true}, 'active');
            manager.updateState('connecting', {isInternetReachable: true}, 'active');
            expect(mockBannerManager.showBanner).toHaveBeenCalled();

            mockBannerManager.hideBanner.mockClear();
            manager.updateState('not_connected', {isInternetReachable: true}, 'background');

            expect(mockBannerManager.hideBanner).toHaveBeenCalled();
        });

        it('should show banner when app becomes active and not connected after first connection', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            manager.updateState('connected', {isInternetReachable: true}, 'active');
            manager.updateState('not_connected', {isInternetReachable: true}, 'active');
            manager.updateState('not_connected', {isInternetReachable: true}, 'active');

            expect(mockBannerManager.showBanner).toHaveBeenCalled();
        });
    });

    describe('cleanup', () => {
        it('should hide banner and cleanup on cleanup', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            manager.updateState('connected', {isInternetReachable: true}, 'active');
            manager.updateState('not_connected', {isInternetReachable: true}, 'active');
            manager.updateState('connecting', {isInternetReachable: true}, 'active');

            manager.cleanup();

            expect(mockBannerManager.cleanup).toHaveBeenCalled();
        });
    });

    describe('connection restoration behavior', () => {
        it('should not show banner on initial connection', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            expect((manager as any).previousWebsocketState).toBeNull();
            manager.updateState('connected', {isInternetReachable: true}, 'active');

            expect(mockBannerManager.showBanner).not.toHaveBeenCalled();
        });

        it('should show banner when transitioning from disconnected to connected after first connection', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            manager.updateState('connected', {isInternetReachable: true}, 'active');
            manager.updateState('not_connected', {isInternetReachable: true}, 'active');
            mockBannerManager.showBannerWithAutoHide.mockClear();

            manager.updateState('connected', {isInternetReachable: true}, 'active');

            expect(mockBannerManager.showBannerWithAutoHide).toHaveBeenCalled();
        });

        it('should not show banner when transitioning from connecting to connected on first connection', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            manager.updateState('connecting', {isInternetReachable: true}, 'active');
            mockBannerManager.showBanner.mockClear();

            manager.updateState('connected', {isInternetReachable: true}, 'active');

            expect(mockBannerManager.showBannerWithAutoHide).not.toHaveBeenCalled();
        });

        it('should not show banner when staying connected', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            manager.updateState('connected', {isInternetReachable: true}, 'active');
            mockBannerManager.showBanner.mockClear();

            manager.updateState('connected', {isInternetReachable: true}, 'active');

            expect(mockBannerManager.showBanner).not.toHaveBeenCalled();
        });

        it('should not show banner on reapply for initial connection', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            manager.updateState('connected', {isInternetReachable: true}, 'active');
            mockBannerManager.showBanner.mockClear();

            manager.reapply();

            expect(mockBannerManager.showBanner).not.toHaveBeenCalled();
        });

        it('should show banner on reapply for reconnection', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            manager.updateState('connected', {isInternetReachable: true}, 'active');
            manager.updateState('not_connected', {isInternetReachable: true}, 'active');
            manager.updateState('connected', {isInternetReachable: true}, 'active');
            mockBannerManager.showBannerWithAutoHide.mockClear();

            manager.reapply();

            expect(mockBannerManager.showBannerWithAutoHide).toHaveBeenCalled();
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

    describe('pure functions', () => {
        const {getConnectionMessageText, isReconnection} = testExports;

        describe('getConnectionMessageText', () => {
            const mockFormatMessage = jest.fn((descriptor) => descriptor.defaultMessage);

            it('should return connected message when websocket is connected', () => {
                const result = getConnectionMessageText('connected', true, mockFormatMessage);
                expect(result).toBe('Connection restored');
                expect(mockFormatMessage).toHaveBeenCalledWith({
                    id: 'connection_banner.connected',
                    defaultMessage: 'Connection restored',
                });
            });

            it('should return connecting message when websocket is connecting', () => {
                const result = getConnectionMessageText('connecting', true, mockFormatMessage);
                expect(result).toBe('Connecting...');
                expect(mockFormatMessage).toHaveBeenCalledWith({
                    id: 'connection_banner.connecting',
                    defaultMessage: 'Connecting...',
                });
            });

            it('should return not reachable message when internet is reachable but not connected', () => {
                const result = getConnectionMessageText('not_connected', true, mockFormatMessage);
                expect(result).toBe('The server is not reachable');
                expect(mockFormatMessage).toHaveBeenCalledWith({
                    id: 'connection_banner.not_reachable',
                    defaultMessage: 'The server is not reachable',
                });
            });

            it('should return not connected message when internet is not reachable', () => {
                const result = getConnectionMessageText('not_connected', false, mockFormatMessage);
                expect(result).toBe('Unable to connect to network');
                expect(mockFormatMessage).toHaveBeenCalledWith({
                    id: 'connection_banner.not_connected',
                    defaultMessage: 'Unable to connect to network',
                });
            });
        });

        describe('isReconnection', () => {
            it('should return true when previous state was not_connected and not first connection', () => {
                const result = isReconnection('not_connected', false);
                expect(result).toBe(true);
            });

            it('should return true when previous state was connecting and not first connection', () => {
                const result = isReconnection('connecting', false);
                expect(result).toBe(true);
            });

            it('should return false when previous state was connected', () => {
                const result = isReconnection('connected', false);
                expect(result).toBe(false);
            });

            it('should return false when it is first connection regardless of previous state', () => {
                expect(isReconnection('not_connected', true)).toBe(false);
                expect(isReconnection('connecting', true)).toBe(false);
                expect(isReconnection('connected', true)).toBe(false);
            });

            it('should return false when previous state is null', () => {
                const result = isReconnection(null, false);
                expect(result).toBe(false);
            });
        });

        describe('shouldShowDisconnectedBanner', () => {
            it('should return true when websocket is not_connected and not first connection', () => {
                const result = shouldShowDisconnectedBanner('not_connected', false);
                expect(result).toBe(true);
            });

            it('should return false when websocket is not_connected but is first connection', () => {
                const result = shouldShowDisconnectedBanner('not_connected', true);
                expect(result).toBe(false);
            });

            it('should return false when websocket is connected', () => {
                const result = shouldShowDisconnectedBanner('connected', false);
                expect(result).toBe(false);
            });

            it('should return false when websocket is connecting', () => {
                const result = shouldShowDisconnectedBanner('connecting', false);
                expect(result).toBe(false);
            });

            it('should return false when websocket state is null', () => {
                const result = shouldShowDisconnectedBanner(null, false);
                expect(result).toBe(false);
            });
        });

        describe('shouldShowConnectingBanner', () => {
            it('should return true when websocket is connecting and not first connection', () => {
                const result = shouldShowConnectingBanner('connecting', false);
                expect(result).toBe(true);
            });

            it('should return false when websocket is connecting but is first connection', () => {
                const result = shouldShowConnectingBanner('connecting', true);
                expect(result).toBe(false);
            });

            it('should return false when websocket is connected', () => {
                const result = shouldShowConnectingBanner('connected', false);
                expect(result).toBe(false);
            });

            it('should return false when websocket is not_connected', () => {
                const result = shouldShowConnectingBanner('not_connected', false);
                expect(result).toBe(false);
            });

            it('should return false when websocket state is null', () => {
                const result = shouldShowConnectingBanner(null, false);
                expect(result).toBe(false);
            });
        });

        describe('shouldShowPerformanceBanner', () => {
            it('should return true when websocket is connected, performance is slow, and not suppressed', () => {
                const result = shouldShowPerformanceBanner('connected', 'slow', false);
                expect(result).toBe(true);
            });

            it('should return false when websocket is not connected', () => {
                const result = shouldShowPerformanceBanner('not_connected', 'slow', false);
                expect(result).toBe(false);
            });

            it('should return false when websocket is connecting', () => {
                const result = shouldShowPerformanceBanner('connecting', 'slow', false);
                expect(result).toBe(false);
            });

            it('should return false when performance is normal', () => {
                const result = shouldShowPerformanceBanner('connected', 'normal', false);
                expect(result).toBe(false);
            });

            it('should return false when performance is suppressed', () => {
                const result = shouldShowPerformanceBanner('connected', 'slow', true);
                expect(result).toBe(false);
            });

            it('should return false when websocket state is null', () => {
                const result = shouldShowPerformanceBanner(null, 'slow', false);
                expect(result).toBe(false);
            });

            it('should return false when performance state is null', () => {
                const result = shouldShowPerformanceBanner('connected', null, false);
                expect(result).toBe(false);
            });
        });

        describe('shouldShowReconnectionBanner', () => {
            it('should return true when all conditions are met for reconnection', () => {
                const result = shouldShowReconnectionBanner('connected', 'not_connected', false, false, false);
                expect(result).toBe(true);
            });

            it('should return true when previous state was connecting', () => {
                const result = shouldShowReconnectionBanner('connected', 'connecting', false, false, false);
                expect(result).toBe(true);
            });

            it('should return false when websocket is not connected', () => {
                const result = shouldShowReconnectionBanner('not_connected', 'not_connected', false, false, false);
                expect(result).toBe(false);
            });

            it('should return false when websocket is connecting', () => {
                const result = shouldShowReconnectionBanner('connecting', 'not_connected', false, false, false);
                expect(result).toBe(false);
            });

            it('should return false when it is first connection', () => {
                const result = shouldShowReconnectionBanner('connected', 'not_connected', true, false, false);
                expect(result).toBe(false);
            });

            it('should return false when reconnection banner was already shown', () => {
                const result = shouldShowReconnectionBanner('connected', 'not_connected', false, true, false);
                expect(result).toBe(false);
            });

            it('should return false when performance is suppressed', () => {
                const result = shouldShowReconnectionBanner('connected', 'not_connected', false, false, true);
                expect(result).toBe(false);
            });

            it('should return false when previous state was connected', () => {
                const result = shouldShowReconnectionBanner('connected', 'connected', false, false, false);
                expect(result).toBe(false);
            });

            it('should return false when previous state is null', () => {
                const result = shouldShowReconnectionBanner('connected', null, false, false, false);
                expect(result).toBe(false);
            });

            it('should return false when websocket state is null', () => {
                const result = shouldShowReconnectionBanner(null, 'not_connected', false, false, false);
                expect(result).toBe(false);
            });
        });
    });

    describe('reapply edge cases', () => {
        it('should return early when websocketState is null', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            manager.reapply();

            expect(mockBannerManager.showBanner).not.toHaveBeenCalled();
        });

        it('should return early when netInfo is null', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            manager.updateState('connected', null as any, 'active');

            manager.reapply();

            expect(mockBannerManager.showBanner).not.toHaveBeenCalled();
        });

        it('should return early when appState is null', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            manager.updateState('connected', {isInternetReachable: true}, null as any);

            manager.reapply();

            expect(mockBannerManager.showBanner).not.toHaveBeenCalled();
        });

    });

    describe('dismissed key logic', () => {
        beforeEach(() => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');
        });

        it('should show sticky banner on reapply even after dismissal', () => {

            manager.updateState('connected', {isInternetReachable: true}, 'active');
            manager.updateState('not_connected', {isInternetReachable: true}, 'active');

            simulateBannerDismissal();

            mockBannerManager.showBanner.mockClear();
            manager.reapply();

            expect(mockBannerManager.showBanner).toHaveBeenCalled();
        });

        it('should show banner when dismissed key does not match current key', () => {

            manager.updateState('connected', {isInternetReachable: true}, 'active');
            manager.updateState('not_connected', {isInternetReachable: true}, 'active');

            simulateBannerDismissal();

            mockBannerManager.showBanner.mockClear();
            manager.updateState('not_connected', {isInternetReachable: true}, 'active');
            manager.reapply();

            expect(mockBannerManager.showBanner).toHaveBeenCalled();
        });
    });

    describe('performance state handling', () => {
        beforeEach(() => {
            mockSetTimeout.mockClear();
            Object.values(mockBannerManager).forEach((mock) => {
                if (typeof mock === 'function' && 'mockClear' in mock) {
                    mock.mockClear();
                }
            });
            manager = NetworkConnectivityManager;
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            jest.spyOn(global, 'setTimeout').mockImplementation((cb: () => void, delay: number) => {
                if (!delay) {
                    cb();
                }
                return 1 as unknown as NodeJS.Timeout;
            });
        });

        it('should show performance banner when performance is slow', () => {
            setupConnectedState(manager);
            manager.updatePerformanceState('slow');

            expect(mockBannerManager.showBannerWithAutoHide).toHaveBeenCalled();
        });

        it('should hide performance banner when performance returns to normal', () => {
            setupConnectedState(manager);

            manager.updatePerformanceState('slow');
            expect(mockBannerManager.showBannerWithAutoHide).toHaveBeenCalled();

            mockBannerManager.hideBanner.mockClear();

            manager.updatePerformanceState('normal');
            expect(mockBannerManager.hideBanner).toHaveBeenCalled();
        });

        it('should not hide banner if it is not a performance banner', () => {

            manager.updateState('connected', {isInternetReachable: true}, 'active');
            manager.updateState('not_connected', {isInternetReachable: true}, 'active');

            mockBannerManager.hideBanner.mockClear();

            manager.updatePerformanceState('normal');
            expect(mockBannerManager.hideBanner).not.toHaveBeenCalled();
        });

        it('should persist performance banner across navigation', () => {

            manager.setServerConnectionStatus(true, 'https://test.server.com');
            manager.updateState('connected', {isInternetReachable: true}, 'active');

            manager.updatePerformanceState('slow');
            expect(mockBannerManager.showBannerWithAutoHide).toHaveBeenCalled();
            expect((manager as any).currentPerformanceState).toBe('slow');

            mockBannerManager.hideBanner.mockClear();
            mockBannerManager.showBannerWithAutoHide.mockClear();

            manager.reapply();

            expect(mockBannerManager.showBannerWithAutoHide).toHaveBeenCalledTimes(1);
            expect(mockBannerManager.hideBanner).not.toHaveBeenCalled();
        });

        it('should reapply performance banner when navigating', () => {

            manager.setServerConnectionStatus(true, 'https://test.server.com');
            manager.updateState('connected', {isInternetReachable: true}, 'active');

            manager.updatePerformanceState('slow');
            mockBannerManager.showBannerWithAutoHide.mockClear();

            manager.reapply();

            expect(mockBannerManager.showBannerWithAutoHide).toHaveBeenCalledTimes(1);
        });

    });
});
