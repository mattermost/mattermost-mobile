// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {forceLogoutIfNecessary} from '@actions/remote/session';
import DatabaseManager from '@database/manager';
import NetworkManager from '@managers/network_manager';
import {getFullErrorMessage} from '@utils/errors';
import {logDebug} from '@utils/log';

import {fetchRegisteredDevices} from './devices';

import type {Database} from '@nozbe/watermelondb';

jest.mock('@actions/remote/session', () => ({
    forceLogoutIfNecessary: jest.fn(),
}));

jest.mock('@database/manager', () => ({
    __esModule: true,
    default: {
        getServerDatabaseAndOperator: jest.fn(),
    },
}));

jest.mock('@utils/errors', () => ({
    getFullErrorMessage: jest.fn((err: Error) => err?.message ?? ''),
}));

const serverUrl = 'baseHandler.test.com';

const mockDevicesResponse: RegisteredDevicesReturn = {
    devices: [
        {
            device_id: 'device-1',
            device_name: 'Device 1',
            created_at: 1000,
            last_active_at: 2000,
        },
        {
            device_id: 'device-2',
            device_name: 'Current Device',
            created_at: 1500,
            last_active_at: 2500,
        },
    ],
};

// no local data by default
const mockHandleDevices = jest.fn().mockResolvedValue([]);
const mockOperator = {handleDevices: mockHandleDevices};

const mockClient = {
    fetchDevices: jest.fn(),
};

const throwFunc = () => {
    throw new Error('error');
};

beforeAll(() => {
    jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockReturnValue({
        database: {} as Database,
        operator: mockOperator as never,
    });

    // @ts-expect-error mock for test
    NetworkManager.getClient = () => mockClient;
});

beforeEach(() => {
    jest.clearAllMocks();
    mockClient.fetchDevices.mockResolvedValue(mockDevicesResponse);
});

describe('fetchRegisteredDevices', () => {
    it('should fetch devices successfully and call handleDevices to keep local data in sync', async () => {
        const result = await fetchRegisteredDevices(serverUrl);

        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.devices).toHaveLength(2);
        expect(mockClient.fetchDevices).toHaveBeenCalled();

        // creates local data for new fetched devices
        expect(mockHandleDevices).toHaveBeenCalledWith({
            devices: expect.arrayContaining([
                expect.objectContaining({
                    device_id: 'device-1',
                    device_name: 'Device 1',
                }),
                expect.objectContaining({
                    device_id: 'device-2',
                }),
            ]),
        });
        expect(logDebug).not.toHaveBeenCalled();
        expect(forceLogoutIfNecessary).not.toHaveBeenCalled();
    });

    it('should combine local data with fetched data', async () => {
        mockHandleDevices.mockResolvedValueOnce([
            {deviceId: 'device-1', isCurrentDevice: true, verified: true},
            {deviceId: 'device-2', isCurrentDevice: false, verified: false},
        ]);

        const result = await fetchRegisteredDevices(serverUrl);

        expect(result.devices).toHaveLength(2);
        expect(result.devices![0]).toMatchObject({
            device_id: 'device-1',
            is_current_device: true,
            verified: true,
        });
        expect(result.devices![1]).toMatchObject({
            device_id: 'device-2',
            is_current_device: false,
            verified: false,
        });
    });

    it('should handle getServerDatabaseAndOperator error', async () => {
        jest.mocked(DatabaseManager.getServerDatabaseAndOperator).mockImplementationOnce(throwFunc);
        jest.mocked(getFullErrorMessage).mockReturnValueOnce('error');

        const result = await fetchRegisteredDevices(serverUrl);

        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(result.devices).toBeUndefined();
        expect(mockClient.fetchDevices).not.toHaveBeenCalled();
        expect(mockHandleDevices).not.toHaveBeenCalled();
        expect(logDebug).toHaveBeenCalledWith('fetchRegisteredDevicesWithLocalData', 'error');
        expect(forceLogoutIfNecessary).toHaveBeenCalledWith(serverUrl, expect.any(Error));
    });

    it('should handle fetchDevices API exception', async () => {
        const apiError = new Error('API error');
        mockClient.fetchDevices.mockRejectedValueOnce(apiError);
        jest.mocked(getFullErrorMessage).mockReturnValueOnce('API error');

        const result = await fetchRegisteredDevices(serverUrl);

        expect(result).toBeDefined();
        expect(result.error).toBeDefined();
        expect(result.error).toBe(apiError);
        expect(result.devices).toBeUndefined();
        expect(mockClient.fetchDevices).toHaveBeenCalled();
        expect(mockHandleDevices).not.toHaveBeenCalled();
        expect(logDebug).toHaveBeenCalledWith('fetchRegisteredDevicesWithLocalData', 'API error');
        expect(forceLogoutIfNecessary).toHaveBeenCalledWith(serverUrl, apiError);
    });

    it('should handle null devices from API and call handleDevices with empty array', async () => {
        mockClient.fetchDevices.mockResolvedValueOnce({devices: null});

        const result = await fetchRegisteredDevices(serverUrl);

        expect(result).toBeDefined();
        expect(result.error).toBeUndefined();
        expect(result.devices).toEqual([]);
        expect(mockHandleDevices).toHaveBeenCalledWith({devices: []});
    });
});
