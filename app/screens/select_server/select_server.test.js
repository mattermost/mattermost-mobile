// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Appearance} from 'react-native-appearance';

import {shallowWithIntl} from 'test/intl-test-helper';

import {darkColors, lightColors} from 'app/styles/colors';
import SelectServer from './select_server';

jest.mock('react-native-splash-screen', () => ({
    hide: jest.fn(),
}));

describe('SelectServer', () => {
    const baseProps = {
        actions: {
            getPing: jest.fn(),
            handleServerUrlChanged: jest.fn(),
            handleSuccessfulLogin: jest.fn(),
            scheduleExpiredNotification: jest.fn(),
            loadConfigAndLicense: jest.fn(),
            login: jest.fn(),
            resetPing: jest.fn(),
            setLastUpgradeCheck: jest.fn(),
            setServerVersion: jest.fn(),
        },
        hasConfigAndLicense: false,
        serverUrl: '',
    };

    test('should show light background when user has light color scheme set', () => {
        Appearance.getColorScheme.mockImplementation(() => 'light');
        Appearance.addChangeListener.mockImplementation(() => 'light');

        const wrapper = shallowWithIntl(<SelectServer {...baseProps}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper).toHaveStyle('backgroundColor', lightColors.containerBg);
    });

    test('should show dark background when user has dark color scheme set', () => {
        Appearance.getColorScheme.mockImplementation(() => 'dark');
        Appearance.addChangeListener.mockImplementation(() => 'dark');

        const wrapper = shallowWithIntl(<SelectServer {...baseProps}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper).toHaveStyle('backgroundColor', darkColors.containerBg);
    });
});
