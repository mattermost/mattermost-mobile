// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Appearance} from 'react-native-appearance';

import {RequestStatus} from 'mattermost-redux/constants';

import FormattedText from 'app/components/formatted_text';

import {shallowWithIntl} from 'test/intl-test-helper';

import * as NavigationActions from 'app/actions/navigation';

import {mfaExpectedErrors} from 'app/screens/login/login';
import {darkColors, lightColors} from 'app/styles/colors';
import Login from './login';
import {getColorStyles, getStyledNavigationOptions} from '../../utils/appearance';

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
        isLandscape: false,
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

        let props = {
            ...baseProps,
            loginRequest: {
                status: RequestStatus.NOT_STARTED,
            },
        };

        props.actions.handleSuccessfulLogin.mockImplementation(() => Promise.resolve());

        const wrapper = shallowWithIntl(<Login {...props}/>);

        expect(resetToChannel).not.toHaveBeenCalled();

        props = {
            ...props,
            loginRequest: {
                status: RequestStatus.STARTED,
            },
        };
        wrapper.setProps(props);

        expect(resetToChannel).not.toHaveBeenCalled();

        props = {
            ...props,
            loginRequest: {
                status: RequestStatus.SUCCESS,
            },
        };
        wrapper.setProps(props);

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

        expect(goToScreen).
            toHaveBeenCalledWith(
                'MFA',
                'Multi-factor Authentication',
                {},
                getStyledNavigationOptions(getColorStyles('dark'))
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
                {},
                getStyledNavigationOptions(getColorStyles('dark'))
            );
    });

    test('should show light background when user has light color scheme set', () => {
        Appearance.getColorScheme.mockImplementation(() => 'light');
        Appearance.addChangeListener.mockImplementation(() => 'light');

        const wrapper = shallowWithIntl(<Login {...baseProps}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper).toHaveStyle('backgroundColor', lightColors.containerBg);
    });

    test('should show dark background when user has dark color scheme set', () => {
        Appearance.getColorScheme.mockImplementation(() => 'dark');
        Appearance.addChangeListener.mockImplementation(() => 'dark');

        const wrapper = shallowWithIntl(<Login {...baseProps}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper).toHaveStyle('backgroundColor', darkColors.containerBg);
    });
});
