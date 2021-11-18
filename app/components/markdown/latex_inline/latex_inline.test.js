// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shallow} from 'enzyme';
import React from 'react';

import Preferences from '@mm-redux/constants/preferences';

import LatexInline from './latex_inline';

describe('LatexCodeBlock', () => {
    const baseProps = {
        theme: Preferences.THEMES.denim,
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <LatexInline
                {...baseProps}
                content={'\\frac{1}{2} == 0.5^{0*\\pi} - 0.5'}
            />,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should have maxWidth 10', () => {
        const wrapper = shallow(
            <LatexInline
                {...baseProps}
                content={'\\frac{1}{2} == 0.5^{0*\\pi} - 0.5'}
                maxMathWidth={10}
            />,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
