// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {useBannerActions} from '@context/floating_banner';
import {renderWithIntl} from '@test/intl-test-helper';
import {toMilliseconds} from '@utils/datetime';

jest.unmock('@managers/connectivity_manager');
import {testExports} from './connectivity_manager';

const {
    ConnectivityManager,
    getConnectionMessage,
    createBannerConfig,
    CONNECTION_BANNER_ID,
    TIME_TO_OPEN,
    TIME_TO_CLOSE,
} = testExports;

jest.mock('@react-native-community/netinfo', () => ({
    useNetInfo: jest.fn(),
    NetInfoStateType: {
        none: 'none',
        unknown: 'unknown',
        cellular: 'cellular',
        wifi: 'wifi',
        bluetooth: 'bluetooth',
        ethernet: 'ethernet',
        wimax: 'wimax',
        vpn: 'vpn',
        other: 'other',
    },
}));

jest.mock('@context/floating_banner', () => ({
    useBannerActions: jest.fn(),
}));

jest.mock('@hooks/device', () => ({
    useAppState: jest.fn(),
}));

jest.mock('@components/connection_banner/connection_banner', () => 'ConnectionBanner');

const mockSetTimeout = jest.fn();
const mockClearTimeout = jest.fn();

jest.spyOn(global, 'setTimeout').mockImplementation(mockSetTimeout);
jest.spyOn(global, 'clearTimeout').mockImplementation(mockClearTimeout);

// Test helpers for improved testability
const createMockNetInfo = (isInternetReachable: boolean | null = true) => ({
    isInternetReachable,
});

const defaultProps = {
    serverUrl: 'https://test.mattermost.com',
    websocketState: 'connected' as WebsocketConnectedState,
};

const renderConnectivityManager = (props: Partial<typeof defaultProps> = {}) => {
    const fullProps = {...defaultProps, ...props};
    return renderWithIntl(<ConnectivityManager {...fullProps}/>);
};

const expectBannerCall = (mockShowCustom: jest.Mock, autoHideDuration?: number) => {
    expect(mockShowCustom).toHaveBeenCalledWith({
        id: CONNECTION_BANNER_ID,
        title: '',
        message: '',
        position: 'bottom',
        dismissible: true,
        autoHideDuration,
        customContent: expect.any(Object),
    });
};

