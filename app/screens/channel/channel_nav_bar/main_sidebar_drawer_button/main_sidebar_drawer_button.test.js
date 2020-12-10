// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import Badge from '@components/badge';
import Preferences from '@mm-redux/constants/preferences';
import PushNotification from '@init/push_notifications';
import {shallowWithIntl} from 'test/intl-test-helper';

import MainSidebarDrawerButton from './main_sidebar_drawer_button';

describe('MainSidebarDrawerButton', () => {
    const baseProps = {
        openSidebar: jest.fn(),
        badgeCount: 0,
        theme: Preferences.THEMES.default,
        visible: false,
    };

    afterEach(() => PushNotification.setApplicationIconBadgeNumber(0));

    test('should match, full snapshot', () => {
        const wrapper = shallowWithIntl(
            <MainSidebarDrawerButton {...baseProps}/>,
        );

        // no badge to show
        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.find(Badge).length).toEqual(0);

        // badge should render
        wrapper.setProps({badgeCount: 1, visible: true});
        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.find(Badge).length).toEqual(1);
    });

    test('should not set app icon badge on mount', () => {
        const setApplicationIconBadgeNumber = jest.spyOn(PushNotification, 'setApplicationIconBadgeNumber');
        const props = {
            ...baseProps,
            badgeCount: 0,
        };

        shallowWithIntl(
            <MainSidebarDrawerButton {...props}/>,
        );
        expect(setApplicationIconBadgeNumber).not.toBeCalled();
    });

    test('should set app icon badge on mount', () => {
        const setApplicationIconBadgeNumber = jest.spyOn(PushNotification, 'setApplicationIconBadgeNumber');
        const props = {
            ...baseProps,
            badgeCount: 1,
        };

        shallowWithIntl(
            <MainSidebarDrawerButton {...props}/>,
        );
        expect(setApplicationIconBadgeNumber).toHaveBeenCalledTimes(1);
    });

    test('should set app icon badge update', () => {
        const setApplicationIconBadgeNumber = jest.spyOn(PushNotification, 'setApplicationIconBadgeNumber');
        const props = {
            ...baseProps,
            badgeCount: 0,
        };

        const wrapper = shallowWithIntl(
            <MainSidebarDrawerButton {...props}/>,
        );

        wrapper.setProps({badgeCount: 2});
        expect(setApplicationIconBadgeNumber).toHaveBeenCalledTimes(1);
        expect(setApplicationIconBadgeNumber).toHaveBeenCalledWith(2);
    });

    test('should set remove icon badge on update', () => {
        const setApplicationIconBadgeNumber = jest.spyOn(PushNotification, 'setApplicationIconBadgeNumber');
        const props = {
            ...baseProps,
            badgeCount: 0,
        };

        const wrapper = shallowWithIntl(
            <MainSidebarDrawerButton {...props}/>,
        );
        wrapper.setProps({badgeCount: 2});
        expect(setApplicationIconBadgeNumber).toHaveBeenCalledWith(2);

        wrapper.setProps({badgeCount: -1});
        expect(setApplicationIconBadgeNumber).toHaveBeenCalledWith(-1);
    });

    test('Should be accessible', () => {
        const wrapper = shallowWithIntl(
            <MainSidebarDrawerButton {...baseProps}/>,
        );
        expect(wrapper.props().accessible).toBeTruthy();
    });

    test('Should have the correct accessibilityHint', () => {
        const wrapper = shallowWithIntl(
            <MainSidebarDrawerButton {...baseProps}/>,
        );
        expect(wrapper.props().accessibilityHint).toEqual('Opens the channels and teams drawer');
    });

    test('Should have the correct accessibilityLabel', () => {
        const wrapper = shallowWithIntl(
            <MainSidebarDrawerButton {...baseProps}/>,
        );
        expect(wrapper.props().accessibilityLabel).toEqual('Channels and teams');
    });
});
