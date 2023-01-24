// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {Preferences, Screens} from '@constants';
import LaunchType from '@constants/launch';
import {renderWithIntl} from '@test/intl-test-helper';

import SSOLogin from './index';

jest.mock('@screens/navigation', () => {
    return {
        getThemeFromState: () => 'light',
    };
});

jest.mock('@utils/url', () => {
    return {
        tryOpenURL: () => true,
    };
});

describe('SSO', () => {
    const baseProps = {
        componentId: Screens.SSO,
        license: {
            IsLicensed: 'true',
        },
        ssoType: 'GITLAB',
        theme: Preferences.THEMES.denim,
        serverUrl: 'https://locahost:8065',
        serverDisplayName: 'Test Server',
        launchType: LaunchType.Normal,
    };

    test('implement with OS browser & redirect url from version 5.33', async () => {
        const props = {...baseProps, config: {Version: '5.36.0'}};
        const {getByTestId} = renderWithIntl(<SSOLogin {...props}/>);
        expect(getByTestId('sso.redirect_url')).toBeTruthy();
    });
});
