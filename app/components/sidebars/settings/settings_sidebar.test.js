// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallowWithIntl} from 'test/intl-test-helper';

import Preferences from '@mm-redux/constants/preferences';

import SettingsSidebar from './settings_sidebar.ios';

describe('SettingsSidebar', () => {
    const baseProps = {
        actions: {
            logout: jest.fn(),
            setStatus: jest.fn(),
        },
        currentUser: {
            id: 'user-id',
        },
        status: 'offline',
        theme: Preferences.THEMES.default,
    };

    test('should match snapshot', () => {
        const wrapper = shallowWithIntl(
            <SettingsSidebar {...baseProps}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
