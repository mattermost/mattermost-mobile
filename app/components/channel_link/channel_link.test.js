// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';
import {Text} from 'react-native';

import ChannelLink from './channel_link';

describe('ChannelLink', () => {
    const channelsByName = {
        firstChannel: {id: 'channel_id_1', name: 'firstChannel', display_name: 'First Channel'},
        secondChannel: {id: 'channel_id_2', name: 'secondChannel', display_name: 'Second Channel'},
    };
    const baseProps = {
        channelName: 'firstChannel',
        linkStyle: {color: '#2389d7'},
        onChannelLinkPress: jest.fn(),
        textStyle: {color: '#3d3c40', fontSize: 15, lineHeight: 20},
        channelsByName,
        actions: {
            switchToChannel: jest.fn(),
        },
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <ChannelLink {...baseProps}/>
        );

        expect(wrapper.getElement()).toMatchSnapshot();
        expect(wrapper.find(Text).length).toBe(2);

        // inner text with highlight
        let innerText = wrapper.find(Text).last();
        expect(innerText.props().onPress).toBeDefined();
        expect(innerText.props().style.color).toBe('#2389d7');
        expect(innerText.props().children).toContain(channelsByName.firstChannel.display_name);

        // text for channel name with punctuation
        const punctuation = '-_';
        wrapper.setProps({channelName: baseProps.channelName + punctuation});
        expect(wrapper.find(Text).length).toBe(2);
        innerText = wrapper.find(Text).last();
        const outerText = wrapper.find(Text).first();
        expect(innerText.props().onPress).toBeDefined();
        expect(innerText.props().children).toContain(channelsByName.firstChannel.display_name);
        expect(outerText.props().children).toContain(punctuation);

        // text for not found channel
        const notFoundChannel = 'notFoundChannel';
        wrapper.setProps({channelName: notFoundChannel});
        expect(wrapper.find(Text).length).toBe(1);
        innerText = wrapper.find(Text).first();
        expect(innerText.props().children).toContain(notFoundChannel);
        expect(innerText.props().onPress).not.toBeDefined();
    });

    test('should call props.actions and onChannelLinkPress on handlePress', () => {
        const wrapper = shallow(
            <ChannelLink {...baseProps}/>
        );

        const channel = channelsByName.firstChannel;
        wrapper.setState({channel});
        wrapper.instance().handlePress();
        expect(baseProps.actions.switchToChannel).toHaveBeenCalledTimes(1);
        expect(baseProps.actions.switchToChannel).toBeCalledWith(channel.id, channel.display_name);
        expect(baseProps.onChannelLinkPress).toHaveBeenCalledTimes(1);
        expect(baseProps.onChannelLinkPress).toBeCalledWith(channel);
    });
});
