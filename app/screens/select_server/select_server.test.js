// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {shallowWithIntl} from 'test/intl-test-helper';

import {darkColors, lightColors} from 'app/styles/colors';
import {getColorStyles} from 'app/utils/appearance';
import SelectServer from './select_server';

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
        colorScheme: 'light',
        colorStyles: getColorStyles('light'),
        hasConfigAndLicense: false,
        serverUrl: '',
    };

    test('should show light background when user has dark color scheme set', () => {
        const props = {
            ...baseProps,
            colorScheme: 'light',
            colorStyles: getColorStyles('light'),
        };

        const wrapper = shallowWithIntl(<SelectServer {...props}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper).toHaveStyle('backgroundColor', lightColors.containerBg);
    });

    test('should show dark background when user has dark color scheme set', () => {
        const props = {
            ...baseProps,
            colorScheme: 'dark',
            colorStyles: getColorStyles('dark'),
        };

        const wrapper = shallowWithIntl(<SelectServer {...props}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper).toHaveStyle('backgroundColor', darkColors.containerBg);
    });
});
