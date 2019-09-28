// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import FormattedText from 'app/components/formatted_text';

import {shallowWithIntl} from 'test/intl-test-helper';

import * as NavigationActions from 'app/actions/navigation';

import {mfaExpectedErrors} from 'app/screens/login/login';
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
        login: jest.fn(),
        password: '',
        scheduleExpiredNotification: jest.fn(),
        sendPasswordResetEmail: jest.fn(),
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

    test('should send the user to the login screen after login', (done) => {
        const resetToChannel = jest.spyOn(NavigationActions, 'resetToChannel').mockImplementation(() => done());

        const props = {
            ...baseProps,
        };

        props.login.mockImplementation(() => Promise.resolve({}));

        const wrapper = shallowWithIntl(<Login {...props}/>);
        wrapper.instance().signIn();
        expect(resetToChannel).not.toHaveBeenCalled();

        // This test times out if resetToChannel hasn't been called
    });

    test('should go to MFA screen when login response returns MFA error', () => {
        const goToScreen = jest.spyOn(NavigationActions, 'goToScreen');

        const mfaError = {
            error: {
                server_error_id: mfaExpectedErrors[0],
            },
        };

        const wrapper = shallowWithIntl(<Login {...baseProps}/>);
        wrapper.instance().checkLoginResponse(mfaError);

        const passProps = {
            config: {
                EnableSignInWithEmail: 'true',
                EnableSignInWithUsername: 'true',
            },
            goToChannel: wrapper.instance().goToChannel,
            license: {
                IsLicensed: 'false',
            },
            login: baseProps.login,
            loginId: '',
            password: null,
        };

        expect(goToScreen).
            toHaveBeenCalledWith(
                'MFA',
                'Multi-factor Authentication',
                passProps,
            );
    });

    test('should go to ForgotPassword screen when forgotPassword is called', () => {
        const goToScreen = jest.spyOn(NavigationActions, 'goToScreen');

        const wrapper = shallowWithIntl(<Login {...baseProps}/>);
        wrapper.instance().forgotPassword();

        expect(goToScreen).
            toHaveBeenCalledWith(
                'ForgotPassword',
                'Password Reset',
                {sendPasswordResetEmail: baseProps.sendPasswordResetEmail}
            );
    });
});
