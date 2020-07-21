// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Platform} from 'react-native';
import {shallow} from 'enzyme';

import Preferences from '@mm-redux/constants/preferences';

import {DeviceTypes} from '@constants';

import ChannelNavBar from './channel_nav_bar';

jest.mock('react-intl');
jest.mock('app/mattermost_managed', () => ({
    isRunningInSplitView: jest.fn().mockResolvedValue(false),
}));

describe('ChannelNavBar', () => {
    const baseProps = {
        isLandscape: false,
        openMainSidebar: jest.fn(),
        openSettingsSidebar: jest.fn(),
        onPress: jest.fn(),
        theme: Preferences.THEMES.default,
    };

    test('should match, full snapshot', () => {
        const wrapper = shallow(
            <ChannelNavBar {...baseProps}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should not set the permanentSidebar state if not Tablet', async () => {
        const wrapper = shallow(
            <ChannelNavBar {...baseProps}/>,
        );

        await wrapper.instance().handlePermanentSidebar();
        expect(wrapper.state('permanentSidebar')).toBeUndefined();
    });

    test('should set the permanentSidebar state if Tablet', async () => {
        const wrapper = shallow(
            <ChannelNavBar {...baseProps}/>,
        );

        DeviceTypes.IS_TABLET = true;

        await wrapper.instance().handlePermanentSidebar();
        expect(wrapper.state('permanentSidebar')).toBeDefined();
    });

    test('drawerButtonVisible appears for android tablets', async () => {
        const wrapper = shallow(
            <ChannelNavBar {...baseProps}/>,
        );

        DeviceTypes.IS_TABLET = true;
        Platform.OS = 'android';

        expect(wrapper.instance().drawerButtonVisible()).toBe(true);
    });

    test('drawerButtonVisible appears for android phones', async () => {
        const wrapper = shallow(
            <ChannelNavBar {...baseProps}/>,
        );

        DeviceTypes.IS_TABLET = false;
        Platform.OS = 'android';

        expect(wrapper.instance().drawerButtonVisible()).toBe(true);
    });

    test('drawerButtonVisible appears for iOS phones', async () => {
        const wrapper = shallow(
            <ChannelNavBar {...baseProps}/>,
        );

        DeviceTypes.IS_TABLET = false;
        Platform.OS = 'ios';

        expect(wrapper.instance().drawerButtonVisible()).toBe(true);
    });

    test('drawerButtonVisible appears for iOS tablets with PermanentSidebar at default false, and not in splitview', async () => {
        const wrapper = shallow(
            <ChannelNavBar {...baseProps}/>,
        );

        wrapper.setState({permanentSidebar: false, isSplitView: false});

        DeviceTypes.IS_TABLET = true;
        Platform.OS = 'ios';

        expect(wrapper.instance().drawerButtonVisible()).toBe(true);
    });

    test('drawerButtonVisible does not appear for iOS tablets with permanentSidebar enabled', async () => {
        const wrapper = shallow(
            <ChannelNavBar {...baseProps}/>,
        );

        wrapper.setState({permanentSidebar: true});

        DeviceTypes.IS_TABLET = true;
        Platform.OS = 'ios';

        expect(wrapper.instance().drawerButtonVisible()).toBe(false);
    });

    test('drawerButtonVisible appears for iOS tablets with splitview enabled', async () => {
        const wrapper = shallow(
            <ChannelNavBar {...baseProps}/>,
        );

        wrapper.setState({isSplitView: true});

        DeviceTypes.IS_TABLET = true;
        Platform.OS = 'ios';

        expect(wrapper.instance().drawerButtonVisible()).toBe(true);
    });
});
