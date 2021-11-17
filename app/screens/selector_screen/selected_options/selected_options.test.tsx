// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shallow} from 'enzyme';
import React from 'react';

import Preferences from '@mm-redux/constants/preferences';

import SelectedOptions from './selected_options';

describe('SelectedOptions', () => {
    const baseProps = {
        onRemove: jest.fn(),
        selectedOptions: [
            {
                text: 'text1',
                value: 'value1',
            },
            {
                text: 'text2',
                value: 'value2',
            },
            {
                text: 'text3',
                value: 'value3',
            },
        ],
        dataSource: '',
        theme: Preferences.THEMES.denim,
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <SelectedOptions {...baseProps}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });
});
