// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {countKeyPackages, generateKeyPackages, replenishKeyPackages} from '@e2ee/actions/remote/key_packages';

import DatabaseManager from '@database/manager';
import E2EEManager from '@managers/e2ee_manager';
import NetworkManager from '@managers/network_manager';

const mockGetCurrentDevice = jest.fn();
jest.mock('@e2ee/database/queries/devices', () => ({
    getCurrentDevice: (...args: unknown[]) => mockGetCurrentDevice(...args),
}));

const serverUrl = 'baseHandler.test.com';
const userId = 'user-id';
const currentDevice = {
    deviceId: 'device-id-123',
    signaturePublicKey: 'base64-public-key-string',
};

beforeAll(() => {
    // @ts-expect-error mock for test
    DatabaseManager.getServerDatabaseAndOperator = () => ({database: {}});
});

beforeEach(() => {
    jest.clearAllMocks();
    mockGetCurrentDevice.mockResolvedValue(currentDevice);
    jest.mocked(E2EEManager.generateKeyPackages).mockReturnValue(5);
});

describe('countKeyPackages', () => {
    const mockCountKeyPackages = jest.fn();

    beforeAll(() => {
        // @ts-expect-error mock for test
        NetworkManager.getClient = () => ({countKeyPackages: mockCountKeyPackages});
    });

    beforeEach(() => {
        mockCountKeyPackages.mockResolvedValue({available: 50, last_resort: false});
    });

    it('should return result on success', async () => {
        const result = await countKeyPackages(serverUrl);
        expect(result).toEqual({result: {available: 50, last_resort: false}});
    });

    it('should return error when network request fails', async () => {
        mockCountKeyPackages.mockRejectedValueOnce(new Error('network error'));
        const result = await countKeyPackages(serverUrl);
        expect(result).toEqual({error: expect.any(Error)});
    });
});

describe('generateKeyPackages', () => {
    const quantity = 10;
    const generateLastResort = false;

    it('should return key package count on success', async () => {
        const result = await generateKeyPackages(serverUrl, userId, quantity, generateLastResort);
        expect(result).toEqual({data: 5});
    });

    it('should return error when current device is not found in DB', async () => {
        mockGetCurrentDevice.mockResolvedValueOnce(undefined);
        const result = await generateKeyPackages(serverUrl, userId, quantity, generateLastResort);
        expect(result).toEqual({error: expect.any(Error)});
    });

    it('should return error when current device has no signature public key', async () => {
        mockGetCurrentDevice.mockResolvedValueOnce({...currentDevice, signaturePublicKey: null});
        const result = await generateKeyPackages(serverUrl, userId, quantity, generateLastResort);
        expect(result).toEqual({error: expect.any(Error)});
    });

    it('should return error when E2EE native module is not available', async () => {
        jest.mocked(E2EEManager.generateKeyPackages).mockReturnValueOnce(null);
        const result = await generateKeyPackages(serverUrl, userId, quantity, generateLastResort);
        expect(result).toEqual({error: expect.any(Error)});
    });

    it('should return error when serverUrl has no associated database', async () => {
        jest.spyOn(DatabaseManager, 'getServerDatabaseAndOperator').mockImplementationOnce(() => {
            throw new Error('no server database found');
        });
        const result = await generateKeyPackages('unknown-server', userId, quantity, generateLastResort);
        expect(result).toEqual({error: expect.any(Error)});
    });
});

describe('replenishKeyPackages', () => {
    const mockCountKeyPackages = jest.fn();

    beforeAll(() => {
        // @ts-expect-error mock for test
        NetworkManager.getClient = () => ({countKeyPackages: mockCountKeyPackages});
    });

    beforeEach(() => {
        mockCountKeyPackages.mockResolvedValue({available: 50, last_resort: false});
    });

    it('should not generate key packages when available count is above threshold', async () => {
        mockCountKeyPackages.mockResolvedValue({available: 11, last_resort: false});
        await replenishKeyPackages(serverUrl, userId);
        expect(E2EEManager.generateKeyPackages).not.toHaveBeenCalled();
    });

    it('should generate key packages when available count is at the threshold', async () => {
        mockCountKeyPackages.mockResolvedValue({available: 10, last_resort: false});
        await replenishKeyPackages(serverUrl, userId);
        expect(E2EEManager.generateKeyPackages).toHaveBeenCalledWith(
            userId, currentDevice.deviceId, currentDevice.signaturePublicKey, 10, true,
        );
    });

    it('should generate key packages when available count is below threshold', async () => {
        mockCountKeyPackages.mockResolvedValue({available: 0, last_resort: true});
        await replenishKeyPackages(serverUrl, userId);
        expect(E2EEManager.generateKeyPackages).toHaveBeenCalledWith(
            userId, currentDevice.deviceId, currentDevice.signaturePublicKey, 20, false,
        );
    });

    it('should not generate key packages when count request fails', async () => {
        mockCountKeyPackages.mockRejectedValue(new Error('network error'));
        await replenishKeyPackages(serverUrl, userId);
        expect(E2EEManager.generateKeyPackages).not.toHaveBeenCalled();
    });

});
