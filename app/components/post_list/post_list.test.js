// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react';
import {shallow} from 'enzyme';

import Preferences from 'mattermost-redux/constants/preferences';

import * as NavigationActions from 'app/actions/navigation';
import PostList from './post_list';

jest.useFakeTimers();
jest.mock('react-intl');

describe('PostList', () => {
    const serverURL = 'https://server-url.fake';
    const deeplinkRoot = 'mattermost://server-url.fake';

    const baseProps = {
        actions: {
            handleSelectChannelByName: jest.fn(),
            loadChannelsByTeamName: jest.fn(),
            refreshChannelWithRetry: jest.fn(),
            selectFocusedPostId: jest.fn(),
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
        const showModalOverCurrentContext = jest.spyOn(NavigationActions, 'showModalOverCurrentContext');
        const wrapper = shallow(
            <PostList {...baseProps}/>,
        );

        wrapper.setProps({deepLinkURL: deepLinks.permalink});
        expect(baseProps.actions.setDeepLinkURL).toHaveBeenCalled();
        expect(baseProps.actions.selectFocusedPostId).toHaveBeenCalled();
        expect(showModalOverCurrentContext).toHaveBeenCalled();
        expect(wrapper.getElement()).toMatchSnapshot();
    });

    test('setting channel deep link', () => {
        const wrapper = shallow(
            <PostList {...baseProps}/>,
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
});
