// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getTimeZone} from 'react-native-localize';

import {getDeviceTimezone, getSupportedDeviceTimezone} from './timezone';

// Mocking react-native-localize getTimeZone function
jest.mock('react-native-localize', () => ({
    getTimeZone: jest.fn(),
}));

describe('getDeviceTimezone function', () => {
    afterEach(() => {
        jest.clearAllMocks(); // Clear all mock calls after each test
    });

    it('should return the device timezone', () => {
    // Mock getTimeZone to return a specific timezone
        const mockTimeZone = 'America/New_York';
        (getTimeZone as jest.Mock).mockReturnValue(mockTimeZone);

        // Call the function
        const result = getDeviceTimezone();

        // Expect getTimeZone to have been called once
        expect(getTimeZone).toHaveBeenCalledTimes(1);

        // Expect the result to be the mocked timezone
        expect(result).toEqual(mockTimeZone);
    });
});

describe('getSupportedDeviceTimezone', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should return the device timezone when Intl can format with it', () => {
        (getTimeZone as jest.Mock).mockReturnValue('Asia/Yekaterinburg');

        expect(getSupportedDeviceTimezone()).toBe('Asia/Yekaterinburg');
    });

    it('should return undefined when the platform reports a zone Intl rejects', () => {
        (getTimeZone as jest.Mock).mockReturnValue('World/Somewhere');

        expect(getSupportedDeviceTimezone()).toBeUndefined();
    });

    it('should re-evaluate when the device timezone changes', () => {
        (getTimeZone as jest.Mock).mockReturnValue('World/Somewhere');
        expect(getSupportedDeviceTimezone()).toBeUndefined();

        (getTimeZone as jest.Mock).mockReturnValue('America/New_York');
        expect(getSupportedDeviceTimezone()).toBe('America/New_York');
    });

    it('should return the last valid timezone when getTimeZone throws', () => {
        (getTimeZone as jest.Mock).mockReturnValue('America/New_York');
        expect(getSupportedDeviceTimezone()).toBe('America/New_York');

        (getTimeZone as jest.Mock).mockImplementation(() => {
            throw new Error('native call failed');
        });
        expect(getSupportedDeviceTimezone()).toBe('America/New_York');
    });
});
