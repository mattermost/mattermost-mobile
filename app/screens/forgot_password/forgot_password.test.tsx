// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act, waitFor} from '@testing-library/react-native';
import React from 'react';

import {Preferences} from '@constants';
import * as SessionAPICalls from '@actions/remote/session';
import {renderWithIntl, fireEvent} from '@test/intl-test-helper';

import ForgotPassword from './index';

describe('ForgotPassword', () => {
    const baseProps = {
        componentId: 'ForgotPassword',
        serverUrl: 'https://community.mattermost.com',
        theme: Preferences.THEMES.default,
    };

    test('should match snapshot', () => {
        const {toJSON} = renderWithIntl(<ForgotPassword {...baseProps}/>);
        expect(toJSON()).toMatchSnapshot();
    });

    test('Error on failure of email regex', async () => {
        const {getByTestId} = renderWithIntl(<ForgotPassword {...baseProps}/>);
        const emailTextInput = getByTestId('forgot.password.email');
        const resetButton = getByTestId('forgot.password.button');

        fireEvent.changeText(emailTextInput, 'bar');

        act(() => {
            fireEvent.press(resetButton);
        });

        expect(getByTestId('forgot.password.error.text')).toBeDefined();
    });

    test('Should show password link sent texts', async () => {
        const spyOnResetAPICall = jest.spyOn(SessionAPICalls, 'sendPasswordResetEmail');
        const {getByTestId} = renderWithIntl(<ForgotPassword {...baseProps}/>);
        const emailTextInput = getByTestId('forgot.password.email');
        const resetButton = getByTestId('forgot.password.button');

        fireEvent.changeText(emailTextInput, 'test@test.com');

        await waitFor(() => {
            fireEvent.press(resetButton);
        });

        expect(spyOnResetAPICall).toHaveBeenCalled();
    });
});
