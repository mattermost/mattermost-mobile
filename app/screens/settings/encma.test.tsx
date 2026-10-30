// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen} from '@testing-library/react-native';
import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import Settings from './settings';

jest.mock('expo-application', () => ({
    applicationId: 'com.encma.hxmain',
}));

jest.mock('@context/server', () => ({
    useServerDisplayName: () => 'Mattermost',
    useServerUrl: () => 'https://server.example.com',
}));

jest.mock('@hooks/android_back_handler', () => jest.fn());
jest.mock('./report_problem', () => () => null);

const baseProps = {
    showHelp: true,
    siteName: 'Mattermost',
};

describe('ENCMA settings branding and links', () => {
    it('brands the About label and hides a Mattermost help destination', () => {
        renderWithIntlAndTheme(
            <Settings
                {...baseProps}
                helpLink='https://docs.mattermost.com/help'
            />,
        );

        expect(screen.getByText('About ENCMA')).toBeTruthy();
        expect(screen.queryByTestId('settings.help.option')).toBeNull();
    });

    it('retains an administrator-provided custom help destination', () => {
        renderWithIntlAndTheme(
            <Settings
                {...baseProps}
                helpLink='https://support.example.org/help'
            />,
        );

        expect(screen.getByTestId('settings.help.option')).toBeTruthy();
    });
});
