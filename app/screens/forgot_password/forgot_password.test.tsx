// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {renderWithIntl, fireEvent, waitFor} from '@test/intl-test-helper';

import ForgotPassword from './index';

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

        await waitFor(() => {
            fireEvent.press(resetButton);
        }, {timeout: 300});

        expect(getByTestId('forgot.password.error.text')).toBeDefined();
    });

    test('Should show password link sent texts', async () => {
        const {getByTestId} = renderWithIntl(<ForgotPassword {...baseProps}/>);
        const emailTextInput = getByTestId('forgot.password.email');
        const resetButton = getByTestId('forgot.password.button');

        fireEvent.changeText(emailTextInput, 'test@test.com');
        fireEvent.changeText(emailTextInput, 'bar');

        await waitFor(() => {
            fireEvent.press(resetButton);
        }, {timeout: 300});

        // When testing for appearance of views, we have to use this work-around as the library is a bit glitchy when we have more than one await in a test.
        // Issue https://github.com/callstack/react-native-testing-library/issues/379
        const t = setTimeout(() => {
            clearTimeout(t);
            expect(getByTestId('password_send.link.view')).toBeDefined();
        }, 500);
    });
});
