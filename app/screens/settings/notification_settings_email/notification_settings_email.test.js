// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {configure, shallow} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
configure({adapter: new Adapter()});

import NotificationSettingsEmail from './notification_settings_email.js';

// jest.useFakeTimers();

jest.mock('app/utils/theme', () => {
    const original = require.requireActual('app/utils/theme');
    return {
        ...original,
        changeOpacity: jest.fn(),
    };
});

describe('NotificationSettingsEmail', () => {
    const baseProps = {
        currentUser: {id: 'user_id', notify_props: {email: 'true'}},
        emailInterval: '30',
        enableEmailBatching: false,
        navigator: {setOnNavigatorEvent: () => {}}, // eslint-disable-line no-empty-function
        onBack: () => {}, // eslint-disable-line no-empty-function
        sendEmailNotifications: true,
        siteName: 'Mattermost',
        theme: {
            centerChannelBg: '#aaa',
            centerChannelColor: '#aaa',
        },
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <NotificationSettingsEmail {...baseProps}/>
        );

        expect(wrapper).toMatchSnapshot();
    });

    test('should call saveUserNotifyProps on onNavigatorEvent', () => {
        const wrapper = shallow(
            <NotificationSettingsEmail {...baseProps}/>
        );

        const instance = wrapper.instance();
        instance.saveUserNotifyProps = jest.fn();
        instance.onNavigatorEvent({type: 'ScreenChangedEvent', id: 'willDisappear'});

        expect(instance.saveUserNotifyProps).toHaveBeenCalledTimes(1);
    });

    test('should macth state on setEmailNotifications', () => {
        const wrapper = shallow(
            <NotificationSettingsEmail {...baseProps}/>
        );

        wrapper.setState({email: 'false', interval: '0'});
        wrapper.instance().setEmailNotifications('30');
        expect(wrapper.state({email: 'true', interval: '30'}));

        wrapper.instance().setEmailNotifications('0');
        expect(wrapper.state({email: 'false', interval: '0'}));

        wrapper.instance().setEmailNotifications('3600');
        expect(wrapper.state({email: 'true', interval: '3600'}));
    });

    test('should call props.onBack on saveUserNotifyProps', () => {
        const props = {...baseProps, onBack: jest.fn()};
        const wrapper = shallow(
            <NotificationSettingsEmail {...props}/>
        );

        wrapper.setState({email: 'true', interval: '3600'});
        wrapper.instance().saveUserNotifyProps();
        expect(props.onBack).toHaveBeenCalledTimes(1);
        expect(props.onBack).toBeCalledWith({email: 'true', interval: '3600', user_id: 'user_id'});
    });

    test('should match snapshot, renderEmailSection', () => {
        const wrapper = shallow(
            <NotificationSettingsEmail {...baseProps}/>
        );

        expect(wrapper.instance().renderEmailSection()).toMatchSnapshot();
    });
});