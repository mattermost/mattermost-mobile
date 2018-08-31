// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {configure} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
configure({adapter: new Adapter()});

import {shallowWithIntl} from 'test/intl-test-helper';
import {emptyFunction} from 'app/utils/general';

import RadioButtonGroup from 'app/components/radio_button';

import NotificationSettingsEmailAndroid from './notification_settings_email.android.js';

describe('NotificationSettingsEmailAndroid', () => {
    const baseProps = {
        currentUser: {id: 'current_user_id'},
        emailInterval: '30',
        enableEmailBatching: false,
        navigator: {setOnNavigatorEvent: emptyFunction},
        actions: {
            updateMe: jest.fn(),
            savePreferences: jest.fn(),
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
            <NotificationSettingsEmailAndroid {...baseProps}/>
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

    test('should match state on select of RadioButtonGroup', () => {
        const wrapper = shallowWithIntl(
            <NotificationSettingsEmailAndroid
                {...baseProps}
                sendEmailNotifications={false}
            />
        );
        expect(wrapper.find(RadioButtonGroup).exists()).toBe(false);
        wrapper.setProps({sendEmailNotifications: true});
        expect(wrapper.find(RadioButtonGroup).exists()).toBe(true);

        wrapper.setState({email: 'false', interval: '0'});

        wrapper.find(RadioButtonGroup).first().prop('onSelect')('30');
        expect(wrapper.state({email: 'true', interval: '30'}));

        wrapper.find(RadioButtonGroup).first().prop('onSelect')('0');
        expect(wrapper.state({email: 'false', interval: '0'}));

        wrapper.find(RadioButtonGroup).first().prop('onSelect')('3600');
        expect(wrapper.state({email: 'true', interval: '3600'}));
    });

    test('should match state on handleClose', () => {
        const wrapper = shallowWithIntl(
            <NotificationSettingsEmailAndroid {...baseProps}/>
        );

        wrapper.setState({showEmailNotificationsModal: true, interval: '30', newInterval: '3600'});
        wrapper.instance().handleClose();
        expect(wrapper.state('showEmailNotificationsModal')).toEqual(false);
        expect(wrapper.state('newInterval')).toEqual('30');
    });

    test('should saveEmailNotifyProps and handleClose on handleSaveEmailNotification', () => {
        const wrapper = shallowWithIntl(
            <NotificationSettingsEmailAndroid {...baseProps}/>
        );

        const instance = wrapper.instance();
        instance.saveEmailNotifyProps = jest.fn();

        instance.handleSaveEmailNotification();
        expect(instance.saveEmailNotifyProps).toHaveBeenCalledTimes(1);
    });

    test('should call actions.updateMe and actions.savePreferences on saveEmailNotifyProps', () => {
        const savePreferences = jest.fn();
        const updateMe = jest.fn();
        const props = {...baseProps, actions: {savePreferences, updateMe}};
        const wrapper = shallowWithIntl(
            <NotificationSettingsEmailAndroid {...props}/>
        );

        wrapper.setState({email: 'true', newInterval: 30});
        wrapper.instance().saveEmailNotifyProps();

        expect(updateMe).toHaveBeenCalledTimes(1);
        expect(updateMe.mock.calls[0][0].notify_props.email).toBe('true');

        expect(savePreferences).toHaveBeenCalledTimes(1);
        expect(savePreferences).toBeCalledWith('current_user_id', [{category: 'notifications', name: 'email_interval', user_id: 'current_user_id', value: 30}]);
    });

    test('should match state on showEmailModal', () => {
        const wrapper = shallowWithIntl(
            <NotificationSettingsEmailAndroid {...baseProps}/>
        );

        wrapper.setState({showEmailNotificationsModal: false});
        wrapper.instance().showEmailModal();
        expect(wrapper.state('showEmailNotificationsModal')).toEqual(true);
    });
});
