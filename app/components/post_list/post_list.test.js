// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from '@mm-redux/constants/preferences';
import EventEmitter from '@mm-redux/utils/event_emitter';

import {NavigationTypes} from '@constants';
import PostList from './post_list';

jest.useFakeTimers();
jest.mock('react-intl');

describe('PostList', () => {
    const formatMessage = jest.fn();
    const serverURL = 'https://server-url.fake';
    const deeplinkRoot = 'mattermost://server-url.fake';

    const baseProps = {
        actions: {
            closePermalink: jest.fn(),
            handleSelectChannelByName: jest.fn(),
            refreshChannelWithRetry: jest.fn(),
            showPermalink: jest.fn(),
            setDeepLinkURL: jest.fn(),
        },
        channelId: 'channel-id',
        deepLinkURL: '',
        lastPostIndex: -1,
        postIds: ['post-id-1', 'post-id-2'],
        serverURL,
        siteURL: 'https://site-url.fake',
        theme: Preferences.THEMES.default,
    };

    const deepLinks = {
        permalink: deeplinkRoot + '/team-name/pl/pl-id',
        channel: deeplinkRoot + '/team-name/channels/channel-name',
    };

    test('should match snapshot', () => {
        const wrapper = shallow(
            <PostList {...baseProps}/>,
        );

        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('setting permalink deep link', () => {
        const wrapper = shallow(
            <PostList {...baseProps}/>,
        );

        wrapper.setProps({deepLinkURL: deepLinks.permalink});
        expect(baseProps.actions.setDeepLinkURL).toHaveBeenCalled();
        expect(baseProps.actions.showPermalink).toHaveBeenCalled();
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('setting channel deep link', () => {
        const wrapper = shallow(
            <PostList {...baseProps}/>,
            {context: {intl: {formatMessage}}},
        );

        wrapper.setProps({deepLinkURL: deepLinks.channel});
        expect(baseProps.actions.setDeepLinkURL).toHaveBeenCalled();
        expect(baseProps.actions.handleSelectChannelByName).toHaveBeenCalled();
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('should call flatListScrollToIndex only when ref is set and index is in range', () => {
        jest.spyOn(global, 'requestAnimationFrame').mockImplementation((cb) => cb());

        const wrapper = shallow(
            <PostList {...baseProps}/>,
        );
        const instance = wrapper.instance();
        const flatListScrollToIndex = jest.spyOn(instance, 'flatListScrollToIndex');
        const indexInRange = baseProps.postIds.length;
        const indexOutOfRange = [-1, indexInRange + 1];

        instance.flatListRef = {
            current: null,
        };
        instance.scrollToIndex(indexInRange);
        expect(flatListScrollToIndex).not.toHaveBeenCalled();

        instance.flatListRef = {
            current: {
                scrollToIndex: jest.fn(),
            },
        };
        for (const index of indexOutOfRange) {
            instance.scrollToIndex(index);
            expect(flatListScrollToIndex).not.toHaveBeenCalled();
        }

        instance.scrollToIndex(indexInRange);
        expect(flatListScrollToIndex).toHaveBeenCalled();
    });

    test('should load more posts if available space on the screen', () => {
        const wrapper = shallow(
            <PostList {...baseProps}/>,
        );
        const instance = wrapper.instance();
        instance.loadToFillContent = jest.fn();

        wrapper.setProps({
            extraData: false,
        });
        expect(instance.loadToFillContent).toHaveBeenCalledTimes(0);

        instance.postListHeight = 500;
        instance.contentHeight = 200;
        wrapper.setProps({
            extraData: true,
        });

        expect(instance.loadToFillContent).toHaveBeenCalledTimes(1);
    });

    test('should register listeners on componentDidMount', () => {
        const wrapper = shallow(
            <PostList {...baseProps}/>,
        );
        const instance = wrapper.instance();
        instance.handleSetScrollToBottom = jest.fn();
        instance.handleClosePermalink = jest.fn();
        EventEmitter.on = jest.fn();

        expect(EventEmitter.on).not.toHaveBeenCalled();
        instance.componentDidMount();
        expect(EventEmitter.on).toHaveBeenCalledTimes(2);
        expect(EventEmitter.on).toHaveBeenCalledWith('scroll-to-bottom', instance.handleSetScrollToBottom);
        expect(EventEmitter.on).toHaveBeenCalledWith(NavigationTypes.NAVIGATION_DISMISS_AND_POP_TO_ROOT, instance.handleClosePermalink);
    });

    test('should remove listeners on componentWillUnmount', () => {
        const wrapper = shallow(
            <PostList {...baseProps}/>,
        );
        const instance = wrapper.instance();
        instance.handleSetScrollToBottom = jest.fn();
        instance.handleClosePermalink = jest.fn();
        EventEmitter.off = jest.fn();

        expect(EventEmitter.off).not.toHaveBeenCalled();
        instance.componentWillUnmount();
        expect(EventEmitter.off).toHaveBeenCalledTimes(2);
        expect(EventEmitter.off).toHaveBeenCalledWith('scroll-to-bottom', instance.handleSetScrollToBottom);
        expect(EventEmitter.off).toHaveBeenCalledWith(NavigationTypes.NAVIGATION_DISMISS_AND_POP_TO_ROOT, instance.handleClosePermalink);
    });
});
