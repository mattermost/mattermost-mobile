// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {getTimeZone} from 'react-native-localize';

import {getDeviceTimezone} from './timezone';

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
