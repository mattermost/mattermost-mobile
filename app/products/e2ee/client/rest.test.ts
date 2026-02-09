// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import TestHelper from '@test/test_helper';

let client: any;

beforeEach(() => {
    client = TestHelper.createClient();
    client.doFetch = jest.fn();
});

describe('fetchDevices', () => {
    test('shoud fetch devices for current user', async () => {
        const expectedUrl = '/plugins/mattermost-e2ee/v1/devices';
        const expectedOptions = {method: 'get'};
        const mockResponse = {devices: [{
            device_id: 'device-1',
            device_name: 'Device 1',
            created_at: 1000,
            last_active_at: 2000,
        }]};

        jest.mocked(client.doFetch).mockResolvedValue(mockResponse);

        const result = await client.fetchDevices();
        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
        expect(result).toEqual(mockResponse);
    });

    test('should return empty array when doFetch returns null', async () => {
        const expectedUrl = '/plugins/mattermost-e2ee/v1/devices';
        const expectedOptions = {method: 'get'};
        const mockResponse = {devices: []};

        jest.mocked(client.doFetch).mockResolvedValue(null);

        const result = await client.fetchDevices();
        expect(client.doFetch).toHaveBeenCalledWith(expectedUrl, expectedOptions);
        expect(result).toEqual(mockResponse);
    });

    test('should return error response when doFetch throws error', async () => {
        const mockError = new Error('Network error');

        jest.mocked(client.doFetch).mockRejectedValue(mockError);

        expect(client.fetchDevices()).rejects.toThrow('Network error');
    });
});
