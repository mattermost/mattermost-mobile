// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';

let client: any;

beforeEach(() => {
    client = TestHelper.createClient();
    client.doFetch = jest.fn();
});

describe('fetchDevices', () => {
    test('should fetch devices for current user', async () => {
        const expectedUrl = '/plugins/mattermost-e2ee/v1/devices';
        const expectedOptions = {method: 'get'};
        const mockResponse = [{
            device_id: 'device-1',
            device_name: 'Device 1',
            created_at: 1000,
            last_active_at: 2000,
        }];

        jest.mocked(client.doFetch).mockResolvedValue(mockResponse);

        const result = await client.fetchDevices();
        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
        expect(result).toEqual({devices: mockResponse});
    });

    test('should return empty array when doFetch returns null', async () => {
        const expectedUrl = '/plugins/mattermost-e2ee/v1/devices';
        const expectedOptions = {method: 'get'};

        jest.mocked(client.doFetch).mockResolvedValue(null);

        const result = await client.fetchDevices();
        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
        expect(result).toEqual({devices: []});
    });

    test('should return error response when doFetch throws error', async () => {
        const mockError = new Error('Network error');

        jest.mocked(client.doFetch).mockRejectedValue(mockError);

        await expect(client.fetchDevices()).rejects.toThrow('Network error');
    });
});

describe('registerDevice', () => {
    test('should POST to devices endpoint with correct body', async () => {
        const mockResponse = {device_id: 'device-123'};
        jest.mocked(client.doFetch).mockResolvedValue(mockResponse);

        const result = await client.registerDevice('public-key-abc', 'My Phone');

        expect(client.doFetch).toHaveBeenCalledWith(
            '/plugins/mattermost-e2ee/v1/devices',
            {
                body: {
                    signature_public_key: 'public-key-abc',
                    device_name: 'My Phone',
                },
                method: 'post',
            },
        );
        expect(result).toEqual(mockResponse);
    });

    test('should propagate error when doFetch throws', async () => {
        jest.mocked(client.doFetch).mockRejectedValue(new Error('Network error'));

        await expect(client.registerDevice('key', 'device')).rejects.toThrow('Network error');
    });
});

describe('revokeDevice', () => {
    test('should DELETE to the correct device endpoint', async () => {
        jest.mocked(client.doFetch).mockResolvedValue(undefined);

        await client.revokeDevice('device-123');

        expect(client.doFetch).toHaveBeenCalledWith(
            '/plugins/mattermost-e2ee/v1/devices/device-123',
            {method: 'delete'},
        );
    });

    test('should propagate error when doFetch throws', async () => {
        jest.mocked(client.doFetch).mockRejectedValue(new Error('Network error'));

        await expect(client.revokeDevice('device-123')).rejects.toThrow('Network error');
    });
});
