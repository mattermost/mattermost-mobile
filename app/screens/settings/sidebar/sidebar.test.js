// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import {DeviceTypes} from 'app/constants';
import MainSidebar from 'app/components/sidebars/main/main_sidebar';
import SidebarSettings from './index';

jest.mock('react-intl');
jest.mock('app/mattermost_managed', () => ({
    isRunningInSplitView: jest.fn().mockResolvedValue(false),
}));

describe('SidebarSettings', () => {
    const baseProps = {
        theme: Preferences.THEMES.default,
        isLandscape: false,
    };

    test('should match, full snapshot', async () => {
        const wrapper = shallow(
            <SidebarSettings {...baseProps}/>
        );

        expect(wrapper.getElement()).toMatchSnapshot();

        await wrapper.instance().loadSetting();
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should set the Permanent Sidebar value to false', async () => {
        const wrapper = shallow(
            <SidebarSettings {...baseProps}/>
        );

        await wrapper.instance().loadSetting();
        expect(wrapper.state('enabled')).toBe(false);
    });

    test('should set the Permanent Sidebar value to true and update the sidebar', async () => {
        DeviceTypes.IS_TABLET = true;

        const wrapper = shallow(
            <SidebarSettings {...baseProps}/>
        );

        const mainProps = {
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

        const mainSidebar = shallow(
            <MainSidebar {...mainProps}/>
        );

        await wrapper.instance().loadSetting();
        expect(wrapper.state('enabled')).toBe(false);

        await wrapper.instance().saveSetting(true);

        expect(wrapper.state('enabled')).toBe(true);
        expect(mainSidebar.state('permanentSidebar')).toBe(true);
    });
});
