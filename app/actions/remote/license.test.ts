// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import NetworkManager from '@managers/network_manager';

import {getLicenseLoadMetric} from './license';
import {forceLogoutIfNecessary} from './session';

import type {Client} from '@client/rest';

jest.mock('@constants/device', () => ({}), {virtual: true});
jest.mock('@database/manager', () => ({}), {virtual: true});

jest.mock('@managers/network_manager');
jest.mock('./session');

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
            };
            jest.mocked(NetworkManager.getClient).mockReturnValue(mockClient as unknown as Client);

            const result = await getLicenseLoadMetric(serverUrl, '10.8.0', true);

            expect(NetworkManager.getClient).toHaveBeenCalledWith(serverUrl);
            expect(mockClient.getLicenseLoadMetric).toHaveBeenCalledWith();
            expect(result).toBe(100);
        });

        it('should return null if response does not contain load or load is 0', async () => {
            const mockClient = {
                getLicenseLoadMetric: jest.fn().mockResolvedValue({load: 0}),
            };
            jest.mocked(NetworkManager.getClient).mockReturnValue(mockClient as unknown as Client);

            const result = await getLicenseLoadMetric(serverUrl, '10.8.0', true);

            expect(result).toBeNull();
        });

        it('should return error and call forceLogoutIfNecessary if API call fails', async () => {
            const mockError = new Error('API error');
            const mockClient = {
                getLicenseLoadMetric: jest.fn().mockRejectedValue(mockError),
            };
            jest.mocked(NetworkManager.getClient).mockReturnValue(mockClient as unknown as Client);

            const result = await getLicenseLoadMetric(serverUrl, '10.8.0', true);

            expect(result).toEqual({error: mockError});
            expect(forceLogoutIfNecessary).toHaveBeenCalledWith(serverUrl, mockError);
        });
    });
});
