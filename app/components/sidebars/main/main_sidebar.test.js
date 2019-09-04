// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import {DeviceTypes} from 'app/constants';

import MainSidebar from './main_sidebar';

jest.mock('react-intl');

describe('MainSidebar', () => {
    const baseProps = {
        actions: {
            getTeams: jest.fn(),
            logChannelSwitch: jest.fn(),
            makeDirectChannel: jest.fn(),
            setChannelDisplayName: jest.fn(),
            setChannelLoading: jest.fn(),
        },
        blurPostTextBox: jest.fn(),
        currentTeamId: 'current-team-id',
        currentUserId: 'current-user-id',
        deviceWidth: 10,
        isLandscape: false,
        teamsCount: 2,
        theme: Preferences.THEMES.default,
    };

    test('should match, full snapshot', () => {
        const wrapper = shallow(
            <MainSidebar {...baseProps}/>
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should not set the permanentSidebar state if not Tablet', () => {
        const wrapper = shallow(
            <MainSidebar {...baseProps}/>
        );

        wrapper.instance().handlePermanentSidebar();
        expect(wrapper.state('permanentSidebar')).toBeUndefined();
    });

    test('should set the permanentSidebar state if Tablet', async () => {
        const wrapper = shallow(
            <MainSidebar {...baseProps}/>
        );

        DeviceTypes.IS_TABLET = true;

        await wrapper.instance().handlePermanentSidebar();

        expect(wrapper.state('permanentSidebar')).toBeDefined();

        // Reset to false for subsequent tests
        DeviceTypes.IS_TABLET = false;
    });

    test('should re-render when the theme changes', () => {
        const theme = Preferences.THEMES.default;
        const newTheme = Preferences.THEMES.organization;
        const props = {
            ...baseProps,
            theme,
        };

        const wrapper = shallow(
            <MainSidebar {...props}/>
        );

        const instance = wrapper.instance();
        instance.render = jest.fn();

        expect(instance.render).toHaveBeenCalledTimes(0);
        wrapper.setProps({theme: newTheme});
        expect(instance.render).toHaveBeenCalledTimes(1);
    });
});
