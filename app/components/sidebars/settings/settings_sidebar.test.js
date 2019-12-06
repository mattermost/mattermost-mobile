// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import SettingsSidebar from './settings_sidebar';

jest.mock('react-intl');

jest.mock('react-native-vector-icons/MaterialIcons', () => ({
    getImageSource: jest.fn().mockResolvedValue(null),
}));

describe('SettingsSidebar', () => {
    const baseProps = {
        blurPostTextBox: jest.fn(),
        currentUser: {},
        logout: jest.fn(),
        setStatus: jest.fn(),
        status: 'online',
        theme: Preferences.THEMES.default,
    };

    test('Android back button should dismiss status modal first', () => {
        const wrapper = shallow(<SettingsSidebar {...baseProps}/>);

        const instance = wrapper.instance();

        // Mocking the reference the DrawerLayout as the component is not really being mounted
        instance.drawer.current = {
            closeDrawer: jest.fn(() => {
                instance.drawerOpened = false;
            }),
        };

        // simulate that the drawer is opened
        instance.drawerOpened = true;

        // simulate that the status modal is opened
        instance.statusModal = true;

        // this simulates the first tap on the back button that closes the status modal
        let backButtonResult = instance.handleAndroidBack();
        expect(backButtonResult).toBe(false);
        expect(instance.drawerOpened).toBe(true);

        // this simulates a second tap on the back button that closes the drawer
        backButtonResult = instance.handleAndroidBack();
        expect(backButtonResult).toBe(true);
        expect(instance.drawerOpened).toBe(false);
    });
});
