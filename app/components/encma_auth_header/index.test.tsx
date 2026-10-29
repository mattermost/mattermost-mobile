// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen} from '@testing-library/react-native';
import React from 'react';

import {Preferences} from '@constants';
import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import EncmaAuthHeader from './index';

let mockApplicationId = 'com.encma.hxmain';

jest.mock('expo-application', () => ({
    get applicationId() {
        return mockApplicationId;
    },
}));

describe('EncmaAuthHeader', () => {
    beforeEach(() => {
        mockApplicationId = 'com.encma.hxmain';
    });

    it('shows the ENCMA identity and authentication tagline', () => {
        renderWithIntlAndTheme(
            <EncmaAuthHeader theme={Preferences.THEMES.denim}/>,
        );

        expect(screen.getByTestId('encma_auth_header.container')).toBeTruthy();
        expect(screen.getByTestId('encma_auth_header.logo')).toBeTruthy();
        expect(screen.getByTestId('encma_auth_header.name')).toHaveTextContent('ENCMA');
        expect(screen.getByTestId('encma_auth_header.tagline')).toHaveTextContent('Your team, connected.');
    });

    it('does not alter authentication screens for other application IDs', () => {
        mockApplicationId = 'com.mattermost.rnbeta';

        renderWithIntlAndTheme(
            <EncmaAuthHeader theme={Preferences.THEMES.denim}/>,
        );

        expect(screen.queryByTestId('encma_auth_header.container')).toBeNull();
    });
});
