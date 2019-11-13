// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import EphemeralStore from 'app/store/ephemeral_store';
import * as NavigationActions from 'app/actions/navigation';

import Theme from './theme';
import ThemeTile from './theme_tile';

jest.mock('react-intl');

const allowedThemes = Object.keys(Preferences.THEMES).map((key) => ({
    key,
    ...Preferences.THEMES[key],
}));

describe('Theme', () => {
    const baseProps = {
        actions: {
            savePreferences: jest.fn(),
        },
        allowedThemes,
        isLandscape: false,
        isTablet: false,
        teamId: 'test-team',
        theme: Preferences.THEMES.default,
        userId: 'test-user',
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <Theme {...baseProps}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.find(ThemeTile)).toHaveLength(4);
    });

    test('should call mergeNavigationOptions on all navigation components when theme changes', () => {
        const mergeNavigationOptions = jest.spyOn(NavigationActions, 'mergeNavigationOptions');

        const componentIds = ['component-1', 'component-2', 'component-3'];
        componentIds.forEach((componentId) => {
            EphemeralStore.addNavigationComponentId(componentId);
        });

        const wrapper = shallow(
            <Theme {...baseProps}/>,
        );

        const newTheme = allowedThemes[1];
        wrapper.setProps({theme: newTheme});

        const options = {
            topBar: {
                backButton: {
                    color: newTheme.sidebarHeaderTextColor,
                },
                background: {
                    color: newTheme.sidebarHeaderBg,
                },
                title: {
                    color: newTheme.sidebarHeaderTextColor,
                },
                leftButtonColor: newTheme.sidebarHeaderTextColor,
                rightButtonColor: newTheme.sidebarHeaderTextColor,
            },
            layout: {
                backgroundColor: newTheme.centerChannelBg,
            },
        };

        expect(mergeNavigationOptions.mock.calls).toEqual([
            [componentIds[2], options],
            [componentIds[1], options],
            [componentIds[0], options],
        ]);
    });
});
