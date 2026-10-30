// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen} from '@testing-library/react-native';
import React from 'react';

import {Preferences} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import ServerHeader from './header';

jest.mock('expo-application', () => ({
    applicationId: 'com.encma.hxmain',
}));

describe('ServerHeader ENCMA branding', () => {
    it('keeps the existing server guidance below the ENCMA authentication header', () => {
        renderWithIntlAndTheme(
            <ServerHeader
                additionalServer={false}
                theme={Preferences.THEMES.denim}
            />,
        );

        expect(screen.getByTestId('encma_auth_header.container')).toBeTruthy();
        expect(screen.getByTestId('server_header.title.connect_to_server')).toHaveTextContent('Connect to your server');
        expect(screen.getByTestId('server_header.description')).toBeTruthy();
    });
});
