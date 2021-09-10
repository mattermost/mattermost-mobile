// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {fireEvent, waitFor} from '@testing-library/react-native';
import React from 'react';

import {Preferences} from '@constants';
import {renderWithIntl} from '@test/intl-test-helper';

import Mfa from './index';

jest.mock('@actions/remote/session', () => {
    return {
        login: jest.fn().mockResolvedValue({error: undefined, hasTeams: true}),
    };
});

describe('*** MFA Screen ***', () => {
    const baseProps = {
        config: {},
        goToChannel: jest.fn(),
        loginId: 'loginId',
        password: 'passwd',
        license: {},
        serverUrl: 'https://locahost:8065',
        theme: Preferences.THEMES.denim,
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

        const spyOnGoToChannel = jest.spyOn(props, 'goToChannel');
        const {getByTestId} = renderWithIntl(<Mfa {...props}/>);
        const submitBtn = getByTestId('login_mfa.submit');
        const inputText = getByTestId('login_mfa.input');
        fireEvent.changeText(inputText, 'token123');

        await waitFor(() => {
            fireEvent.press(submitBtn);
        });

        expect(spyOnGoToChannel).toHaveBeenCalled();
    });
});
