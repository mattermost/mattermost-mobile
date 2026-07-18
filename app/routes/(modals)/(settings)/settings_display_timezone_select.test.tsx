// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import SettingsDisplayTimezoneSelectScreen from '@screens/settings/display_timezone_select';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import SettingsDisplayTimezoneSelectRoute from './settings_display_timezone_select';

const mockUseLocalSearchParams = jest.fn();

jest.mock('expo-router', () => ({
    useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

jest.mock('@hooks/navigation_header', () => ({
    getHeaderOptions: jest.fn(() => ({})),
    useNavigationHeader: jest.fn(),
}));

jest.mock('@screens/settings/display_timezone_select', () => ({
    __esModule: true,
    default: jest.fn(() => null),
}));

describe('SettingsDisplayTimezoneSelectRoute', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should decode the serialized current timezone', () => {
        mockUseLocalSearchParams.mockReturnValue({
            currentTimezone: '"Europe/Warsaw"',
        });

        renderWithIntlAndTheme(<SettingsDisplayTimezoneSelectRoute/>);

        expect(jest.mocked(SettingsDisplayTimezoneSelectScreen).mock.calls[0][0]).toEqual(expect.objectContaining({
            currentTimezone: 'Europe/Warsaw',
        }));
    });
});
