// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {initE2eeDevice} from '@e2ee/actions/remote/registration';
import E2EE from '@e2ee/constants/e2ee';
import * as KeyChain from 'react-native-keychain';

import NetworkManager from '@managers/network_manager';

jest.mock('react-native-keychain');

const mockGenerateKey = jest.fn();
jest.mock('@mattermost/e2ee', () => ({
    generateSignatureKeyPair: (...args: unknown[]) => mockGenerateKey(...args),
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
});

beforeEach(() => {
    jest.clearAllMocks();

    mockClient.getPluginsManifests.mockResolvedValue([{id: E2EE.PluginId}]);
    (KeyChain.hasGenericPassword as jest.Mock).mockResolvedValue(false);
    (KeyChain.setGenericPassword as jest.Mock).mockResolvedValue({storage: 'KeystoreAESCBC' as const});
    (KeyChain.resetGenericPassword as jest.Mock).mockResolvedValue(true);

    mockGenerateKey.mockReturnValue(testSigningKey);
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

        expect(mockGenerateKey).not.toHaveBeenCalled();
    });

    it('when signature key is already generated it should skip initialization', async () => {
        (KeyChain.hasGenericPassword as jest.Mock).mockResolvedValue(true);

        const result = await initE2eeDevice(serverUrl, userId);

        expect(result).toEqual({data: false});
        expect(KeyChain.setGenericPassword).not.toHaveBeenCalled();
        expect(mockClient.registerDevice).not.toHaveBeenCalled();
        expect(mockAddDevice).not.toHaveBeenCalled();

        expect(mockGenerateKey).not.toHaveBeenCalled();
    });

    it('should return error when key generation fails', async () => {
        mockGenerateKey.mockImplementationOnce(() => {
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
});
