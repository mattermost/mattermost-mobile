// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import EphemeralStore from 'app/store/ephemeral_store';
import * as NavigationActions from 'app/actions/navigation';

import ChannelBase from './channel_base';

jest.mock('react-intl');
jest.mock('react-native-vector-icons/MaterialIcons', () => ({
    getImageSource: jest.fn().mockResolvedValue(null),
}));

describe('ChannelBase', () => {
    const channelBaseComponentId = 'component-0';
    const componentIds = ['component-1', 'component-2', 'component-3'];
    const baseProps = {
        actions: {
            loadChannelsIfNecessary: jest.fn(),
            loadProfilesAndTeamMembersForDMSidebar: jest.fn(),
            selectDefaultTeam: jest.fn(),
            selectInitialChannel: jest.fn(),
            recordLoadTime: jest.fn(),
            getChannelStats: jest.fn(),
        },
        componentId: channelBaseComponentId,
        theme: Preferences.THEMES.default,
    };
    const optionsForTheme = (theme) => {
        return {
            topBar: {
                backButton: {
                    color: theme.sidebarHeaderTextColor,
                },
                background: {
                    color: theme.sidebarHeaderBg,
                },
                title: {
                    color: theme.sidebarHeaderTextColor,
                },
                leftButtonColor: theme.sidebarHeaderTextColor,
                rightButtonColor: theme.sidebarHeaderTextColor,
            },
            layout: {
                backgroundColor: theme.centerChannelBg,
            },
        };
    };

    test('should call mergeNavigationOptions on all navigation components when theme changes', () => {
        const mergeNavigationOptions = jest.spyOn(NavigationActions, 'mergeNavigationOptions');

        componentIds.forEach((componentId) => {
            EphemeralStore.addNavigationComponentId(componentId);
        });

        const wrapper = shallow(
            <ChannelBase {...baseProps}/>,
        );

        const themeOptions = optionsForTheme(Preferences.THEMES.default);
        expect(mergeNavigationOptions.mock.calls).toEqual([
            [baseProps.componentId, themeOptions],
        ]);
        mergeNavigationOptions.mockClear();

        wrapper.setProps({theme: Preferences.THEMES.mattermostDark});

        const newThemeOptions = optionsForTheme(Preferences.THEMES.mattermostDark);
        expect(mergeNavigationOptions.mock.calls).toEqual([
            [baseProps.componentId, newThemeOptions],
            [componentIds[2], newThemeOptions],
            [componentIds[1], newThemeOptions],
            [componentIds[0], newThemeOptions],
        ]);
    });
});
