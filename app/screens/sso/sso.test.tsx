// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Linking} from 'react-native';
import configureMockStore from 'redux-mock-store';

import initialState from '@store/initial_state';
import {renderWithReduxIntl} from '@test/testing_library';

import SSOComponent from './index';

describe('SSO', () => {
    const baseProps = {
        config: {},
        license: {
            IsLicensed: 'true',
        },
    };

    test('implement with OS browser & redirect url', async () => {
        (Linking.openURL as jest.Mock).mockResolvedValueOnce('');
        const mockStore = configureMockStore();
        const store = mockStore(initialState);
        const basicWrapper = renderWithReduxIntl(<SSOComponent {...baseProps}/>, store);
        expect(basicWrapper.queryByTestId('sso.webview')).toBeFalsy();
        expect(basicWrapper.queryByTestId('sso.redirect_url')).toBeTruthy();
    });
});
