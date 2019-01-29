// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';
import {Text} from 'react-native';

import ChannelLink from './channel_link';

jest.mock('react-intl');

describe('ChannelLink', () => {
    const formatMessage = jest.fn();
    const channelsByName = {
        firstChannel: {id: 'channel_id_1', name: 'firstChannel', display_name: 'First Channel', team_id: 'current_team_id'},
        secondChannel: {id: 'channel_id_2', name: 'secondChannel', display_name: 'Second Channel', team_id: 'current_team_id'},
    };
    const baseProps = {
        channelName: 'firstChannel',
        currentTeamId: 'current_team_id',
        currentUserId: 'current_user_id',
        linkStyle: {color: '#2389d7'},
        onChannelLinkPress: jest.fn(),
        textStyle: {color: '#3d3c40', fontSize: 15, lineHeight: 20},
        channelsByName,
        actions: {
            handleSelectChannel: jest.fn(),
            joinChannel: jest.fn(),
            setChannelDisplayName: jest.fn(),
        },
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <ChannelLink {...baseProps}/>,
            {context: {intl: {formatMessage}}},
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
        const actions = {...baseProps.actions, joinChannel: jest.fn()};
        const wrapper = shallow(
            <ChannelLink
                {...baseProps}
                actions={actions}
            />,
            {context: {intl: {formatMessage}}},
        );

        const channel = channelsByName.firstChannel;
        wrapper.instance().handlePress();
        expect(actions.handleSelectChannel).toHaveBeenCalledTimes(1);
        expect(actions.handleSelectChannel).toBeCalledWith(channel.id);
        expect(actions.setChannelDisplayName).toHaveBeenCalledTimes(1);
        expect(actions.setChannelDisplayName).toBeCalledWith(channel.display_name);
        expect(baseProps.onChannelLinkPress).toHaveBeenCalledTimes(1);
        expect(baseProps.onChannelLinkPress).toBeCalledWith(channel);

        expect(actions.joinChannel).not.toBeCalled();
    });

    test('should call props.actions.joinChannel on handlePress when user is not member of such channel', async () => {
        const newChannelName = 'thirdChannel';
        const thirdChannel = {id: 'channel_id_3', name: 'thirdChannel', display_name: 'thirdChannel', team_id: 'current_team_id'};
        const joinChannel = jest.fn().mockResolvedValue({data: {channel: thirdChannel}});
        const channelMentions = {thirdChannel: {display_name: 'thirdChannel'}};
        const newChannelsByName = Object.assign({}, channelMentions, channelsByName);
        const newProps = {
            ...baseProps,
            channelsByName: newChannelsByName,
            channelName: newChannelName,
            actions: {...baseProps.actions, joinChannel},
        };
        const wrapper = shallow(
            <ChannelLink {...newProps}/>,
            {context: {intl: {formatMessage}}},
        );

        await wrapper.instance().handlePress();
        expect(newProps.actions.joinChannel).toHaveBeenCalledTimes(1);
        expect(newProps.actions.joinChannel).toBeCalledWith('current_user_id', 'current_team_id', null, 'thirdChannel');
    });
});
