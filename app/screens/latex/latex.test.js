// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shallow} from 'enzyme';
import React from 'react';

import Preferences from '@mm-redux/constants/preferences';

import Latex from './latex';

describe('Latex', () => {
    const baseProps = {
        theme: Preferences.THEMES.denim,
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <Latex
                {...baseProps}
                content={'\\frac{1}{2} = 0.5^1 + (x^0 - e^{\\pi - \\frac{2*pi}}{2}}'}
            />,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should have 2 lines', () => {
        const wrapper = shallow(
            <Latex
                {...baseProps}
                content={'\\frac{1}{2} = 0.5^1 + (x^0 - e^{\\pi - \\frac{2*pi}}{2}} \\\\ Test = 1'}
            />,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should have 4 lines', () => {
        const wrapper = shallow(
            <Latex
                {...baseProps}
                content={'\\frac{1}{2} = 0.5^1 + (x^0 - e^{\\pi - \\frac{2*pi}}{2}} \\\\ Test = 1 \\\\ \\alpha = \\beta \\\\ 1 != 0'}
            />,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
