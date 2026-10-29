// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, screen, waitFor} from '@testing-library/react-native';
import {router} from 'expo-router';
import React from 'react';

import {appEntry} from '@actions/remote/entry/app';
import {determinePostWireGuardRouteWithFallback} from '@init/launch_with_fallback';
import {
    WireGuardStatus,
    addWireGuardStateListener,
    clearWireGuardConfig,
    connectWireGuard,
    disconnectWireGuard,
    getWireGuardState,
    loadWireGuardConfig,
    publishWireGuardState,
    readWireGuardConfig,
    saveWireGuardConfig,
    setWireGuardSecureScreen,
    validateWireGuardConfig,
} from '@managers/wireguard_manager';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import VpnScreen from './index';

jest.mock('@react-native-documents/picker', () => ({
    errorCodes: {OPERATION_CANCELED: 'OPERATION_CANCELED'},
    isErrorWithCode: jest.fn(),
    pick: jest.fn(),
    types: {allFiles: 'allFiles'},
}));

jest.mock('@actions/remote/entry/app', () => ({
    appEntry: jest.fn(),
}));

jest.mock('@init/launch_with_fallback', () => ({
    determinePostWireGuardRouteWithFallback: jest.fn(),
}));

jest.mock('@managers/wireguard_manager', () => ({
    WireGuardStatus: {
        Disconnected: 'disconnected',
        Connecting: 'connecting',
        Connected: 'connected',
        Failed: 'failed',
    },
    addWireGuardStateListener: jest.fn(),
    clearWireGuardConfig: jest.fn(),
    connectWireGuard: jest.fn(),
    disconnectWireGuard: jest.fn(),
    getWireGuardState: jest.fn(),
    loadWireGuardConfig: jest.fn(),
    publishWireGuardState: jest.fn(),
    readWireGuardConfig: jest.fn(),
    saveWireGuardConfig: jest.fn(),
    setWireGuardSecureScreen: jest.fn(),
    validateWireGuardConfig: jest.fn(),
}));

const disconnectedState = {
    status: WireGuardStatus.Disconnected,
    message: null,
    handshakeEpochMillis: 0,
    rxBytes: 0,
    txBytes: 0,
    applicationId: 'com.encma.hxmain',
};

const connectedState = {
    ...disconnectedState,
    status: WireGuardStatus.Connected,
    handshakeEpochMillis: 123456,
    rxBytes: 128,
    txBytes: 256,
};

const summary = {
    addresses: ['10.20.0.2/32'],
    dnsServers: ['10.20.0.1'],
    allowedIps: ['10.20.0.0/24'],
    endpoints: ['192.0.2.10:51820'],
    peerCount: 1,
};

