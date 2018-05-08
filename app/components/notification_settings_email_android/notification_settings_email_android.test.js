// Copyright (c) 2017-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import React from 'react';
import {configure, shallow} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
configure({adapter: new Adapter()});

import NotificationSettingsEmailAndroid from './notification_settings_email_android.js';

describe('NotificationSettingsEmailAndroid', () => {
    const baseProps = {
        actions: {
            savePreferences: () => {}, // eslint-disable-line no-empty-function
        },
        currentUserId: 'current_user_id',
        emailInterval: '30',
        enableEmailBatching: true,
        onClose: () => {}, // eslint-disable-line no-empty-function
        sendEmailNotifications: true,
        siteName: 'Mattermost',
        theme: {
            centerChannelBg: '#aaa',
            centerChannelColor: '#aaa',
        },
        visible: true,
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <NotificationSettingsEmailAndroid {...baseProps}/>
        );

        expect(wrapper).toMatchSnapshot();
    });

    test('should macth state on setEmailNotifications', () => {
        const wrapper = shallow(
            <NotificationSettingsEmailAndroid {...baseProps}/>
        );

        wrapper.setState({email: 'false', interval: '0'});
        wrapper.instance().setEmailNotifications('30');
        expect(wrapper.state({email: 'true', interval: '30'}));

        wrapper.instance().setEmailNotifications('0');
        expect(wrapper.state({email: 'false', interval: '0'}));

        wrapper.instance().setEmailNotifications('3600');
        expect(wrapper.state({email: 'true', interval: '3600'}));
    });

    test('should call props.onClose on handleClose', () => {
        const props = {...baseProps, onClose: jest.fn()};
        const wrapper = shallow(
            <NotificationSettingsEmailAndroid {...props}/>
        );

        wrapper.instance().handleClose();
        expect(props.onClose).toHaveBeenCalledTimes(1);
        expect(props.onClose).toBeCalledWith();
    });

    test('should call props.actions.savePreferences and props.onClose on handleSaveEmailNotification', () => {
        const props = {...baseProps, onClose: jest.fn(), actions: {savePreferences: jest.fn()}};
        const wrapper = shallow(
            <NotificationSettingsEmailAndroid {...props}/>
        );

        wrapper.setState({email: 'true', interval: '3600'});
        wrapper.instance().handleSaveEmailNotification();
        expect(props.actions.savePreferences).toHaveBeenCalledTimes(1);
        expect(props.actions.savePreferences).toBeCalledWith(
            'current_user_id',
            [
                {category: 'notifications', name: 'email', user_id: 'current_user_id', value: 'true'},
                {category: 'notifications', name: 'email_interval', user_id: 'current_user_id', value: '3600'},
            ]
        );
        expect(props.onClose).toHaveBeenCalledTimes(1);
        expect(props.onClose).toBeCalledWith();
    });
});
