// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {configure, shallow} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
configure({adapter: new Adapter()});

import ForgotPassword from './forgot_password.js';

jest.mock('react-intl');

describe('ForgotPassword', () => {
    const actions = {
        sendPasswordResetEmail: jest.fn(),
    };

    const baseProps = {
        actions,
    };

    const formatMessage = jest.fn();

    test('should match snapshot', () => {
        const wrapper = shallow(
            <ForgotPassword {...baseProps}/>,
            {context: {intl: {formatMessage}}},
        );

        expect(wrapper).toMatchSnapshot();
    });

    test('snapshot for error on failure of email regex', () => {
        const wrapper = shallow(
            <ForgotPassword {...baseProps}/>,
            {context: {intl: {formatMessage}}},
        );

        wrapper.setState({email: 'bar'});
        wrapper.instance().submitResetPassword();
        wrapper.update();
        expect(wrapper).toMatchSnapshot();
    });

    test('Should call sendPasswordResetEmail', () => {
        const wrapper = shallow(
            <ForgotPassword {...baseProps}/>,
            {context: {intl: {formatMessage}}},
        );

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
        const wrapper = shallow(
            <ForgotPassword
                {...baseProps}
                actions={{
                    ...actions,
                    sendPasswordResetEmail,
                }}
            />,
            {context: {intl: {formatMessage}}},
        );

        wrapper.setState({email: 'test@test.com'});
        wrapper.instance().submitResetPassword();
        await sendPasswordResetEmail();
        expect(wrapper).toMatchSnapshot();
    });
});
