// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {shallow} from 'enzyme';
import {
    Animated,
} from 'react-native';
const {View: AnimatedView} = Animated;

import Typing from './typing';

describe('Typing', () => {
    const baseProps = {
        typing: ['user1', 'user2'],
        theme: {
            centerChannelColor: 'blue',
        },
    };

    test('should render component without error', () => {
        const wrapper = shallow(
            <Typing {...baseProps}/>,
        );

        expect(wrapper.find(AnimatedView).exists()).toBe(true);
    });

    test('should call animateTyping when next typing props is not empty and current is empty', () => {
        const props = {
            ...baseProps,
            typing: [],
        };
        const wrapper = shallow(
            <Typing {...props}/>,
        );
        wrapper.instance().animateTyping = jest.fn();

        wrapper.setProps({typing: ['user2']});
        expect(wrapper.instance().animateTyping).toHaveBeenCalledWith(true);
    });

    test('should call animateTyping when next typing props is not empty', () => {
        const props = {
            ...baseProps,
        };
        const wrapper = shallow(
            <Typing {...props}/>,
        );
        wrapper.instance().animateTyping = jest.fn();

        wrapper.setProps({typing: []});
        expect(wrapper.instance().animateTyping).toHaveBeenCalledWith();
    });
});
