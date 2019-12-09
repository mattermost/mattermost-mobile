// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import Notification from './notification.js';

jest.mock('react-native-navigation', () => ({
    Navigation: {
        events: jest.fn(() => ({
            registerComponentDidDisappearListener: jest.fn(),
        })),
    },
}));

describe('Notification', () => {
    const baseProps = {
        actions: {
            loadFromPushNotification: jest.fn(),
        },
        componentId: 'component-id',
        deviceWidth: 100,
        notification: {},
        theme: Preferences.THEMES.default,
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <Notification {...baseProps}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should call loadFromPushNotification on notification tap for non-local notification', () => {
        const props = {
            ...baseProps,
            notification: {
                localNotification: true,
            },
        };
        const wrapper = shallow(
            <Notification {...props}/>,
        );
        const instance = wrapper.instance();

        instance.notificationTapped();
        expect(baseProps.actions.loadFromPushNotification).not.toHaveBeenCalled();

        const notification = {
            localNotification: false,
        };
        wrapper.setProps({notification});
        instance.notificationTapped();
        expect(baseProps.actions.loadFromPushNotification).toHaveBeenCalledWith(notification);
    });
});
