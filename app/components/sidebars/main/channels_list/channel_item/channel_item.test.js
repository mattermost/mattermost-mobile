// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';
import {Navigation} from 'react-native-navigation';

import Preferences from 'mattermost-redux/constants/preferences';

import ChannelItem from './channel_item.js';

jest.useFakeTimers();
jest.mock('react-intl');

describe('ChannelItem', () => {
    const channel = {
        id: 'channel_id',
        delete_at: 0,
        type: 'O',
        fake: false,
        status: 'online',
    };

    const baseProps = {
        channelId: 'channel_id',
        channel,
        currentChannelId: 'current_channel_id',
        displayName: 'display_name',
        isChannelMuted: false,
        currentUserId: 'currentUser',
        isUnread: true,
        hasDraft: false,
        mentions: 0,
        onSelectChannel: () => {}, // eslint-disable-line no-empty-function
        shouldHideChannel: false,
        showUnreadForMsgs: true,
        theme: Preferences.THEMES.default,
        unreadMsgs: 1,
        isSearchResult: false,
        isBot: false,
        isLandscape: false,
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <ChannelItem {...baseProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot with mentions and muted', () => {
        const newProps = {
            ...baseProps,
            mentions: 1,
            isChannelMuted: true,
        };

        const wrapper = shallow(
            <ChannelItem {...newProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot for deactivated user and not searchResults or currentChannel', () => {
        const channelObj = {
            ...channel,
            type: 'D',
            delete_at: 123,
        };

        const newProps = {
            ...baseProps,
            channel: channelObj,
        };

        const wrapper = shallow(
            <ChannelItem {...newProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot for deactivated user and is searchResult', () => {
        const channelObj = {
            ...channel,
            type: 'D',
            delete_at: 123,
        };

        const newProps = {
            ...baseProps,
            isSearchResult: true,
            channel: channelObj,
        };

        const wrapper = shallow(
            <ChannelItem {...newProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot for deactivated user and is currentChannel', () => {
        const channelObj = {
            ...channel,
            type: 'D',
            delete_at: 123,
        };

        const newProps = {
            ...baseProps,
            channel: channelObj,
            currentChannelId: 'channel_id',
        };

        const wrapper = shallow(
            <ChannelItem {...newProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot for no displayName', () => {
        const newProps = {
            ...baseProps,
            displayName: '',
        };

        const wrapper = shallow(
            <ChannelItem {...newProps}/>,
            {context: {intl: {formatMessage: jest.fn()}}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot for current user i.e currentUser (you)', () => {
        const channelObj = {
            ...channel,
            type: 'D',
            teammate_id: 'currentUser',
        };

        const newProps = {
            ...baseProps,
            channel: channelObj,
            currentChannelId: 'channel_id',
        };

        const wrapper = shallow(
            <ChannelItem {...newProps}/>,
            {context: {intl: {formatMessage: (intlId) => intlId.defaultMessage}}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot for current user i.e currentUser (you) when isSearchResult', () => {
        const channelObj = {
            ...channel,
            id: 'currentUser',
            type: 'D',
            teammate_id: 'somethingElse',
        };

        const newProps = {
            ...baseProps,
            channel: channelObj,
            currentChannelId: 'channel_id',
            isSearchResult: true,
        };

        const wrapper = shallow(
            <ChannelItem {...newProps}/>,
            {context: {intl: {formatMessage: (intlId) => intlId.defaultMessage}}},
        );
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot with draft', () => {
        const wrapper = shallow(
            <ChannelItem
                {...baseProps}
                hasDraft={true}
            />,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should match snapshot for showUnreadForMsgs', () => {
        const wrapper = shallow(
            <ChannelItem
                {...baseProps}
                hasDraft={true}
                shouldHideChannel={true}
                unreadMsgs={0}
            />,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('Should call onPress', () => {
        const onSelectChannel = jest.fn();

        const wrapper = shallow(
            <ChannelItem
                {...baseProps}
                onSelectChannel={onSelectChannel}
            />,
            {context: {intl: {formatMessage: jest.fn()}}},
        );

        wrapper.find(Navigation.TouchablePreview).simulate('press');
        jest.runAllTimers();

        const expectedChannelParams = {id: baseProps.channelId, display_name: baseProps.displayName, fake: channel.fake, type: channel.type};
        expect(onSelectChannel).toHaveBeenCalledWith(expectedChannelParams, baseProps.currentChannelId);
    });
});
