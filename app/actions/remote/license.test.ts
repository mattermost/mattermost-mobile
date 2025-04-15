// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';
import {isMinimumServerVersion} from '@utils/helpers';
import {forceLogoutIfNecessary} from './session';

import {getLicenseLoadMetric} from './license';

jest.mock('@constants/device', () => ({}), {virtual: true});
jest.mock('@database/manager', () => ({}), {virtual: true});

jest.mock('@managers/network_manager', () => ({
    getClient: jest.fn(),
}));

jest.mock('@utils/helpers', () => ({
    isMinimumServerVersion: jest.fn(),
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
            (isMinimumServerVersion as jest.Mock).mockReturnValueOnce(false);
            const result = await getLicenseLoadMetric(serverUrl, '10.7.0', true);
            expect(result).toBeNull();
            expect(NetworkManager.getClient).not.toHaveBeenCalled();
        });

        it('should fetch and return load metric if licensed and minimum version is met', async () => {
            const mockClient = {
                getLicenseLoadMetric: jest.fn().mockResolvedValue({load: 100}),
            };
            (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);
            (isMinimumServerVersion as jest.Mock).mockReturnValueOnce(true);

            const result = await getLicenseLoadMetric(serverUrl, '10.8.0', true);

            expect(isMinimumServerVersion).toHaveBeenCalledWith('10.8.0', 10, 8, 0);
            expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
            expect(mockClient.getLicenseLoadMetric).toHaveBeenCalled();
            expect(result).toBe(100);
        });

        it('should return null if response does not contain load or load is 0', async () => {
            const mockClient = {
                getLicenseLoadMetric: jest.fn().mockResolvedValue({load: 0}),
            };
            (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);
            (isMinimumServerVersion as jest.Mock).mockReturnValueOnce(true);

            const result = await getLicenseLoadMetric(serverUrl, '10.8.0', true);

            expect(result).toBeNull();
        });

        it('should return error and call forceLogoutIfNecessary if API call fails', async () => {
            const mockError = new Error('API error');
            const mockClient = {
                getLicenseLoadMetric: jest.fn().mockRejectedValue(mockError),
            };
            (NetworkManager.getClient as jest.Mock).mockReturnValue(mockClient);
            (isMinimumServerVersion as jest.Mock).mockReturnValueOnce(true);

            const result = await getLicenseLoadMetric(serverUrl, '10.8.0', true);

            expect(result).toEqual({error: mockError});
            expect(forceLogoutIfNecessary).toHaveBeenCalledWith(serverUrl, mockError);
        });
    });
});
