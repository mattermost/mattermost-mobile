// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {screen} from '@testing-library/react-native';
import React from 'react';

import {renderWithIntlAndTheme} from '@test/intl-test-helper';

import SearchField from './index';

jest.mock('expo-application', () => ({
    applicationId: 'com.encma.hxmain',
}));

describe('ENCMA channel-list search', () => {
    it('uses the refined surface and exposes an accessible button label', () => {
        renderWithIntlAndTheme(<SearchField/>);

        const button = screen.getByTestId('channel_list_subheader.search_field.button');
        expect(button).toHaveStyle({
            borderRadius: 14,
            borderWidth: 1,
            height: 40,
        });
        expect(button).toHaveProp('accessibilityRole', 'button');
        expect(button).toHaveProp('accessibilityLabel', 'Find channels...');
    });
});
