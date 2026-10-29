// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {render, waitFor} from '@testing-library/react-native';
import {Redirect} from 'expo-router';
import React from 'react';

import {determineInitialExpoRoute} from '@init/launch';
import {getWireGuardState, isWireGuardRequired, WireGuardStatus} from '@managers/wireguard_manager';

import RootIndex from './index';

jest.mock('expo-router', () => ({
    Redirect: jest.fn(() => null),
}));

jest.mock('@init/launch', () => ({
    determineInitialExpoRoute: jest.fn(),
}));

jest.mock('@managers/wireguard_manager', () => ({
    WireGuardStatus: {
        Disconnected: 'disconnected',
        Connecting: 'connecting',
        Connected: 'connected',
        Failed: 'failed',
    },
    getWireGuardState: jest.fn(),
    isWireGuardRequired: jest.fn(),
}));

jest.mock('@screens/navigation', () => ({
    propsToParams: (params: object) => params,
}));

const mockRedirect = Redirect as unknown as jest.Mock;

describe('RootIndex WireGuard gate', () => {
    beforeEach(() => {
        jest.mocked(isWireGuardRequired).mockReturnValue(true);
        jest.mocked(getWireGuardState).mockResolvedValue({
            status: WireGuardStatus.Disconnected,
            message: null,
            handshakeEpochMillis: 0,
            rxBytes: 0,
            txBytes: 0,
            applicationId: 'com.mattermost.rnbeta',
        });
        jest.mocked(determineInitialExpoRoute).mockResolvedValue({route: '/login', params: {}});
    });

    it('redirects to VPN before normal launch when the tunnel is disconnected', async () => {
        render(<RootIndex/>);

        await waitFor(() => expect(mockRedirect).toHaveBeenCalled());
        expect(mockRedirect.mock.calls[0][0].href).toEqual({pathname: '/vpn', params: {}});
        expect(determineInitialExpoRoute).not.toHaveBeenCalled();
    });

    it('fails closed when the native VPN state cannot be read', async () => {
        jest.mocked(getWireGuardState).mockRejectedValue(new Error('native module unavailable'));

        render(<RootIndex/>);

        await waitFor(() => expect(mockRedirect).toHaveBeenCalled());
        expect(mockRedirect.mock.calls[0][0].href).toEqual({pathname: '/vpn', params: {}});
        expect(determineInitialExpoRoute).not.toHaveBeenCalled();
    });

    it('continues normal launch only after native connected state', async () => {
        jest.mocked(getWireGuardState).mockResolvedValue({
            status: WireGuardStatus.Connected,
            message: null,
            handshakeEpochMillis: 123456,
            rxBytes: 128,
            txBytes: 256,
            applicationId: 'com.mattermost.rnbeta',
        });

        render(<RootIndex/>);

        await waitFor(() => expect(determineInitialExpoRoute).toHaveBeenCalled());
        expect(mockRedirect.mock.calls[0][0].href).toEqual({pathname: '/login', params: {}});
    });

    it('opens the server screen instead of a blank route when normal launch fails', async () => {
        jest.mocked(getWireGuardState).mockResolvedValue({
            status: WireGuardStatus.Connected,
            message: null,
            handshakeEpochMillis: 123456,
            rxBytes: 128,
            txBytes: 256,
            applicationId: 'com.encma.hxmain',
        });
        jest.mocked(determineInitialExpoRoute).mockRejectedValue(new Error('launch initialization failed'));

        render(<RootIndex/>);

        await waitFor(() => expect(mockRedirect).toHaveBeenCalled());
        expect(mockRedirect.mock.calls[0][0].href).toEqual({
            pathname: '/(unauthenticated)/server',
            params: {launchError: true},
        });
    });

    it('shows a loading indicator while normal launch is pending', async () => {
        jest.mocked(getWireGuardState).mockResolvedValue({
            status: WireGuardStatus.Connected,
            message: null,
            handshakeEpochMillis: 123456,
            rxBytes: 128,
            txBytes: 256,
            applicationId: 'com.encma.hxmain',
        });
        jest.mocked(determineInitialExpoRoute).mockReturnValue(new Promise<never>(() => undefined));

        const {getByTestId} = render(<RootIndex/>);

        await waitFor(() => expect(determineInitialExpoRoute).toHaveBeenCalled());
        expect(getByTestId('launch.loading')).toBeTruthy();
        expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('does not invoke the Android gate on other platforms', async () => {
        jest.mocked(isWireGuardRequired).mockReturnValue(false);

        render(<RootIndex/>);

        await waitFor(() => expect(determineInitialExpoRoute).toHaveBeenCalled());
        expect(getWireGuardState).not.toHaveBeenCalled();
    });
});
