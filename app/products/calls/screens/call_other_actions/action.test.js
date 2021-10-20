// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import {shallow} from 'enzyme';
import React from 'react';

import Preferences from '@mm-redux/constants/preferences';

import Action from './action';

describe('Action', () => {
    const baseProps = {
        theme: Preferences.THEMES.denim,
        destructive: false,
        icon: 'test-icon',
        onPress: jest.fn(),
        text: 'test-text',
    };

    test('should match snapshot', () => {
        const wrapper = shallow(<Action {...baseProps}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot when is destructive', () => {
        const props = {...baseProps, destructive: true};
        const wrapper = shallow(<Action {...props}/>);

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should call on callback on press', () => {
        const onPress = jest.fn();
        const props = {...baseProps, onPress};
        const wrapper = shallow(<Action {...props}/>);

        wrapper.find({testID: 'action'}).simulate('press');

        expect(onPress).toBeCalled();
    });
});
