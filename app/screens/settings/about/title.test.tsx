// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen} from '@testing-library/react-native';
import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import Title from './title';

jest.mock('expo-application', () => ({
    applicationId: 'com.encma.hxmain',
}));

describe('About Title', () => {
    it('uses the ENCMA product name for the ENCMA application ID', () => {
        const config = {BuildEnterpriseReady: 'false'} as ClientConfig;

        renderWithIntlAndTheme(<Title config={config}/>);

        expect(screen.getByTestId('about.title')).toHaveTextContent('ENCMA');
        expect(screen.getByTestId('about.title')).not.toHaveTextContent('Mattermost');
    });
});