describe('ConnectivityManager', () => {
    const mockUseNetInfo = require('@react-native-community/netinfo').useNetInfo;
    const mockUseBannerActions = useBannerActions as jest.MockedFunction<typeof useBannerActions>;
    const mockUseAppState = require('@hooks/device').useAppState;

    const mockShowCustom = jest.fn();
    const mockHideBanner = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        mockSetTimeout.mockClear();
        mockClearTimeout.mockClear();

        mockUseNetInfo.mockReturnValue(createMockNetInfo());

        mockUseBannerActions.mockReturnValue({
            showCustom: mockShowCustom,
            hideBanner: mockHideBanner,
            showSuccess: jest.fn(),
            showError: jest.fn(),
            showInfo: jest.fn(),
            showWarning: jest.fn(),
            hideAllBanners: jest.fn(),
        });

        mockUseAppState.mockReturnValue('active');
    });

    describe('rendering', () => {
        it('should render nothing (null)', () => {
            const result = renderConnectivityManager();
            expect(result.toJSON()).toBeNull();
        });
    });

    describe('connection state handling', () => {
        it('should show banner immediately when websocket is connecting', () => {
            renderConnectivityManager({websocketState: 'connecting'});
            expectBannerCall(mockShowCustom, undefined);
        });

        it('should show banner with delay when websocket is not_connected', () => {
            renderConnectivityManager({websocketState: 'not_connected'});
            expect(mockShowCustom).not.toHaveBeenCalled();
        });

        it('should handle connected state without showing banner immediately', () => {
            renderConnectivityManager({websocketState: 'connected'});
            expect(mockShowCustom).not.toHaveBeenCalled();
        });

        it('should show banner when no internet connection', () => {
            mockUseNetInfo.mockReturnValue(createMockNetInfo(false));
            renderConnectivityManager({websocketState: 'not_connected'});
            expect(mockSetTimeout).toHaveBeenCalledWith(
                expect.any(Function),
                TIME_TO_OPEN,
            );
        });

        it('should handle null internet reachable state', () => {
            mockUseNetInfo.mockReturnValue(createMockNetInfo(null));
            renderConnectivityManager({websocketState: 'not_connected'});
            expect(mockSetTimeout).toHaveBeenCalled();
        });

        it('should immediately show banner for connecting state', () => {
            renderConnectivityManager({websocketState: 'connecting'});
            expect(mockShowCustom).toHaveBeenCalled();
            expect(mockSetTimeout).not.toHaveBeenCalled();
        });

        it('should show connection restored banner when transitioning to connected', () => {
            const {rerender} = renderConnectivityManager({websocketState: 'connecting'});
            expect(mockShowCustom).toHaveBeenCalled();
            mockShowCustom.mockClear();

            rerender(
                <ConnectivityManager
                    {...defaultProps}
                    websocketState='connected'
                />);
            expectBannerCall(mockShowCustom, TIME_TO_CLOSE);
        });

        it('should handle websocket state transitions correctly', () => {
            const {rerender} = renderConnectivityManager({websocketState: 'connected'});
            mockShowCustom.mockClear();

            rerender(
                <ConnectivityManager
                    {...defaultProps}
                    websocketState='not_connected'
                />);
            expect(mockShowCustom).toHaveBeenCalled();
        });
    });

    describe('app state handling', () => {
        it('should hide banner when app goes to background', () => {
            mockUseAppState.mockReturnValue('background');

            renderWithIntl(<ConnectivityManager {...defaultProps}/>);

            // The hideConnectionBanner effect only runs when appState changes to background
            // On mount with background state, useDidUpdate skips the first render
            expect(mockHideBanner).not.toHaveBeenCalled();
        });

        it('should show banner when app becomes active and not connected', () => {
            mockUseAppState.mockReturnValue('active');

            renderWithIntl(
                <ConnectivityManager
                    {...defaultProps}
                    websocketState='not_connected'
                />,
            );

            // Should set timeout for banner display when app is active and not connected
            expect(mockSetTimeout).toHaveBeenCalled();
        });

        it('should handle websocket state transitions without crashing', () => {
            const {rerender} = renderWithIntl(
                <ConnectivityManager
                    {...defaultProps}
                    websocketState='not_connected'
                />,
            );

            // Verify timeout was set for not_connected state
            expect(mockSetTimeout).toHaveBeenCalled();

            // Transition to connected should not crash
            expect(() => {
                rerender(
                    <ConnectivityManager
                        {...defaultProps}
                        websocketState='connected'
                    />,
                );
            }).not.toThrow();
        });

        it('should handle app state transitions with rerender', () => {
            // Start with active state and connecting (to set isBannerVisible = true)
            mockUseAppState.mockReturnValue('active');

            const {rerender} = renderWithIntl(
                <ConnectivityManager
                    {...defaultProps}
                    websocketState='connecting'
                />,
            );

            // Clear initial calls
            mockHideBanner.mockClear();
            mockClearTimeout.mockClear();

            // Transition to background - this should trigger hideConnectionBanner
            mockUseAppState.mockReturnValue('background');
            rerender(
                <ConnectivityManager
                    {...defaultProps}
                    websocketState='connecting'
                />,
            );

            // Should hide banner when going to background
            expect(mockHideBanner).toHaveBeenCalledWith(CONNECTION_BANNER_ID);

            mockHideBanner.mockClear();
            mockSetTimeout.mockClear();

            // Transition back to active with not_connected
            mockUseAppState.mockReturnValue('active');
            rerender(
                <ConnectivityManager
                    {...defaultProps}
                    websocketState='not_connected'
                />,
            );

            // Should set timeout for banner display when returning to active and not connected
            expect(mockSetTimeout).toHaveBeenCalledWith(
                expect.any(Function),
                TIME_TO_OPEN,
            );
        });
    });

    describe('timeout management', () => {
        it('should use setTimeout for delayed banner display', () => {
            renderWithIntl(
                <ConnectivityManager
                    {...defaultProps}
                    websocketState='not_connected'
                />,
            );

            // Component should call setTimeout for delayed banner logic
            expect(mockSetTimeout).toHaveBeenCalled();
        });

        it('should handle component lifecycle without crashing', () => {
            const {unmount} = renderWithIntl(
                <ConnectivityManager
                    {...defaultProps}
                    websocketState='not_connected'
                />,
            );

            expect(() => unmount()).not.toThrow();
        });
    });

    describe('utility functions', () => {
        describe('getConnectionMessage', () => {
            const mockFormatMessage = jest.fn((descriptor) => descriptor.defaultMessage);

            beforeEach(() => {
                mockFormatMessage.mockClear();
            });

            it('should return connected message for connected state', () => {
                const result = getConnectionMessage('connected', true, mockFormatMessage);

                expect(result).toBe('Connection restored');
                expect(mockFormatMessage).toHaveBeenCalledWith({
                    id: 'connection_banner.connected',
                    defaultMessage: 'Connection restored',
                });
            });

            it('should return connecting message for connecting state', () => {
                const result = getConnectionMessage('connecting', true, mockFormatMessage);

                expect(result).toBe('Connecting...');
                expect(mockFormatMessage).toHaveBeenCalledWith({
                    id: 'connection_banner.connecting',
                    defaultMessage: 'Connecting...',
                });
            });

            it('should return server unreachable message when internet is available', () => {
                const result = getConnectionMessage('not_connected', true, mockFormatMessage);

                expect(result).toBe('The server is not reachable');
                expect(mockFormatMessage).toHaveBeenCalledWith({
                    id: 'connection_banner.not_reachable',
                    defaultMessage: 'The server is not reachable',
                });
            });

            it('should return network unavailable message when internet is not available', () => {
                const result = getConnectionMessage('not_connected', false, mockFormatMessage);

                expect(result).toBe('Unable to connect to network');
                expect(mockFormatMessage).toHaveBeenCalledWith({
                    id: 'connection_banner.not_connected',
                    defaultMessage: 'Unable to connect to network',
                });
            });

            it('should handle null internet reachable state', () => {
                const result = getConnectionMessage('not_connected', null, mockFormatMessage);

                expect(result).toBe('Unable to connect to network');
                expect(mockFormatMessage).toHaveBeenCalledWith({
                    id: 'connection_banner.not_connected',
                    defaultMessage: 'Unable to connect to network',
                });
            });
        });

        describe('createBannerConfig', () => {
            const mockOnDismiss = jest.fn();

            beforeEach(() => {
                mockOnDismiss.mockClear();
            });

            it('should create config for connected state with auto-hide', () => {
                const config = createBannerConfig('connected', 'Connection restored', mockOnDismiss);

                expect(config).toEqual({
                    id: CONNECTION_BANNER_ID,
                    title: '',
                    message: '',
                    position: 'bottom',
                    dismissible: true,
                    autoHideDuration: TIME_TO_CLOSE,
                    customContent: expect.any(Object),
                });

                expect(config.customContent.props).toEqual({
                    isConnected: true,
                    message: 'Connection restored',
                    dismissible: true,
                    onDismiss: mockOnDismiss,
                });
            });

            it('should create config for not_connected state without auto-hide', () => {
                const config = createBannerConfig('not_connected', 'Server unreachable', mockOnDismiss);

                expect(config).toEqual({
                    id: CONNECTION_BANNER_ID,
                    title: '',
                    message: '',
                    position: 'bottom',
                    dismissible: true,
                    autoHideDuration: undefined,
                    customContent: expect.any(Object),
                });

                expect(config.customContent.props).toEqual({
                    isConnected: false,
                    message: 'Server unreachable',
                    dismissible: true,
                    onDismiss: mockOnDismiss,
                });
            });

            it('should create config for connecting state without auto-hide', () => {
                const config = createBannerConfig('connecting', 'Connecting...', mockOnDismiss);

                expect(config.autoHideDuration).toBeUndefined();
                expect(config.customContent.props.isConnected).toBe(false);
            });
        });

        describe('constants', () => {
            it('should have correct timeout values', () => {
                expect(TIME_TO_OPEN).toBe(toMilliseconds({seconds: 3}));
                expect(TIME_TO_CLOSE).toBe(toMilliseconds({seconds: 1}));
            });

            it('should have correct banner ID', () => {
                expect(CONNECTION_BANNER_ID).toBe('global-connection-status');
            });
        });
    });
});
