// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {useNavigationHeader} from '@hooks/navigation_header';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import SettingsAboutRoute from './about';

const mockUseLocalSearchParams = jest.fn();

jest.mock('expo-router', () => ({
    useLocalSearchParams: () => mockUseLocalSearchParams(),
}));

jest.mock('@hooks/navigation_header', () => ({
    getHeaderOptions: jest.fn(() => ({})),
    useNavigationHeader: jest.fn(),
}));

jest.mock('@screens/settings/about', () => ({
    __esModule: true,
    default: jest.fn(() => null),
}));

describe('SettingsAboutRoute', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should decode the serialized header title', () => {
        mockUseLocalSearchParams.mockReturnValue({
            headerTitle: '"About Mattermost"',
        });

        renderWithIntlAndTheme(<SettingsAboutRoute/>);

        expect(jest.mocked(useNavigationHeader)).toHaveBeenCalledWith(expect.objectContaining({
            headerOptions: expect.objectContaining({
                headerTitle: 'About Mattermost',
            }),
        }));
    });
});
