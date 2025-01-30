// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import LocalConfig from '@assets/config.json';
import Preferences from '@constants/preferences';
import {renderWithIntl} from '@test/intl-test-helper';

import SSOAuthentication from './sso_authentication';

jest.mock('@utils/url', () => {
    return {
        tryOpenURL: () => null,
    };
});

describe('SSO with redirect url', () => {
    const baseProps = {
        customUrlScheme: LocalConfig.AuthUrlSchemeDev,
        doSSOLogin: jest.fn(),
        intl: {},
        loginError: '',
        loginUrl: '',
        setLoginError: jest.fn(),
        theme: Preferences.THEMES.denim,
    };

    test('should show message when user navigates to the page', () => {
        const {getByTestId} = renderWithIntl(<SSOAuthentication {...baseProps}/>);
        expect(getByTestId('mobile.oauth.switch_to_browser')).toBeDefined();
    });

    test('should show "try again" and hide default message when error text is displayed', () => {
        const {getByTestId} = renderWithIntl(
            <SSOAuthentication
                {...baseProps}
                loginError='some error'
            />,
        );
        expect(getByTestId('mobile.oauth.try_again')).toBeDefined();
        let browser;
        try {
            browser = getByTestId('mobile.oauth.switch_to_browser');
        } catch (error) {
            // do nothing
        }
        expect(browser).toBeUndefined();
    });
});
