// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shallow} from 'enzyme';
import React from 'react';

import Preferences from '@mm-redux/constants/preferences';

import LatexCodeBlock from './latex_code_block';

describe('LatexCodeBlock', () => {
    const baseProps = {
        theme: Preferences.THEMES.denim,
        language: 'latex',
        textStyle: {},
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <LatexCodeBlock
                {...baseProps}
                content={'\\frac{1}{2} == 0.5^{0*\\pi} - 0.5'}
            />,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should have 2 lines', () => {
        const wrapper = shallow(
            <LatexCodeBlock
                {...baseProps}
                content={'\\frac{2}{1} = 2 \\\\ 2_{nd} = line'}
            />,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should have moreLinesText', () => {
        const wrapper = shallow(
            <LatexCodeBlock
                {...baseProps}
                content={'\\frac{5}{2} = 2 \\\\ 2_{nd} = line \\\\ \\pi = 3.14'}
            />,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
