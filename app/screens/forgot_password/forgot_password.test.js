// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Appearance} from 'react-native-appearance';

import {shallowWithIntl} from 'test/intl-test-helper';
import {darkColors, lightColors} from 'app/styles/colors';
import ForgotPassword from './forgot_password.js';

describe('ForgotPassword', () => {
    const actions = {
        sendPasswordResetEmail: jest.fn(),
    };

    const baseProps = {
        actions,
    };

    test('should match snapshot', () => {
        const wrapper = shallowWithIntl(<ForgotPassword {...baseProps}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('snapshot for error on failure of email regex', () => {
        const wrapper = shallowWithIntl(<ForgotPassword {...baseProps}/>);

        wrapper.setState({email: 'bar'});
        wrapper.instance().submitResetPassword();
        wrapper.update();
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('Should call sendPasswordResetEmail', () => {
        const wrapper = shallowWithIntl(<ForgotPassword {...baseProps}/>);

        wrapper.setState({email: 'test@test.com'});
        wrapper.instance().submitResetPassword();
        expect(actions.sendPasswordResetEmail).toBeCalledWith('test@test.com');
    });

    test('match snapshot after success of sendPasswordResetEmail', async () => {
        const sendPasswordResetEmail = async () => {
            return {
                data: {},
            };
        };
        const wrapper = shallowWithIntl(
            <ForgotPassword
                {...baseProps}
                actions={{
                    ...actions,
                    sendPasswordResetEmail,
                }}
            />);

        wrapper.setState({email: 'test@test.com'});
        wrapper.instance().submitResetPassword();
        await sendPasswordResetEmail();
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should show light background when user has light color scheme set', () => {
        Appearance.getColorScheme.mockImplementation(() => 'light');
        Appearance.addChangeListener.mockImplementation(() => 'light');

        const wrapper = shallowWithIntl(<ForgotPassword {...baseProps}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper).toHaveStyle('backgroundColor', lightColors.containerBg);
    });

    test('should show dark background when user has dark color scheme set', () => {
        Appearance.getColorScheme.mockImplementation(() => 'dark');
        Appearance.addChangeListener.mockImplementation(() => 'dark');

        const wrapper = shallowWithIntl(<ForgotPassword {...baseProps}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper).toHaveStyle('backgroundColor', darkColors.containerBg);
    });
});
