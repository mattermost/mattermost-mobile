// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {TouchableOpacity} from 'react-native';
import {configure, shallow} from 'enzyme';
import Adapter from 'enzyme-adapter-react-16';
configure({adapter: new Adapter()});

import LinearGradient from 'react-native-linear-gradient';

import ShowMoreButton from './show_more_button';

describe('ShowMoreButton', () => {
    const baseProps = {
        highlight: false,
        onPress: jest.fn(),
        showMore: true,
        theme: {
            centerChannelBg: '#2f3e4e',
            centerChannelColor: '#dddddd',
        },
    };

    test('should match, full snapshot', () => {
        const wrapper = shallow(
            <ShowMoreButton {...baseProps}/>
        );

        expect(wrapper).toMatchSnapshot();
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
