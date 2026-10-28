// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {NativeModules, Platform} from 'react-native';
import * as KeyChain from 'react-native-keychain';

import {
    WireGuardStatus,
    clearWireGuardConfig,
    connectWireGuard,
    getWireGuardState,
    isWireGuardRequired,
    loadWireGuardConfig,
    saveWireGuardConfig,
    validateWireGuardConfig,
    type WireGuardState,
} from './wireguard_manager';

jest.mock('react-native-keychain', () => ({
    SECURITY_LEVEL: {
        SECURE_SOFTWARE: 'SECURE_SOFTWARE',
    },
    STORAGE_TYPE: {
        AES_GCM: 'KeystoreAESGCM',
    },
    setGenericPassword: jest.fn(),
    getGenericPassword: jest.fn(),
    resetGenericPassword: jest.fn(),
}));

const connectedState: WireGuardState = {
    status: WireGuardStatus.Connected,
    message: null,
    handshakeEpochMillis: 123456,
    rxBytes: 128,
    txBytes: 256,
    applicationId: 'com.mattermost.rnbeta',
};

const summary = {
    addresses: ['10.20.0.2/32'],
    dnsServers: ['10.20.0.1'],
    allowedIps: ['10.20.0.0/24'],
    endpoints: ['192.0.2.10:51820'],
    peerCount: 1,
};

const nativeModule = {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
    getState: jest.fn(),
    validateConfig: jest.fn(),
    readConfigFile: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn(),
    setSecureScreen: jest.fn(),
};

describe('WireGuardManager', () => {
    const originalPlatform = Platform.OS;

    beforeEach(() => {
        Platform.OS = 'android';
        NativeModules.ENCMAWireGuard = nativeModule;
        nativeModule.getState.mockResolvedValue(connectedState);
        nativeModule.validateConfig.mockResolvedValue(summary);
        nativeModule.connect.mockResolvedValue(connectedState);
        jest.mocked(KeyChain.setGenericPassword).mockResolvedValue({service: 'encma.wireguard.configuration', storage: KeyChain.STORAGE_TYPE.AES_GCM});
        jest.mocked(KeyChain.resetGenericPassword).mockResolvedValue(true);
    });

    afterEach(() => {
        Platform.OS = originalPlatform;
    });

    it('requires the tunnel gate only on Android', () => {
        Platform.OS = 'android';
        expect(isWireGuardRequired()).toBe(true);

        Platform.OS = 'ios';
        expect(isWireGuardRequired()).toBe(false);
    });

    it('returns native connection and validation results', async () => {
        await expect(getWireGuardState()).resolves.toEqual(connectedState);
        await expect(validateWireGuardConfig('test-configuration')).resolves.toEqual(summary);
        await expect(connectWireGuard('test-configuration')).resolves.toEqual(connectedState);

        expect(nativeModule.validateConfig).toHaveBeenCalledWith('test-configuration');
        expect(nativeModule.connect).toHaveBeenCalledWith('test-configuration');
    });

    it('uses a dedicated Keychain service and secure software storage', async () => {
        await saveWireGuardConfig('private-test-configuration');

        expect(KeyChain.setGenericPassword).toHaveBeenCalledWith(
            'wireguard-config',
            'private-test-configuration',
            {
                service: 'encma.wireguard.configuration',
                securityLevel: KeyChain.SECURITY_LEVEL.SECURE_SOFTWARE,
            },
        );
    });

    it('loads only the expected WireGuard account', async () => {
        jest.mocked(KeyChain.getGenericPassword).mockResolvedValue({
            username: 'wireguard-config',
            password: 'private-test-configuration',
            service: 'encma.wireguard.configuration',
            storage: KeyChain.STORAGE_TYPE.AES_GCM,
        });

        await expect(loadWireGuardConfig()).resolves.toBe('private-test-configuration');
        expect(KeyChain.getGenericPassword).toHaveBeenCalledWith({service: 'encma.wireguard.configuration'});
    });

    it('does not load another account from the same service', async () => {
        jest.mocked(KeyChain.getGenericPassword).mockResolvedValue({
            username: 'another-account',
            password: 'do-not-use',
            service: 'encma.wireguard.configuration',
            storage: KeyChain.STORAGE_TYPE.AES_GCM,
        });

        await expect(loadWireGuardConfig()).resolves.toBeUndefined();
    });

    it('fails when secure storage refuses to save or clear', async () => {
        jest.mocked(KeyChain.setGenericPassword).mockResolvedValue(false);
        jest.mocked(KeyChain.resetGenericPassword).mockResolvedValue(false);

        await expect(saveWireGuardConfig('private-test-configuration')).rejects.toThrow('could not be stored securely');
        await expect(clearWireGuardConfig()).rejects.toThrow('could not be removed');
    });
});
