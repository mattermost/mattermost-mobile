// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react';
import {shallow} from 'enzyme';
import {
    SectionList,
} from 'react-native';

import ChannelMention from './channel_mention';

describe('ChannelMention', () => {
    const baseProps = {
        actions: {
            searchChannels: jest.fn(),
            autocompleteChannelsForSearch: jest.fn(),
        },
        currentTeamId: '123',
        cursorPosition: 0,
        onChangeText: jest.fn(),
        onResultCountChange: jest.fn(),
        requestStatus: '',
        theme: {},
        isLandscape: false,
    };

    test('should render component without error', () => {
        const wrapper = shallow(
            <ChannelMention {...baseProps}/>,
        );
        expect(wrapper.type()).toEqual(null);
    });

    test('fire onResultCountChange when matchTerm null', () => {
        const wrapper = shallow(
            <ChannelMention {...baseProps}/>,
        );
        const props2 = {
            matchTerm: null,
        };
        wrapper.setProps(props2);
        expect(baseProps.onResultCountChange).toHaveBeenCalled();
        expect(baseProps.onResultCountChange).toHaveBeenLastCalledWith(0);
    });

    test('fire onResultCountChange when matchTerm change', () => {
        const wrapper = shallow(
            <ChannelMention {...baseProps}/>,
        );
        wrapper.instance().runSearch = jest.fn();

        const props = {
            matchTerm: '1',
        };
        wrapper.setProps(props);
        const props2 = {
            matchTerm: '',
            myChannels: ['channel1', 'channel1', 'channel1'],
        };
        wrapper.setProps(props2);
        expect(wrapper.instance().runSearch).toHaveBeenCalled();
        expect(wrapper.instance().runSearch).toHaveBeenLastCalledWith('123', '');

        expect(baseProps.onResultCountChange).toHaveBeenCalledWith(3);

        const props3 = {
            isSearch: true,
            publicChannels: ['channel1', 'channel2', 'channel1'],
            privateChannels: ['channel2', 'channel1', 'channel1'],
            myMembers: {channel2: true, channel1: true},
        };
        wrapper.setProps(props3);
        expect(baseProps.onResultCountChange).toHaveBeenLastCalledWith(6);
        expect(wrapper.find(SectionList).exists()).toBe(true);
    });
});
