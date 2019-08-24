// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import {DeviceTypes} from 'app/constants';
import SettingsItem from 'app/screens/settings/settings_item';

import DisplaySettings from './display_settings';

jest.mock('react-intl');

describe('DisplaySettings', () => {
    const baseProps = {
        actions: {
            goToScreen: jest.fn(),
        },
        theme: Preferences.THEMES.default,
        enableTheme: false,
        enableTimezone: false,
        componentId: 'component-id',
        isLandscape: false,
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <DisplaySettings {...baseProps}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.find(SettingsItem).length).toBe(1);
        wrapper.setProps({enableTheme: true});
        expect(wrapper.find(SettingsItem).length).toBe(2);
        wrapper.setProps({enableTimezone: true});
        expect(wrapper.find(SettingsItem).length).toBe(3);
    });

    test('should match snapshot on Tablet devices', () => {
        DeviceTypes.IS_TABLET = true;

        const wrapper = shallow(
            <DisplaySettings {...baseProps}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.find(SettingsItem).length).toBe(2);
        wrapper.setProps({enableTheme: true});
        expect(wrapper.find(SettingsItem).length).toBe(3);
        wrapper.setProps({enableTimezone: true});
        expect(wrapper.find(SettingsItem).length).toBe(4);
    });
});
