// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import FormattedText from 'app/components/formatted_text';

import {shallowWithIntl} from 'test/intl-test-helper';

import Login from './login';

describe('Login', () => {
    const baseProps = {
        config: {
            EnableSignInWithEmail: 'true',
            EnableSignInWithUsername: 'true',
        },
        license: {
            IsLicensed: 'false',
        },
        loginId: '',
        password: '',
        loginRequest: {},
        actions: {
            handleLoginIdChanged: jest.fn(),
            handlePasswordChanged: jest.fn(),
            handleSuccessfulLogin: jest.fn(),
            scheduleExpiredNotification: jest.fn(),
            login: jest.fn(),
        },
    };

    test('should show "I forgot my password" with only email login enabled', () => {
        const props = {
            ...baseProps,
            config: {
                ...baseProps.config,
                EnableSignInWithUsername: 'false',
            },
        };

        const wrapper = shallowWithIntl(<Login {...props}/>);

        expect(wrapper.find(FormattedText).find({id: 'login.forgot'}).exists()).toBe(true);
    });

    test('should show "I forgot my password" with only username login enabled', () => {
        const props = {
            ...baseProps,
            config: {
                ...baseProps.config,
                EnableSignInWithEmail: 'false',
            },
        };

        const wrapper = shallowWithIntl(<Login {...props}/>);

        expect(wrapper.find(FormattedText).find({id: 'login.forgot'}).exists()).toBe(true);
    });

    test('should not show "I forgot my password" without email or username login enabled', () => {
        const props = {
            ...baseProps,
            config: {
                ...baseProps.config,
                EnableSignInWithEmail: 'false',
                EnableSignInWithUsername: 'false',
            },
        };

        const wrapper = shallowWithIntl(<Login {...props}/>);

        expect(wrapper.find(FormattedText).find({id: 'login.forgot'}).exists()).toBe(false);
    });
});
