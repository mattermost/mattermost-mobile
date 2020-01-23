// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {Appearance} from 'react-native-appearance';

import {shallowWithIntl} from 'test/intl-test-helper';
import {darkColors, lightColors} from 'app/styles/colors';
import LoginOptions from './login_options';

describe('LoginOptions', () => {
    const baseProps = {
        config: {},
        license: {
            IsLicensed: 'false',
        },
        isLandscape: false,
    };

    test('should show light background when user has light color scheme set', () => {
        Appearance.getColorScheme.mockImplementation(() => 'light');
        Appearance.addChangeListener.mockImplementation(() => 'light');

        const wrapper = shallowWithIntl(<LoginOptions {...baseProps}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper).toHaveStyle('backgroundColor', lightColors.containerBg);
    });

    test('should show dark background when user has dark color scheme set', () => {
        Appearance.getColorScheme.mockImplementation(() => 'dark');
        Appearance.addChangeListener.mockImplementation(() => 'dark');

        const wrapper = shallowWithIntl(<LoginOptions {...baseProps}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper).toHaveStyle('backgroundColor', darkColors.containerBg);
    });
});
