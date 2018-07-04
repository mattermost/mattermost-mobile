// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {configure, shallow} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
configure({adapter: new Adapter()});

import NotificationSettingsEmailIos from './notification_settings_email.ios.js';

jest.mock('app/utils/theme', () => {
    const original = require.requireActual('app/utils/theme');
    return {
        ...original,
        changeOpacity: jest.fn(),
    };
});

describe('NotificationSettingsEmailIos', () => {
    const baseProps = {
        currentUserId: 'current_user_id',
        emailInterval: '30',
        enableEmailBatching: false,
        navigator: {setOnNavigatorEvent: () => {}}, // eslint-disable-line no-empty-function
        actions: {
            savePreferences: () => {}, // eslint-disable-line no-empty-function
        },
        sendEmailNotifications: true,
        siteName: 'Mattermost',
        theme: {
            centerChannelBg: '#aaa',
            centerChannelColor: '#aaa',
        },
    };

    test('should match snapshot, renderEmailSection', () => {
        const wrapper = shallow(
            <NotificationSettingsEmailIos {...baseProps}/>
        );

        expect(wrapper.instance().renderEmailSection()).toMatchSnapshot();
    });

    test('should call saveEmailNotifyProps on onNavigatorEvent', () => {
        const wrapper = shallow(
            <NotificationSettingsEmailIos {...baseProps}/>
        );

        const instance = wrapper.instance();
        instance.saveEmailNotifyProps = jest.fn();
        instance.onNavigatorEvent({type: 'ScreenChangedEvent', id: 'willDisappear'});

        expect(instance.saveEmailNotifyProps).toHaveBeenCalledTimes(1);
    });

    test('should macth state on setEmailNotifications', () => {
        const wrapper = shallow(
            <NotificationSettingsEmailIos {...baseProps}/>
        );

        wrapper.setState({email: 'false', interval: '0'});
        wrapper.instance().setEmailNotifications('30');
        expect(wrapper.state({email: 'true', interval: '30'}));

        wrapper.instance().setEmailNotifications('0');
        expect(wrapper.state({email: 'false', interval: '0'}));

        wrapper.instance().setEmailNotifications('3600');
        expect(wrapper.state({email: 'true', interval: '3600'}));
    });

    test('should call props.actions.savePreferences on saveUserNotifyProps', () => {
        const props = {...baseProps, actions: {savePreferences: jest.fn()}};
        const wrapper = shallow(
            <NotificationSettingsEmailIos {...props}/>
        );

        wrapper.setState({email: 'true', interval: '3600'});
        wrapper.instance().saveEmailNotifyProps();
        expect(props.actions.savePreferences).toHaveBeenCalledTimes(1);
        expect(props.actions.savePreferences).toBeCalledWith(
            'current_user_id',
            [
                {category: 'notifications', name: 'email', user_id: 'current_user_id', value: 'true'},
                {category: 'notifications', name: 'email_interval', user_id: 'current_user_id', value: '3600'},
            ]
        );
    });
});
