// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntl, screen} from '@test/intl-test-helper';

import ConnectionBanner from './connection_banner';
import {useConnectionBanner} from './use_connection_banner';

jest.mock('./use_connection_banner');

jest.mock('@context/theme', () => ({
    useTheme: () => ({
        centerChannelBg: '#ffffff',
        centerChannelColor: '#3d3c40',
        onlineIndicator: '#06d6a0',
        sidebarBg: '#2f3e4e',
    }),
}));

jest.mock('@hooks/device', () => ({
    useAppState: () => 'active',
}));

jest.mock('@react-native-community/netinfo', () => ({
    useNetInfo: () => ({
        type: 'wifi',
        isConnected: true,
        isInternetReachable: true,
    }),
}));

describe('ConnectionBanner', () => {
    const mockUseConnectionBanner = useConnectionBanner as jest.MockedFunction<typeof useConnectionBanner>;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should not render banner content when not visible', () => {
        mockUseConnectionBanner.mockReturnValue({
            visible: false,
            bannerText: 'Test message',
            isShowingConnectedBanner: false,
        });

        renderWithIntl(
            <ConnectionBanner
                websocketState='connected'
                networkPerformanceState='normal'
            />,
        );

        expect(screen.queryByText('Test message')).toBeNull();
    });

    it('should render disconnection banner when visible', () => {
        mockUseConnectionBanner.mockReturnValue({
            visible: true,
            bannerText: 'Unable to connect to network',
            isShowingConnectedBanner: false,
        });

        renderWithIntl(
            <ConnectionBanner
                websocketState='not_connected'
                networkPerformanceState='normal'
            />,
        );

        expect(screen.getByText('Unable to connect to network')).toBeTruthy();
    });

    it('should render connection restored banner when showing connected state', () => {
        mockUseConnectionBanner.mockReturnValue({
            visible: true,
            bannerText: 'Connection restored',
            isShowingConnectedBanner: true,
        });

        renderWithIntl(
            <ConnectionBanner
                websocketState='connected'
                networkPerformanceState='normal'
            />,
        );

        expect(screen.getByText('Connection restored')).toBeTruthy();
    });

    it('should render slow network banner', () => {
        mockUseConnectionBanner.mockReturnValue({
            visible: true,
            bannerText: 'Limited network connection',
            isShowingConnectedBanner: false,
        });

        renderWithIntl(
            <ConnectionBanner
                websocketState='connected'
                networkPerformanceState='slow'
            />,
        );

        expect(screen.getByText('Limited network connection')).toBeTruthy();
    });

    it('should render server not reachable banner', () => {
        mockUseConnectionBanner.mockReturnValue({
            visible: true,
            bannerText: 'The server is not reachable',
            isShowingConnectedBanner: false,
        });

        renderWithIntl(
            <ConnectionBanner
                websocketState='not_connected'
                networkPerformanceState='normal'
            />,
        );

        expect(screen.getByText('The server is not reachable')).toBeTruthy();
    });
});

