// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {configure} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
configure({adapter: new Adapter()});

import {shallowWithIntl} from 'test/intl-test-helper';

import NotificationSettingsMobileAndroid from './notification_settings_email.android.js';

describe('NotificationSettingsMobileAndroid', () => {
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

    test('should match snapshot', () => {
        const wrapper = shallowWithIntl(
            <NotificationSettingsMobileAndroid {...baseProps}/>
        );

        const style = {
            divider: {},
            modal: {},
            modalBody: {},
            modalTitleContainer: {},
            modalTitle: {},
            modalOptionDisabled: {},
            modalHelpText: {},
            modalFooter: {},
            modalFooterContainer: {},
            modalFooterOptionContainer: {},
            modalFooterOption: {},
        };

        expect(wrapper.instance().renderEmailSection()).toMatchSnapshot();
        expect(wrapper.instance().renderEmailNotificationsModal(style)).toMatchSnapshot();
    });

    test('should match state on setEmailNotifications', () => {
        const wrapper = shallowWithIntl(
            <NotificationSettingsMobileAndroid {...baseProps}/>
        );

        wrapper.setState({email: 'false', interval: '0'});
        wrapper.instance().setEmailNotifications('30');
        expect(wrapper.state({email: 'true', interval: '30'}));

        wrapper.instance().setEmailNotifications('0');
        expect(wrapper.state({email: 'false', interval: '0'}));

        wrapper.instance().setEmailNotifications('3600');
        expect(wrapper.state({email: 'true', interval: '3600'}));
    });

    test('should match state on handleClose', () => {
        const wrapper = shallowWithIntl(
            <NotificationSettingsMobileAndroid {...baseProps}/>
        );

        wrapper.setState({showEmailNotificationsModal: true, interval: '30', newInterval: '3600'});
        wrapper.instance().handleClose();
        expect(wrapper.state('showEmailNotificationsModal')).toEqual(false);
        expect(wrapper.state('newInterval')).toEqual('30');
    });

    test('should saveEmailNotifyProps and handleClose on handleSaveEmailNotification', () => {
        const wrapper = shallowWithIntl(
            <NotificationSettingsMobileAndroid {...baseProps}/>
        );

        const instance = wrapper.instance();
        instance.saveEmailNotifyProps = jest.fn();

        instance.handleSaveEmailNotification();
        expect(instance.saveEmailNotifyProps).toHaveBeenCalledTimes(1);
    });

    test('should match state on showEmailModal', () => {
        const wrapper = shallowWithIntl(
            <NotificationSettingsMobileAndroid {...baseProps}/>
        );

        wrapper.setState({showEmailNotificationsModal: false});
        wrapper.instance().showEmailModal();
        expect(wrapper.state('showEmailNotificationsModal')).toEqual(true);
    });

    test('should match state on handleChange', () => {
        const wrapper = shallowWithIntl(
            <NotificationSettingsMobileAndroid {...baseProps}/>
        );

        wrapper.setState({newInterval: '3600'});
        wrapper.instance().handleChange('30');
        expect(wrapper.state('newInterval')).toEqual('30');
    });
});
