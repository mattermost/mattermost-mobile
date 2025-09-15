// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkConnectivityManager, {testExports} from './network_connectivity_manager';

const {FLOATING_BANNER_OVERLAY_ID, TIME_TO_OPEN, TIME_TO_CLOSE} = testExports;

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

        it('should show overlay when server is connected after first connection', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            manager.updateState('connected', {isInternetReachable: true}, 'active', jest.fn());
            manager.updateState('not_connected', {isInternetReachable: true}, 'active', jest.fn());
            manager.updateState('connecting', {isInternetReachable: true}, 'active', jest.fn());

            expect(mockShowOverlay).toHaveBeenCalled();
        });

        it('should hide overlay when server URL is empty', () => {
            manager.setServerConnectionStatus(true, '');
            manager.updateState('connecting', {isInternetReachable: true}, 'active', jest.fn());

            expect(mockShowOverlay).not.toHaveBeenCalled();
        });

        it('should hide overlay when server URL is null', () => {
            manager.setServerConnectionStatus(true, null);
            manager.updateState('connecting', {isInternetReachable: true}, 'active', jest.fn());

            expect(mockShowOverlay).not.toHaveBeenCalled();
        });
    });

    describe('websocket state handling', () => {
        beforeEach(() => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');
        });

        it('should not show overlay when connecting on first connection', () => {
            manager.updateState('connecting', {isInternetReachable: true}, 'active', jest.fn());

            expect(mockShowOverlay).not.toHaveBeenCalled();
        });

        it('should not show overlay when not connected on first connection', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            const formatMessageSpy = jest.fn().mockReturnValue('Test message');
            manager.updateState('not_connected', {isInternetReachable: true}, 'active', formatMessageSpy);

            expect(formatMessageSpy).toHaveBeenCalled();
            expect(mockSetTimeout).not.toHaveBeenCalled();
            expect(mockShowOverlay).not.toHaveBeenCalled();
        });

        it('should show overlay when connecting after first connection', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            manager.updateState('connected', {isInternetReachable: true}, 'active', jest.fn());
            manager.updateState('not_connected', {isInternetReachable: true}, 'active', jest.fn());
            manager.updateState('connecting', {isInternetReachable: true}, 'active', jest.fn());

            expect(mockShowOverlay).toHaveBeenCalled();
        });

        it('should refresh overlay with auto-hide when transitioning to connected', () => {
            manager.updateState('connected', {isInternetReachable: true}, 'active', jest.fn());
            manager.updateState('not_connected', {isInternetReachable: true}, 'active', jest.fn());
            manager.updateState('connecting', {isInternetReachable: true}, 'active', jest.fn());
            expect(mockShowOverlay).toHaveBeenCalled();

            mockShowOverlay.mockClear();
            manager.updateState('connected', {isInternetReachable: true}, 'active', jest.fn());

            expect(mockShowOverlay).toHaveBeenCalled();
            expect(mockSetTimeout).toHaveBeenCalled();
        });
    });

    describe('app state handling', () => {
        beforeEach(() => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');
        });

        it('should hide overlay when app goes to background', () => {
            manager.updateState('connected', {isInternetReachable: true}, 'active', jest.fn());
            manager.updateState('not_connected', {isInternetReachable: true}, 'active', jest.fn());
            manager.updateState('connecting', {isInternetReachable: true}, 'active', jest.fn());
            expect(mockShowOverlay).toHaveBeenCalled();

            mockDismissOverlay.mockClear();
            manager.updateState('not_connected', {isInternetReachable: true}, 'background', jest.fn());

            expect(mockDismissOverlay).toHaveBeenCalled();
        });

        it('should show overlay when app becomes active and not connected after first connection', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            manager.updateState('connected', {isInternetReachable: true}, 'active', jest.fn());
            manager.updateState('not_connected', {isInternetReachable: true}, 'active', jest.fn());
            manager.updateState('not_connected', {isInternetReachable: true}, 'active', jest.fn());

            expect(mockSetTimeout).toHaveBeenCalled();
            expect(mockShowOverlay).toHaveBeenCalled();
        });
    });

    describe('cleanup', () => {
        it('should hide overlay and clear timeouts on cleanup', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            manager.updateState('connected', {isInternetReachable: true}, 'active', jest.fn());
            manager.updateState('not_connected', {isInternetReachable: true}, 'active', jest.fn());
            manager.updateState('connecting', {isInternetReachable: true}, 'active', jest.fn());

            manager.cleanup();

            expect(mockDismissOverlay).toHaveBeenCalled();
        });
    });

    describe('connection restoration behavior', () => {
        it('should not show banner on initial connection', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            expect((manager as any).previousWebsocketState).toBeNull();
            manager.updateState('connected', {isInternetReachable: true}, 'active', jest.fn());

            expect(mockShowOverlay).not.toHaveBeenCalled();
        });

        it('should show banner when transitioning from disconnected to connected after first connection', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            manager.updateState('connected', {isInternetReachable: true}, 'active', jest.fn());
            manager.updateState('not_connected', {isInternetReachable: true}, 'active', jest.fn());
            mockShowOverlay.mockClear();

            manager.updateState('connected', {isInternetReachable: true}, 'active', jest.fn());

            expect(mockShowOverlay).toHaveBeenCalled();
        });

        it('should not show banner when transitioning from connecting to connected on first connection', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            manager.updateState('connecting', {isInternetReachable: true}, 'active', jest.fn());
            mockShowOverlay.mockClear();

            manager.updateState('connected', {isInternetReachable: true}, 'active', jest.fn());

            expect(mockShowOverlay).not.toHaveBeenCalled();
        });

        it('should not show banner when staying connected', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            manager.updateState('connected', {isInternetReachable: true}, 'active', jest.fn());
            mockShowOverlay.mockClear();

            manager.updateState('connected', {isInternetReachable: true}, 'active', jest.fn());

            expect(mockShowOverlay).not.toHaveBeenCalled();
        });

        it('should not show banner on reapply for initial connection', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            manager.updateState('connected', {isInternetReachable: true}, 'active', jest.fn());
            mockShowOverlay.mockClear();

            manager.reapply();

            expect(mockShowOverlay).not.toHaveBeenCalled();
        });

        it('should show banner on reapply for reconnection', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            manager.updateState('connected', {isInternetReachable: true}, 'active', jest.fn());
            manager.updateState('not_connected', {isInternetReachable: true}, 'active', jest.fn());
            manager.updateState('connected', {isInternetReachable: true}, 'active', jest.fn());
            mockShowOverlay.mockClear();

            manager.reapply();

            expect(mockShowOverlay).toHaveBeenCalled();
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
    });

    describe('dismiss handlers', () => {
        beforeEach(() => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');
        });

        it('should handle dismiss from handleDismiss callback', () => {
            manager.updateState('connected', {isInternetReachable: true}, 'active', jest.fn());
            manager.updateState('not_connected', {isInternetReachable: true}, 'active', jest.fn());
            manager.updateState('connecting', {isInternetReachable: true}, 'active', jest.fn());

            expect(mockShowOverlay).toHaveBeenCalled();

            const bannerConfig = mockShowOverlay.mock.calls[mockShowOverlay.mock.calls.length - 1][1].banners[0];
            bannerConfig.onDismiss();

            expect(mockDismissOverlay).toHaveBeenCalledWith(FLOATING_BANNER_OVERLAY_ID);
        });

        it('should handle dismiss from showOverlay onDismiss callback', () => {
            manager.updateState('connected', {isInternetReachable: true}, 'active', jest.fn());
            manager.updateState('not_connected', {isInternetReachable: true}, 'active', jest.fn());
            manager.updateState('connecting', {isInternetReachable: true}, 'active', jest.fn());

            expect(mockShowOverlay).toHaveBeenCalled();

            const onDismissCallback = mockShowOverlay.mock.calls[mockShowOverlay.mock.calls.length - 1][1].onDismiss;
            onDismissCallback('connectivity');

            expect(mockDismissOverlay).toHaveBeenCalledWith(FLOATING_BANNER_OVERLAY_ID);
        });

        it('should not dismiss when onDismiss callback is called with different id', () => {
            manager.updateState('connected', {isInternetReachable: true}, 'active', jest.fn());
            manager.updateState('not_connected', {isInternetReachable: true}, 'active', jest.fn());
            manager.updateState('connecting', {isInternetReachable: true}, 'active', jest.fn());

            expect(mockShowOverlay).toHaveBeenCalled();

            const onDismissCallback = mockShowOverlay.mock.calls[mockShowOverlay.mock.calls.length - 1][1].onDismiss;
            onDismissCallback('other-banner');

            expect(mockDismissOverlay).not.toHaveBeenCalled();
        });
    });

    describe('reapply edge cases', () => {
        it('should return early when websocketState is null', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            manager.reapply();

            expect(mockShowOverlay).not.toHaveBeenCalled();
        });

        it('should return early when netInfo is null', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            manager.updateState('connected', null as any, 'active', jest.fn());

            manager.reapply();

            expect(mockShowOverlay).not.toHaveBeenCalled();
        });

        it('should return early when appState is null', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            manager.updateState('connected', {isInternetReachable: true}, null as any, jest.fn());

            manager.reapply();

            expect(mockShowOverlay).not.toHaveBeenCalled();
        });

        it('should return early when formatMessage is null', () => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');

            manager.updateState('connected', {isInternetReachable: true}, 'active', null as any);

            manager.reapply();

            expect(mockShowOverlay).not.toHaveBeenCalled();
        });
    });

    describe('dismissed key logic', () => {
        beforeEach(() => {
            manager.setServerConnectionStatus(true, 'https://test.server.com');
        });

        it('should not show banner when dismissed key matches current key on reapply', () => {
            const formatMessage = jest.fn().mockReturnValue('Test message');

            manager.updateState('connected', {isInternetReachable: true}, 'active', formatMessage);
            manager.updateState('not_connected', {isInternetReachable: true}, 'active', formatMessage);

            const bannerConfig = mockShowOverlay.mock.calls[mockShowOverlay.mock.calls.length - 1][1].banners[0];
            bannerConfig.onDismiss();

            mockShowOverlay.mockClear();
            manager.reapply();

            expect(mockShowOverlay).not.toHaveBeenCalled();
        });

        it('should show banner when dismissed key does not match current key', () => {
            const formatMessage1 = jest.fn().mockReturnValue('Test message 1');
            const formatMessage2 = jest.fn().mockReturnValue('Test message 2');

            manager.updateState('connected', {isInternetReachable: true}, 'active', formatMessage1);
            manager.updateState('not_connected', {isInternetReachable: true}, 'active', formatMessage1);

            const bannerConfig = mockShowOverlay.mock.calls[mockShowOverlay.mock.calls.length - 1][1].banners[0];
            bannerConfig.onDismiss();

            mockShowOverlay.mockClear();
            manager.updateState('not_connected', {isInternetReachable: true}, 'active', formatMessage2);
            manager.reapply();

            expect(mockShowOverlay).toHaveBeenCalled();
        });
    });
});
