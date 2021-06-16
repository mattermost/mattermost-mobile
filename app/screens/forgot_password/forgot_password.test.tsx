// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {act} from '@testing-library/react-native';
import React from 'react';

import {renderWithIntl, fireEvent, waitFor} from '@test/intl-test-helper';

import ForgotPassword from './index';
import * as UserAPICalls from '@requests/remote/user';

describe('ForgotPassword', () => {
    const baseProps = {
        componentId: 'ForgotPassword',
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
        const spyOnResetAPICall = jest.spyOn(UserAPICalls, 'sendPasswordResetEmail');
        const {getByTestId} = renderWithIntl(<ForgotPassword {...baseProps}/>);
        const emailTextInput = getByTestId('forgot.password.email');
        const resetButton = getByTestId('forgot.password.button');

        fireEvent.changeText(emailTextInput, 'test@test.com');
        await waitFor(() => {
            fireEvent.press(resetButton);
        }, {timeout: 300});

        expect(spyOnResetAPICall).toHaveBeenCalled();
    });
});
