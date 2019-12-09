// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';

import {shallowWithIntl} from 'test/intl-test-helper';
import {darkColors, lightColors} from 'app/styles/colors';
import {getColorStyles} from 'app/utils/appearance';
import LoginOptions from './login_options';

describe('LoginOptions', () => {
    const baseProps = {
        colorScheme: 'light',
        colorStyles: getColorStyles('light'),
        config: {},
        license: {
            IsLicensed: 'false',
        },
        isLandscape: false,
    };

    test('should show light background when user has dark color scheme set', () => {
        const props = {
            ...baseProps,
            colorScheme: 'light',
            colorStyles: getColorStyles('light'),
        };

        const wrapper = shallowWithIntl(<LoginOptions {...props}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper).toHaveStyle('backgroundColor', lightColors.containerBg);
    });

    test('should show dark background when user has dark color scheme set', () => {
        const props = {
            ...baseProps,
            colorScheme: 'dark',
            colorStyles: getColorStyles('dark'),
        };

        const wrapper = shallowWithIntl(<LoginOptions {...props}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper).toHaveStyle('backgroundColor', darkColors.containerBg);
    });
});
