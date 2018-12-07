// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';
import SettingsItem from 'app/screens/settings/settings_item';
import Preferences from 'mattermost-redux/constants/preferences';

import DisplaySettings from './display_settings';

jest.mock('react-intl');

describe('DisplaySettings', () => {
    const baseProps = {
        theme: Preferences.THEMES.default,
        enableTheme: false,
        enableTimezone: false,
        navigator: {
            push: jest.fn(),
            setOnNavigatorEvent: jest.fn(),
        },
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
});
