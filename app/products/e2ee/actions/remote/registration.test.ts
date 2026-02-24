// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {initE2eeDevice} from '@e2ee/actions/remote/registration';
import E2EE from '@e2ee/constants/e2ee';
import * as KeyChain from 'react-native-keychain';

import DatabaseManager from '@database/manager';
import E2EEManager from '@managers/e2ee_manager';
import NetworkManager from '@managers/network_manager';
import EphemeralStore from '@store/ephemeral_store';

jest.mock('react-native-keychain');
jest.mock('@store/ephemeral_store');

const mockGetCurrentDevice = jest.fn();
jest.mock('@e2ee/database/queries/devices', () => ({
    getCurrentDevice: (...args: unknown[]) => mockGetCurrentDevice(...args),
}));

jest.mock('expo-device', () => ({
    isDevice: true,
    modelName: 'TestDevice',
}));

const mockAddDevice = jest.fn();
jest.mock('@e2ee/actions/local/devices', () => ({
    addDevice: (...args: unknown[]) => mockAddDevice(...args),
}));

const serverUrl = 'baseHandler.test.com';
const userId = 'user-id';
const testSigningKey = {
    blob: new ArrayBuffer(32),
    publicKey: 'base64-public-key-string',
};

const mockClient = {
    getPluginsManifests: jest.fn(),
    registerDevice: jest.fn(),
};

beforeAll(() => {
    // @ts-expect-error mock for test
    NetworkManager.getClient = () => mockClient;

    // @ts-expect-error mock for test
    DatabaseManager.getServerDatabaseAndOperator = () => ({database: {}});
});

beforeEach(() => {
    jest.clearAllMocks();

    mockGetCurrentDevice.mockResolvedValue(undefined);
    mockClient.getPluginsManifests.mockResolvedValue([{id: E2EE.PluginId}]);
    (KeyChain.setGenericPassword as jest.Mock).mockResolvedValue({storage: 'KeystoreAESCBC' as const});
    (KeyChain.resetGenericPassword as jest.Mock).mockResolvedValue(true);

    jest.mocked(E2EEManager.generateSignatureKeyPair).mockReturnValue(testSigningKey);
    mockClient.registerDevice.mockResolvedValue({device_id: 'device-id-123'});
    mockAddDevice.mockResolvedValue({data: []});
});

describe('initE2eeDevice', () => {
    it('when e2ee plugin is not enabled returns ok without side effects', async () => {
        mockClient.getPluginsManifests.mockResolvedValueOnce([]);

        const result = await initE2eeDevice(serverUrl, userId);

        expect(result).toEqual({data: false});
        expect(KeyChain.setGenericPassword).not.toHaveBeenCalled();
        expect(mockClient.registerDevice).not.toHaveBeenCalled();
        expect(mockAddDevice).not.toHaveBeenCalled();

        expect(E2EEManager.generateSignatureKeyPair).not.toHaveBeenCalled();
    });

    it('when current device is already registered it should skip initialization', async () => {
        mockGetCurrentDevice.mockResolvedValueOnce({deviceId: 'device-id-123'});

        const result = await initE2eeDevice(serverUrl, userId);

        expect(result).toEqual({data: false});
        expect(KeyChain.setGenericPassword).not.toHaveBeenCalled();
        expect(mockClient.registerDevice).not.toHaveBeenCalled();
        expect(mockAddDevice).not.toHaveBeenCalled();

        expect(E2EEManager.generateSignatureKeyPair).not.toHaveBeenCalled();
    });

    it('when e2ee native library is not available it should skip initialization', async () => {
        jest.mocked(E2EEManager.generateSignatureKeyPair).mockReturnValueOnce(null);

        const result = await initE2eeDevice(serverUrl, userId);

        expect(result).toEqual({data: false});
        expect(KeyChain.setGenericPassword).not.toHaveBeenCalled();
        expect(mockClient.registerDevice).not.toHaveBeenCalled();
        expect(mockAddDevice).not.toHaveBeenCalled();
    });

    it('should return error when key generation fails', async () => {
        jest.mocked(E2EEManager.generateSignatureKeyPair).mockImplementationOnce(() => {
            throw new Error('key generation failed');
        });

        const result = await initE2eeDevice(serverUrl, userId);

        expect(result).toEqual({error: expect.any(Error)});
        expect(KeyChain.setGenericPassword).not.toHaveBeenCalled();
        expect(mockClient.registerDevice).not.toHaveBeenCalled();
        expect(mockAddDevice).not.toHaveBeenCalled();
    });

    it('should store device in DB and key in keychain on success', async () => {
        await initE2eeDevice(serverUrl, userId);

        expect(KeyChain.setGenericPassword).toHaveBeenCalledWith(
            'key',
            expect.any(String),
            expect.objectContaining({
                server: serverUrl,
                service: E2EE.KeychainSigningKey,
            }),
        );

        expect(mockClient.registerDevice).toHaveBeenCalledWith(
            testSigningKey.publicKey,
            'TestDevice',
        );

        expect(mockAddDevice).toHaveBeenCalledWith(
            serverUrl,
            'device-id-123',
            testSigningKey.publicKey,
        );
    });

    it('failure to get OK from register device api call should delete key stored in keychain', async () => {
        mockClient.registerDevice.mockRejectedValueOnce(new Error('400 Bad Request'));

        await initE2eeDevice(serverUrl, userId);

        expect(KeyChain.setGenericPassword).toHaveBeenCalled();
        expect(mockClient.registerDevice).toHaveBeenCalled();
        expect(KeyChain.resetGenericPassword).toHaveBeenCalledWith({
            server: serverUrl,
            service: E2EE.KeychainSigningKey,
        });
    });

    it('failure to save in keychain sets correspondent error status in ephemeral store', async () => {
        (KeyChain.setGenericPassword as jest.Mock).mockResolvedValueOnce(false);

        await initE2eeDevice(serverUrl, userId);

        expect(jest.mocked(EphemeralStore.addInitE2eeDeviceStatus)).toHaveBeenCalledWith(
            serverUrl,
            'TestDevice',
            expect.any(String),
        );
    });

    it('failure to register device with server sets error status in ephemeral store', async () => {
        mockClient.registerDevice.mockRejectedValueOnce(new Error('400 Bad Request'));

        await initE2eeDevice(serverUrl, userId);

        expect(jest.mocked(EphemeralStore.addInitE2eeDeviceStatus)).toHaveBeenCalledWith(
            serverUrl,
            'TestDevice',
            expect.any(String),
        );
    });

    it('on success ephemeral store for init e2ee state is cleared', async () => {
        await initE2eeDevice(serverUrl, userId);

        expect(jest.mocked(EphemeralStore.clearE2eeInitStatus)).toHaveBeenCalledWith(serverUrl);
        expect(jest.mocked(EphemeralStore.addInitE2eeDeviceStatus)).not.toHaveBeenCalled();
    });
});