describe('VpnScreen', () => {
    beforeEach(() => {
        jest.mocked(addWireGuardStateListener).mockReturnValue(jest.fn());
        jest.mocked(getWireGuardState).mockResolvedValue(disconnectedState);
        jest.mocked(loadWireGuardConfig).mockResolvedValue(undefined);
        jest.mocked(validateWireGuardConfig).mockResolvedValue(summary);
        jest.mocked(connectWireGuard).mockResolvedValue(connectedState);
        jest.mocked(disconnectWireGuard).mockResolvedValue(disconnectedState);
        jest.mocked(saveWireGuardConfig).mockResolvedValue(undefined);
        jest.mocked(clearWireGuardConfig).mockResolvedValue(undefined);
        jest.mocked(readWireGuardConfig).mockResolvedValue('private-test-configuration');
        jest.mocked(determinePostWireGuardRouteWithFallback).mockResolvedValue({
            route: '/(unauthenticated)/server',
            params: {},
        });
        jest.mocked(appEntry).mockResolvedValue({});
    });

    it('saves only after verified connect and then replaces VPN with the resolved destination', async () => {
        renderWithIntlAndTheme(<VpnScreen/>);

        const editor = await screen.findByTestId('mobile.vpn.editor');
        fireEvent.changeText(editor, 'private-test-configuration');
        fireEvent.press(screen.getByTestId('mobile.vpn.connect'));

        await waitFor(() => expect(saveWireGuardConfig).toHaveBeenCalledWith('private-test-configuration'));
        await waitFor(() => expect(router.replace).toHaveBeenCalledWith({
            pathname: '/(unauthenticated)/server',
            params: {},
        }));
        expect(connectWireGuard).toHaveBeenCalledWith('private-test-configuration');
        expect(jest.mocked(connectWireGuard).mock.invocationCallOrder[0]).toBeLessThan(
            jest.mocked(saveWireGuardConfig).mock.invocationCallOrder[0],
        );
        expect(jest.mocked(saveWireGuardConfig).mock.invocationCallOrder[0]).toBeLessThan(
            jest.mocked(router.replace).mock.invocationCallOrder[0],
        );
        expect(router.replace).not.toHaveBeenCalledWith('/');
    });

    it('disconnects and fails closed if the verified config cannot be saved securely', async () => {
        jest.mocked(saveWireGuardConfig).mockRejectedValue(new Error('secure storage unavailable'));

        renderWithIntlAndTheme(<VpnScreen/>);

        const editor = await screen.findByTestId('mobile.vpn.editor');
        fireEvent.changeText(editor, 'private-test-configuration');
        fireEvent.press(screen.getByTestId('mobile.vpn.connect'));

        await waitFor(() => expect(disconnectWireGuard).toHaveBeenCalled());
        expect(router.replace).not.toHaveBeenCalled();
        expect(screen.getByText('The tunnel connected, but the configuration could not be saved securely. The tunnel was disconnected.')).toBeTruthy();
        expect(screen.getByTestId('mobile.vpn.status').props.children).toBe('Connection failed');
    });

    it('continues directly to the resolved destination when the tunnel is already connected', async () => {
        jest.mocked(getWireGuardState).mockResolvedValue(connectedState);

        renderWithIntlAndTheme(<VpnScreen/>);

        await waitFor(() => expect(router.replace).toHaveBeenCalledWith({
            pathname: '/(unauthenticated)/server',
            params: {},
        }));
        expect(connectWireGuard).not.toHaveBeenCalled();
        expect(publishWireGuardState).toHaveBeenCalledWith(connectedState);
        expect(router.replace).not.toHaveBeenCalledWith('/');
    });

    it('resumes server entry only after replacing VPN for an authenticated session', async () => {
        jest.mocked(getWireGuardState).mockResolvedValue(connectedState);
        jest.mocked(determinePostWireGuardRouteWithFallback).mockResolvedValue({
            route: '/(authenticated)/(home)',
            params: {serverUrl: 'https://server.example'},
        });

        renderWithIntlAndTheme(<VpnScreen/>);

        await waitFor(() => expect(router.replace).toHaveBeenCalledWith({
            pathname: '/(authenticated)/(home)',
            params: {serverUrl: JSON.stringify('https://server.example')},
        }));
        await waitFor(() => expect(appEntry).toHaveBeenCalledWith('https://server.example'));
        expect(jest.mocked(router.replace).mock.invocationCallOrder[0]).toBeLessThan(
            jest.mocked(appEntry).mock.invocationCallOrder[0],
        );
    });

    it('reconnects a securely saved config without exposing it in the summary', async () => {
        jest.mocked(loadWireGuardConfig).mockResolvedValue('private-test-configuration');

        renderWithIntlAndTheme(<VpnScreen management={true}/>);

        await waitFor(() => expect(connectWireGuard).toHaveBeenCalledWith('private-test-configuration'));
        await waitFor(() => expect(screen.getByTestId('mobile.vpn.status').props.children).toBe('Connected'));
        expect(screen.queryByText('private-test-configuration')).toBeNull();
        expect(setWireGuardSecureScreen).toHaveBeenCalledWith(true);
        expect(router.replace).not.toHaveBeenCalled();
    });
});
