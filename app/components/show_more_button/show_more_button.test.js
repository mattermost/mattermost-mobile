// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {TouchableOpacity} from 'react-native';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import LinearGradient from 'react-native-linear-gradient';

import ShowMoreButton from './show_more_button';

describe('ShowMoreButton', () => {
    const baseProps = {
        highlight: false,
        onPress: jest.fn(),
        showMore: true,
        theme: Preferences.THEMES.default,
    };

    test('should match, full snapshot', () => {
        const wrapper = shallow(
            <ShowMoreButton {...baseProps}/>
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match, button snapshot', () => {
        const wrapper = shallow(
            <ShowMoreButton {...baseProps}/>
        );

        expect(wrapper.instance().renderButton(true, {button: {}, sign: {}, text: {}})).toMatchSnapshot();
        expect(wrapper.instance().renderButton(false, {button: {}, sign: {}, text: {}})).toMatchSnapshot();
    });

    test('should LinearGradient exists', () => {
        const wrapper = shallow(
            <ShowMoreButton {...baseProps}/>
        );

        expect(wrapper.find(LinearGradient).exists()).toBe(true);
        wrapper.setProps({showMore: false});
        expect(wrapper.find(LinearGradient).exists()).toBe(false);
    });

    test('should call props.onPress on press of TouchableOpacity', () => {
        const onPress = jest.fn();
        const wrapper = shallow(
            <ShowMoreButton
                {...baseProps}
                onPress={onPress}
            />
        );

        wrapper.find(TouchableOpacity).props().onPress();
        expect(onPress).toHaveBeenCalledTimes(1);
    });
});
