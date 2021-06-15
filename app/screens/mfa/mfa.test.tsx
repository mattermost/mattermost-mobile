// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {fireEvent, waitFor} from '@testing-library/react-native';
import {renderWithIntl} from '@test/intl-test-helper';

import Mfa from './index';

jest.mock('@requests/remote/user', () => {
    return {
        login: jest.fn(),
    };
});

describe('*** MFA Screen ***', () => {
    const baseProps = {
        componentId: 'MFA',
    };

    test('MFA screen should match snapshot', () => {
        const {toJSON} = renderWithIntl(<Mfa {...baseProps}/>);
        expect(toJSON()).toMatchSnapshot();
    });

    test('should call login method on submit', async () => {
        const props = {
            ...baseProps,
            goToChannel: jest.fn(),
        };

        const spyOnProps = jest.spyOn(props, 'goToChannel');
        const {getByTestId} = renderWithIntl(<Mfa {...props}/>);
        const submitBtn = getByTestId('login_mfa.submit');
        const inputText = getByTestId('login_mfa.input');
        fireEvent.changeText(inputText, 'token123');

        await waitFor(() => {
            fireEvent.press(submitBtn);
        }, {timeout: 300});

        expect(spyOnProps).toHaveBeenCalled();
    });
});
