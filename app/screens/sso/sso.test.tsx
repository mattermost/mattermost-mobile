// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {Preferences} from '@constants';
import React from 'react';
import {Linking} from 'react-native';

import {renderWithIntl} from '@test/intl-test-helper';

import SSOComponent from './index';

describe('SSO', () => {
    const baseProps = {
        config: {},
        license: {
            IsLicensed: 'true',
        },
        ssoType: '',
        theme: Preferences.THEMES.default,
        serverUrl: '',
    };

    test('implement with webview when version is less than 5.32 version', async () => {
        const {getByTestId} = renderWithIntl(<SSOComponent {...baseProps}/>);
        expect(getByTestId('sso.webview')).toBeTruthy();
        expect(getByTestId('sso.redirect_url')).toBeFalsy();
    });

    test('implement with OS browser & redirect url from version 5.33', async () => {
        (Linking.openURL as jest.Mock).mockResolvedValueOnce('');
        const {getByTestId} = renderWithIntl(<SSOComponent {...baseProps}/>);
        expect(getByTestId('sso.webview')).toBeFalsy();
        expect(getByTestId('sso.redirect_url')).toBeTruthy();
    });
});
