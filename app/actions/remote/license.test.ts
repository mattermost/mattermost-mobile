// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Client} from '@client/rest';
import NetworkManager from '@managers/network_manager';

import {getLicenseLoadMetric} from './license';
import {forceLogoutIfNecessary} from './session';

jest.mock('@constants/device', () => ({}), {virtual: true});
jest.mock('@database/manager', () => ({}), {virtual: true});

jest.mock('@managers/network_manager', () => ({
    getClient: jest.fn(),
}));

jest.mock('./session', () => ({
    forceLogoutIfNecessary: jest.fn(),
}));

describe('Actions.Remote.License', () => {
    const serverUrl = 'https://server.com';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getLicenseLoadMetric', () => {
        it('should return null if not licensed', async () => {
            const result = await getLicenseLoadMetric(serverUrl, '10.8.0', false);
            expect(result).toBeNull();
            expect(NetworkManager.getClient).not.toHaveBeenCalled();
        });

        it('should return null if server version is less than minimum', async () => {
            const result = await getLicenseLoadMetric(serverUrl, '10.7.0', true);
            expect(result).toBeNull();
            expect(NetworkManager.getClient).not.toHaveBeenCalled();
        });

        it('should fetch and return load metric if licensed and minimum version is met', async () => {
            const mockClient = {
                getLicenseLoadMetric: jest.fn().mockResolvedValue({load: 100}),
            } as unknown as Client;
            (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);

            const result = await getLicenseLoadMetric(serverUrl, '10.8.0', true);

            expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
            expect(mockClient.getLicenseLoadMetric).toHaveBeenCalledWith();
            expect(result).toBe(100);
        });

        it('should return null if response does not contain load or load is 0', async () => {
            const mockClient = {
                getLicenseLoadMetric: jest.fn().mockResolvedValue({load: 0}),
            } as unknown as Client;
            (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);

            const result = await getLicenseLoadMetric(serverUrl, '10.8.0', true);

            expect(result).toBeNull();
        });

        it('should return error and call forceLogoutIfNecessary if API call fails', async () => {
            const mockError = new Error('API error');
            const mockClient = {
                getLicenseLoadMetric: jest.fn().mockRejectedValue(mockError),
            } as unknown as Client;
            (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);

            const result = await getLicenseLoadMetric(serverUrl, '10.8.0', true);

            expect(result).toEqual({error: mockError});
            expect(forceLogoutIfNecessary).toHaveBeenCalledWith(serverUrl, mockError);
        });

        it('should correctly handle different server versions', async () => {
            // Test with versions below minimum requirement
            let result = await getLicenseLoadMetric(serverUrl, '10.7.0', true);
            expect(result).toBeNull();
            expect(NetworkManager.getClient).not.toHaveBeenCalled();

            result = await getLicenseLoadMetric(serverUrl, '9.0.0', true);
            expect(result).toBeNull();
            expect(NetworkManager.getClient).not.toHaveBeenCalled();

            // Set up mock for versions that meet requirement
            const mockClient = {
                getLicenseLoadMetric: jest.fn().mockResolvedValue({load: 100}),
            } as unknown as Client;
            (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);

            // Test with versions meeting or exceeding minimum requirement
            result = await getLicenseLoadMetric(serverUrl, '10.8.0', true);
            expect(NetworkManager.getClient).toHaveBeenCalled();
            expect(result).toBe(100);
            jest.clearAllMocks();

            result = await getLicenseLoadMetric(serverUrl, '10.9.0', true);
            expect(NetworkManager.getClient).toHaveBeenCalled();
            expect(result).toBe(100);
            jest.clearAllMocks();

            result = await getLicenseLoadMetric(serverUrl, '11.0.0', true);
            expect(NetworkManager.getClient).toHaveBeenCalled();
            expect(result).toBe(100);
        });
    });
});
