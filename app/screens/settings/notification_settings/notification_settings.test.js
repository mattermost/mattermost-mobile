// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import Preferences from 'mattermost-redux/constants/preferences';

import {shallowWithIntl} from 'test/intl-test-helper';

import NotificationSettings from './notification_settings.js';

describe('NotificationSettings', () => {
    const baseProps = {
        actions: {
            updateMe: jest.fn(),
        },
        componentId: 'component-id',
        currentUser: {id: 'current_user_id'},
        theme: Preferences.THEMES.default,
        updateMeRequest: {},
        currentUserStatus: 'status',
        enableAutoResponder: false,
        isLandscape: false,
    };

    test('should match snapshot', () => {
        const wrapper = shallowWithIntl(
            <NotificationSettings {...baseProps}/>
        );

        expect(wrapper.instance()).toMatchSnapshot();
    });

    test('should include previous notification props when saving new ones', () => {
        baseProps.currentUser.notify_props = {previous: 'previous'};
        const wrapper = shallowWithIntl(
            <NotificationSettings {...baseProps}/>
        );

        const instance = wrapper.instance();
        const newProps = {new: 'new'};
        instance.saveNotificationProps(newProps);
        expect(baseProps.actions.updateMe).toHaveBeenCalledWith({
            notify_props: {
                ...baseProps.currentUser.notify_props,
                ...newProps,
            },
        });
    });
});
